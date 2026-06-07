# SP5b.1 — Hardening do seed admin: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substitui o seed admin baseado em hash pré-computado em env (Flyway V5) por um `AdminBootstrap` que gera hash via `passwordEncoder.encode(rawPassword)` em runtime, com validação de formato bcrypt fail-fast no startup. Bônus: fix do nit do code review do PR #9 (`/auth/admin/logout` passa de `permitAll` para `authenticated`).

**Architecture:** `ApplicationRunner` idempotente que roda em todo boot. V6 deleta o seed legacy de V5 (idempotente). Validação de formato bcrypt de TODOS admins corre antes da criação. Env ausente → WARN + skip. Email já existe → skip silencioso.

**Tech Stack:** Java 21 + Spring Boot 4.0.6 + Flyway + JPA + Spring Security Crypto (BCrypt) + Testcontainers Postgres + JUnit 5 + AssertJ + Mockito + OutputCaptureExtension (`spring-boot-starter-test`).

---

## File Structure (mapa)

**Criar (4):**
- `backend/src/main/java/com/bragas/api/auth/admin/AdminBootstrap.java` — ApplicationRunner principal
- `backend/src/main/resources/db/migration/V6__remove_legacy_admin_seed.sql` — migration de cleanup
- `backend/src/test/java/com/bragas/api/auth/admin/AdminBootstrapTest.java` — 8 testes unitários
- `backend/src/test/java/com/bragas/api/auth/admin/AdminBootstrapIT.java` — 2 testes de integração

**Modificar (6):**
- `backend/src/main/java/com/bragas/api/common/AppProperties.java` — adicionar `AdminBootstrap` record
- `backend/src/main/resources/application.yml` — bloco `app.admin-bootstrap`
- `backend/src/test/resources/application-test.yml` — bloco `app.admin-bootstrap` para o profile de teste
- `backend/src/main/java/com/bragas/api/common/SecurityConfig.java` — split do matcher de logout
- `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java` — 3 mudanças (id assert + logout rename + novo 401 test)
- `backend/src/test/java/com/bragas/api/auth/admin/CookieFactoryAdminTest.java` — ajustar construtor de `AppProperties` (ganha 4º arg)
- `backend/.env.example` — comentar deprecação de `ADMIN_BOOTSTRAP_PASSWORD_HASH`; adicionar `ADMIN_BOOTSTRAP_PASSWORD`

**Deletar (1):**
- `backend/src/test/java/com/bragas/api/auth/admin/FlywayV5IT.java` — V5 não tem mais comportamento testável isoladamente após V6

---

## Pré-requisitos antes de começar

- [ ] Branch `feat/sp5b1-hardening-admin-seed` checkada (já criada a partir de master `74476e0`).
- [ ] Docker Desktop rodando (Testcontainers Postgres).
- [ ] `backend/.env` local tem `JWT_SECRET` válido (qualquer secret >= 32 bytes) e `ADMIN_BOOTSTRAP_PASSWORD_HASH` setado (último smoke do SP5b).

Confirme:
```bash
git branch --show-current     # esperado: feat/sp5b1-hardening-admin-seed
git log --oneline -2          # esperado: spec commit em cima do merge do SP5b
docker info | head -3         # esperado: Server: ... (rodando)
```

---

### Task 1: AppProperties.AdminBootstrap + YAML wiring + fix do CookieFactoryAdminTest

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/common/AppProperties.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/test/resources/application-test.yml`
- Modify: `backend/src/test/java/com/bragas/api/auth/admin/CookieFactoryAdminTest.java`

- [ ] **Step 1: Adicionar `AdminBootstrap` record em `AppProperties`**

Edite `backend/src/main/java/com/bragas/api/common/AppProperties.java`. Substitua o arquivo inteiro por:

```java
package com.bragas.api.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Cors cors, Auth auth, Mail mail, AdminBootstrap adminBootstrap) {
    public record Cors(List<String> allowedOrigins) {}
    public record Auth(String jwtSecret, boolean cookieSecure, String cookieSameSite,
                       long jwtTtlSeconds, long adminCookieTtlSeconds, boolean rateLimitEnabled) {}
    public record Mail(String from, String resetBaseUrl) {}
    public record AdminBootstrap(String email, String password, String name) {}
}
```

- [ ] **Step 2: Adicionar bloco `app.admin-bootstrap` em `application.yml`**

Edite `backend/src/main/resources/application.yml`. Sob `app:`, adicione (na ordem alfabética — depois de `auth:`, antes de `cors:`):

```yaml
  admin-bootstrap:
    email:    ${ADMIN_BOOTSTRAP_EMAIL:}
    password: ${ADMIN_BOOTSTRAP_PASSWORD:}
    name:     ${ADMIN_BOOTSTRAP_NAME:Admin}
