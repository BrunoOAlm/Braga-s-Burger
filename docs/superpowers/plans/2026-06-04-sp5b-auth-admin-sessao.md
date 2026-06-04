# SP5b — Auth Admin por Sessão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o header `X-Admin-Token` por login admin com cookie httpOnly (`bb_admin`) e JWT HS256, com tabela `admin_users` separada, audit log identificando o admin real e endpoints `/auth/admin/{login,logout,me}`.

**Architecture:** Reusa `JwtService`, `RateLimitFilter` e `CookieFactory` do SP4b (auth do cliente) via pequenas extensões. Adiciona pacote `auth/admin/` com `AdminUser` entity, `AdminAuthService`, `AdminAuthController`, `JwtAdminCookieAuthFilter`. Isolamento de privilégio em camadas: cookie name (`bb_admin` vs `bb_session`) + prefixo do `sub` no JWT (`adm_` vs `usr_`) + filter dedicado. Tabela `admin_users` criada e seeded via Flyway V5 com placeholders lidos de env vars.

**Tech Stack:** Java 21, Spring Boot 4.0.6, Spring Security, JJWT 0.12.x, Bucket4j 8.x, BCryptPasswordEncoder (strength 10), Flyway, PostgreSQL 16, Testcontainers, JUnit 5, MockMvc, AssertJ, Mockito.

**Spec:** `docs/superpowers/specs/2026-06-04-sp5b-auth-admin-sessao-design.md` (commit `0647c7f`).

**Régua esperada ao final:** backend ~130 verdes (era 115 em master); front 216/216 sem mudança.

---

## File Structure (mapa)

**Novos arquivos:**

```
backend/src/main/java/com/bragas/api/auth/admin/
├── AdminAuthController.java               ← REST: POST /auth/admin/login, /logout; GET /auth/admin/me
├── AdminAuthService.java                  ← lógica de login (busca + bcrypt.matches)
├── JwtAdminCookieAuthFilter.java          ← lê cookie bb_admin, valida JWT, popula ROLE_ADMIN
├── AdminUserRepository.java               ← JpaRepository<AdminUser, String>
├── CurrentAdmin.java                      ← helper estático: SecurityContext → AdminUser.id
├── domain/
│   └── AdminUser.java                     ← @Entity (id "adm_<ULID>")
└── dto/
    ├── AdminLoginRequest.java             ← record(email, password)
    └── AdminMeResponse.java               ← record(id, email, name, createdAt)

backend/src/main/resources/db/migration/
└── V5__create_admin_users_and_seed.sql    ← cria tabela + seed via placeholders

backend/src/test/java/com/bragas/api/auth/admin/
├── AdminAuthServiceTest.java              ← unit (sem Spring)
├── JwtAdminCookieAuthFilterTest.java      ← unit (sem Spring)
├── CurrentAdminTest.java                  ← unit
├── AdminAuthControllerIT.java             ← IT com Testcontainers
├── AdminCatalogAuthIT.java                ← IT do audit log + isolamento via cookie
├── CrossCookieIsolationIT.java            ← IT do isolamento de cookies/prefixos
├── FlywayV5IT.java                        ← IT da migration V5
└── AdminAuthTestHelper.java               ← helper para ITs: login + extrair cookie bb_admin
```

**Arquivos modificados:**

```
backend/src/main/java/com/bragas/api/common/SecurityConfig.java         ← chain final, sem AdminTokenFilter
backend/src/main/java/com/bragas/api/common/AdminTokenFilter.java       ← DELETADO
backend/src/main/java/com/bragas/api/common/AppProperties.java          ← remove Admin record, add adminCookieTtlSeconds em Auth
backend/src/main/java/com/bragas/api/auth/CookieFactory.java            ← métodos adminSession/adminExpire
backend/src/main/java/com/bragas/api/auth/JwtService.java               ← sobrecarga issue(sub, ttl)
backend/src/main/java/com/bragas/api/auth/JwtCookieAuthFilter.java      ← check prefixo "usr_" no sub
backend/src/main/java/com/bragas/api/auth/RateLimitFilter.java          ← 1 regra nova para /auth/admin/login
backend/src/main/java/com/bragas/api/catalog/admin/AdminCategoryController.java   ← actor no log
backend/src/main/java/com/bragas/api/catalog/admin/AdminProductController.java    ← actor no log
backend/src/main/java/com/bragas/api/catalog/admin/AdminCouponController.java     ← actor no log
backend/src/main/resources/application.yml                              ← remove app.admin, add adminCookieTtlSeconds, add placeholders Flyway
backend/src/test/resources/application-test.yml                         ← remove app.admin.token, add placeholders Flyway
backend/.env.example                                                    ← remove ADMIN_TOKEN, add ADMIN_BOOTSTRAP_*
backend/build.gradle.kts                                                ← task bcryptHash
backend/src/test/java/com/bragas/api/catalog/admin/AdminCategoryControllerIT.java  ← header → cookie via helper
backend/src/test/java/com/bragas/api/catalog/admin/AdminProductControllerIT.java   ← header → cookie via helper
backend/src/test/java/com/bragas/api/catalog/admin/AdminCouponControllerIT.java    ← header → cookie via helper
backend/src/test/java/com/bragas/api/order/OrderAdminControllerIT.java             ← header → cookie via helper
backend/src/test/java/com/bragas/api/auth/RateLimitFilterTest.java                 ← case do /auth/admin/login
```

---

## Pré-requisitos antes de começar

**1.** Confirme que está no branch `master` atualizado:

```bash
git status                  # working tree limpa
git log -1 --oneline        # último commit: 0647c7f docs(sp5b): spec...
```

**2.** Crie a branch de feature:

```bash
git checkout -b feat/sp5b-auth-admin-sessao
```

**3.** Suba os containers de dev (Postgres+MailHog) — ITs usam Testcontainers, mas dev manual usa esses:

```bash
cd backend
docker compose up -d
docker compose ps           # bragas-postgres e bragas-mailhog "Up"
```

**4.** Gere um hash bcrypt fixo para a senha de teste **"admin-test-pwd"**. Como o `BCryptPasswordEncoder` não é determinístico, qualquer hash válido daquela senha serve — gere uma vez, anote, e use em todos os passos abaixo. Use:

```bash
cd backend
./gradlew --quiet -PadHocPassword=admin-test-pwd jar    # só para garantir compile
```

Depois, num shell python (ou qualquer ferramenta), gere o hash. Opção rápida com Java direto via `jshell`:

```bash
jshell --class-path build/libs/bragas-api-0.0.1-SNAPSHOT.jar
jshell> new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(10).encode("admin-test-pwd")
```

Anote o hash retornado (formato `$2a$10$...` ~60 chars). **Sempre que este plano referenciar `<HASH_TEST_PWD>`, substitua pelo hash gerado.**

> Alternativa: se o `jshell` não estiver disponível, ao implementar o Task 10 (tarefa Gradle `bcryptHash`), faça primeiro essa tarefa, rode `./gradlew bcryptHash -Ppassword=admin-test-pwd` e use a saída. Mas se preferir começar TDD pelo Task 1, qualquer ferramenta bcrypt-10 serve. **Não invente um hash — tem que ser gerado.**

---

### Task 1: Migration V5 + AdminUser entity + AdminUserRepository

**Files:**
- Create: `backend/src/main/resources/db/migration/V5__create_admin_users_and_seed.sql`
- Create: `backend/src/main/java/com/bragas/api/auth/admin/domain/AdminUser.java`
- Create: `backend/src/main/java/com/bragas/api/auth/admin/AdminUserRepository.java`
- Create: `backend/src/test/java/com/bragas/api/auth/admin/FlywayV5IT.java`
- Modify: `backend/src/test/resources/application-test.yml`
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Adicionar placeholders Flyway no `application-test.yml`**

Edite `backend/src/test/resources/application-test.yml`. Acrescente o bloco `spring.flyway.placeholders` (substitua `<HASH_TEST_PWD>` pelo hash gerado nos pré-requisitos):

```yaml
spring:
  main:
    allow-bean-definition-overriding: true
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.format_sql: false
  flyway:
    placeholders:
      admin:
        bootstrap:
          id: adm_test_0000000000000000
          email: admin@test.local
          passwordHash: <HASH_TEST_PWD>
          name: Admin Test
```

Mantenha tudo o que já estava no arquivo — só **acrescente** o bloco `spring.flyway.placeholders` (Spring merge faz o resto).

- [ ] **Step 2: Adicionar placeholders Flyway no `application.yml` (produção/dev)**

Edite `backend/src/main/resources/application.yml`. Sob `spring:`, antes do `mail:`, acrescente:

