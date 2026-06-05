# Spec de Design — Auth Admin por Sessão (Sub-projeto 5b)

**Data:** 2026-06-04
**Sub-projeto:** 5b de 6 — Auth admin por sessão
**Spec anterior:** `2026-06-01-sp5a-catalogo-dinamico-design.md` (SP5a, mergeado em master via PR #8, commit `fa0756c`)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

Sub-projetos 1, 2, 3, 4a, 4b e 5a estão concluídos e mergeados em master:

- **SP4b** entregou auth do cliente final (cookie httpOnly `bb_session` com JWT HS256, filter, rate limit, MailService, BCrypt).
- **SP5a** entregou os endpoints REST admin de catálogo (`/api/v1/admin/{products,categories,coupons}`) protegidos pelo header `X-Admin-Token` lido de env var compartilhada — sem identidade, sem audit por actor real.

Este sub-projeto **substitui o `X-Admin-Token` por login admin com sessão**, similar ao que o SP4b fez para clientes:

- Cookie httpOnly `bb_admin` separado do `bb_session` do cliente.
- Endpoints novos `/api/v1/auth/admin/{login,logout,me}`.
- Filter dedicado `JwtAdminCookieAuthFilter` que popula `ROLE_ADMIN`.
- Tabela `admin_users` separada da `users` do SP4b.
- Audit log dos controllers admin de catálogo ganha `actor=<admin_user_id>`.

A justificativa central é dar identidade real ao actor que muda preço/produto/cupom (visível no audit log de stdout) e remover o token compartilhado, que é um vetor inteiro (qualquer um com a env var é admin para sempre).

UI admin web (telas de gestão) fica para **SP5c**.

### Escopo

**Dentro:**

- Backend: pacote `auth/admin/` (AdminUser entity, AdminAuthService, AdminAuthController, JwtAdminCookieAuthFilter, DTOs).
- Backend: tabela `admin_users` (migration V5) com seed do primeiro admin via placeholders Flyway.
- Backend: endpoints `POST /auth/admin/login`, `POST /auth/admin/logout`, `GET /auth/admin/me`.
- Backend: refatoração mínima de `CookieFactory` (métodos admin), `JwtService` (sobrecarga com TTL parametrizado), `RateLimitFilter` (1 regra nova) — sem mexer no comportamento atual de cliente.
- Backend: `SecurityConfig` passa a exigir `ROLE_ADMIN` em `/api/v1/admin/**`; `AdminTokenFilter` removido.
- Backend: audit log dos `AdminCategoryController`, `AdminProductController`, `AdminCouponController` ganha `actor=<adminId>`.
- Backend: utilitário para gerar hash bcrypt (tarefa Gradle).
- Testes: unitários + ITs cobrindo login, isolamento de cookies, audit log, rate limit, migration idempotente.

**Fora do escopo:**

- **UI admin web** (Next.js, telas de gestão de catálogo/cupons) — SP5c.
- **Change-password admin** logado — SP5c ou SP6 (se virar fricção). Por enquanto, dev re-bootstrap ou SQL manual.
- **Reset de senha admin por email** — SP5c/6. Vetor clássico de abuso; reabrir quando UI existir.
- **CRUD de admins** (criar/listar/desativar outros admins) — SP5c.
- **Tabela `admin_audit_log` queryable** — SP6. Stdout estruturado basta para 1-2 admins.
- **IP allowlist em `/api/v1/admin/**`** — SP6 (camada de infraestrutura).
- **HTTPS, `Secure=true` em prod, `SameSite=Lax` em prod** — SP6.
- **Rate limit distribuído (Redis)** — SP6.
- **Token de "deslogar de todos os dispositivos"** (`token_version`) — futuro.
- **Refresh token** — sem ele no MVP, igual ao SP4b.
- **Frontend** — nenhuma mudança neste sub-projeto.

### Decisões travadas no brainstorming (2026-06-04)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Onde admins moram no banco | Tabela `admin_users` separada (V5 Flyway) — isolamento total de schema |
| 2 | Bootstrap do primeiro admin | Seed do Flyway V5 com placeholders `${admin.bootstrap.*}` lidos de env vars; `ON CONFLICT (email) DO NOTHING` |
| 3 | Cookie + endpoints | Cookie separado `bb_admin`; endpoints `/auth/admin/{login,logout,me}`; novo filter → `ROLE_ADMIN` |
| 4 | Escopo de endpoints | Mínimo viável: login/logout/me. Sem change-password, reset, CRUD de admins |
| 5 | Audit log | Acrescentar `actor=<admin_user_id>` aos `log.info("admin.action ...")` existentes (stdout estruturado) |
| 6 | `X-Admin-Token` | Remover de vez — `AdminTokenFilter` deletado, env var `ADMIN_TOKEN` removida |
| 7 | TTL sessão admin | 8 horas (28800s) — cobre 1 turno; sem refresh token |
| 8 | Reuso vs. duplicação | Reusar `JwtService` (com convenção de prefixo no `sub`), `RateLimitFilter` (só adicionar regra), `CookieFactory` (estender). Novos arquivos só para o que é específico de admin |

---

## 2. Stack adicional

Nenhuma. `io.jsonwebtoken:jjwt`, `bucket4j`, Spring Security, BCrypt já estão no projeto via SP4b.

---

## 3. Arquitetura

### 3.1 Novos arquivos

```
backend/src/main/java/com/bragas/api/auth/admin/
├── AdminAuthController.java          ← POST /auth/admin/login, /logout; GET /auth/admin/me
├── AdminAuthService.java             ← login (busca + bcrypt.matches)
├── JwtAdminCookieAuthFilter.java     ← lê cookie bb_admin, valida JWT, popula ROLE_ADMIN
├── AdminUserRepository.java          ← findByEmail(String), findById(String)
├── CurrentAdmin.java                 ← helper estático para extrair AdminUser.id do SecurityContext
├── domain/
│   └── AdminUser.java                ← @Entity (id "adm_<ULID>", email UNIQUE, password_hash, name, timestamps)
└── dto/
    ├── AdminLoginRequest.java        ← record(email, password) com @Email, @Size
    └── AdminMeResponse.java          ← record(id, email, name, createdAt)

backend/src/main/resources/db/migration/
└── V5__create_admin_users_and_seed.sql
```

### 3.2 Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `common/SecurityConfig.java` | Remove `AdminTokenFilter` da chain. Adiciona `JwtAdminCookieAuthFilter` antes do `UsernamePasswordAuthenticationFilter`. Adiciona regras: `/api/v1/auth/admin/login`+`/logout` permitAll; `/api/v1/auth/admin/me` requer `ROLE_ADMIN`; `/api/v1/admin/**` agora requer `ROLE_ADMIN` (era plug do filter de token). Remove dependência `AppProperties.admin().token()`. |
| `common/AdminTokenFilter.java` | **Deletado.** |
| `common/AppProperties.java` | Remove `admin().token()`. Adiciona `auth.adminCookieTtlSeconds` (default 28800). Sem mudar shape do bloco `auth.*` existente. |
| `auth/CookieFactory.java` | Adiciona métodos `adminSession(String jwt)` e `adminExpire()` — cookie `bb_admin` com TTL próprio. `secure`/`sameSite` continuam do mesmo bloco `auth.*`. |
| `auth/JwtService.java` | Adiciona sobrecarga `issue(String subject, long ttlSeconds)`. Mantém `issue(String subject)` que continua usando `jwtTtlSeconds` (cliente). `verifyAndExtractUserId` continua agnóstico — cada filter checa o prefixo do `sub`. |
| `auth/RateLimitFilter.java` | Adiciona 1 entrada ao array `RULES`: `new Rule("/api/v1/auth/admin/login", 5, Duration.ofMinutes(1))`. Nada mais. |
| `auth/JwtCookieAuthFilter.java` | Adiciona check do prefixo `usr_` no `sub` antes de buscar `userRepository.findById`. Mudança mínima — defesa em profundidade contra JWTs trocados de cookie. |
| `catalog/admin/AdminCategoryController.java` | Logs `admin.action` ganham `actor={}` extraído via `CurrentAdmin.id()`. |
| `catalog/admin/AdminProductController.java` | Idem. |
| `catalog/admin/AdminCouponController.java` | Idem. |
| `backend/.env.example` | Remove `ADMIN_TOKEN`. Adiciona `ADMIN_BOOTSTRAP_ID`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD_HASH`, `ADMIN_BOOTSTRAP_NAME`. |
| `backend/build.gradle.kts` | Adiciona tarefa `bcryptHash` para gerar hash bcrypt na CLI. |
| `backend/src/main/resources/application.yml` | Adiciona bloco `spring.flyway.placeholders.admin.bootstrap.*` lendo das env vars. Remove `app.admin.token`. Adiciona `app.auth.adminCookieTtlSeconds`. |
| `backend/src/test/resources/application-test.yml` | Adiciona placeholders de bootstrap com valores fixos para ITs (hash bcrypt conhecido de senha de teste). |

### 3.3 Fluxo de auth (visão geral)

```
Browser (futura UI admin SP5c, hoje só curl)         Backend (Spring)
────────                                              ──────────────────
POST /api/v1/auth/admin/login {email,password}
                                              ─→
                                                     RateLimitFilter (5/min por IP)
                                                     AdminAuthService.login → AdminUser
                                                     JwtService.issue(adminUser.id, 28800)
                                                     CookieFactory.adminSession(jwt)
                                              ←─    204 + Set-Cookie: bb_admin=<JWT>; HttpOnly; ...; Max-Age=28800

GET /api/v1/auth/admin/me  (cookie anexo)
                                              ─→
                                                     RateLimitFilter (passa) → JwtAdminCookieAuthFilter (autentica)
                                                     AdminAuthController.me() → AdminMeResponse
                                              ←─    200

POST /api/v1/admin/products {...}
                                              ─→
                                                     JwtAdminCookieAuthFilter (autentica como ROLE_ADMIN)
                                                     SecurityConfig autoriza (hasRole("ADMIN"))
                                                     AdminProductController.create(...)
                                                     log.info("admin.action ... actor=adm_...")
                                              ←─    201

POST /api/v1/auth/admin/logout
                                              ─→
                                              ←─    204 + Set-Cookie: bb_admin=; Max-Age=0
```

---

## 4. API REST — contratos

Prefixo `/api/v1`. Erros em Problem Details (RFC 7807), iguais ao SP3/SP4b.

### 4.1 `POST /auth/admin/login`

**Request:**
```json
{ "email": "admin@bragas.local", "password": "..." }
```

**Validações:** `email` formato + lowercase + trim + máx 200; `password` 8–100.

**Response 204** + `Set-Cookie: bb_admin=<JWT>; HttpOnly; Secure=<env>; SameSite=<env>; Path=/; Max-Age=28800`.

Sem body — front (SP5c) chama `GET /auth/admin/me` em seguida para obter os dados.

**Erros:**

| Código | `type` slug | Quando |
|---|---|---|
| 400 | `validation-failed` | Campos inválidos (email mal formado, password fora de 8–100) |
| 401 | `invalid-credentials` | Email inexistente OU senha errada (mensagem genérica anti-enumeração) |
| 429 | `too-many-requests` | Rate limit estourado (5/min por IP); header `Retry-After` |

### 4.2 `POST /auth/admin/logout`

Sem body. **Response 204** + `Set-Cookie: bb_admin=; Max-Age=0; Path=/`. **Idempotente** — chamar sem cookie devolve 204 (no-op no browser).

### 4.3 `GET /auth/admin/me`

Sem body no request. Requer cookie `bb_admin` válido.

**Response 200:**
```json
{
  "id": "adm_01HXYZ...",
  "email": "admin@bragas.local",
  "name": "Admin",
  "createdAt": "2026-06-04T18:00:00Z"
}
```

**Erros:** `401 unauthenticated` se cookie ausente ou JWT inválido/expirado.

### 4.4 Nenhum erro novo no `ApiExceptionHandler`

Reusa exceptions do SP4b:

- `InvalidCredentialsException` → 401 `invalid-credentials`.
- `UnauthenticatedException` → 401 `unauthenticated` (via `ProblemDetailsAuthEntryPoint`).
- `RateLimitExceededException` → 429 (já tratada pelo `RateLimitFilter` diretamente).

---

## 5. Schema do banco — Flyway V5

```sql
-- backend/src/main/resources/db/migration/V5__create_admin_users_and_seed.sql

CREATE TABLE admin_users (
  id              TEXT PRIMARY KEY,                  -- "adm_<ULID>"
  email           VARCHAR(200) NOT NULL UNIQUE,      -- lowercase, trimmed antes do INSERT
  password_hash   VARCHAR(72)  NOT NULL,             -- bcrypt $2a$... (~60 chars; 72 dá folga)
  name            VARCHAR(120) NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER admin_users_touch_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();  -- função já criada em V1

-- Seed do primeiro admin via placeholders Flyway.
-- Vars expandidas: ${admin.bootstrap.id}, ${admin.bootstrap.email},
--                  ${admin.bootstrap.passwordHash}, ${admin.bootstrap.name}
INSERT INTO admin_users (id, email, password_hash, name)
VALUES (
  '${admin.bootstrap.id}',
  LOWER(TRIM('${admin.bootstrap.email}')),
  '${admin.bootstrap.passwordHash}',
  '${admin.bootstrap.name}'
)
ON CONFLICT (email) DO NOTHING;
```

**Notas:**

- `email UNIQUE` já cria índice — sem índice redundante.
- `ON CONFLICT DO NOTHING`: migration idempotente. Rodar em banco que já tem o admin (mesmo email) é no-op.
- App falha rápido no startup se `ADMIN_BOOTSTRAP_ID`, `ADMIN_BOOTSTRAP_EMAIL` ou `ADMIN_BOOTSTRAP_PASSWORD_HASH` ausentes (sem default no `application.yml`).
- Sem tabela de tokens de reset (sem fluxo de esqueci-senha admin neste sub-projeto).
- **Por que não estender `users` com `role`:** segurança por isolamento. Bug que aceite um JWT com `sub=usr_...` para uma rota admin não escala privilégio porque (a) o cookie é diferente e (b) o filter admin rejeita `sub` que não comece com `adm_`. Esquemas separados eliminam a classe inteira de bugs "esqueci de checar a role".

---

## 6. Auth — detalhes técnicos

### 6.1 JWT — convenção de prefixo no `sub`

`JwtService` continua agnóstico — só emite e valida tokens. A **convenção** é:

- Cliente (SP4b): `sub` começa com `usr_` (ex.: `usr_01HXYZ...`).
- Admin (SP5b): `sub` começa com `adm_` (ex.: `adm_01HXYZ...`).

Cada filter checa o prefixo antes de buscar no repo correspondente:

```java
// JwtCookieAuthFilter (cliente)
.filter(sub -> sub.startsWith("usr_"))
.flatMap(userRepository::findById)
.ifPresent(user -> { ... ROLE_USER ... });

// JwtAdminCookieAuthFilter (admin)
.filter(sub -> sub.startsWith("adm_"))
.flatMap(adminUserRepository::findById)
.ifPresent(admin -> { ... ROLE_ADMIN ... });
```

Resultado: um JWT com `sub=usr_...` enviado no cookie `bb_admin` não autentica como admin. Defesa em profundidade — **cookie name** + **prefixo do sub** + **filter dedicado**.

`JwtService.issue` ganha sobrecarga:

```java
public String issue(String subject) { return issue(subject, this.ttlSeconds); }  // cliente, 7d
public String issue(String subject, long ttlSeconds) { ... }                      // admin chama com 8h
```

### 6.2 Cookie `bb_admin`

| Atributo | Valor |
|---|---|
| Nome | `bb_admin` |
| `HttpOnly` | `true` |
| `Secure` | `${COOKIE_SECURE:false}` (mesma var do SP4b; dev sobrescreve via `.env` se cross-port; prod via SP6) |
| `SameSite` | `${COOKIE_SAME_SITE:Lax}` (mesma var do SP4b; dev sobrescreve se cross-port) |
| `Path` | `/` |
| `Max-Age` | `${app.auth.adminCookieTtlSeconds}` (default 28800 = 8h) |
| `Domain` | não setar (usa host da response) |

`CookieFactory` ganha:

```java
public ResponseCookie adminSession(String jwt) {
    return ResponseCookie.from(ADMIN_COOKIE, jwt)
        .httpOnly(true).secure(secure).sameSite(sameSite).path("/")
        .maxAge(adminTtlSeconds)
        .build();
}
public ResponseCookie adminExpire() {
    return ResponseCookie.from(ADMIN_COOKIE, "")
        .httpOnly(true).secure(secure).sameSite(sameSite).path("/")
        .maxAge(0)
        .build();
}
```

Constante `public static final String ADMIN_COOKIE = "bb_admin"`.

### 6.3 `JwtAdminCookieAuthFilter`

Espelha `JwtCookieAuthFilter` (SP4b) com 3 diferenças:

1. Lê cookie `bb_admin` (não `bb_session`).
2. Aceita só `sub` com prefixo `adm_`.
3. Popula `Authentication` com `ROLE_ADMIN`.

Ausência de cookie OU JWT inválido OU prefixo errado OU admin deletado → segue como anonymous (sem retornar 401). Quem retorna 401 é o `AuthenticationEntryPoint` quando a rota exige `ROLE_ADMIN`.

### 6.4 `SecurityConfig` — chain final

**Ordem importa**: `requestMatchers` casa na ordem declarada. Regras mais específicas primeiro.

```java
http
    .csrf(disable)
    .cors(...)
    .sessionManagement(STATELESS)
    .authorizeHttpRequests(a -> a
        // Mais específicos primeiro
        .requestMatchers("/api/v1/auth/admin/me").hasRole("ADMIN")
        .requestMatchers("/api/v1/auth/admin/login", "/api/v1/auth/admin/logout").permitAll()
        .requestMatchers("/api/v1/auth/**").permitAll()                 // cliente: signup/login/logout/forgot/reset
        .requestMatchers(HttpMethod.GET, "/api/v1/orders/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/v1/orders").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/v1/menu").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/v1/coupons/validate").permitAll()
        .requestMatchers("/api/v1/me/**").authenticated()
        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")           // catalog/admin/*
        .anyRequest().permitAll()
    )
    .exceptionHandling(e -> e.authenticationEntryPoint(new ProblemDetailsAuthEntryPoint()))
    .addFilterBefore(new RateLimitFilter(rateLimitEnabled), UsernamePasswordAuthenticationFilter.class)
    .addFilterBefore(new JwtCookieAuthFilter(jwtService, userRepository), UsernamePasswordAuthenticationFilter.class)
    .addFilterBefore(new JwtAdminCookieAuthFilter(jwtService, adminUserRepository), UsernamePasswordAuthenticationFilter.class);
    // AdminTokenFilter REMOVIDO da chain
```

### 6.5 Rate limit — `RateLimitFilter`

Adiciona 1 entrada ao array `RULES`:

```java
new Rule("/api/v1/auth/admin/login", 5, Duration.ofMinutes(1)),
```

`/api/v1/admin/**` continua com 30/min (regra existente do SP5a). `/auth/admin/logout` e `/auth/admin/me` ficam fora do rate limit — não fazem sentido.

### 6.6 `AdminAuthService`

```java
@Service
public class AdminAuthService {
    private final AdminUserRepository adminUsers;
    private final PasswordEncoder encoder;
    // ... ctor

    @Transactional(readOnly = true)
    public AdminUser login(String email, String password) {
        String normalized = email.toLowerCase().trim();
        AdminUser a = adminUsers.findByEmail(normalized)
            .orElseThrow(InvalidCredentialsException::new);
        if (!encoder.matches(password, a.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return a;
    }
}
```

Sem `signup`, `changePassword`, `applyReset` — fora do escopo.

### 6.7 `AdminAuthController`

```java
@RestController
@RequestMapping("/api/v1/auth/admin")
public class AdminAuthController {
    private final AdminAuthService authService;
    private final JwtService jwtService;
    private final CookieFactory cookies;
    private final long adminTtlSeconds;
    // ... ctor

    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody @Valid AdminLoginRequest req) {
        AdminUser a = authService.login(req.email(), req.password());
        String jwt = jwtService.issue(a.getId(), adminTtlSeconds);
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.adminSession(jwt).toString())
            .build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.adminExpire().toString())
            .build();
    }

    @GetMapping("/me")
    public AdminMeResponse me(@AuthenticationPrincipal AdminUser admin) {
        if (admin == null) throw new UnauthenticatedException();
        return AdminMeResponse.from(admin);
    }
}
```

### 6.8 Audit log com actor

Helper:

```java
public final class CurrentAdmin {
    private CurrentAdmin() {}
    public static String id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "unknown";
        var principal = auth.getPrincipal();
        if (principal instanceof AdminUser a) return a.getId();
        return "unknown";
    }
}
```

Cada controller admin de catálogo passa a logar:

```java
log.info("admin.action action=POST resource=product id={} actor={}", p.getId(), CurrentAdmin.id());
log.info("admin.action action=PATCH resource=product id={} actor={}", p.getId(), CurrentAdmin.id());
log.info("admin.action action=DELETE resource=product id={} actor={}", id, CurrentAdmin.id());
```

(Análogo para `AdminCategoryController` e `AdminCouponController`.)

Se `actor=unknown` aparecer no log de produção, é bug — o `SecurityConfig` já barra request sem `ROLE_ADMIN` antes de chegar no controller. Defensivo para não NPE.

### 6.9 `AdminUser` entity

```java
@Entity
@Table(name = "admin_users")
public class AdminUser {
    @Id
    private String id;                                // "adm_<ULID>"
    @Column(unique = true, nullable = false, length = 200)
    private String email;                             // lowercase, trimmed
    @Column(name = "password_hash", nullable = false, length = 72)
    private String passwordHash;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
    // getters; setter só de passwordHash (futuro change-password)
}
```

ULID gerado fora do banco (no signup futuro de admin). No bootstrap, vem da env var `ADMIN_BOOTSTRAP_ID`.

---

## 7. Configuração — variáveis de ambiente

### 7.1 `application.yml`

```yaml
app:
  auth:
    jwtSecret: ${JWT_SECRET}
    jwtTtlSeconds: 604800                  # cliente — 7d (existente)
    adminCookieTtlSeconds: 28800           # admin — 8h (NOVO)
    cookieSecure: ${COOKIE_SECURE:false}   # existente — não muda
    cookieSameSite: ${COOKIE_SAME_SITE:Lax}# existente — não muda
    rateLimitEnabled: ${RATE_LIMIT_ENABLED:true}

# Bloco app.admin.token REMOVIDO (antes: token: ${ADMIN_TOKEN})

spring:
  flyway:
    placeholders:
      admin:
        bootstrap:
          id: ${ADMIN_BOOTSTRAP_ID}
          email: ${ADMIN_BOOTSTRAP_EMAIL}
          passwordHash: ${ADMIN_BOOTSTRAP_PASSWORD_HASH}
          name: ${ADMIN_BOOTSTRAP_NAME:Admin}
```

Sem default em `JWT_SECRET`, `ADMIN_BOOTSTRAP_ID`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD_HASH` — startup falha rápido se ausentes.

### 7.2 `backend/.env.example` (adiciona; remove `ADMIN_TOKEN`)

```
# Admin bootstrap (obrigatório no primeiro boot)
ADMIN_BOOTSTRAP_ID=adm_01HXYZ0123456789ABCDEFGH
ADMIN_BOOTSTRAP_EMAIL=admin@bragas.local
# Gerar hash via: ./gradlew bcryptHash -Ppassword=SUA_SENHA
ADMIN_BOOTSTRAP_PASSWORD_HASH=$2a$10$......
ADMIN_BOOTSTRAP_NAME=Admin
```

### 7.3 Tarefa Gradle `bcryptHash`

Em `backend/build.gradle.kts`:

```kotlin
tasks.register("bcryptHash") {
    description = "Generate a bcrypt hash for a password. Usage: ./gradlew bcryptHash -Ppassword=YOUR_PASSWORD"
    doLast {
        val pwd = (project.findProperty("password") as String?)
            ?: throw GradleException("Missing -Ppassword=YOUR_PASSWORD")
        val encoder = org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(10)
        println(encoder.encode(pwd))
    }
    // Spring Security já é dependência runtime; classpath via configurations.runtimeClasspath ou buildscript
}
```

Detalhes (classpath de buildscript vs runtime) ficam para o plano de implementação. Alternativa de baixo custo: documentar `psql -c "SELECT crypt('SUA_SENHA', gen_salt('bf', 10))"` no README e pular a tarefa Gradle.

### 7.4 `application-test.yml`

```yaml
spring:
  flyway:
    placeholders:
      admin:
        bootstrap:
          id: adm_test_0000000000000000
          email: admin@test.local
          # bcrypt de "admin-test-pwd" com strength=10 — gerado uma vez no plano e commitado
          # (o "$2a$10$xxx..." abaixo é placeholder; o plano de implementação substitui pelo hash real)
          passwordHash: $2a$10$xxxxxxxxxxxxxxxxxxxxxx
          name: Admin Test
```

Hash fixo gerado **uma vez** durante a implementação (com a tarefa `bcryptHash` ou via psql), substituindo o `xxx...` acima. ITs que precisam logar como admin usam credenciais conhecidas via helper `AdminAuthHelper.loginAndGetCookie()`.

---

## 8. Testes do backend

### 8.1 Unitários (sem Spring)

| Classe | Cobertura |
|---|---|
| `AdminAuthServiceTest` | login OK; email inexistente → `InvalidCredentialsException`; senha errada → `InvalidCredentialsException`; email com whitespace e maiúsculas é normalizado (lowercase + trim) |
| `JwtAdminCookieAuthFilterTest` | sub com prefixo `adm_` → autentica + popula ROLE_ADMIN; sub com prefixo `usr_` no cookie `bb_admin` → segue anonymous (não escala); cookie ausente → anonymous; JWT inválido/expirado → anonymous; admin deletado (id válido no JWT mas não no banco) → anonymous |
| `CookieFactoryTest` (estende) | `adminSession()` produz `bb_admin` com TTL 8h e atributos esperados; `adminExpire()` produz `bb_admin` com `Max-Age=0` |
| `JwtServiceTest` (estende) | sobrecarga `issue(sub, ttl)` respeita TTL custom (token expira no instante esperado) |
| `RateLimitFilterTest` (estende) | 6º POST `/auth/admin/login` no mesmo minuto → 429 com `Retry-After` |
| `CurrentAdminTest` | retorna id quando principal é AdminUser; "unknown" quando contexto vazio ou principal é outro tipo |

### 8.2 Integração (`@SpringBootTest` + Testcontainers Postgres)

| Classe | Cobertura |
|---|---|
| `AdminAuthControllerIT` | login com seed (`admin@test.local` + `admin-test-pwd`) → 204 + `Set-Cookie: bb_admin=...; Max-Age=28800`; login senha errada → 401 invalid-credentials; login email inexistente → 401 invalid-credentials (mesma mensagem); logout → 204 + cookie `Max-Age=0`; logout sem cookie → 204 (idempotente); GET /auth/admin/me sem cookie → 401 unauthenticated; GET /auth/admin/me com cookie de cliente (`bb_session`, sem `bb_admin`) → 401; GET /auth/admin/me com `bb_admin` válido → 200 + AdminMeResponse |
| `AdminCatalogAuthIT` | POST `/api/v1/admin/products` sem cookie → 401; com cookie cliente (`bb_session` válido, sem `bb_admin`) → 401; com `bb_admin` válido → 201; idem para PATCH/DELETE; idem para `/admin/categories` e `/admin/coupons`. Audit log contém `actor=adm_test_...` (via `OutputCaptureExtension` ou logger appender de teste) |
| `FlywayV5IT` | migration aplica em banco limpo; `admin_users` contém 1 row com email/name/hash dos placeholders; rodar migration de novo é no-op (idempotente via `ON CONFLICT`) |
| `CrossCookieIsolationIT` | JWT emitido para um `User` (sub=`usr_...`) colocado manualmente no cookie `bb_admin` → não autentica como admin (filter rejeita prefixo); vice-versa para JWT admin no cookie `bb_session` |
| `RateLimitAdminLoginIT` | 6 POST `/auth/admin/login` em <1min do mesmo IP → 6º responde 429 + `Retry-After` |

### 8.3 Adaptação dos ITs existentes

ITs do SP5a que exercitam os endpoints admin de catálogo usavam o header `X-Admin-Token`. Levantar lista e adaptar:

- `AdminCategoryIT` (se existir)
- `AdminProductIT` (se existir)
- `AdminCouponIT` (se existir)
- Qualquer outro IT que use `X-Admin-Token`

Para cada um: substituir o setup do header por chamada ao helper `AdminAuthHelper.loginAndGetCookie(mockMvc)` que faz `POST /auth/admin/login` com credenciais do `application-test.yml`, lê o `Set-Cookie: bb_admin=...` e devolve para anexar nas requests subsequentes.

Plano deve auditar os ITs existentes no começo e listar os afetados — assim ninguém esquece um.

### 8.4 Régua

Backend SP5a: 115/115. SP5b adiciona ~15 testes novos + adaptação dos ITs existentes. Régua esperada: **~130 verdes**. Front continua **216/216** (sem mudança nesta etapa).

---

## 9. Critérios de sucesso

- `cd backend && docker compose up -d` sobe Postgres + MailHog (sem mudança no compose).
- `./gradlew test` verde — ~130 testes incluindo os novos ITs.
- `./gradlew bootRun` com `.env` populado sobe normal. Startup **falha rápido** se `ADMIN_BOOTSTRAP_ID`, `ADMIN_BOOTSTRAP_EMAIL` ou `ADMIN_BOOTSTRAP_PASSWORD_HASH` ausentes.
- Migration V5 idempotente: rodar `./gradlew flywayMigrate` em banco que já tem o admin é no-op.
- Sanity manual com `curl`:
  - `curl -i -X POST http://localhost:8080/api/v1/auth/admin/login -d '{"email":"admin@bragas.local","password":"..."}' -H "Content-Type: application/json"` → 204 + `Set-Cookie: bb_admin=...; Max-Age=28800`.
  - `curl -i http://localhost:8080/api/v1/auth/admin/me --cookie "bb_admin=<jwt>"` → 200 + `{id, email, name, createdAt}`.
  - `curl -i -X POST http://localhost:8080/api/v1/admin/products -d '{...}' -H "Content-Type: application/json" --cookie "bb_admin=<jwt>"` → 201; log mostra `admin.action action=POST resource=product id=... actor=adm_...`.
  - `curl -i -X POST http://localhost:8080/api/v1/admin/products -d '{...}' -H "X-Admin-Token: qualquer-coisa"` → 401 (header é ignorado agora).
  - 6 POST `/auth/admin/login` errados em <1min → 6º retorna 429 com `Retry-After`.
- `psql ... -c "SELECT id, email, name FROM admin_users"` mostra a row do bootstrap.

---

## 10. Pendências para sub-projetos seguintes

| Item | Sub-projeto |
|---|---|
| UI admin web (Next.js, telas de gestão de catálogo/cupons) | 5c |
| Change-password admin (logado) | 5c |
| Reset de senha admin por email | 5c ou 6 |
| CRUD de admins (criar/listar/desativar via UI) | 5c |
| Remoção do checkout-via-WhatsApp paralelo | 5c |
| Tabela `admin_audit_log` queryable | 6 |
| IP allowlist em `/api/v1/admin/**` | 6 |
| HTTPS, `Secure=true` em prod, `SameSite=Lax` em prod | 6 |
| Rate limit distribuído (Redis) | 6 |
| Token de "deslogar de todos os dispositivos" (`token_version` em admin_users) | 6 |
| Secrets em vault (JWT_SECRET, ADMIN_BOOTSTRAP_PASSWORD_HASH) | 6 |