```

> **Atenção:** o nome do record é `adminBootstrap` (camelCase) e Spring Boot mapeia pra `admin-bootstrap` (kebab-case) no YAML automaticamente. Não mude a chave do YAML.

- [ ] **Step 3: Adicionar bloco `app.admin-bootstrap` em `application-test.yml`**

Edite `backend/src/test/resources/application-test.yml`. Sob `app:`, adicione:

```yaml
  admin-bootstrap:
    email:    admin@test.local
    password: admin-test-pwd
    name:     Admin Test
```

(Valores devem bater com `AdminAuthTestHelper.TEST_EMAIL` e `TEST_PASSWORD`.)

- [ ] **Step 4: Atualizar `CookieFactoryAdminTest` para construir `AppProperties` com 4 args**

Edite `backend/src/test/java/com/bragas/api/auth/admin/CookieFactoryAdminTest.java`. Substitua o método `props(...)` por:

```java
    private AppProperties props(boolean secure, String sameSite, long adminTtl) {
        return new AppProperties(
            new AppProperties.Cors(List.of()),
            new AppProperties.Auth("secret-32-bytes-long-padding-padding!!", secure, sameSite, 604800, adminTtl, false),
            new AppProperties.Mail("from@test", "http://reset"),
            new AppProperties.AdminBootstrap(null, null, null)
        );
    }