```yaml
  flyway:
    placeholders:
      admin:
        bootstrap:
          id: ${ADMIN_BOOTSTRAP_ID}
          email: ${ADMIN_BOOTSTRAP_EMAIL}
          passwordHash: ${ADMIN_BOOTSTRAP_PASSWORD_HASH}
          name: ${ADMIN_BOOTSTRAP_NAME:Admin}
```

Sem default para `ADMIN_BOOTSTRAP_ID`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD_HASH` — startup deve falhar rápido se ausentes.

- [ ] **Step 3: Atualizar `.env.example` com vars de bootstrap**

Edite `backend/.env.example`. **Remova** a linha `ADMIN_TOKEN=changeme`. **Adicione** ao final:

```
# Admin bootstrap (obrigatório no primeiro boot)
# Gerar o hash bcrypt via: ./gradlew bcryptHash -Ppassword=SUA_SENHA  (ver Task 10)
ADMIN_BOOTSTRAP_ID=adm_01HXYZ0123456789ABCDEFGH
ADMIN_BOOTSTRAP_EMAIL=admin@bragas.local
ADMIN_BOOTSTRAP_PASSWORD_HASH=$2a$10$replace_me_with_real_bcrypt_hash_60_chars
ADMIN_BOOTSTRAP_NAME=Admin
```

- [ ] **Step 4: Escrever o teste de integração FlywayV5IT (falha primeiro)**

Crie `backend/src/test/java/com/bragas/api/auth/admin/FlywayV5IT.java`:

```java
package com.bragas.api.auth.admin;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class FlywayV5IT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired DataSource dataSource;

    @Test
    void admin_users_table_exists_with_expected_columns() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT column_name FROM information_schema.columns " +
                "WHERE table_name='admin_users' ORDER BY column_name");
            var cols = new ArrayList<String>();
            while (rs.next()) cols.add(rs.getString(1));
            assertThat(cols).contains("id", "email", "password_hash", "name", "created_at", "updated_at");
        }
    }

    @Test
    void admin_users_email_is_unique() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT COUNT(*) FROM pg_indexes " +
                "WHERE tablename='admin_users' AND indexdef ILIKE '%UNIQUE%email%'");
            assertThat(rs.next()).isTrue();
            assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(1);
        }
    }

    @Test
    void seed_inserted_one_admin_with_bootstrap_email() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT id, email, name FROM admin_users WHERE email='admin@test.local'");
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString("id")).isEqualTo("adm_test_0000000000000000");
            assertThat(rs.getString("name")).isEqualTo("Admin Test");
        }
    }
}
```

- [ ] **Step 5: Rodar o teste — deve falhar**

```bash
cd backend
./gradlew test --tests 'com.bragas.api.auth.admin.FlywayV5IT'
```

Esperado: falha porque V5 não existe ainda (`table "admin_users" does not exist` ou erro de migration).

- [ ] **Step 6: Escrever a migration V5**

Crie `backend/src/main/resources/db/migration/V5__create_admin_users_and_seed.sql`:

```sql
CREATE TABLE admin_users (
  id              TEXT PRIMARY KEY,
  email           VARCHAR(200) NOT NULL UNIQUE,
  password_hash   VARCHAR(72)  NOT NULL,
  name            VARCHAR(120) NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER admin_users_touch_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO admin_users (id, email, password_hash, name)
VALUES (
  '${admin.bootstrap.id}',
  LOWER(TRIM('${admin.bootstrap.email}')),
  '${admin.bootstrap.passwordHash}',
  '${admin.bootstrap.name}'
)
ON CONFLICT (email) DO NOTHING;
```

Notas:
- `touch_updated_at()` já existe (criada em V1).
- Placeholders `${...}` são expandidos pelo Flyway lendo de `spring.flyway.placeholders.*`.

- [ ] **Step 7: Criar entidade `AdminUser`**

Crie `backend/src/main/java/com/bragas/api/auth/admin/domain/AdminUser.java`:

```java
package com.bragas.api.auth.admin.domain;

import com.github.f4b6a3.ulid.UlidCreator;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "admin_users")
public class AdminUser {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, length = 200, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 72)
    private String passwordHash;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    protected AdminUser() {}

    public static AdminUser create(String email, String passwordHash, String name, OffsetDateTime now) {
        AdminUser a = new AdminUser();
        a.id = "adm_" + UlidCreator.getUlid();
        a.email = email;
        a.passwordHash = passwordHash;
        a.name = name;
        a.createdAt = now;
        return a;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}
```

- [ ] **Step 8: Criar `AdminUserRepository`**

Crie `backend/src/main/java/com/bragas/api/auth/admin/AdminUserRepository.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminUserRepository extends JpaRepository<AdminUser, String> {
    Optional<AdminUser> findByEmail(String email);
}
```

- [ ] **Step 9: Rodar o teste — deve passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.FlywayV5IT'
```

Esperado: PASS nos 3 testes.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/resources/db/migration/V5__create_admin_users_and_seed.sql \
        backend/src/main/java/com/bragas/api/auth/admin/domain/AdminUser.java \
        backend/src/main/java/com/bragas/api/auth/admin/AdminUserRepository.java \
        backend/src/test/java/com/bragas/api/auth/admin/FlywayV5IT.java \
        backend/src/test/resources/application-test.yml \
        backend/src/main/resources/application.yml \
        backend/.env.example
git commit -m "$(cat <<'EOF'
feat(sp5b): cria tabela admin_users (V5) + entity + repository

Migration V5 com seed do primeiro admin via placeholders Flyway lidos de
env vars (ADMIN_BOOTSTRAP_*). Tabela espelha a estrutura de users (SP4b)
sem campo phone. ON CONFLICT DO NOTHING para idempotência.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: JwtService — sobrecarga `issue(sub, ttlSeconds)`

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/auth/JwtService.java`
- Modify: `backend/src/test/java/com/bragas/api/auth/JwtServiceTest.java`

- [ ] **Step 1: Adicionar teste para a nova sobrecarga**

Abra `backend/src/test/java/com/bragas/api/auth/JwtServiceTest.java`. Adicione (sem remover testes existentes):

```java
    @Test
    void issue_with_custom_ttl_token_expires_after_that_ttl() {
        var fixed = java.time.Clock.fixed(java.time.Instant.parse("2026-01-01T00:00:00Z"), java.time.ZoneOffset.UTC);
        var svc = new JwtService("test-secret-with-at-least-32-bytes-of-padding-yay-yay-yay", 604800, fixed);

        String jwt = svc.issue("adm_xyz", 60);  // 1 minuto

        // Avançar 30s — ainda válido
        var clock30s = java.time.Clock.fixed(java.time.Instant.parse("2026-01-01T00:00:30Z"), java.time.ZoneOffset.UTC);
        var svc30s = new JwtService("test-secret-with-at-least-32-bytes-of-padding-yay-yay-yay", 604800, clock30s);
        org.assertj.core.api.Assertions.assertThat(svc30s.verifyAndExtractUserId(jwt)).contains("adm_xyz");

        // Avançar 61s — expirado
        var clock61s = java.time.Clock.fixed(java.time.Instant.parse("2026-01-01T00:01:01Z"), java.time.ZoneOffset.UTC);
        var svc61s = new JwtService("test-secret-with-at-least-32-bytes-of-padding-yay-yay-yay", 604800, clock61s);
        org.assertj.core.api.Assertions.assertThat(svc61s.verifyAndExtractUserId(jwt)).isEmpty();
    }
```

- [ ] **Step 2: Rodar o teste — deve falhar**

```bash
./gradlew test --tests 'com.bragas.api.auth.JwtServiceTest.issue_with_custom_ttl_token_expires_after_that_ttl'
```

Esperado: erro de compilação — método `issue(String, long)` não existe.

- [ ] **Step 3: Adicionar a sobrecarga em `JwtService`**

Edite `backend/src/main/java/com/bragas/api/auth/JwtService.java`. Substitua o método `issue` existente por:

```java
    public String issue(String subject) {
        return issue(subject, this.ttlSeconds);
    }

    public String issue(String subject, long ttlSeconds) {
        Instant now = clock.instant();
        return Jwts.builder()
            .issuer(ISSUER)
            .subject(subject)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(ttlSeconds)))
            .signWith(key)
            .compact();
    }
```

- [ ] **Step 4: Rodar todos os testes do `JwtServiceTest` — devem passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.JwtServiceTest'
```

Esperado: PASS (incluindo o novo + os antigos).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/JwtService.java \
        backend/src/test/java/com/bragas/api/auth/JwtServiceTest.java
git commit -m "$(cat <<'EOF'
feat(sp5b): JwtService.issue ganha sobrecarga com TTL custom

