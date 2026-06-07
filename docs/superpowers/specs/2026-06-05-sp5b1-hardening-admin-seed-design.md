# SP5b.1 — Hardening do seed admin (design spec)

**Status:** aprovado para implementação
**Data:** 2026-06-05
**Branch alvo:** `feat/sp5b1-hardening-admin-seed` (a partir de master `74476e0`)
**Predecessor:** SP5b (PR #9, mergeado em master)

---

## 1. Contexto

SP5b introduziu auth admin por sessão (cookie `bb_admin` + JWT, tabela `admin_users` com seed via Flyway V5 placeholder-based). Durante o smoke manual do SP5b (Task 12), descobrimos uma classe de bug grave:

1. **Hash bcrypt tratado como texto opaco no pipeline** (env → Flyway placeholder → SQL → DB). Qualquer corrupção silenciosa (typo, shell, encoding, copy-paste) passa sem erro até bater no `passwordEncoder.matches()` em runtime, retornando 401 genérico sem signal.
2. **Seed-only-once por design** do Flyway (`ON CONFLICT (email) DO NOTHING` em V5): mudar env após o primeiro boot não tem efeito sobre o admin já inserido.
3. **Sem validação de formato bcrypt em runtime** — uma row com `password_hash='garbage'` (ou hash bcrypt de senha diferente) permanece silenciosa até alguém tentar logar.

Adicionalmente, o code review do PR #9 levantou um nit aberto: `/api/v1/auth/admin/logout` está em `.permitAll()`. CSRF teórico de DoS de sessão admin (sem escalada para leitura/escrita). Score 25/100 no review — filtrado, mas fica registrado para fix barato (1 linha).

**SP5b.1 endereça as três classes de bug + o nit em um único PR de hardening.**

---

## 2. Decisões aprovadas no brainstorming (2026-06-05)

| # | Decisão | Justificativa |
|---|---|---|
| 1 | Escopo = 4 itens: bootstrap component + format validation + V6 cleanup + logout authenticated | Foca no que o smoke + review expuseram. Sem adicionar scope creep. |
| 2 | Bootstrap **always-on idempotente**: roda em todo boot; `skip` se admin com email já existe | Sem flag pra esquecer. Email = chave de unicidade. Operador seta env uma vez, deploya, esquece. |
| 3 | Env ausente → **WARN + skip** (não fail-fast) | Junior dev rodando `bootRun` pela primeira vez vê warning explicativo. Format validation em admins existentes continua rodando. |
| 4 | **Auto-gerar admin id** (drop `ADMIN_BOOTSTRAP_ID` env); testes ajustam asserts para `startsWith("adm_")` | Menos vars de env. `AdminUser.create()` (já existe) gera ULID-prefixado. |
| 5 | Format validation = **fail-fast `IllegalStateException`** se algum admin tem hash inválido | Hash inválido = admin não consegue logar; detectar no boot ≪ detectar em login. Restart loop = signal claro pra operador. |
| 6 | Validação cobre **TODOS admins em `admin_users`**, não só o bootstrap-criado | Pega corrupção manual (UPDATE direto, scripts ad-hoc). |
| 7 | **V6 deleta por `email`** (não por id) usando placeholder `${admin.bootstrap.email}` | Robusto a mudança de id entre boots. V6 é idempotente. |
| 8 | **Limitação aceita:** hash semanticamente errado (format-válido mas pra senha diferente) **não é detectado** por format validation | bcrypt é one-way; impossível verificar sem a senha bruta. Mitigação manual: `bcryptVerify` task (já existe). |

---

## 3. Arquitetura

### Boot order (todos profiles)

```
1. Flyway V1..V5  (já existem; V5 ainda insere seed legacy via placeholder)
2. Flyway V6      (NOVO) DELETE FROM admin_users WHERE email = '${admin.bootstrap.email}'
3. Spring beans inicializam (PasswordEncoder, Clock, AdminUserRepository, AppProperties)
4. AdminBootstrap.run() (NOVO, ApplicationRunner)
   ├─ 4a. validateAllExistingAdminHashesOrFail()  — fail-fast
   ├─ 4b. Lê app.admin-bootstrap.{email,password,name}
   │      Se email ou password blank → WARN + skip
   └─ 4c. findByEmail(normalizedEmail).orElseGet(() -> create from env)
          Hash via encoder.encode(rawPassword)
5. App pronta (HTTP listener up)
```

**Em paralelo** (mudança independente):
- `SecurityConfig.filterChain`: `/api/v1/auth/admin/logout` migra de `.permitAll()` para `.authenticated()`

**Sem mudança em:** `AdminAuthService`, `AdminAuthController`, `CookieFactory`, `JwtAdminCookieAuthFilter`, frontend, `JwtService`, `RateLimitFilter`.

---

## 4. Componentes

### 4.1 `AppProperties.AdminBootstrap` (novo record)

Adicionar como 4º componente em `AppProperties`:

```java
public record AppProperties(Cors cors, Auth auth, Mail mail, AdminBootstrap adminBootstrap) {
    public record Cors(...) {}
    public record Auth(...) {}
    public record Mail(...) {}
    public record AdminBootstrap(String email, String password, String name) {}
}
```

YAML wiring (`application.yml`):

```yaml
app:
  admin-bootstrap:
    email:    ${ADMIN_BOOTSTRAP_EMAIL:}
    password: ${ADMIN_BOOTSTRAP_PASSWORD:}
    name:     ${ADMIN_BOOTSTRAP_NAME:Admin}
```

Defaults vazios para email/password; `name` tem default literal `Admin` para nunca ser blank.

### 4.2 `AdminBootstrap` — ApplicationRunner

**Path:** `backend/src/main/java/com/bragas/api/auth/admin/AdminBootstrap.java`

```java
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    // bcrypt: $2[aby]$<cost(2 digitos)>$<53 chars base64-like> = 60 chars total
    private static final Pattern BCRYPT = Pattern.compile("^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$");

    private final AdminUserRepository repo;
    private final PasswordEncoder encoder;
    private final AppProperties.AdminBootstrap props;
    private final Clock clock;

    public AdminBootstrap(AdminUserRepository repo, PasswordEncoder encoder,
                          AppProperties appProps, Clock clock) {
        this.repo = repo;
        this.encoder = encoder;
        this.props = appProps.adminBootstrap();
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // 4a. Fail-fast em hash inválido
        validateAllExistingAdminHashesOrFail();

        // 4b. WARN + skip se env incompleto
        String email = props.email();
        String password = props.password();
        if (isBlank(email) || isBlank(password)) {
            log.warn("app.admin-bootstrap parcialmente configurado (email={}, password={}); skip.",
                isBlank(email) ? "MISSING" : "set",
                isBlank(password) ? "MISSING" : "set");
            return;
        }

        // Senha > 72 bytes: bcrypt trunca silenciosamente. Warn mas segue.
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            log.warn("ADMIN_BOOTSTRAP_PASSWORD > 72 bytes; bcrypt vai truncar.");
        }

        // 4c. Idempotente por email
        String normalized = email.toLowerCase().trim();
        if (repo.findByEmail(normalized).isPresent()) {
            log.info("Admin {} ja existe; bootstrap skip.", normalized);
            return;
        }

        String hash = encoder.encode(password);
        AdminUser admin = AdminUser.create(normalized, hash, props.name(), OffsetDateTime.now(clock));
        try {
            repo.save(admin);
            log.info("Admin bootstrap: criado {} id={}", normalized, admin.getId());
        } catch (DataIntegrityViolationException e) {
            // Race: outra instancia concorrente venceu o INSERT
            log.info("Admin bootstrap: corrida concorrente perdida (admin {} criado por outra instancia); skip.",
                normalized);
        }
    }

    private void validateAllExistingAdminHashesOrFail() {
        for (AdminUser a : repo.findAll()) {
            if (!BCRYPT.matcher(a.getPasswordHash()).matches()) {
                throw new IllegalStateException(
                    "Admin com hash invalido detectado no startup: id=" + a.getId() +
                    " email=" + a.getEmail() +
                    ". Hash deve ser bcrypt ($2[aby]$nn$<53 chars>, 60 chars total). " +
                    "Restore: ./gradlew bcryptHash -Ppassword=NOVA_SENHA → " +
                    "UPDATE admin_users SET password_hash='<hash>' WHERE id='" + a.getId() + "'."
                );
            }
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
```

**Invariantes:**
- Password **nunca** entra em log statement (auditável via code review e teste `does_not_log_password_anywhere`)
- `@Transactional` cobre validation + lookup + create em uma única transação
- Validação roda **antes** de qualquer criação (não modifica estado se algum admin existente está corrompido)

### 4.3 `V6__remove_legacy_admin_seed.sql`

**Path:** `backend/src/main/resources/db/migration/V6__remove_legacy_admin_seed.sql`

```sql
-- Remove o seed inserido por V5 (placeholder-based, hash texto interpolado).
-- A partir do SP5b.1, AdminBootstrap @Component e a autoridade do seed admin.
-- Idempotente: 0 ou 1 row deletado.
DELETE FROM admin_users
WHERE email = LOWER(TRIM('${admin.bootstrap.email}'));
```

Placeholders `admin.bootstrap.email` continuam vivos em `application.yml` (V5 ainda os usa em primeiro run de fresh DB).

### 4.4 `SecurityConfig` — `/logout` `.authenticated()`

Mudança de 2 linhas em `backend/src/main/java/com/bragas/api/common/SecurityConfig.java`:

```java
// antes
.requestMatchers("/api/v1/auth/admin/login", "/api/v1/auth/admin/logout").permitAll()

// depois
.requestMatchers("/api/v1/auth/admin/login").permitAll()
.requestMatchers("/api/v1/auth/admin/logout").authenticated()
```

Endpoint `/logout` sem cookie agora retorna 401 Problem Details `unauthenticated` (entry point existente).

---

## 5. Data flow (cenários concretos)

### 5.1 Dev local (estado atual: admin manual em DB do smoke debug)

```
Pré:
  admin_users: id=adm_test_0000000000000000 email=admin@bragas.local
               password_hash=$2a$10$tvV2... (de SuaNovaSenha123, via UPDATE manual)

Dev atualiza backend/.env:
  + ADMIN_BOOTSTRAP_PASSWORD=SuaNovaSenha123
  (ADMIN_BOOTSTRAP_PASSWORD_HASH pode ficar ou sair; V5 ja rodou)

./gradlew bootRun:
  → V6 roda: DELETE FROM admin_users WHERE email='admin@bragas.local' → tabela vazia
  → AdminBootstrap.run():
     4a. findAll() vazio → validation passa trivial
     4b. email+password setados → continua
     4c. findByEmail vazio → cria admin com id=adm_<ULID novo>, hash gerado
  → Login com SuaNovaSenha123 → 204
```

### 5.2 Prod fresh (primeiro deploy)

```
Pré: DB vazio (nenhuma migration aplicada)
Env (via vault/secrets manager):
  JWT_SECRET=<openssl rand -base64 48>
  ADMIN_BOOTSTRAP_EMAIL=admin@bragas-burger.com.br
  ADMIN_BOOTSTRAP_PASSWORD=<senha forte gerada e guardada uma vez>
  ADMIN_BOOTSTRAP_NAME=Admin

bootRun:
  → V1..V5 rodam (V5 insere row sentinel com placeholder do .env.example)
  → V6 deleta esse row sentinel (matching email)
  → Bootstrap cria admin com email/password reais → INSERT

Operador faz primeiro login. Pode manter env setado (bootstrap idempotente)
ou rotacionar via SP5c (UI admin futura).
```

### 5.3 Prod re-deploy (rolling update, env inalterado)

```
Pré: admin_users tem 1 row criado pelo bootstrap da deploy anterior
bootRun:
  → V1..V6 ja no flyway_schema_history → nada novo
  → Bootstrap:
     4a. Hash existente bate regex bcrypt → OK
     4b. env OK
     4c. findByEmail acha → skip
  → log: "Admin admin@bragas-burger.com.br ja existe; bootstrap skip."
  → app pronta
```

### 5.4 Test profile

```
application-test.yml ganha bloco:
  app:
    admin-bootstrap:
      email: admin@test.local
      password: admin-test-pwd
      name: Admin Test

(Flyway placeholders existentes ficam — V5 ainda usa em primeiro Testcontainer)

@SpringBootTest com Testcontainers (Postgres novo a cada ApplicationContext):
  → V1..V5 rodam → V5 insere admin@test.local (sentinel)
  → V6 deleta admin@test.local
  → AdminBootstrap.run() cria admin@test.local com hash de "admin-test-pwd"
  → AdminAuthTestHelper.loginAndGetCookie() funciona normalmente
```

### 5.5 Format validation falha (security incident)

```
Pré: alguem UPDATE admin_users SET password_hash='garbage' WHERE id='adm_XXX'
     (sabotagem, script de migração broken, copy-paste corrupto)

bootRun:
  → AdminBootstrap.run():
     4a. validate row com hash='garbage' → IllegalStateException com mensagem
         de recovery
  → BOOT FALHA. Container restart loop ate operador corrigir.
```

---

## 6. Error handling

| Situação | Resposta |
|---|---|
| Env parcial (só email ou só password) | WARN com detalhe (`MISSING`/`set`) por campo; skip create |
| Concorrência: 2 instâncias INSERT simultâneo | Loser cata `DataIntegrityViolationException`; loga "corrida perdida"; segue boot |
| V6 migration falha | Flyway aborta; app não sobe; operador vê erro padrão de Flyway |
| Format validation throws | App não sobe; restart loop; operator recovery via mensagem da exception |
| Password > 72 bytes | WARN sobre truncamento bcrypt; segue criando (login funciona com truncamento simétrico) |
| `encoder.encode()` lança | Exception propaga, app não sobe (caso degenerado; muito raro) |
| Bootstrap loga senha | **Proibido por invariante.** Auditável via teste `does_not_log_password_anywhere`. |

---

## 7. Testing strategy

### 7.1 Testes novos

**`AdminBootstrapTest`** (unit, sem Spring, ~8 testes):

Mocks: `AdminUserRepository`, real `BCryptPasswordEncoder(4)` (strength baixa = rápido), `Clock` fixo.

```
✓ creates_admin_when_email_not_exists
✓ skips_when_email_already_exists
✓ skips_when_email_blank
✓ skips_when_password_blank
✓ warns_when_password_over_72_bytes (verifica log via OutputCaptureExtension)
✓ fails_fast_when_existing_admin_has_invalid_bcrypt_format
✓ handles_concurrent_creation_via_data_integrity_violation
✓ does_not_log_password_anywhere
```

**`AdminBootstrapIT`** (integração, Testcontainers Postgres, ~3 testes):

```
✓ fresh_db_bootstrap_creates_admin_from_env (boot real → assert row em DB)
✓ existing_admin_is_not_recreated (pré-popula via repo; assert id não mudou)
✓ corrupted_hash_in_db_causes_startup_to_fail
   (pré-popula admin com hash 'garbage' via @Sql ou repo.save;
    chama bootstrap.run() diretamente; espera IllegalStateException)
```

### 7.2 Ajustes em testes existentes

**`AdminAuthControllerIT`:**

1. `get_admin_me_with_admin_cookie_returns_200`: id passa a ser ULID-gerado, não sentinel.
   ```java
   import static org.hamcrest.Matchers.startsWith;
   .andExpect(jsonPath("$.id", startsWith("adm_")))
   ```

2. Renomear `logout_returns_204_and_clears_cookie` → `logout_with_admin_cookie_returns_204_and_clears_cookie` e enviar cookie:
   ```java
   Cookie cookie = AdminAuthTestHelper.loginAndGetCookie(mvc);
   mvc.perform(post("/api/v1/auth/admin/logout").cookie(cookie))
       .andExpect(status().isNoContent())
       ...
   ```

3. Adicionar (não substituir) novo test `logout_without_admin_cookie_returns_401`:
   ```java
   mvc.perform(post("/api/v1/auth/admin/logout"))
       .andExpect(status().isUnauthorized())
       .andExpect(jsonPath("$.type").value("https://bragas.com/errors/unauthenticated"));
   ```

**`FlywayV5IT`:** deletar. Após V6, V5 não tem mais comportamento testável isoladamente — o seed inserido é imediatamente removido por V6. `AdminBootstrapIT.fresh_db_bootstrap_creates_admin_from_env` cobre V1→V6→Bootstrap como fluxo end-to-end.

**`application-test.yml`:** adicionar bloco `app.admin-bootstrap.{email,password,name}` (valores: `admin@test.local`, `admin-test-pwd`, `Admin Test`). Placeholders Flyway existentes pra V5 permanecem inalterados.

### 7.3 Contagem estimada

```
Baseline SP5b mergeado: 146 testes
+ AdminBootstrapTest:    +8
+ AdminBootstrapIT:      +3
- FlywayV5IT:            -1
+ logout 401 test:       +1
SP5b.1 final:           ~157 testes
```

---

## 8. Out of scope (explícito)

1. **Hash semanticamente errado** (format-válido mas pra senha diferente): bcrypt one-way impede verificação sem senha bruta. Mitigação manual via `bcryptVerify` task (já existe desde SP5b).
2. **UI admin de change-password / criação de admins adicionais**: pertence ao SP5c.
3. **Rotação de senha via env**: bootstrap skip se email existe (não atualiza). Operador usa UPDATE manual ou aguarda SP5c.
4. **Auditoria de tentativas de login admin** (sucesso/falha): plataforma de auth não muda; audit log dos endpoints admin (POST/PATCH/DELETE catálogo) já implementado no SP5b mantém `actor=<admin_id>`.
5. **Secrets vault em prod**: SP6 (deploy hardening) trata.
6. **CSRF token explícito**: SP5b decisão registrada — STATELESS + SameSite mitiga. SP5b.1 não revisa.

---

## 9. Migration path

### Para o dev (local)

1. Pull master após SP5b.1 mergear
2. Editar `backend/.env`:
   - Adicionar `ADMIN_BOOTSTRAP_PASSWORD=<senha que vai usar>`
   - Garantir `ADMIN_BOOTSTRAP_EMAIL=admin@bragas.local` e `ADMIN_BOOTSTRAP_NAME=Admin` setados
   - `ADMIN_BOOTSTRAP_PASSWORD_HASH` pode ficar (ignorado) ou ser removido
3. `./gradlew bootRun` → V6 deleta admin local antigo → bootstrap cria novo
4. Login com a nova senha

### Para prod (quando rolar)

1. Operador define secrets no vault: `JWT_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `ADMIN_BOOTSTRAP_NAME`
2. Deploy: V5 insere sentinel (do `.env.example` placeholder), V6 deleta, bootstrap cria admin real
3. Operador faz primeiro login. Senha vai pro password manager pessoal.
4. Deploy subsequentes: bootstrap skip (idempotente). Env pode ficar setado sem efeito colateral.

---

## 10. Critérios de sucesso

- [ ] `./gradlew test` verde com ~157 testes (146 baseline + 11 net novo)
- [ ] `npm test` no front continua 216/216 (front não muda)
- [ ] Smoke manual: dev local migra com sucesso (V6 deleta, bootstrap recria, login passa)
- [ ] Log de bootstrap NUNCA contém password (verificado em teste unitário + grep manual no smoke)
- [ ] `/auth/admin/logout` sem cookie retorna 401 unauthenticated; com cookie retorna 204 + clear cookie
- [ ] Code review (manual ou /ultrareview) passa sem findings high-confidence
- [ ] Spec deste documento + plano de implementação subsequente commitados em `docs/superpowers/`

---

## 11. Pendências futuras (registradas para SP5c+ ou SP6)

- UI admin com change-password (SP5c)
- Audit log de tentativas de login admin (success/failure rate, source IP) — possivelmente SP6
- Limites de validade de senha admin (expiração N dias) — fora de escopo até demanda do cliente
- 2FA admin — fora de escopo

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