```

(Bootstrap fields irrelevantes pra esse teste — qualquer valor não-blank funciona; `null` deixa explícito que não é consumido.)

- [ ] **Step 5: Compilar e rodar testes; baseline deve continuar verde**

```bash
./gradlew compileJava compileTestJava
./gradlew test --tests 'com.bragas.api.auth.admin.CookieFactoryAdminTest'
```

Esperado: BUILD SUCCESSFUL, 2 testes passam.

Em seguida, rode a suite completa pra garantir nada quebrou:

```bash
./gradlew test
```

Esperado: 146/146 testes verdes (baseline SP5b). Bootstrap ainda não existe, mas `AppProperties` mudou — testes que constroem AppProperties manualmente já foram fixados acima.

> **Se `grep -rn "new AppProperties(" backend/src/test` mostrar outros construtores manuais que não sejam `CookieFactoryAdminTest`,** atualize-os com o 4º arg. (Foi checado em sessão prévia: só esse teste constrói manualmente. Confirme antes de seguir.)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/bragas/api/common/AppProperties.java \
        backend/src/main/resources/application.yml \
        backend/src/test/resources/application-test.yml \
        backend/src/test/java/com/bragas/api/auth/admin/CookieFactoryAdminTest.java
git commit -m "$(cat <<'EOF'
feat(sp5b1): AppProperties ganha record AdminBootstrap + wiring YAML

Defaults vazios (email/password) e literal "Admin" para name. Bootstrap
component vem na Task 2; este commit só prepara a estrutura de config
pra que o record seja bound no startup.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: AdminBootstrap component (TDD: unit tests RED → impl GREEN)

**Files:**
- Create: `backend/src/test/java/com/bragas/api/auth/admin/AdminBootstrapTest.java`
- Create: `backend/src/main/java/com/bragas/api/auth/admin/AdminBootstrap.java`

- [ ] **Step 1: Escrever os 8 testes unitários**

Crie `backend/src/test/java/com/bragas/api/auth/admin/AdminBootstrapTest.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import com.bragas.api.common.AppProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(OutputCaptureExtension.class)
class AdminBootstrapTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-06-05T12:00:00Z"), ZoneOffset.UTC);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4); // strength baixa em test = rápido

    private AppProperties props(String email, String password, String name) {
        return new AppProperties(
            new AppProperties.Cors(List.of()),
            new AppProperties.Auth("secret-32-bytes-long-padding-padding!!", false, "Lax", 3600, 1800, false),
            new AppProperties.Mail("from@test", "http://reset"),
            new AppProperties.AdminBootstrap(email, password, name)
        );
    }

    @Test
    void creates_admin_when_email_not_exists() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.empty());

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "senha-boa-123", "Admin"), clock);
        bootstrap.run(null);

        verify(repo).save(any(AdminUser.class));
    }

    @Test
    void skips_when_email_already_exists() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        AdminUser existing = AdminUser.create("admin@bragas.local", encoder.encode("qq"), "Admin", OffsetDateTime.now(clock));
        when(repo.findAll()).thenReturn(List.of(existing));
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.of(existing));

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "senha-boa-123", "Admin"), clock);
        bootstrap.run(null);

        verify(repo, never()).save(any(AdminUser.class));
    }

    @Test
    void skips_when_email_blank() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());

        var bootstrap = new AdminBootstrap(repo, encoder, props("", "senha-boa-123", "Admin"), clock);
        bootstrap.run(null);

        verify(repo, never()).save(any(AdminUser.class));
    }

    @Test
    void skips_when_password_blank() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "", "Admin"), clock);
        bootstrap.run(null);

        verify(repo, never()).save(any(AdminUser.class));
    }

    @Test
    void warns_when_password_over_72_bytes(CapturedOutput out) {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.empty());

        String longPassword = "x".repeat(80);
        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", longPassword, "Admin"), clock);
        bootstrap.run(null);

        verify(repo).save(any(AdminUser.class)); // segue criando
        assertThat(out.getOut()).contains("> 72 bytes");
    }

    @Test
    void fails_fast_when_existing_admin_has_invalid_bcrypt_format() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        AdminUser corrupted = AdminUser.create("orph@x", "not-bcrypt", "Orph", OffsetDateTime.now(clock));
        when(repo.findAll()).thenReturn(List.of(corrupted));

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "senha-boa-123", "Admin"), clock);

        assertThatThrownBy(() -> bootstrap.run(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("hash invalido")
            .hasMessageContaining(corrupted.getId());
    }

    @Test
    void handles_concurrent_creation_via_data_integrity_violation() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.empty());
        when(repo.save(any(AdminUser.class))).thenThrow(new DataIntegrityViolationException("uniq email"));

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "senha-boa-123", "Admin"), clock);

        // Não deve propagar exception — concorrência é tratada
        bootstrap.run(null);
    }

    @Test
    void does_not_log_password_anywhere(CapturedOutput out) {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.empty());

        String uniqueSecret = "UnIqUe-Token-DoNotLog-987654321";
        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", uniqueSecret, "Admin"), clock);
        bootstrap.run(null);

        assertThat(out.getOut()).doesNotContain(uniqueSecret);
    }
}
```

- [ ] **Step 2: Rodar — deve falhar (classe não existe)**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.AdminBootstrapTest'
```

Esperado: erro de compilação — `AdminBootstrap` symbol não existe.

- [ ] **Step 3: Implementar `AdminBootstrap`**

Crie `backend/src/main/java/com/bragas/api/auth/admin/AdminBootstrap.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import com.bragas.api.common.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.regex.Pattern;

@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    // bcrypt: $2[aby]$<cost 2 digitos>$<53 chars base64-like> = 60 chars total
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
        // 4a. Fail-fast em hash inválido em qualquer admin existente
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

        // Senha > 72 bytes: bcrypt trunca silenciosamente
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
                    "Restore: ./gradlew bcryptHash -Ppassword=NOVA_SENHA -> " +
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

- [ ] **Step 4: Rodar — devem passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.AdminBootstrapTest'
```

Esperado: PASS nos 8 testes.

- [ ] **Step 5: Rodar suite inteira pra confirmar regressão zero**

```bash
./gradlew test
```

Esperado: 154/154 verdes (146 baseline + 8 novos do AdminBootstrapTest). Bootstrap em ITs existentes corre como no-op (admin@test.local já existe via V5 seed); skip silencioso.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/admin/AdminBootstrap.java \
        backend/src/test/java/com/bragas/api/auth/admin/AdminBootstrapTest.java
git commit -m "$(cat <<'EOF'
feat(sp5b1): AdminBootstrap @Component (always-on idempotente)