Mantém issue(subject) que delega para issue(subject, defaultTtl).
Necessário para emitir JWT admin com TTL próprio (8h) sem afetar
emissão de JWT cliente (7d).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: CookieFactory — métodos admin + AppProperties.Auth.adminCookieTtlSeconds

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/common/AppProperties.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/test/resources/application-test.yml`
- Modify: `backend/src/main/java/com/bragas/api/auth/CookieFactory.java`
- Create: `backend/src/test/java/com/bragas/api/auth/admin/CookieFactoryAdminTest.java`

- [ ] **Step 1: Adicionar `adminCookieTtlSeconds` em `AppProperties.Auth`**

Edite `backend/src/main/java/com/bragas/api/common/AppProperties.java`. Substitua a record `Auth` por:

```java
    public record Auth(String jwtSecret, boolean cookieSecure, String cookieSameSite,
                       long jwtTtlSeconds, long adminCookieTtlSeconds, boolean rateLimitEnabled) {}
```

**Não** mexa em `Admin`, `Cors`, `Mail` ainda — só na `Auth`.

- [ ] **Step 2: Adicionar `adminCookieTtlSeconds` no `application.yml`**

Edite `backend/src/main/resources/application.yml`. No bloco `app.auth:`, acrescente `adminCookieTtlSeconds: 28800` (8 horas):

```yaml
  auth:
    jwtSecret: ${JWT_SECRET}
    cookieSecure: ${COOKIE_SECURE:false}
    cookieSameSite: ${COOKIE_SAME_SITE:Lax}
    jwtTtlSeconds: 604800
    adminCookieTtlSeconds: 28800
    rateLimitEnabled: ${RATE_LIMIT_ENABLED:true}
```

- [ ] **Step 3: Adicionar `adminCookieTtlSeconds` no `application-test.yml`**

Edite `backend/src/test/resources/application-test.yml`. No bloco `app.auth:`, acrescente:

```yaml
  auth:
    jwtSecret: test-secret-with-at-least-32-bytes-of-padding-yay-yay-yay
    cookieSecure: false
    cookieSameSite: Lax
    jwtTtlSeconds: 3600
    adminCookieTtlSeconds: 1800
    rateLimitEnabled: false
```

(TTL admin de 1800s nos testes — tempo curto não atrapalha porque ITs encerram em segundos.)

- [ ] **Step 4: Escrever teste para `adminSession` e `adminExpire`**

Crie `backend/src/test/java/com/bragas/api/auth/admin/CookieFactoryAdminTest.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.CookieFactory;
import com.bragas.api.common.AppProperties;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CookieFactoryAdminTest {

    private AppProperties props(boolean secure, String sameSite, long adminTtl) {
        return new AppProperties(
            new AppProperties.Admin(null),                    // não usado nestes tests
            new AppProperties.Cors(List.of()),
            new AppProperties.Auth("secret-32-bytes-long-padding-padding!!", secure, sameSite, 604800, adminTtl, false),
            new AppProperties.Mail("from@test", "http://reset")
        );
    }

    @Test
    void admin_session_cookie_has_expected_attributes() {
        var factory = new CookieFactory(props(true, "None", 28800));
        var cookie = factory.adminSession("jwt-value");

        assertThat(cookie.getName()).isEqualTo("bb_admin");
        assertThat(cookie.getValue()).isEqualTo("jwt-value");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("None");
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(cookie.getMaxAge().getSeconds()).isEqualTo(28800);
    }

    @Test
    void admin_expire_cookie_has_max_age_zero() {
        var factory = new CookieFactory(props(false, "Lax", 28800));
        var cookie = factory.adminExpire();

        assertThat(cookie.getName()).isEqualTo("bb_admin");
        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getMaxAge().getSeconds()).isEqualTo(0);
        assertThat(cookie.getPath()).isEqualTo("/");
    }
}
```

- [ ] **Step 5: Rodar o teste — deve falhar**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.CookieFactoryAdminTest'
```

Esperado: erro de compilação — métodos `adminSession`/`adminExpire` não existem.

- [ ] **Step 6: Implementar os métodos em `CookieFactory`**

Edite `backend/src/main/java/com/bragas/api/auth/CookieFactory.java`. Substitua o conteúdo da classe por:

```java
package com.bragas.api.auth;

import com.bragas.api.common.AppProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieFactory {

    public static final String SESSION_COOKIE = "bb_session";
    public static final String ADMIN_COOKIE   = "bb_admin";

    private final boolean secure;
    private final String sameSite;
    private final long ttlSeconds;
    private final long adminTtlSeconds;

    public CookieFactory(AppProperties props) {
        this.secure = props.auth().cookieSecure();
        String configured = props.auth().cookieSameSite();
        this.sameSite = configured == null || configured.isBlank() ? "Lax" : configured;
        this.ttlSeconds = props.auth().jwtTtlSeconds();
        this.adminTtlSeconds = props.auth().adminCookieTtlSeconds();
    }

    public ResponseCookie session(String jwt) {
        return build(SESSION_COOKIE, jwt, ttlSeconds);
    }

    public ResponseCookie expire() {
        return build(SESSION_COOKIE, "", 0);
    }

    public ResponseCookie adminSession(String jwt) {
        return build(ADMIN_COOKIE, jwt, adminTtlSeconds);
    }

    public ResponseCookie adminExpire() {
        return build(ADMIN_COOKIE, "", 0);
    }

    private ResponseCookie build(String name, String value, long maxAge) {
        return ResponseCookie.from(name, value)
            .httpOnly(true)
            .secure(secure)
            .sameSite(sameSite)
            .path("/")
            .maxAge(maxAge)
            .build();
    }
}
```

- [ ] **Step 7: Rodar os testes — devem passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.CookieFactoryAdminTest'
./gradlew test                              # garante que nada quebrou no SP4b
```

Esperado: PASS em tudo (build de SP4b/SP5a continua verde).

> Se algum teste do SP4b quebrar por conta da mudança de assinatura de `AppProperties.Auth`, é porque ele constrói `AppProperties` manualmente. Procure e atualize: `grep -rn "new AppProperties.Auth" backend/src/test`. Devem ser instanciações em testes unitários — adicione o `adminCookieTtlSeconds` no construtor.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/bragas/api/common/AppProperties.java \
        backend/src/main/java/com/bragas/api/auth/CookieFactory.java \
        backend/src/main/resources/application.yml \
        backend/src/test/resources/application-test.yml \
        backend/src/test/java/com/bragas/api/auth/admin/CookieFactoryAdminTest.java
# se houve testes do SP4b ajustados, adicione-os também
git commit -m "$(cat <<'EOF'
feat(sp5b): CookieFactory ganha adminSession/adminExpire

Cookie bb_admin com TTL 8h (configurável via
app.auth.adminCookieTtlSeconds). Reusa secure/sameSite do bloco auth.*.
DRY via helper build() interno.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: AdminAuthService (lógica de login)

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/admin/AdminAuthService.java`
- Create: `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthServiceTest.java`

- [ ] **Step 1: Escrever testes unitários de `AdminAuthService`**

Crie `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthServiceTest.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.InvalidCredentialsException;
import com.bragas.api.auth.admin.domain.AdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminAuthServiceTest {

    private final AdminUserRepository repo = mock(AdminUserRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);  // strength baixa em test = rápido
    private final AdminAuthService svc = new AdminAuthService(repo, encoder);

    @Test
    void login_happy_path_returns_admin() {
        String hash = encoder.encode("admin-pwd");
        AdminUser a = AdminUser.create("admin@bragas.local", hash, "Admin", OffsetDateTime.now());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.of(a));

        AdminUser result = svc.login("admin@bragas.local", "admin-pwd");

        assertThat(result.getEmail()).isEqualTo("admin@bragas.local");
    }

    @Test
    void login_normalizes_email_lowercase_and_trim() {
        String hash = encoder.encode("admin-pwd");
        AdminUser a = AdminUser.create("admin@bragas.local", hash, "Admin", OffsetDateTime.now());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.of(a));

        AdminUser result = svc.login("  ADMIN@Bragas.Local  ", "admin-pwd");

        assertThat(result.getEmail()).isEqualTo("admin@bragas.local");
    }

    @Test
    void login_with_unknown_email_throws_invalid_credentials() {
        when(repo.findByEmail("nope@bragas.local")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> svc.login("nope@bragas.local", "admin-pwd"))
            .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_with_wrong_password_throws_invalid_credentials() {
        String hash = encoder.encode("admin-pwd");
        AdminUser a = AdminUser.create("admin@bragas.local", hash, "Admin", OffsetDateTime.now());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.of(a));

        assertThatThrownBy(() -> svc.login("admin@bragas.local", "errada"))
            .isInstanceOf(InvalidCredentialsException.class);
    }
}
```

- [ ] **Step 2: Rodar — deve falhar (classe não existe)**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.AdminAuthServiceTest'
```

Esperado: erro de compilação.

- [ ] **Step 3: Implementar `AdminAuthService`**

Crie `backend/src/main/java/com/bragas/api/auth/admin/AdminAuthService.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.InvalidCredentialsException;
import com.bragas.api.auth.admin.domain.AdminUser;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminAuthService {

    private final AdminUserRepository admins;
    private final PasswordEncoder encoder;

    public AdminAuthService(AdminUserRepository admins, PasswordEncoder encoder) {
        this.admins = admins;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public AdminUser login(String email, String password) {
        String normalized = email.toLowerCase().trim();
        AdminUser a = admins.findByEmail(normalized).orElseThrow(InvalidCredentialsException::new);
        if (!encoder.matches(password, a.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return a;
    }
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.AdminAuthServiceTest'
```

Esperado: PASS nos 4 testes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/admin/AdminAuthService.java \
        backend/src/test/java/com/bragas/api/auth/admin/AdminAuthServiceTest.java
git commit -m "$(cat <<'EOF'
feat(sp5b): AdminAuthService com login (bcrypt + busca normalizada)

Reusa InvalidCredentialsException do SP4b — mensagem genérica anti
enumeração. Normaliza email (lowercase + trim) antes de buscar.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: JwtAdminCookieAuthFilter + CurrentAdmin helper

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/admin/JwtAdminCookieAuthFilter.java`
- Create: `backend/src/main/java/com/bragas/api/auth/admin/CurrentAdmin.java`
- Create: `backend/src/test/java/com/bragas/api/auth/admin/JwtAdminCookieAuthFilterTest.java`
- Create: `backend/src/test/java/com/bragas/api/auth/admin/CurrentAdminTest.java`

- [ ] **Step 1: Escrever testes do filter**

Crie `backend/src/test/java/com/bragas/api/auth/admin/JwtAdminCookieAuthFilterTest.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.admin.domain.AdminUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JwtAdminCookieAuthFilterTest {

    private static final String SECRET = "test-secret-with-at-least-32-bytes-of-padding-yay-yay-yay";

    private final JwtService jwt = new JwtService(SECRET, 28800, Clock.systemUTC());
    private final AdminUserRepository repo = mock(AdminUserRepository.class);
    private final JwtAdminCookieAuthFilter filter = new JwtAdminCookieAuthFilter(jwt, repo);

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    @Test
    void valid_admin_cookie_populates_role_admin() throws Exception {
        AdminUser a = AdminUser.create("a@x", "hash", "A", OffsetDateTime.now());
        when(repo.findById(a.getId())).thenReturn(Optional.of(a));
        String token = jwt.issue(a.getId(), 28800);
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        req.setCookies(new Cookie("bb_admin", token));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(AdminUser.class);
        assertThat(auth.getAuthorities()).anyMatch(g -> g.getAuthority().equals("ROLE_ADMIN"));
        verify(chain).doFilter(any(), any());
    }

    @Test
    void cookie_with_usr_prefix_in_sub_does_not_authenticate_as_admin() throws Exception {
        String token = jwt.issue("usr_some_user_id", 28800);
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        req.setCookies(new Cookie("bb_admin", token));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void missing_cookie_passes_chain_as_anonymous() throws Exception {
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void invalid_jwt_passes_chain_as_anonymous() throws Exception {
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        req.setCookies(new Cookie("bb_admin", "not-a-jwt"));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void deleted_admin_passes_chain_as_anonymous() throws Exception {
        when(repo.findById("adm_orphan")).thenReturn(Optional.empty());
        String token = jwt.issue("adm_orphan", 28800);
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        req.setCookies(new Cookie("bb_admin", token));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }
}
```

- [ ] **Step 2: Escrever teste de `CurrentAdmin`**

Crie `backend/src/test/java/com/bragas/api/auth/admin/CurrentAdminTest.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CurrentAdminTest {

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    @Test
    void id_returns_admin_id_when_principal_is_admin() {
        AdminUser a = AdminUser.create("a@x", "hash", "A", OffsetDateTime.now());
        var auth = new UsernamePasswordAuthenticationToken(a, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThat(CurrentAdmin.id()).isEqualTo(a.getId());
    }

    @Test
    void id_returns_unknown_when_no_authentication() {
        assertThat(CurrentAdmin.id()).isEqualTo("unknown");
    }

    @Test
    void id_returns_unknown_when_principal_is_not_admin() {
        var auth = new UsernamePasswordAuthenticationToken("some-string", null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThat(CurrentAdmin.id()).isEqualTo("unknown");
    }
}
```

- [ ] **Step 3: Rodar — devem falhar (classes não existem)**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.JwtAdminCookieAuthFilterTest' \
                  --tests 'com.bragas.api.auth.admin.CurrentAdminTest'
```

Esperado: erros de compilação.

- [ ] **Step 4: Implementar `CurrentAdmin`**

Crie `backend/src/main/java/com/bragas/api/auth/admin/CurrentAdmin.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentAdmin {

    private CurrentAdmin() {}

    public static String id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "unknown";
        Object principal = auth.getPrincipal();
        if (principal instanceof AdminUser a) return a.getId();
        return "unknown";
    }
}
```

- [ ] **Step 5: Implementar `JwtAdminCookieAuthFilter`**

Crie `backend/src/main/java/com/bragas/api/auth/admin/JwtAdminCookieAuthFilter.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.admin.domain.AdminUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JwtAdminCookieAuthFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "bb_admin";
    private static final String SUB_PREFIX = "adm_";

    private final JwtService jwtService;
    private final AdminUserRepository repository;

    public JwtAdminCookieAuthFilter(JwtService jwtService, AdminUserRepository repository) {
        this.jwtService = jwtService;
        this.repository = repository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null) {
            jwtService.verifyAndExtractUserId(token)
                .filter(sub -> sub.startsWith(SUB_PREFIX))
                .flatMap(repository::findById)
                .ifPresent(admin -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                        admin, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
        }
        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (COOKIE_NAME.equals(c.getName())) return c.getValue();
        }
        return null;
    }
}
```

- [ ] **Step 6: Rodar — devem passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.JwtAdminCookieAuthFilterTest' \
                  --tests 'com.bragas.api.auth.admin.CurrentAdminTest'
```

Esperado: PASS nos 8 testes.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/admin/JwtAdminCookieAuthFilter.java \
        backend/src/main/java/com/bragas/api/auth/admin/CurrentAdmin.java \
        backend/src/test/java/com/bragas/api/auth/admin/JwtAdminCookieAuthFilterTest.java \
        backend/src/test/java/com/bragas/api/auth/admin/CurrentAdminTest.java
git commit -m "$(cat <<'EOF'
feat(sp5b): JwtAdminCookieAuthFilter + CurrentAdmin helper

Filter lê cookie bb_admin, rejeita sub sem prefixo adm_ (defesa contra
JWT cliente colado no cookie admin) e popula ROLE_ADMIN. Helper estático
extrai admin.id do SecurityContext para audit log; devolve "unknown"
defensivamente quando contexto vazio.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: DTOs + AdminAuthController + AdminAuthControllerIT

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/admin/dto/AdminLoginRequest.java`
- Create: `backend/src/main/java/com/bragas/api/auth/admin/dto/AdminMeResponse.java`
- Create: `backend/src/main/java/com/bragas/api/auth/admin/AdminAuthController.java`
- Create: `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthTestHelper.java`
- Create: `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java`

> O IT abaixo depende do wire-up no `SecurityConfig` (Task 7). Para esta task, escrevemos a controller + DTOs e o IT, mas o IT só ficará verde no Task 7. **Roda parcialmente verde aqui — é esperado.**

- [ ] **Step 1: Criar `AdminLoginRequest` DTO**

Crie `backend/src/main/java/com/bragas/api/auth/admin/dto/AdminLoginRequest.java`:

```java
package com.bragas.api.auth.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminLoginRequest(
    @Email @NotBlank @Size(max = 200) String email,
    @NotBlank @Size(min = 8, max = 100) String password
) {}
```

- [ ] **Step 2: Criar `AdminMeResponse` DTO**

Crie `backend/src/main/java/com/bragas/api/auth/admin/dto/AdminMeResponse.java`:

```java
package com.bragas.api.auth.admin.dto;

import com.bragas.api.auth.admin.domain.AdminUser;

import java.time.OffsetDateTime;

public record AdminMeResponse(
    String id,
    String email,
    String name,
    OffsetDateTime createdAt
) {
    public static AdminMeResponse from(AdminUser a) {
        return new AdminMeResponse(a.getId(), a.getEmail(), a.getName(), a.getCreatedAt());
    }
}
```

- [ ] **Step 3: Criar `AdminAuthController`**

Crie `backend/src/main/java/com/bragas/api/auth/admin/AdminAuthController.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.CookieFactory;
import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.UnauthenticatedException;
import com.bragas.api.auth.admin.domain.AdminUser;
import com.bragas.api.auth.admin.dto.AdminLoginRequest;
import com.bragas.api.auth.admin.dto.AdminMeResponse;
import com.bragas.api.common.AppProperties;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/admin")
public class AdminAuthController {

    private final AdminAuthService authService;
    private final JwtService jwtService;
    private final CookieFactory cookies;
    private final long adminTtlSeconds;

    public AdminAuthController(AdminAuthService authService, JwtService jwtService,
                               CookieFactory cookies, AppProperties props) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.cookies = cookies;
        this.adminTtlSeconds = props.auth().adminCookieTtlSeconds();
    }

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

- [ ] **Step 4: Criar `AdminAuthTestHelper`**

Crie `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthTestHelper.java`:

```java
package com.bragas.api.auth.admin;

import jakarta.servlet.http.Cookie;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

public final class AdminAuthTestHelper {

    public static final String TEST_EMAIL = "admin@test.local";
    public static final String TEST_PASSWORD = "admin-test-pwd";

    private AdminAuthTestHelper() {}

    public static Cookie loginAndGetCookie(MockMvc mvc) throws Exception {
        String body = "{\"email\":\"" + TEST_EMAIL + "\",\"password\":\"" + TEST_PASSWORD + "\"}";
        MvcResult r = mvc.perform(post("/api/v1/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andReturn();
        String setCookie = r.getResponse().getHeader("Set-Cookie");
        if (setCookie == null) {
            throw new IllegalStateException("Login admin não retornou Set-Cookie. Status: "
                + r.getResponse().getStatus() + " Body: " + r.getResponse().getContentAsString());
        }
        String value = setCookie.split(";")[0].split("=", 2)[1];
        return new Cookie("bb_admin", value);
    }
}
```

- [ ] **Step 5: Escrever `AdminAuthControllerIT`**

Crie `backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java`:

```java
package com.bragas.api.auth.admin;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class AdminAuthControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;

    @Test
    void login_with_seed_credentials_returns_204_and_admin_cookie() throws Exception {
        mvc.perform(post("/api/v1/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@test.local\",\"password\":\"admin-test-pwd\"}"))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", containsString("bb_admin=")))
            .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
            .andExpect(header().string("Set-Cookie", containsString("Max-Age=1800")));
    }

    @Test
    void login_with_wrong_password_returns_401_generic() throws Exception {
        mvc.perform(post("/api/v1/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@test.local\",\"password\":\"errada-123\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void login_with_unknown_email_returns_same_401() throws Exception {
        mvc.perform(post("/api/v1/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nao-existe@test.local\",\"password\":\"admin-test-pwd\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void logout_returns_204_and_clears_cookie() throws Exception {
        mvc.perform(post("/api/v1/auth/admin/logout"))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", containsString("bb_admin=")))
            .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    @Test
    void get_admin_me_without_cookie_returns_401() throws Exception {
        mvc.perform(get("/api/v1/auth/admin/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/unauthenticated"));
    }

    @Test
    void get_admin_me_with_admin_cookie_returns_200() throws Exception {
        Cookie cookie = AdminAuthTestHelper.loginAndGetCookie(mvc);

        mvc.perform(get("/api/v1/auth/admin/me").cookie(cookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("admin@test.local"))
            .andExpect(jsonPath("$.name").value("Admin Test"))
            .andExpect(jsonPath("$.id").value("adm_test_0000000000000000"));
    }
}
```

- [ ] **Step 6: Rodar — IT vai falhar nesta task; controller compila**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.AdminAuthControllerIT'
```

Esperado: vários testes falham porque o `SecurityConfig` ainda não permite/protege as rotas corretamente (próxima task). Por ora, garanta apenas que **compila**.

```bash
./gradlew compileJava compileTestJava
```

Esperado: BUILD SUCCESSFUL (compila).

- [ ] **Step 7: Commit (build verde, IT vermelho — segue na próxima task)**

```bash
git add backend/src/main/java/com/bragas/api/auth/admin/dto/ \
        backend/src/main/java/com/bragas/api/auth/admin/AdminAuthController.java \
        backend/src/test/java/com/bragas/api/auth/admin/AdminAuthTestHelper.java \
        backend/src/test/java/com/bragas/api/auth/admin/AdminAuthControllerIT.java
git commit -m "$(cat <<'EOF'
feat(sp5b): AdminAuthController + DTOs + ITs do controller

Endpoints /auth/admin/login, /logout, /me. ITs pré-existentes para a
próxima task (wire-up no SecurityConfig). DTOs validados via
@Email/@Size, espelhando padrão do SP4b. AdminAuthTestHelper para login
admin reutilizável em ITs.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: SecurityConfig — wire-up final, remoção do AdminTokenFilter, adaptação dos ITs existentes

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/common/SecurityConfig.java`
- Modify: `backend/src/main/java/com/bragas/api/common/AppProperties.java`
- Modify: `backend/src/main/java/com/bragas/api/auth/JwtCookieAuthFilter.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/test/resources/application-test.yml`
- Delete: `backend/src/main/java/com/bragas/api/common/AdminTokenFilter.java`
- Modify: `backend/src/test/java/com/bragas/api/catalog/admin/AdminCategoryControllerIT.java`
- Modify: `backend/src/test/java/com/bragas/api/catalog/admin/AdminProductControllerIT.java`
- Modify: `backend/src/test/java/com/bragas/api/catalog/admin/AdminCouponControllerIT.java`
- Modify: `backend/src/test/java/com/bragas/api/order/OrderAdminControllerIT.java`

- [ ] **Step 1: Adicionar check de prefixo `usr_` em `JwtCookieAuthFilter`**

Edite `backend/src/main/java/com/bragas/api/auth/JwtCookieAuthFilter.java`. Substitua o método `doFilterInternal`:

```java
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null) {
            jwtService.verifyAndExtractUserId(token)
                .filter(sub -> sub.startsWith("usr_"))
                .flatMap(userRepository::findById)
                .ifPresent(user -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                        user, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
        }
        chain.doFilter(request, response);
    }