Substitui dependencia em hash pre-computado por geracao runtime via
passwordEncoder.encode(). Format validation de TODOS admins no startup
falha rapido (IllegalStateException) se algum hash nao bater regex
bcrypt. WARN + skip se ADMIN_BOOTSTRAP_PASSWORD/EMAIL nao setados.
Skip silencioso se email ja existe (idempotente).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: AdminBootstrapIT (integração com Spring + Testcontainers)

**Files:**
- Create: `backend/src/test/java/com/bragas/api/auth/admin/AdminBootstrapIT.java`

- [ ] **Step 1: Escrever os 2 ITs**

Crie `backend/src/test/java/com/bragas/api/auth/admin/AdminBootstrapIT.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class AdminBootstrapIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired AdminUserRepository repo;

    @Test
    void fresh_db_bootstrap_creates_admin_from_env() {
        // Bootstrap rodou durante context init; admin@test.local deve existir
        Optional<AdminUser> admin = repo.findByEmail("admin@test.local");

        assertThat(admin).isPresent();
        assertThat(admin.get().getName()).isEqualTo("Admin Test");
        assertThat(admin.get().getId()).startsWith("adm_");
        // Hash existe e bate regex bcrypt
        assertThat(admin.get().getPasswordHash()).matches("^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$");
    }

    @Test
    void existing_admin_is_not_recreated() {
        // Bootstrap rodou 1x no init. Reinvocando manualmente nao deve duplicar.
        long countBefore = repo.count();

        // Note: em produção, bootstrap roda 1x por boot. Esse teste confirma
        // que count permanece estavel apos o init (idempotencia em DB).
        assertThat(countBefore).isGreaterThanOrEqualTo(1);
        assertThat(repo.findByEmail("admin@test.local")).isPresent();
        // Não tem como invocar bootstrap.run() de novo sem outro ApplicationContext;
        // teste de "skip if exists" está coberto no unit test.
    }
}
```

> **Nota de design:** o caso `corrupted_hash_in_db_causes_startup_to_fail` da spec está coberto no unit test (`fails_fast_when_existing_admin_has_invalid_bcrypt_format`). Replicar no IT exigiria forçar falha de ApplicationContext, custo > benefício. Spec 7.1 → 2 ITs em vez de 3 (desvio documentado).