```

(Único acréscimo: linha `.filter(sub -> sub.startsWith("usr_"))`.)

- [ ] **Step 2: Reescrever `SecurityConfig` (sem AdminTokenFilter, com JwtAdminCookieAuthFilter, com regras novas)**

Edite `backend/src/main/java/com/bragas/api/common/SecurityConfig.java`. Substitua o conteúdo inteiro por:

```java
package com.bragas.api.common;

import com.bragas.api.auth.JwtCookieAuthFilter;
import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.ProblemDetailsAuthEntryPoint;
import com.bragas.api.auth.RateLimitFilter;
import com.bragas.api.auth.UserRepository;
import com.bragas.api.auth.admin.AdminUserRepository;
import com.bragas.api.auth.admin.JwtAdminCookieAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final List<String> corsOrigins;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AdminUserRepository adminUserRepository;
    private final boolean rateLimitEnabled;

    public SecurityConfig(AppProperties props, JwtService jwtService,
                          UserRepository userRepository, AdminUserRepository adminUserRepository) {
        this.corsOrigins = props.cors() == null ? null : props.cors().allowedOrigins();
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.adminUserRepository = adminUserRepository;
        this.rateLimitEnabled = props.auth().rateLimitEnabled();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                // Regras mais específicas primeiro
                .requestMatchers("/api/v1/auth/admin/me").hasRole("ADMIN")
                .requestMatchers("/api/v1/auth/admin/login", "/api/v1/auth/admin/logout").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/orders/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/orders").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/menu").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/coupons/validate").permitAll()
                .requestMatchers("/api/v1/me/**").authenticated()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().permitAll()
            )
            .exceptionHandling(e -> e.authenticationEntryPoint(new ProblemDetailsAuthEntryPoint()))
            .addFilterBefore(new RateLimitFilter(rateLimitEnabled), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new JwtCookieAuthFilter(jwtService, userRepository), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new JwtAdminCookieAuthFilter(jwtService, adminUserRepository), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private CorsConfigurationSource corsSource() {
        var cfg = new CorsConfiguration();
        if (corsOrigins != null && !corsOrigins.isEmpty()) {
            cfg.setAllowedOrigins(corsOrigins);
        }
        cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        var src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/api/**", cfg);
        return src;
    }
}
```

(Mudanças vs. versão anterior: removido `adminToken` field e injeção de `AppProperties.Admin`; removido `AdminTokenFilter` da chain; adicionado `AdminUserRepository`+`JwtAdminCookieAuthFilter`; regras `/auth/admin/*` adicionadas no topo; `/api/v1/admin/**` agora exige `hasRole("ADMIN")`.)

- [ ] **Step 3: Remover record `Admin` de `AppProperties`**

Edite `backend/src/main/java/com/bragas/api/common/AppProperties.java`:

```java
package com.bragas.api.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Cors cors, Auth auth, Mail mail) {
    public record Cors(List<String> allowedOrigins) {}
    public record Auth(String jwtSecret, boolean cookieSecure, String cookieSameSite,
                       long jwtTtlSeconds, long adminCookieTtlSeconds, boolean rateLimitEnabled) {}
    public record Mail(String from, String resetBaseUrl) {}
}
```

(Removido: o record `Admin` e a posição correspondente no construtor.)

- [ ] **Step 4: Buscar usos de `AppProperties.Admin` e adaptar**

Procure no projeto inteiro qualquer uso restante:

```bash
grep -rn "AppProperties.Admin\|props.admin\|admin().token" backend/src
```

Se aparecer fora dos arquivos que vamos modificar:
- Em `CookieFactoryAdminTest` (Task 3): construtor de AppProperties usa `new AppProperties.Admin(null)` — **remova esse argumento** do construtor (a record `AppProperties` agora tem 3 components, não 4).
- Em qualquer outro lugar: corrija para não referenciar `Admin`.

Faça as edições necessárias.

- [ ] **Step 5: Atualizar `application.yml` (remover bloco `app.admin`)**

Edite `backend/src/main/resources/application.yml`. **Remova** as linhas:

```yaml
  admin:
    token: ${ADMIN_TOKEN}
```

Sob `app:`. (Mantenha `store`, `cors`, `auth`, `mail` intactos.)

- [ ] **Step 6: Atualizar `application-test.yml` (remover bloco `app.admin.token`)**

Edite `backend/src/test/resources/application-test.yml`. **Remova** as linhas:

```yaml
  admin:
    token: test-admin-token
```

- [ ] **Step 7: Deletar `AdminTokenFilter`**

```bash
git rm backend/src/main/java/com/bragas/api/common/AdminTokenFilter.java
```

- [ ] **Step 8: Adaptar `AdminCategoryControllerIT`, `AdminProductControllerIT`, `AdminCouponControllerIT`, `OrderAdminControllerIT`**

Cada um desses ITs hoje usa `.header("X-Admin-Token", "test-admin-token")` em todas as chamadas. Substitua por cookie via helper.

Para cada um dos 4 arquivos:

1. Adicione imports:
```java
import com.bragas.api.auth.admin.AdminAuthTestHelper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
```

2. Adicione campo + setup que pega o cookie uma vez por teste:
```java
    private Cookie adminCookie;

    @BeforeEach
    void loginAdmin() throws Exception {
        adminCookie = AdminAuthTestHelper.loginAndGetCookie(mvc);
    }
```

3. Em cada chamada `mvc.perform(...)`, substitua `.header("X-Admin-Token", "test-admin-token")` por `.cookie(adminCookie)`.

**Exemplo concreto — `AdminProductControllerIT.create_happy_path_returns_201`:**

Antes:
```java
mvc.perform(post("/api/v1/admin/products")
        .header("X-Admin-Token", "test-admin-token")
        .contentType(APPLICATION_JSON)
        .content("{\"id\":\"smoke-prod\",...}"))
    .andExpect(status().isCreated())
```

Depois:
```java
mvc.perform(post("/api/v1/admin/products")
        .cookie(adminCookie)
        .contentType(APPLICATION_JSON)
        .content("{\"id\":\"smoke-prod\",...}"))
    .andExpect(status().isCreated())
```

Faça isso em **todos os 4 arquivos**, em **todas as chamadas** `mvc.perform(...)` que usavam o header.

> Se você não tem certeza de algum, faça uma busca: `grep -rn "X-Admin-Token" backend/src/test`. Após esta task, **nada** deve aparecer.

- [ ] **Step 9: Compilar e rodar todos os ITs admin**

```bash
./gradlew compileJava compileTestJava
./gradlew test --tests 'com.bragas.api.auth.admin.AdminAuthControllerIT' \
                  --tests 'com.bragas.api.catalog.admin.*' \
                  --tests 'com.bragas.api.order.OrderAdminControllerIT' \
                  --tests 'com.bragas.api.auth.admin.FlywayV5IT'
```

Esperado: PASS em todos.

- [ ] **Step 10: Rodar a suite inteira para garantir regressão zero**

```bash
./gradlew test
```

Esperado: PASS em todos (~130 testes).

> Se algo do SP4b quebrar por causa do prefixo `usr_`, é bug — todos os JWTs do SP4b já tem `sub=usr_...` (ULID prefixado no `User.create`). Investigue antes de seguir.

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/java/com/bragas/api/common/SecurityConfig.java \
        backend/src/main/java/com/bragas/api/common/AppProperties.java \
        backend/src/main/java/com/bragas/api/auth/JwtCookieAuthFilter.java \
        backend/src/main/resources/application.yml \
        backend/src/test/resources/application-test.yml \
        backend/src/test/java/com/bragas/api/catalog/admin/ \
        backend/src/test/java/com/bragas/api/order/OrderAdminControllerIT.java \
        backend/src/test/java/com/bragas/api/auth/admin/CookieFactoryAdminTest.java
# AdminTokenFilter já foi rm com git rm
git commit -m "$(cat <<'EOF'
feat(sp5b): SecurityConfig usa cookie admin, remove AdminTokenFilter

Substitui X-Admin-Token por JwtAdminCookieAuthFilter na chain. Rotas
/api/v1/admin/** agora exigem ROLE_ADMIN via cookie bb_admin.
JwtCookieAuthFilter (SP4b) ganha check defensivo de prefixo usr_ no
sub do JWT. AppProperties.Admin removido. ITs admin existentes
adaptados para login + cookie via AdminAuthTestHelper.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Audit log com `actor=<admin_id>` + AdminCatalogAuthIT

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/catalog/admin/AdminCategoryController.java`
- Modify: `backend/src/main/java/com/bragas/api/catalog/admin/AdminProductController.java`
- Modify: `backend/src/main/java/com/bragas/api/catalog/admin/AdminCouponController.java`
- Create: `backend/src/test/java/com/bragas/api/auth/admin/AdminCatalogAuthIT.java`

- [ ] **Step 1: Escrever `AdminCatalogAuthIT` (com captura de log)**

Crie `backend/src/test/java/com/bragas/api/auth/admin/AdminCatalogAuthIT.java`:

```java
package com.bragas.api.auth.admin;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
@ExtendWith(OutputCaptureExtension.class)
class AdminCatalogAuthIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;

    @Test
    void admin_endpoint_without_cookie_returns_401() throws Exception {
        mvc.perform(post("/api/v1/admin/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"x\",\"categoryId\":\"burgers\",\"name\":\"X\",\"price\":10.00}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void admin_endpoint_with_admin_cookie_returns_201_and_logs_actor(CapturedOutput out) throws Exception {
        Cookie cookie = AdminAuthTestHelper.loginAndGetCookie(mvc);

        mvc.perform(post("/api/v1/admin/products")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"audit-prod\",\"categoryId\":\"burgers\",\"name\":\"Audit\",\"price\":10.00}"))
            .andExpect(status().isCreated());

        assertThat(out.getOut()).contains("admin.action action=POST resource=product id=audit-prod actor=adm_test_0000000000000000");
    }
}
```

- [ ] **Step 2: Rodar — deve falhar (logs ainda não têm actor)**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.AdminCatalogAuthIT'
```

Esperado: o segundo teste falha porque o log atual não tem `actor=...`.

- [ ] **Step 3: Atualizar `AdminProductController` (logs com actor)**

Edite `backend/src/main/java/com/bragas/api/catalog/admin/AdminProductController.java`. Adicione import:

```java
import com.bragas.api.auth.admin.CurrentAdmin;
```

Em cada chamada `log.info("admin.action ...", ...)`, adicione `actor={}` no fim do format e `CurrentAdmin.id()` no varargs:

```java
log.info("admin.action action=POST resource=product id={} actor={}", p.getId(), CurrentAdmin.id());
// ...
log.info("admin.action action=PATCH resource=product id={} actor={}", p.getId(), CurrentAdmin.id());
// ...
log.info("admin.action action=DELETE resource=product id={} actor={}", id, CurrentAdmin.id());
```

- [ ] **Step 4: Atualizar `AdminCategoryController` (logs com actor)**

Mesmo padrão em `backend/src/main/java/com/bragas/api/catalog/admin/AdminCategoryController.java`:

```java
log.info("admin.action action=POST resource=category id={} actor={}", c.getId(), CurrentAdmin.id());
log.info("admin.action action=PATCH resource=category id={} actor={}", c.getId(), CurrentAdmin.id());
log.info("admin.action action=DELETE resource=category id={} actor={}", id, CurrentAdmin.id());
```

- [ ] **Step 5: Atualizar `AdminCouponController` (logs com actor)**

Mesmo padrão em `backend/src/main/java/com/bragas/api/catalog/admin/AdminCouponController.java`:

```java
log.info("admin.action action=POST resource=coupon code={} actor={}", c.getCode(), CurrentAdmin.id());
log.info("admin.action action=PATCH resource=coupon code={} actor={}", c.getCode(), CurrentAdmin.id());
log.info("admin.action action=DELETE resource=coupon code={} actor={}", upper, CurrentAdmin.id());
```

- [ ] **Step 6: Rodar — deve passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.AdminCatalogAuthIT'
```

Esperado: PASS nos 2 testes.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/bragas/api/catalog/admin/AdminCategoryController.java \
        backend/src/main/java/com/bragas/api/catalog/admin/AdminProductController.java \
        backend/src/main/java/com/bragas/api/catalog/admin/AdminCouponController.java \
        backend/src/test/java/com/bragas/api/auth/admin/AdminCatalogAuthIT.java
git commit -m "$(cat <<'EOF'
feat(sp5b): audit log dos endpoints admin inclui actor=<admin_id>

CurrentAdmin.id() resolve admin via SecurityContext. AdminCatalogAuthIT
valida com OutputCaptureExtension. Substitui rastro opaco do header
X-Admin-Token por identidade real no stdout.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Rate limit do `/auth/admin/login`

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/auth/RateLimitFilter.java`
- Modify: `backend/src/test/java/com/bragas/api/auth/RateLimitFilterTest.java`

- [ ] **Step 1: Adicionar teste para a regra nova**

Edite `backend/src/test/java/com/bragas/api/auth/RateLimitFilterTest.java`. Adicione no fim da classe:

```java
    @Test
    void admin_login_rate_limit_5_per_min() throws Exception {
        var filter = new RateLimitFilter(true);
        var chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/auth/admin/login");
            req.setRemoteAddr("5.5.5.5");
            filter.doFilter(req, new MockHttpServletResponse(), chain);
        }
        var req = new MockHttpServletRequest("POST", "/api/v1/auth/admin/login");
        req.setRemoteAddr("5.5.5.5");
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(res.getHeader("Retry-After")).isNotNull();
    }
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
./gradlew test --tests 'com.bragas.api.auth.RateLimitFilterTest.admin_login_rate_limit_5_per_min'
```

Esperado: o 6º request passa (sem regra, sem rate limit) → assertEquals(429) falha.

- [ ] **Step 3: Adicionar a regra em `RateLimitFilter`**

Edite `backend/src/main/java/com/bragas/api/auth/RateLimitFilter.java`. No array `RULES`, adicione entre `/auth/reset` e `/coupons/validate`:

```java
    private static final Rule[] RULES = new Rule[] {
        new Rule("/api/v1/auth/login",          5, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/signup",         3, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/forgot",         2, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/reset",          5, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/admin/login",    5, Duration.ofMinutes(1)),
        new Rule("/api/v1/coupons/validate",   60, Duration.ofMinutes(1)),
        new Rule("/api/v1/admin/**",           30, Duration.ofMinutes(1)),
    };
```

> **Atenção à ordem:** `matchRule` casa o primeiro `prefix` que dá `startsWith` ou `equals`. `/api/v1/auth/admin/login` tem que vir antes de `/api/v1/admin/**` (não é problema aqui porque o primeiro casa por igualdade exata, mas mantenha a ordem para clareza) e antes de `/api/v1/auth/**` se for adicionado uma regra wildcard de `/auth`. Hoje as regras de `/auth/*` são path-exato — sem conflito.

- [ ] **Step 4: Rodar — deve passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.RateLimitFilterTest'
```

Esperado: PASS em todos os testes (existentes + novo).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/RateLimitFilter.java \
        backend/src/test/java/com/bragas/api/auth/RateLimitFilterTest.java
git commit -m "$(cat <<'EOF'
feat(sp5b): rate limit 5/min em /auth/admin/login

Mesma política de /auth/login (cliente). Bucket4j in-memory por IP.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Cross-cookie isolation IT (defesa em profundidade)

**Files:**
- Create: `backend/src/test/java/com/bragas/api/auth/admin/CrossCookieIsolationIT.java`

- [ ] **Step 1: Escrever o IT**

Crie `backend/src/test/java/com/bragas/api/auth/admin/CrossCookieIsolationIT.java`:

```java
package com.bragas.api.auth.admin;

import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.UserRepository;
import com.bragas.api.auth.domain.User;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class CrossCookieIsolationIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepo;

    @Test
    @Transactional
    void user_jwt_placed_in_bb_admin_cookie_does_not_authenticate_as_admin() throws Exception {
        User u = User.create("victim@test.local", "fakehash", "Victim", "(21) 0000-0000", OffsetDateTime.now());
        userRepo.save(u);
        String userJwt = jwtService.issue(u.getId(), 3600);

        mvc.perform(get("/api/v1/auth/admin/me")
                .cookie(new Cookie("bb_admin", userJwt)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void admin_jwt_placed_in_bb_session_cookie_does_not_authenticate_as_user() throws Exception {
        // Seed admin já existe (admin@test.local — adm_test_0000000000000000)
        String adminJwt = jwtService.issue("adm_test_0000000000000000", 3600);

        mvc.perform(get("/api/v1/me")
                .cookie(new Cookie("bb_session", adminJwt)))
            .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: Rodar — deve passar**

```bash
./gradlew test --tests 'com.bragas.api.auth.admin.CrossCookieIsolationIT'
```

Esperado: PASS nos 2 testes (a defesa em profundidade já está em vigor pelos prefixos no `sub`).

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/bragas/api/auth/admin/CrossCookieIsolationIT.java
git commit -m "$(cat <<'EOF'
test(sp5b): IT valida isolamento entre cookies bb_admin e bb_session

JWT cliente colocado em bb_admin → 401 em /auth/admin/me.
JWT admin colocado em bb_session → 401 em /me.
Defesa em profundidade: cookie name + prefixo do sub no JWT.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Tarefa Gradle `bcryptHash` + .env.example final

**Files:**
- Modify: `backend/build.gradle.kts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Adicionar tarefa Gradle `bcryptHash`**

Edite `backend/build.gradle.kts`. **No topo do arquivo** (após `plugins {}`, antes de `repositories {}`), adicione:

```kotlin
buildscript {
    repositories { mavenCentral() }
    dependencies {
        classpath("org.springframework.security:spring-security-crypto:6.5.2")
        classpath("commons-logging:commons-logging:1.3.4")
    }
}
```

**No fim do arquivo**, adicione:

```kotlin
tasks.register("bcryptHash") {
    description = "Generate a bcrypt hash for a password. Usage: ./gradlew bcryptHash -Ppassword=YOUR_PASSWORD"
    group = "verification"
    doLast {
        val pwd = (project.findProperty("password") as String?)
            ?: throw GradleException("Missing -Ppassword=YOUR_PASSWORD")
        val encoder = org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(10)
        println(encoder.encode(pwd))
    }
}
```

> **Notas:**
> - Versões `6.5.2` e `1.3.4` são compatíveis com Spring Boot 4.0.6. Se a versão de Spring Security mudou no projeto, alinhe pelo `build.gradle.kts` existente (`./gradlew dependencies | grep spring-security-crypto`).
> - `commons-logging` é dependência transitiva de spring-security-crypto.

- [ ] **Step 2: Validar manualmente que a tarefa funciona**

```bash
./gradlew bcryptHash -Ppassword=hello-world
```

Esperado: imprime uma linha começando com `$2a$10$...` (~60 chars).

```bash
./gradlew bcryptHash
```

Esperado: falha com `Missing -Ppassword=YOUR_PASSWORD`.

- [ ] **Step 3: Atualizar `.env.example` com hash real de exemplo**

Gere um hash para uma senha forte (ex.: `correct-horse-battery-staple-12345`):

```bash
./gradlew --quiet bcryptHash -Ppassword=correct-horse-battery-staple-12345
```

Edite `backend/.env.example` substituindo o placeholder pelo hash real (mantenha como exemplo — o dev real vai gerar o próprio):

```
# Admin bootstrap (obrigatório no primeiro boot)
# Gerar o hash bcrypt da senha desejada via:
#   ./gradlew bcryptHash -Ppassword=SUA_SENHA
ADMIN_BOOTSTRAP_ID=adm_01HXYZ0123456789ABCDEFGH
ADMIN_BOOTSTRAP_EMAIL=admin@bragas.local
# Exemplo abaixo é da senha "correct-horse-battery-staple-12345"; gere o seu antes do primeiro boot
ADMIN_BOOTSTRAP_PASSWORD_HASH=<HASH_GERADO_NO_STEP_3>
ADMIN_BOOTSTRAP_NAME=Admin
```

- [ ] **Step 4: Commit**

```bash
git add backend/build.gradle.kts backend/.env.example
git commit -m "$(cat <<'EOF'
chore(sp5b): tarefa Gradle bcryptHash + atualiza .env.example

./gradlew bcryptHash -Ppassword=X imprime hash bcrypt(strength=10) para
popular ADMIN_BOOTSTRAP_PASSWORD_HASH. Substitui dependência de jshell
ou comando psql ad-hoc.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Smoke manual + verificação final

**Files:** nenhum (checklist de verificação)

- [ ] **Step 1: Rodar suite completa de testes**

```bash
./gradlew clean test
```

Esperado: BUILD SUCCESSFUL, ~130 testes verdes.

- [ ] **Step 2: Subir backend localmente**

Edite seu `.env` (cópia local de `.env.example`) com hash bcrypt da senha que você vai usar localmente:

```bash
./gradlew bcryptHash -Ppassword=minha-senha-local-forte
```

Atualize `ADMIN_BOOTSTRAP_PASSWORD_HASH` no `.env`. Garanta também `JWT_SECRET` populado (`openssl rand -base64 48`).

Suba:

```bash
docker compose up -d                # Postgres + MailHog
./gradlew bootRun
```

Esperado: log mostra `Started BragasApiApplication`, sem stack trace de placeholder ausente.

- [ ] **Step 3: Sanity test com `curl`**

Em outro terminal:

```bash
# Login admin → deve dar 204 + Set-Cookie: bb_admin=...
curl -i -X POST http://localhost:8080/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bragas.local","password":"minha-senha-local-forte"}'
```

Esperado: `HTTP/1.1 204` + header `Set-Cookie: bb_admin=eyJ...; Max-Age=28800; ...`.

Copie o valor do cookie e exporte:

```bash
export ADMIN_COOKIE="eyJ..."   # valor depois do "bb_admin="
```

- [ ] **Step 4: GET /auth/admin/me**

```bash
curl -i http://localhost:8080/api/v1/auth/admin/me \
  --cookie "bb_admin=$ADMIN_COOKIE"
```

Esperado: `HTTP/1.1 200` + JSON com `{"id":"adm_...","email":"admin@bragas.local","name":"Admin","createdAt":"..."}`.

- [ ] **Step 5: POST /admin/products com cookie admin → 201 + log com actor**

```bash
curl -i -X POST http://localhost:8080/api/v1/admin/products \
  -H "Content-Type: application/json" \
  --cookie "bb_admin=$ADMIN_COOKIE" \
  -d '{"id":"smoke-prod","categoryId":"burgers","name":"Smoke","price":10.00}'
```

Esperado:
- HTTP `201 Created`
- No log do `bootRun` aparece: `admin.action action=POST resource=product id=smoke-prod actor=adm_01HXYZ...`

- [ ] **Step 6: Token velho `X-Admin-Token` deve falhar com 401**

```bash
curl -i -X POST http://localhost:8080/api/v1/admin/products \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: qualquer-coisa" \
  -d '{"id":"x","categoryId":"burgers","name":"X","price":10.00}'
```

Esperado: `HTTP/1.1 401` + body Problem Details `unauthenticated`. (O header X-Admin-Token agora é ignorado.)

- [ ] **Step 7: Rate limit do login admin**

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/v1/auth/admin/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@bragas.local","password":"errada-XX"}'
done
```

Esperado: cinco respostas `401`, sexta resposta `429`.

- [ ] **Step 8: Limpar produto criado**

```bash
curl -i -X DELETE http://localhost:8080/api/v1/admin/products/smoke-prod \
  --cookie "bb_admin=$ADMIN_COOKIE"
```

Esperado: `HTTP/1.1 204`. Log mostra `admin.action action=DELETE resource=product id=smoke-prod actor=adm_...`.

- [ ] **Step 9: Logout**

```bash
curl -i -X POST http://localhost:8080/api/v1/auth/admin/logout
```

Esperado: `HTTP/1.1 204` + `Set-Cookie: bb_admin=; Max-Age=0; ...`.

- [ ] **Step 10: Pedido público continua funcionando (sem auth)**

```bash
curl -i http://localhost:8080/api/v1/menu
```

Esperado: `HTTP/1.1 200` com JSON do cardápio (regressão zero no SP5a).

- [ ] **Step 11: Front continua verde (sem mudança esperada)**

```bash
cd ..
npm test
```

Esperado: 216/216 verdes (igual à régua de master).

- [ ] **Step 12: Commit final se houver ajustes**

Se o smoke revelou algum ajuste menor (typo em log, mensagem etc.), faça commit. Senão, pule.

- [ ] **Step 13: Push e abrir PR**

```bash
git push -u origin feat/sp5b-auth-admin-sessao
gh pr create --title "feat(sp5b): auth admin por sessão" --body "$(cat <<'EOF'
## Summary

- Substitui `X-Admin-Token` por cookie httpOnly `bb_admin` com JWT (TTL 8h) e endpoints `/api/v1/auth/admin/{login,logout,me}`.
- Tabela `admin_users` criada via Flyway V5 com seed do primeiro admin via placeholders.
- Audit log dos `AdminCategoryController`, `AdminProductController`, `AdminCouponController` ganha `actor=<admin_user_id>`.
- `JwtCookieAuthFilter` (SP4b) ganha defesa em profundidade — exige prefixo `usr_` no `sub` do JWT.
- `AdminTokenFilter` e `AppProperties.Admin` removidos.

## Test plan

- [ ] `./gradlew test` verde (~130 testes)
- [ ] Smoke local conforme `docs/superpowers/plans/2026-06-04-sp5b-auth-admin-sessao.md` Task 12
- [ ] `npm test` no front continua 216/216 (sem mudanças no front)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (verificação interna do plano)

**Cobertura da spec — verificada:**

| Seção da spec | Task que cobre |
|---|---|
| §1 Contexto + decisões 1–8 | Estrutura geral em todas as tasks |
| §3.1 Novos arquivos | Tasks 1, 4, 5, 6 (todos os arquivos do pacote `auth/admin/`) |
| §3.2 Arquivos modificados | Tasks 2, 3, 6, 7, 8, 9 (cobre SecurityConfig, AppProperties, CookieFactory, JwtService, JwtCookieAuthFilter, RateLimitFilter, 3 controllers admin) |
| §4 API REST contratos (login/logout/me) | Task 6 (controller) + Task 7 (wire-up) |
| §5 Schema V5 + seed | Task 1 |
| §6.1 Prefixos no `sub` | Tasks 5, 7 (filter admin + reforço no filter cliente) |
| §6.2 Cookie `bb_admin` | Task 3 |
| §6.3 `JwtAdminCookieAuthFilter` | Task 5 |
| §6.4 `SecurityConfig` chain | Task 7 |
| §6.5 Rate limit `/auth/admin/login` | Task 9 |
| §6.6 `AdminAuthService` | Task 4 |
| §6.7 `AdminAuthController` | Task 6 |
| §6.8 Audit log com actor | Task 8 |
| §6.9 `AdminUser` entity | Task 1 |
| §7 application.yml + env vars | Tasks 1, 3, 7, 11 |
| §7.3 Tarefa Gradle `bcryptHash` | Task 11 |
| §7.4 `application-test.yml` | Task 1 + 3 |
| §8.1 Testes unitários | Tasks 2, 3, 4, 5 |
| §8.2 ITs | Tasks 1, 6, 8, 10 |
| §8.3 Adaptação dos ITs existentes | Task 7 |
| §9 Critérios de sucesso | Task 12 (smoke manual completo) |
| §10 Pendências futuras | N/A (fora do escopo) |

Sem gaps detectados.

**Placeholder scan:** Não há "TBD", "TODO", "implement later". Os `<HASH_TEST_PWD>` e `<HASH_GERADO_NO_STEP_3>` são marcadores que o engenheiro **substitui** explicitamente (instrução clara nos passos correspondentes).

**Type consistency:** `CurrentAdmin.id()` retorna `String`; `AdminUser.getId()` retorna `String`; `AdminAuthService.login(email, password)` retorna `AdminUser`; assinatura usada consistentemente em todas as tasks. Cookie chama-se `bb_admin` em todos os pontos (filter, factory, helper, ITs). Prefixo do sub é `"adm_"` em todos os pontos.

Plano pronto.