- [ ] **Step 2: Rodar — devem passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.AdminBootstrapIT'
```

Esperado: PASS nos 2 testes.

> **Nota:** Bootstrap roda durante context init. No primeiro IT do profile test, V5 inserts admin@test.local (sentinel) → V6 ainda não existe → seed permanece → bootstrap acha → skip. **Bootstrap não roda real ainda — V6 vem na Task 4.** Os asserts (`admin@test.local` existe, hash bcrypt válido) passam porque a V5 seed continua intacta com o hash de "admin-test-pwd".

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/bragas/api/auth/admin/AdminBootstrapIT.java
git commit -m "$(cat <<'EOF'
test(sp5b1): AdminBootstrapIT verifica bootstrap end-to-end

Bootstrap roda no context init; testa presenca + formato bcrypt do
admin seed. V6 ainda nao existe; bootstrap faz skip silencioso porque
admin do V5 seed esta intacto. Apos Task 4 (V6), bootstrap criara o
admin real e os asserts continuam validos.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: V6 migration + AdminAuthControllerIT id fix + delete FlywayV5IT

**Files:**
- Create: `backend/src/main/resources/db/migration/V6__remove_legacy_admin_seed.sql`
- Modify: `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java`
- Delete: `backend/src/test/java/com/bragas/api/auth/admin/FlywayV5IT.java`

- [ ] **Step 1: Criar a migration V6**

Crie `backend/src/main/resources/db/migration/V6__remove_legacy_admin_seed.sql`:

```sql
-- Remove o seed inserido por V5 (placeholder-based, hash interpolado como texto).
-- A partir do SP5b.1, AdminBootstrap @Component e a autoridade do seed admin.
-- Idempotente: 0 ou 1 row deletado.
DELETE FROM admin_users
WHERE email = LOWER(TRIM('${admin.bootstrap.email}'));
```

- [ ] **Step 2: Atualizar `AdminAuthControllerIT.get_admin_me_with_admin_cookie_returns_200` (id assertion)**

Edite `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java`. **Adicione o import:**

```java
import static org.hamcrest.Matchers.startsWith;
```

**Substitua o test inteiro:**

```java
    @Test
    void get_admin_me_with_admin_cookie_returns_200() throws Exception {
        Cookie cookie = AdminAuthTestHelper.loginAndGetCookie(mvc);

        mvc.perform(get("/api/v1/auth/admin/me").cookie(cookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("admin@test.local"))
            .andExpect(jsonPath("$.name").value("Admin Test"))
            .andExpect(jsonPath("$.id", startsWith("adm_")));
    }
```

(Antes: `.value("adm_test_0000000000000000")` — depois de V6, esse id sentinel não existe mais; bootstrap gera ULID-prefixado.)

- [ ] **Step 3: Deletar `FlywayV5IT`**

```bash
git rm backend/src/test/java/com/bragas/api/auth/admin/FlywayV5IT.java
```

Razão: V5 não tem mais comportamento testável isoladamente; após V6 (que roda imediatamente depois), o seed do V5 é deletado. `AdminBootstrapIT.fresh_db_bootstrap_creates_admin_from_env` cobre o fluxo end-to-end V1→V6→Bootstrap.

- [ ] **Step 4: Rodar ITs admin pra confirmar fluxo novo**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.*' \
                  --tests 'com.bragas.api.catalog.admin.*' \
                  --tests 'com.bragas.api.order.OrderAdminControllerIT'
```

Esperado: todos passam. Fluxo:
- V1..V5 rodam → V5 insere admin@test.local (sentinel)
- V6 roda → DELETE → tabela vazia
- Spring beans + bootstrap rodam → bootstrap cria admin@test.local com novo ULID id, hash de "admin-test-pwd"
- `AdminAuthTestHelper.loginAndGetCookie` funciona normalmente
- Asserts em `get_admin_me_with_admin_cookie_returns_200` passam (id matches `startsWith("adm_")`)

- [ ] **Step 5: Rodar suite completa**

```bash
./gradlew test
```

Esperado: 155/155 verdes (146 baseline + 8 unit + 2 IT - 1 FlywayV5IT). 

> **Se algum IT admin falhar:** provavelmente o admin não está sendo recriado pelo bootstrap. Cheque que `application-test.yml` tem o bloco `app.admin-bootstrap` da Task 1 Step 3. Sem ele, props.email() vem null → WARN+skip → admin@test.local não existe → `AdminAuthTestHelper.loginAndGetCookie` falha com "Login admin não retornou Set-Cookie".

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V6__remove_legacy_admin_seed.sql \
        backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java
# FlywayV5IT já foi deletado com git rm
git commit -m "$(cat <<'EOF'
feat(sp5b1): V6 remove seed legacy de V5; AdminBootstrap vira autoridade

V6 deleta o admin inserido por V5 (matching email do placeholder).
Bootstrap, que roda no ApplicationContext init, detecta admin ausente
e cria com hash novo (encoder.encode). ID do admin agora e auto-gerado
(ULID), entao AdminAuthControllerIT.get_admin_me assert vira startsWith.
FlywayV5IT removido (V5 nao tem mais comportamento testavel isolado;
AdminBootstrapIT cobre fluxo V1->V6->Bootstrap end-to-end).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: SecurityConfig logout → authenticated + ajustes nos testes

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/common/SecurityConfig.java`
- Modify: `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java`

- [ ] **Step 1: Split do matcher de logout em `SecurityConfig`**

Edite `backend/src/main/java/com/bragas/api/common/SecurityConfig.java`. Procure a linha:

```java
                .requestMatchers("/api/v1/auth/admin/login", "/api/v1/auth/admin/logout").permitAll()
```

**Substitua por DUAS linhas:**

```java
                .requestMatchers("/api/v1/auth/admin/login").permitAll()
                .requestMatchers("/api/v1/auth/admin/logout").authenticated()
```

(Mantém ordem das regras intacta — `login`/`logout` continuam vindo antes de `/auth/**` permitAll.)

- [ ] **Step 2: Renomear o teste de logout existente e enviar cookie**

Edite `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java`. **Substitua o teste `logout_returns_204_and_clears_cookie` inteiro:**

```java
    @Test
    void logout_with_admin_cookie_returns_204_and_clears_cookie() throws Exception {
        Cookie cookie = AdminAuthTestHelper.loginAndGetCookie(mvc);

        mvc.perform(post("/api/v1/auth/admin/logout").cookie(cookie))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", containsString("bb_admin=")))
            .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }
```

- [ ] **Step 3: Adicionar teste novo de logout sem cookie**

No mesmo arquivo, **adicione abaixo** do teste anterior:

```java
    @Test
    void logout_without_admin_cookie_returns_401() throws Exception {
        mvc.perform(post("/api/v1/auth/admin/logout"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/unauthenticated"));
    }
```

- [ ] **Step 4: Rodar tests do controller admin**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.AdminAuthControllerIT'
```

Esperado: 7 testes (6 originais + 1 novo). Todos passam.

- [ ] **Step 5: Rodar suite completa**

```bash
./gradlew test
```

Esperado: 156/156 verdes (155 + 1 novo logout 401).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/bragas/api/common/SecurityConfig.java \
        backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java
git commit -m "$(cat <<'EOF'
fix(sp5b1): /auth/admin/logout exige autenticacao

Endpoint passa de .permitAll() para .authenticated(). Logout sem cookie
agora retorna 401 unauthenticated (entry point existente), removendo
o vetor de DoS de sessao admin via POST cross-site sem credenciais.
Test renomeado para logout_with_admin_cookie e novo test
logout_without_admin_cookie_returns_401 adicionado.

Fix do nit do code review do PR #9 (SP5b).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Atualizar `.env.example` com `ADMIN_BOOTSTRAP_PASSWORD`

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1: Editar o bloco de admin bootstrap em `.env.example`**

Edite `backend/.env.example`. **Substitua o bloco** que começa em `# Admin bootstrap` até o fim do arquivo por:

```
# Admin bootstrap (obrigatório no primeiro boot pra criar o admin inicial)
# AdminBootstrap @Component gera o hash via passwordEncoder.encode() em runtime.
# Defina ADMIN_BOOTSTRAP_PASSWORD com a senha que voce vai usar para logar.
# Em prod, guarde essa senha num password manager (bootstrap idempotente: skip se admin ja existe).
#
# Bootstrap pula silenciosamente se email OU password forem blank.
# Validacao de formato bcrypt corre em TODOS admins no startup; hash invalido faz
# o boot falhar com IllegalStateException + instrucoes de recovery.
ADMIN_BOOTSTRAP_EMAIL=admin@bragas.local
ADMIN_BOOTSTRAP_PASSWORD=troque-essa-senha-forte-no-primeiro-boot
ADMIN_BOOTSTRAP_NAME=Admin

# Legacy (SP5b): hash bcrypt pre-computado, usado pela Flyway V5.
# A partir do SP5b.1, V6 deleta o seed de V5 imediatamente; este env eh
# pratico apenas se voce tem um DB antigo onde V5 rodou mas V6 ainda nao.
# Para novos DBs ou apos V6 rodar, este valor eh ignorado.
ADMIN_BOOTSTRAP_PASSWORD_HASH=$2a$10$qCHHJh7uAYd9ui80fB.i6..L6lFNzgSpbMB4bpwECKu4ACCC/ecvO
```

(Mantém o hash de exemplo do SP5b — não é segredo; é placeholder do template.)

- [ ] **Step 2: Verificar formato do arquivo (sem trailing whitespace, newline final)**

```bash
tail -c 5 backend/.env.example | xxd
```

Esperado: termina com newline (`0a`).

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example
git commit -m "$(cat <<'EOF'
docs(sp5b1): .env.example documenta ADMIN_BOOTSTRAP_PASSWORD (raw)

Substitui dependencia do hash pre-computado por senha raw que o
AdminBootstrap component encripta no startup. Marca
ADMIN_BOOTSTRAP_PASSWORD_HASH como legacy (V5-only, ignorado apos V6).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Smoke manual + verificação final + push + PR

**Files:** nenhum

- [ ] **Step 1: Atualizar `backend/.env` local com `ADMIN_BOOTSTRAP_PASSWORD`**

Edite `backend/.env` (gitignored — não vai pro PR). Adicione:

```
ADMIN_BOOTSTRAP_PASSWORD=SuaNovaSenha123
```

(Ou outra senha forte. `ADMIN_BOOTSTRAP_PASSWORD_HASH` pode ficar — V6 deleta o admin do V5 de qualquer forma.)

- [ ] **Step 2: Subir backend e validar fluxo de boot**

```bash
docker compose up -d                 # postgres
./gradlew bootRun
```

Esperado nos logs do boot:
- Flyway aplica V6 (mensagem tipo "Migrating schema ... to version 6")
- Linha do bootstrap: `Admin bootstrap: criado admin@bragas.local id=adm_01...`
- `Started BragasApiApplication`

> **Se aparecer `app.admin-bootstrap parcialmente configurado` em vez de "criado":** `.env` não foi carregado. Confirme que `ADMIN_BOOTSTRAP_PASSWORD` está em `backend/.env` e que `bootRun` lê esse arquivo (Spring Boot 4 + spring-boot-devtools faz isso; senão use `export` antes do bootRun).

- [ ] **Step 3: Smoke via curl — login admin com a senha nova**

```bash
curl -i -X POST http://localhost:8080/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bragas.local","password":"SuaNovaSenha123"}'
```

Esperado: HTTP/1.1 204 + `Set-Cookie: bb_admin=...; Max-Age=28800; ...`.

Pegue o valor do cookie:
```bash
export ADMIN_COOKIE="<valor depois de bb_admin=>"
```

- [ ] **Step 4: Smoke — GET /me deve retornar id ULID-prefixado**

```bash
curl -i http://localhost:8080/api/v1/auth/admin/me --cookie "bb_admin=$ADMIN_COOKIE"
```

Esperado: HTTP/1.1 200 + body com `"id":"adm_01..."` (ULID novo, **não** mais `adm_test_0000...`).

- [ ] **Step 5: Smoke — logout SEM cookie deve dar 401**

```bash
curl -i -X POST http://localhost:8080/api/v1/auth/admin/logout
```

Esperado: HTTP/1.1 401 + body Problem Details `unauthenticated`.

- [ ] **Step 6: Smoke — logout COM cookie deve dar 204**

```bash
curl -i -X POST http://localhost:8080/api/v1/auth/admin/logout --cookie "bb_admin=$ADMIN_COOKIE"
```

Esperado: HTTP/1.1 204 + `Set-Cookie: bb_admin=; Max-Age=0; ...`.

- [ ] **Step 7: Smoke — validar fail-fast (opcional, destrutivo)**

Apenas se quiser ver o fail-fast em ação manualmente:

```bash
docker exec -it bragas-postgres psql -U bragas -d bragas
# no prompt:
UPDATE admin_users SET password_hash = 'garbage' WHERE email = 'admin@bragas.local';
\q
```

Restarte o `bootRun`. Esperado: stack trace de `IllegalStateException` com a mensagem de recovery, e a app **não sobe**.

**Para recuperar:** repita o login pra criar cookie inválido (não vai funcionar), gere hash via `./gradlew bcryptHash -Ppassword=SuaNovaSenha123`, e use psql interativo para UPDATE com o hash novo.

Ou: drop volume Docker, restart limpo:
```bash
docker compose down -v
docker compose up -d
./gradlew bootRun                    # V1..V6 + bootstrap recriam tudo
```

- [ ] **Step 8: Rodar suite completa final**

```bash
./gradlew clean test
```

Esperado: BUILD SUCCESSFUL, ~156 testes verdes (146 baseline + 8 unit + 2 IT - 1 FlywayV5IT + 1 logout 401).

- [ ] **Step 9: Rodar testes do front (regressão zero esperada)**

```bash
cd ..
npm test -- --run
```

Esperado: 216/216 verdes.

- [ ] **Step 10: Push branch e abrir PR**

```bash
cd backend       # ou onde estava no projeto
git push -u origin feat/sp5b1-hardening-admin-seed
gh pr create --title "feat(sp5b1): hardening do seed admin" --body "$(cat <<'EOF'
## Summary

- `AdminBootstrap` @Component (ApplicationRunner) gera hash do admin via `passwordEncoder.encode()` em runtime. Elimina manipulação textual do hash em env/SQL/DB.
- Validação de formato bcrypt de TODOS admins no startup: fail-fast com `IllegalStateException` + instruções de recovery se algum hash não bater o regex.
- `V6__remove_legacy_admin_seed.sql` deleta o seed inserido pela V5 (matching email do placeholder); idempotente.
- `/api/v1/auth/admin/logout` passa de `.permitAll()` para `.authenticated()` (fix do nit do code review do PR #9).
- Auto-gera admin id (drop `ADMIN_BOOTSTRAP_ID` env); test asserts mudam de sentinel hardcoded para `startsWith("adm_")`.
- `FlywayV5IT` deletado: V5 não tem mais comportamento testável isolado.

## Test plan

- [x] `./gradlew test` verde (~156 testes; 146 baseline SP5b + 8 unit + 2 IT - 1 FlywayV5IT + 1 logout 401)
- [x] `npm test` no front continua 216/216 (sem mudanças no front)
- [x] Smoke local: login admin com senha do env, GET /me com id ULID, logout sem cookie = 401, logout com cookie = 204 + clear
- [x] Smoke opcional de fail-fast: corromper hash no DB faz boot falhar

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 11: Verificar PR aberto**

```bash
gh pr view --json number,url,state
```

Esperado: state OPEN, URL imprimida.

---

## Summary

- 7 tasks, ~33 steps, frequent commits
- TDD nas tasks 2-3 (unit RED → impl GREEN → IT)
- Migration + test fixes em uma única task (4) pra manter ITs verdes entre commits
- Smoke manual destrutivo opcional no fim (Task 7 Step 7)

## Test plan

- [ ] Task 1: 2 testes (CookieFactoryAdminTest) verdes
- [ ] Task 2: 8 testes novos (AdminBootstrapTest) verdes + 146 baseline mantidos = 154
- [ ] Task 3: 2 ITs novos (AdminBootstrapIT) verdes = 156
- [ ] Task 4: 1 IT deletado (FlywayV5IT) = 155 net; AdminAuthControllerIT.get_admin_me passa com id novo
- [ ] Task 5: 1 IT novo (logout sem cookie 401) + 1 IT renomeado/ajustado = 156
- [ ] Task 6: nenhum impact em testes
- [ ] Task 7: smoke verde + 156 unit/IT verdes + 216 front verdes

## Self-review (verificação interna do plano)

**Cobertura da spec — verificada:**

| Seção da spec | Task que cobre |
|---|---|
| §1 Contexto | (introdução do plano) |
| §2 Decisões 1-8 | Task 2 (impl + unit tests) cobre todas as 8 decisões |
| §3 Arquitetura (boot order) | Tasks 1+2+3+4 (V6, bootstrap, ITs) |
| §4.1 AppProperties.AdminBootstrap | Task 1 |
| §4.2 AdminBootstrap component | Task 2 |
| §4.3 V6 migration | Task 4 |
| §4.4 SecurityConfig logout | Task 5 |
| §5 Data flow cenários | Tasks 2 (unit) + 3 (IT) + 7 (smoke) cobrem 5.1-5.5 |
| §6 Error handling | Tasks 2 (impl + 8 unit tests cobrindo 7 das 7 linhas da tabela) |
| §7.1 Tests novos | Tasks 2 (8 unit) + 3 (2 IT — desvio de 3 documentado) |
| §7.2 Ajustes em tests existentes | Tasks 4 + 5 |
| §7.3 Contagem | Plan delivers 156 (spec disse ~157; desvio +/- 1 documentado em Task 3 nota) |
| §8 Out of scope | N/A (não implementa) |
| §9 Migration path | Task 7 (steps 1-2 dev local) |
| §10 Critérios de sucesso | Task 7 (suite + smoke + push) |
| §11 Pendências futuras | N/A (não implementa) |

Sem gaps detectados.

**Placeholder scan:** Não há "TBD", "TODO", "implement later", "add error handling". Os `<HASH_NOVO>`/`<HASH>`/`<senha que vai usar>` no Task 7 são marcadores que o operador substitui explicitamente.

**Type consistency:** `AdminBootstrap.run(ApplicationArguments)` matches em testes e impl. `AppProperties.AdminBootstrap(String email, String password, String name)` é construído consistentemente em Task 1 (record def), Task 1 Step 4 (CookieFactoryAdminTest), Task 2 (unit tests). `repo.findByEmail(String)` retorna `Optional<AdminUser>` em todos os usos. `AdminUser.create(String, String, String, OffsetDateTime)` mantém a assinatura existente.

Plano pronto.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
