# SP4b — Auth do Cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar autenticação opcional do cliente final (signup/login/perfil/meus-pedidos) usando cookie httpOnly + JWT, com reset de senha por e-mail e rate limit nas rotas de auth.

**Architecture:** Backend Spring expõe `/auth/*` (público), `/me/*` (autenticado por cookie JWT) e linka pedidos a `users.id` via FK nullable. Frontend Next.js usa `AuthProvider` client-side que chama `/me` no mount, e adapta header + checkout + adiciona páginas novas. Guest checkout continua funcionando intocado.

**Tech Stack:** Java 21 + Spring Boot 4.0.6 + JJWT 0.12 + Bucket4j 8 + Spring Mail (MailHog em dev) + Flyway · Next.js 16 + React 19 + Vitest + RTL · PostgreSQL 16.

**Spec:** `docs/superpowers/specs/2026-05-27-sp4b-auth-cliente-design.md`

---

## Fase 0 — Setup de dependências e infra

### Task 0.1: Adicionar dependências ao Gradle

**Files:**
- Modify: `backend/build.gradle.kts`

- [ ] **Step 1: Adicionar dependências de JWT, Bucket4j, Mail e GreenMail**

Substituir o bloco `dependencies { ... }` em `backend/build.gradle.kts` por:

```kotlin
dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.springframework.boot:spring-boot-starter-mail")
	implementation("org.flywaydb:flyway-database-postgresql")
	implementation("com.github.f4b6a3:ulid-creator:5.2.3")
	implementation("net.logstash.logback:logstash-logback-encoder:7.4")
	implementation("io.jsonwebtoken:jjwt-api:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
	implementation("com.bucket4j:bucket4j-core:8.10.1")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testImplementation("com.icegreen:greenmail-junit5:2.1.0")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
```

- [ ] **Step 2: Verificar que o build resolve as deps**

Run: `cd backend && ./gradlew dependencies --configuration runtimeClasspath | grep -E "jjwt|bucket4j|mail"`
Expected: linhas com `io.jsonwebtoken`, `com.bucket4j`, `spring-mail`.

- [ ] **Step 3: Commit**

```bash
git add backend/build.gradle.kts
git commit -m "build(sp4b): jjwt, bucket4j, spring-mail, greenmail"
```

---

### Task 0.2: Adicionar MailHog ao docker-compose

**Files:**
- Modify: `backend/docker-compose.yml`

- [ ] **Step 1: Adicionar serviço mailhog**

Substituir o conteúdo de `backend/docker-compose.yml` por:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: bragas-postgres
    environment:
      POSTGRES_DB: bragas
      POSTGRES_USER: bragas
      POSTGRES_PASSWORD: bragas
    ports:
      - "5433:5432"
    volumes:
      - bragas-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bragas -d bragas"]
      interval: 5s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog:latest
    container_name: bragas-mailhog
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI (http://localhost:8025)

volumes:
  bragas-postgres-data:
```

- [ ] **Step 2: Subir e validar**

Run: `cd backend && docker compose up -d mailhog && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8025`
Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add backend/docker-compose.yml
git commit -m "infra(sp4b): MailHog no docker-compose (SMTP 1025, UI 8025)"
```

---

### Task 0.3: Habilitar @EnableAsync e atualizar AppProperties + application.yml

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/BragasApiApplication.java`
- Modify: `backend/src/main/java/com/bragas/api/common/AppProperties.java`
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Adicionar @EnableAsync**

Substituir o conteúdo de `BragasApiApplication.java` por:

```java
package com.bragas.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
public class BragasApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(BragasApiApplication.class, args);
    }
}
```

- [ ] **Step 2: Estender AppProperties com Auth e Mail**

Substituir o conteúdo de `AppProperties.java` por:

```java
package com.bragas.api.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Admin admin, Cors cors, Auth auth, Mail mail) {
    public record Admin(String token) {}
    public record Cors(List<String> allowedOrigins) {}
    public record Auth(String jwtSecret, boolean cookieSecure, long jwtTtlSeconds) {}
    public record Mail(String from, String resetBaseUrl) {}
}
```

- [ ] **Step 3: Estender application.yml**

Substituir o conteúdo de `backend/src/main/resources/application.yml` por:

```yaml
spring:
  application:
    name: bragas-api
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.format_sql: false
    open-in-view: false
  flyway:
    enabled: true
  mail:
    host: ${MAIL_HOST:localhost}
    port: ${MAIL_PORT:1025}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
    properties:
      mail.smtp.auth: ${MAIL_AUTH:false}
      mail.smtp.starttls.enable: ${MAIL_TLS:false}

server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized

app:
  store:
    minOrder: 25.00
    averagePrepTime: 25
    openingHours:
      sun: { open: "18:00", close: "00:00" }
      tue: { open: "18:00", close: "23:40" }
      wed: { open: "18:00", close: "23:40" }
      thu: { open: "18:00", close: "23:40" }
      fri: { open: "18:00", close: "00:00" }
      sat: { open: "18:00", close: "00:00" }
  admin:
    token: ${ADMIN_TOKEN}
  cors:
    allowedOrigins:
      - "http://localhost:3000"
  auth:
    jwtSecret: ${JWT_SECRET}
    cookieSecure: ${COOKIE_SECURE:false}
    jwtTtlSeconds: 604800
  mail:
    from: ${MAIL_FROM:no-reply@bragas.local}
    resetBaseUrl: ${MAIL_RESET_BASE_URL:http://localhost:3000/redefinir-senha}
```

- [ ] **Step 4: Atualizar .env.example**

Substituir o conteúdo de `backend/.env.example` (ou criar) por:

```
ADMIN_TOKEN=changeme

# JWT (obrigatório; gerar com: openssl rand -base64 48)
JWT_SECRET=changeme-please-rotate-and-make-it-long-enough-for-256-bits

# Cookie (dev: false; prod via SP6: true)
COOKIE_SECURE=false

# SMTP (dev: MailHog default; prod via SP6)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_AUTH=false
MAIL_TLS=false
MAIL_FROM=no-reply@bragas.local
MAIL_RESET_BASE_URL=http://localhost:3000/redefinir-senha
```

- [ ] **Step 5: Verificar que o app compila**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/bragas/api/BragasApiApplication.java backend/src/main/java/com/bragas/api/common/AppProperties.java backend/src/main/resources/application.yml backend/.env.example
git commit -m "feat(sp4b): @EnableAsync + AppProperties.auth/mail + application.yml + env.example"
```

---

## Fase 1 — Schema do banco (Flyway)

### Task 1.1: Migration V2 — users + password_reset_tokens

**Files:**
- Create: `backend/src/main/resources/db/migration/V2__create_users_and_password_resets.sql`
- Test: `backend/src/test/java/com/bragas/api/auth/FlywayUsersIT.java`

- [ ] **Step 1: Escrever a migration**

Criar `V2__create_users_and_password_resets.sql`:

```sql
CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           VARCHAR(200) NOT NULL UNIQUE,
  password_hash   VARCHAR(72)  NOT NULL,
  name            VARCHAR(120) NOT NULL,
  phone           VARCHAR(40)  NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user_id    ON password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);
```

- [ ] **Step 2: Escrever teste de migration**

Criar `backend/src/test/java/com/bragas/api/auth/FlywayUsersIT.java`:

```java
package com.bragas.api.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.ResultSet;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class FlywayUsersIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired DataSource dataSource;

    @Test
    void users_table_exists_with_unique_email() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY column_name");
            var cols = new java.util.ArrayList<String>();
            while (rs.next()) cols.add(rs.getString(1));
            assertThat(cols).contains("id", "email", "password_hash", "name", "phone", "created_at", "updated_at");
        }
    }

    @Test
    void password_reset_tokens_table_exists() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT column_name FROM information_schema.columns WHERE table_name='password_reset_tokens' ORDER BY column_name");
            var cols = new java.util.ArrayList<String>();
            while (rs.next()) cols.add(rs.getString(1));
            assertThat(cols).contains("id", "token_hash", "user_id", "expires_at", "used_at", "created_at");
        }
    }
}
```

- [ ] **Step 3: Rodar teste — deve passar**

Run: `cd backend && ./gradlew test --tests FlywayUsersIT`
Expected: BUILD SUCCESSFUL, 2 testes verdes.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/V2__create_users_and_password_resets.sql backend/src/test/java/com/bragas/api/auth/FlywayUsersIT.java
git commit -m "feat(sp4b): Flyway V2 — users + password_reset_tokens"
```

---

### Task 1.2: Migration V3 — orders.user_id

**Files:**
- Create: `backend/src/main/resources/db/migration/V3__add_user_id_to_orders.sql`
- Modify: `backend/src/test/java/com/bragas/api/auth/FlywayUsersIT.java`

- [ ] **Step 1: Escrever a migration**

Criar `V3__add_user_id_to_orders.sql`:

```sql
ALTER TABLE orders
  ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_user_id ON orders (user_id);
```

- [ ] **Step 2: Acrescentar teste em FlywayUsersIT**

Acrescentar no final da classe `FlywayUsersIT`:

```java
    @Test
    void orders_has_user_id_column_nullable() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT is_nullable FROM information_schema.columns " +
                "WHERE table_name='orders' AND column_name='user_id'");
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString(1)).isEqualTo("YES");
        }
    }
```

- [ ] **Step 3: Rodar teste**

Run: `cd backend && ./gradlew test --tests FlywayUsersIT`
Expected: 3 testes verdes.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/V3__add_user_id_to_orders.sql backend/src/test/java/com/bragas/api/auth/FlywayUsersIT.java
git commit -m "feat(sp4b): Flyway V3 — orders.user_id (nullable, ON DELETE SET NULL)"
```

---

## Fase 2 — Domain entities (backend)

### Task 2.1: Entity User

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/domain/User.java`

- [ ] **Step 1: Escrever a entidade**

```java
package com.bragas.api.auth.domain;

import com.github.f4b6a3.ulid.UlidCreator;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, length = 200, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 72)
    private String passwordHash;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 40)
    private String phone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    protected User() {}

    public static User create(String email, String passwordHash, String name, String phone, OffsetDateTime now) {
        User u = new User();
        u.id = "usr_" + UlidCreator.getUlid();
        u.email = email;
        u.passwordHash = passwordHash;
        u.name = name;
        u.phone = phone;
        u.createdAt = now;
        return u;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    public void setName(String name) { this.name = name; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}
```

- [ ] **Step 2: Compilar**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/domain/User.java
git commit -m "feat(sp4b): User entity (JPA)"
```

---

### Task 2.2: Entity PasswordResetToken

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/domain/PasswordResetToken.java`

- [ ] **Step 1: Escrever a entidade**

```java
package com.bragas.api.auth.domain;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected PasswordResetToken() {}

    public static PasswordResetToken create(String tokenHash, String userId, OffsetDateTime now, OffsetDateTime expiresAt) {
        PasswordResetToken t = new PasswordResetToken();
        t.tokenHash = tokenHash;
        t.userId = userId;
        t.expiresAt = expiresAt;
        t.createdAt = now;
        return t;
    }

    public Long getId() { return id; }
    public String getTokenHash() { return tokenHash; }
    public String getUserId() { return userId; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public OffsetDateTime getUsedAt() { return usedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public void markUsed(OffsetDateTime when) { this.usedAt = when; }

    public boolean isValid(OffsetDateTime now) {
        return usedAt == null && expiresAt.isAfter(now);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/domain/PasswordResetToken.java
git commit -m "feat(sp4b): PasswordResetToken entity"
```

---

### Task 2.3: Repositories

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/UserRepository.java`
- Create: `backend/src/main/java/com/bragas/api/auth/PasswordResetTokenRepository.java`

- [ ] **Step 1: Escrever UserRepository**

```java
package com.bragas.api.auth;

import com.bragas.api.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
```

- [ ] **Step 2: Escrever PasswordResetTokenRepository**

```java
package com.bragas.api.auth;

import com.bragas.api.auth.domain.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/UserRepository.java backend/src/main/java/com/bragas/api/auth/PasswordResetTokenRepository.java
git commit -m "feat(sp4b): UserRepository + PasswordResetTokenRepository"
```

---

## Fase 3 — JWT, exceptions, BCrypt

### Task 3.1: JwtService (TDD)

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/JwtService.java`
- Test: `backend/src/test/java/com/bragas/api/auth/JwtServiceTest.java`

- [ ] **Step 1: Escrever o teste primeiro**

Criar `backend/src/test/java/com/bragas/api/auth/JwtServiceTest.java`:

```java
package com.bragas.api.auth;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "this-is-a-test-secret-with-at-least-32-bytes-of-entropy-yay";
    private final Clock clock = Clock.fixed(Instant.parse("2026-05-27T18:00:00Z"), ZoneOffset.UTC);

    @Test
    void issue_and_verify_happy_path() {
        var svc = new JwtService(SECRET, 3600, clock);
        String jwt = svc.issue("usr_abc");
        Optional<String> sub = svc.verifyAndExtractUserId(jwt);
        assertThat(sub).contains("usr_abc");
    }

    @Test
    void verify_returns_empty_for_tampered_token() {
        var svc = new JwtService(SECRET, 3600, clock);
        String jwt = svc.issue("usr_abc");
        String tampered = jwt.substring(0, jwt.length() - 2) + "xx";
        assertThat(svc.verifyAndExtractUserId(tampered)).isEmpty();
    }

    @Test
    void verify_returns_empty_for_expired_token() {
        Clock t0 = Clock.fixed(Instant.parse("2026-05-27T18:00:00Z"), ZoneOffset.UTC);
        Clock t1 = Clock.fixed(Instant.parse("2026-05-27T19:00:01Z"), ZoneOffset.UTC);
        String jwt = new JwtService(SECRET, 3600, t0).issue("usr_abc");
        assertThat(new JwtService(SECRET, 3600, t1).verifyAndExtractUserId(jwt)).isEmpty();
    }

    @Test
    void constructor_rejects_short_secret() {
        assertThatThrownBy(() -> new JwtService("short", 3600, clock))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void verify_returns_empty_for_garbage() {
        var svc = new JwtService(SECRET, 3600, clock);
        assertThat(svc.verifyAndExtractUserId("not-a-jwt")).isEmpty();
        assertThat(svc.verifyAndExtractUserId("")).isEmpty();
    }
}
```

- [ ] **Step 2: Rodar — deve falhar (classe não existe)**

Run: `cd backend && ./gradlew test --tests JwtServiceTest`
Expected: compile error "cannot find symbol JwtService".

- [ ] **Step 3: Implementar JwtService**

Criar `backend/src/main/java/com/bragas/api/auth/JwtService.java`:

```java
package com.bragas.api.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private static final String ISSUER = "bragas-api";
    private final SecretKey key;
    private final long ttlSeconds;
    private final Clock clock;

    public JwtService(@Value("${app.auth.jwtSecret}") String secret,
                      @Value("${app.auth.jwtTtlSeconds}") long ttlSeconds,
                      Clock clock) {
        byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET deve ter pelo menos 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.ttlSeconds = ttlSeconds;
        this.clock = clock;
    }

    public String issue(String userId) {
        Instant now = clock.instant();
        return Jwts.builder()
            .issuer(ISSUER)
            .subject(userId)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(ttlSeconds)))
            .signWith(key)
            .compact();
    }

    public Optional<String> verifyAndExtractUserId(String jwt) {
        if (jwt == null || jwt.isBlank()) return Optional.empty();
        try {
            var claims = Jwts.parser()
                .verifyWith(key)
                .clock(() -> Date.from(clock.instant()))
                .requireIssuer(ISSUER)
                .build()
                .parseSignedClaims(jwt)
                .getPayload();
            return Optional.ofNullable(claims.getSubject());
        } catch (Exception ex) {
            return Optional.empty();
        }
    }
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `cd backend && ./gradlew test --tests JwtServiceTest`
Expected: 5 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/JwtService.java backend/src/test/java/com/bragas/api/auth/JwtServiceTest.java
git commit -m "feat(sp4b): JwtService — HS256, issue + verify, valida segredo no construtor"
```

---

### Task 3.2: Exceptions de auth + handlers

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/EmailAlreadyTakenException.java`
- Create: `backend/src/main/java/com/bragas/api/auth/InvalidCredentialsException.java`
- Create: `backend/src/main/java/com/bragas/api/auth/UnauthenticatedException.java`
- Create: `backend/src/main/java/com/bragas/api/auth/ResetTokenInvalidException.java`
- Create: `backend/src/main/java/com/bragas/api/auth/RateLimitExceededException.java`
- Modify: `backend/src/main/java/com/bragas/api/common/ApiExceptionHandler.java`

- [ ] **Step 1: Criar as exceptions**

`EmailAlreadyTakenException.java`:
```java
package com.bragas.api.auth;

public class EmailAlreadyTakenException extends RuntimeException {
    public EmailAlreadyTakenException(String email) {
        super("E-mail já cadastrado: " + email);
    }
}
```

`InvalidCredentialsException.java`:
```java
package com.bragas.api.auth;

public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() { super("Credenciais inválidas"); }
}
```

`UnauthenticatedException.java`:
```java
package com.bragas.api.auth;

public class UnauthenticatedException extends RuntimeException {
    public UnauthenticatedException() { super("Não autenticado"); }
}
```

`ResetTokenInvalidException.java`:
```java
package com.bragas.api.auth;

public class ResetTokenInvalidException extends RuntimeException {
    public ResetTokenInvalidException() { super("Token de redefinição inválido"); }
}
```

`RateLimitExceededException.java`:
```java
package com.bragas.api.auth;

public class RateLimitExceededException extends RuntimeException {
    private final long retryAfterSeconds;
    public RateLimitExceededException(long retryAfterSeconds) {
        super("Muitas requisições");
        this.retryAfterSeconds = retryAfterSeconds;
    }
    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
```

- [ ] **Step 2: Acrescentar handlers ao ApiExceptionHandler**

Adicionar imports no topo de `backend/src/main/java/com/bragas/api/common/ApiExceptionHandler.java`:

```java
import com.bragas.api.auth.EmailAlreadyTakenException;
import com.bragas.api.auth.InvalidCredentialsException;
import com.bragas.api.auth.RateLimitExceededException;
import com.bragas.api.auth.ResetTokenInvalidException;
import com.bragas.api.auth.UnauthenticatedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
```

Acrescentar antes do `@ExceptionHandler(Exception.class)` final:

```java
    @ExceptionHandler(EmailAlreadyTakenException.class)
    public ResponseEntity<ApiError> handleEmailTaken(EmailAlreadyTakenException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT,
            ApiError.of("email-already-taken", "E-mail já cadastrado", 409, ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCreds(InvalidCredentialsException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED,
            ApiError.of("invalid-credentials", "Credenciais inválidas", 401,
                "E-mail ou senha incorretos.", req.getRequestURI()));
    }

    @ExceptionHandler(UnauthenticatedException.class)
    public ResponseEntity<ApiError> handleUnauth(UnauthenticatedException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED,
            ApiError.of("unauthenticated", "Não autenticado", 401,
                "Faça login para acessar este recurso.", req.getRequestURI()));
    }

    @ExceptionHandler(ResetTokenInvalidException.class)
    public ResponseEntity<ApiError> handleResetInvalid(ResetTokenInvalidException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED,
            ApiError.of("reset-token-invalid", "Link inválido", 401,
                "Link de redefinição inválido ou expirado.", req.getRequestURI()));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ApiError> handleRateLimit(RateLimitExceededException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .contentType(MediaType.valueOf("application/problem+json"))
            .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
            .body(ApiError.of("too-many-requests", "Muitas requisições", 429,
                "Aguarde alguns instantes e tente de novo.", req.getRequestURI()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        String msg = ex.getMostSpecificCause().getMessage();
        if (msg != null && msg.contains("users_email_key")) {
            return handleEmailTaken(new EmailAlreadyTakenException("(constraint)"), req);
        }
        log.error("DataIntegrityViolation em {} {}: ", req.getMethod(), req.getRequestURI(), ex);
        return problem(HttpStatus.CONFLICT,
            ApiError.of("conflict", "Conflito", 409, "Operação conflitou com estado atual.", req.getRequestURI()));
    }
```

- [ ] **Step 3: Compilar**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/*Exception.java backend/src/main/java/com/bragas/api/common/ApiExceptionHandler.java
git commit -m "feat(sp4b): exceptions de auth + handlers (409, 401, 429)"
```

---

### Task 3.3: BCryptPasswordEncoder bean

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/PasswordEncoderConfig.java`

- [ ] **Step 1: Criar config**

```java
package com.bragas.api.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordEncoderConfig {
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/PasswordEncoderConfig.java
git commit -m "feat(sp4b): BCryptPasswordEncoder (strength=10)"
```

---

## Fase 14 — Meus pedidos + Perfil

### Task 14.1: MyOrdersList component

**Files:**
- Create: `components/account/MyOrdersList.tsx`
- Test: `components/account/MyOrdersList.test.tsx`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as api from '@/lib/api-client';
import type { OrderSummary } from '@/lib/types-api';

const LIMIT = 20;

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Em preparo',
  OUT: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function MyOrdersList() {
  const [items, setItems] = useState<OrderSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.listMyOrders(LIMIT, offset).then((page) => {
      if (cancelled) return;
      setItems((prev) => (offset === 0 ? page.items : [...(prev ?? []), ...page.items]));
      setTotal(page.total);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [offset]);

  if (items === null) return <p className="text-paper">Carregando...</p>;

  if (items.length === 0) {
    return (
      <div className="text-paper">
        <h2 className="font-heading text-xl font-bold">Você ainda não fez pedidos com sua conta</h2>
        <p className="mt-2 text-sm text-muted">
          <Link href="/#cardapio" className="underline">Faça seu primeiro pedido</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-paper">
      <h1 className="font-heading text-2xl font-extrabold">Meus pedidos</h1>
      <ul className="flex flex-col gap-2">
        {items.map((o) => (
          <li key={o.id}>
            <Link href={`/checkout?orderId=${o.id}`}
              className="block rounded-2xl border border-line bg-surface p-4 hover:border-paper">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{o.displayId}</span>
                <span className="text-sm text-muted">{formatDate(o.createdAt)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span>{STATUS_LABEL[o.status] ?? o.status}</span>
                <span className="font-semibold">{formatBRL(o.total)}</span>
              </div>
              <div className="mt-1 text-xs text-muted">{o.itemsCount} {o.itemsCount === 1 ? 'item' : 'itens'}</div>
            </Link>
          </li>
        ))}
      </ul>
      {items.length < total && (
        <button onClick={() => setOffset(items.length)} disabled={loading}
          className="rounded-full border border-line px-6 py-2 text-sm hover:bg-surface disabled:opacity-60">
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyOrdersList } from './MyOrdersList';
import * as api from '@/lib/api-client';

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

describe('MyOrdersList', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('empty state', async () => {
    vi.spyOn(api, 'listMyOrders').mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    render(<MyOrdersList />);
    await waitFor(() => expect(screen.getByText(/ainda não fez pedidos/i)).toBeInTheDocument());
  });

  it('renderiza cards e links para checkout?orderId=', async () => {
    vi.spyOn(api, 'listMyOrders').mockResolvedValue({
      items: [
        { id: 'ord_1', displayId: '#1001', status: 'DELIVERED', total: 50.5, itemsCount: 2, createdAt: '2026-05-20T20:00:00Z' },
      ],
      total: 1, limit: 20, offset: 0,
    });
    render(<MyOrdersList />);
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument());
    expect(screen.getByRole('link')).toHaveAttribute('href', '/checkout?orderId=ord_1');
    expect(screen.getByText(/entregue/i)).toBeInTheDocument();
  });

  it('Carregar mais incrementa offset', async () => {
    const spy = vi.spyOn(api, 'listMyOrders')
      .mockResolvedValueOnce({
        items: Array.from({ length: 20 }, (_, i) => ({
          id: `ord_${i}`, displayId: `#100${i}`, status: 'DELIVERED', total: 10, itemsCount: 1, createdAt: '2026-05-20T20:00:00Z',
        })),
        total: 25, limit: 20, offset: 0,
      })
      .mockResolvedValueOnce({
        items: [{ id: 'ord_x', displayId: '#999', status: 'DELIVERED', total: 10, itemsCount: 1, createdAt: '2026-05-20T20:00:00Z' }],
        total: 25, limit: 20, offset: 20,
      });
    render(<MyOrdersList />);
    await waitFor(() => expect(screen.getByText('#1000')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /carregar mais/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith(20, 20));
  });
});
```

- [ ] **Step 3: Rodar e commit**

Run: `npm test -- components/account/MyOrdersList.test.tsx`
Expected: 3 verdes.

```bash
git add components/account/MyOrdersList.tsx components/account/MyOrdersList.test.tsx
git commit -m "feat(sp4b): MyOrdersList — lista paginada, links para OrderStatusScreen"
```

---

### Task 14.2: ProfileForm component

**Files:**
- Create: `components/account/ProfileForm.tsx`
- Test: `components/account/ProfileForm.test.tsx`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { humanizeAuth } from '@/lib/humanize-auth';
import type { User } from '@/lib/types-api';

export function ProfileForm({ initialUser }: { initialUser: User }) {
  const { refresh } = useAuth();
  const [name, setName] = useState(initialUser.name);
  const [phone, setPhone] = useState(initialUser.phone);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null); setSuccess(false); setSubmitting(true);
    try {
      await api.updateMe({ name, phone });
      await refresh();
      setSuccess(true);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado.');
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-paper">
      <h2 className="font-heading text-xl font-bold">Meus dados</h2>

      <label htmlFor="prof-email" className="flex flex-col gap-1 text-sm">
        E-mail (não editável)
        <input id="prof-email" type="email" value={initialUser.email} readOnly disabled
          className="rounded-lg border border-line bg-surface px-3 py-2 text-muted" />
      </label>

      <label htmlFor="prof-name" className="flex flex-col gap-1 text-sm">
        Nome
        <input id="prof-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
          required minLength={2} maxLength={120}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      <label htmlFor="prof-phone" className="flex flex-col gap-1 text-sm">
        Telefone
        <input id="prof-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          required minLength={8} maxLength={40}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      {errorMessage && <p role="alert" className="text-sm text-red-400">{errorMessage}</p>}
      {success && <p role="status" className="text-sm text-green-400">Dados atualizados.</p>}

      <button type="submit" disabled={submitting} aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60">
        {submitting ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileForm } from './ProfileForm';
import * as api from '@/lib/api-client';

const refresh = vi.fn();
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ refresh }) }));

const baseUser = { id: 'usr_1', email: 'a@b.c', name: 'A', phone: '(21) 99999-0000', createdAt: '2026-01-01' };

describe('ProfileForm', () => {
  beforeEach(() => { vi.restoreAllMocks(); refresh.mockReset(); });

  it('email é read-only', () => {
    render(<ProfileForm initialUser={baseUser} />);
    expect(screen.getByLabelText(/e-mail/i)).toBeDisabled();
  });

  it('submit chama updateMe e refresh', async () => {
    vi.spyOn(api, 'updateMe').mockResolvedValue(baseUser);
    render(<ProfileForm initialUser={baseUser} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/^nome/i));
    await user.type(screen.getByLabelText(/^nome/i), 'Novo Nome');
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(api.updateMe).toHaveBeenCalledWith({ name: 'Novo Nome', phone: '(21) 99999-0000' }));
    expect(refresh).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/atualizados/i));
  });
});
```

- [ ] **Step 3: Rodar e commit**

Run: `npm test -- components/account/ProfileForm.test.tsx`
Expected: verdes.

```bash
git add components/account/ProfileForm.tsx components/account/ProfileForm.test.tsx
git commit -m "feat(sp4b): ProfileForm — edita nome/telefone, e-mail read-only"
```

---

### Task 14.3: Pages /meus-pedidos e /perfil

**Files:**
- Create: `app/meus-pedidos/page.tsx`
- Create: `app/perfil/page.tsx`
- Create: `components/account/AccountGate.tsx`

- [ ] **Step 1: AccountGate**

Componente client que mostra "Carregando…" enquanto auth está loading, "Faça login para acessar" se anonymous, e o conteúdo se authenticated. Reusado pelas duas páginas.

```tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import type { ReactNode } from 'react';
import type { User } from '@/lib/types-api';

export function AccountGate({ children }: { children: (user: User) => ReactNode }) {
  const { state } = useAuth();
  if (state.status === 'loading') return <p className="text-paper">Carregando...</p>;
  if (state.status === 'anonymous') {
    return (
      <div className="text-paper">
        <p>Você precisa estar logado para acessar esta página.</p>
        <p className="mt-2 text-sm text-muted">
          <Link href="/entrar" className="underline">Entrar</Link> ou{' '}
          <Link href="/cadastro" className="underline">criar conta</Link>.
        </p>
      </div>
    );
  }
  return <>{children(state.user)}</>;
}
```

- [ ] **Step 2: app/meus-pedidos/page.tsx**

```tsx
'use client';

import { Suspense } from 'react';
import { MyOrdersList } from '@/components/account/MyOrdersList';
import { AccountGate } from '@/components/account/AccountGate';

export default function MeusPedidosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <AccountGate>
        {() => (
          <Suspense>
            <MyOrdersList />
          </Suspense>
        )}
      </AccountGate>
    </main>
  );
}
```

- [ ] **Step 3: app/perfil/page.tsx**

```tsx
'use client';

import { ProfileForm } from '@/components/account/ProfileForm';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { AccountGate } from '@/components/account/AccountGate';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <button onClick={async () => { await logout(); router.push('/'); }}
      className="self-start rounded-full border border-line px-6 py-2 text-sm text-paper hover:bg-surface">
      Sair
    </button>
  );
}

export default function PerfilPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <AccountGate>
        {(user) => (
          <div className="flex flex-col gap-8">
            <ProfileForm initialUser={user} />
            <ChangePasswordForm />
            <LogoutButton />
          </div>
        )}
      </AccountGate>
    </main>
  );
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add components/account/AccountGate.tsx app/meus-pedidos app/perfil
git commit -m "feat(sp4b): pages /meus-pedidos, /perfil + AccountGate"
```

---

## Fase 15 — Header adaptado + Checkout pré-preenchimento + smoke

### Task 15.1: HeaderUserMenu component

**Files:**
- Create: `components/layout/HeaderUserMenu.tsx`
- Test: `components/layout/HeaderUserMenu.test.tsx`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function HeaderUserMenu() {
  const { state, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  if (state.status === 'loading') {
    return <div aria-hidden className="h-8 w-20 animate-pulse rounded-full bg-surface" />;
  }

  if (state.status === 'anonymous') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <a href="/entrar" className="rounded-full px-3 py-1.5 text-paper hover:bg-surface">Entrar</a>
        <a href="/cadastro" className="rounded-full bg-white px-3 py-1.5 font-semibold text-ink hover:bg-paper">Criar conta</a>
      </div>
    );
  }

  const firstName = state.user.name.split(' ')[0];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu"
        className="rounded-full px-3 py-1.5 text-sm text-paper hover:bg-surface">
        Olá, {firstName} ▾
      </button>
      {open && (
        <div role="menu"
          className="absolute right-0 mt-2 w-48 rounded-2xl border border-line bg-ink/95 p-2 backdrop-blur">
          <a role="menuitem" href="/meus-pedidos" className="block rounded-lg px-3 py-2 text-sm text-paper hover:bg-surface">Meus pedidos</a>
          <a role="menuitem" href="/perfil" className="block rounded-lg px-3 py-2 text-sm text-paper hover:bg-surface">Perfil</a>
          <button role="menuitem" onClick={async () => { await logout(); router.push('/'); }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-paper hover:bg-surface">Sair</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeaderUserMenu } from './HeaderUserMenu';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

let mockState: any = { status: 'anonymous' };
const logout = vi.fn();
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ state: mockState, logout }) }));

describe('HeaderUserMenu', () => {
  beforeEach(() => { logout.mockReset(); push.mockReset(); });

  it('anonymous mostra Entrar/Criar conta', () => {
    mockState = { status: 'anonymous' };
    render(<HeaderUserMenu />);
    expect(screen.getByText(/entrar/i)).toBeInTheDocument();
    expect(screen.getByText(/criar conta/i)).toBeInTheDocument();
  });

  it('authenticated mostra "Olá, [primeiroNome]" e abre menu', async () => {
    mockState = { status: 'authenticated', user: { id: 'usr_1', email: 'a@b.c', name: 'João Silva', phone: 'p', createdAt: '2026-01-01' } };
    render(<HeaderUserMenu />);
    expect(screen.getByText(/olá, joão/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /olá/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /meus pedidos/i })).toBeInTheDocument();
  });

  it('logout chama api e redireciona para /', async () => {
    mockState = { status: 'authenticated', user: { id: 'usr_1', email: 'a@b.c', name: 'João', phone: 'p', createdAt: '2026-01-01' } };
    logout.mockResolvedValue(undefined);
    render(<HeaderUserMenu />);
    await userEvent.click(screen.getByRole('button', { name: /olá/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /sair/i }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });
});
```

- [ ] **Step 3: Rodar e commit**

Run: `npm test -- components/layout/HeaderUserMenu.test.tsx`
Expected: 3 verdes.

```bash
git add components/layout/HeaderUserMenu.tsx components/layout/HeaderUserMenu.test.tsx
git commit -m "feat(sp4b): HeaderUserMenu — anonymous vs authenticated, menu dropdown"
```

---

### Task 15.2: Plug HeaderUserMenu na Navbar

**Files:**
- Modify: `components/layout/Navbar.tsx`

- [ ] **Step 1: Acrescentar HeaderUserMenu**

Em `Navbar.tsx`, adicionar import:

```tsx
import { HeaderUserMenu } from './HeaderUserMenu';
```

Substituir o bloco `{/* CTA — desktop */}` por:

```tsx
        {/* CTA + user menu — desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <HeaderUserMenu />
          <Button href="#cardapio">Peça agora</Button>
        </div>
```

E logo antes do `</div>` final do menu mobile (após o `<a>Peça agora</a>` mobile), acrescentar versão mobile do menu de usuário:

```tsx
          <div className="mt-3">
            <HeaderUserMenu />
          </div>
```

- [ ] **Step 2: Atualizar Navbar.test.tsx se necessário**

Rodar `npm test -- components/layout/Navbar.test.tsx` — se quebrar por causa do useAuth (provavelmente vai), envolver o render em AuthProvider mockado:

```tsx
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ state: { status: 'anonymous' }, logout: vi.fn() }),
}));
```

Adicionar no topo do arquivo de teste existente.

- [ ] **Step 3: Rodar suite**

Run: `npm test -- components/layout/Navbar.test.tsx`
Expected: verdes (existentes + sem regressão).

- [ ] **Step 4: Commit**

```bash
git add components/layout/Navbar.tsx components/layout/Navbar.test.tsx
git commit -m "feat(sp4b): Navbar com HeaderUserMenu (desktop + mobile)"
```

---

### Task 15.3: Checkout pré-preenchimento + ?orderId=

**Files:**
- Modify: `app/checkout/page.tsx`
- Modify: `app/checkout/page.test.tsx`

- [ ] **Step 1: Modificar checkout para usar useAuth e aceitar ?orderId=**

No topo de `app/checkout/page.tsx`, acrescentar imports:

```tsx
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
```

Logo após `const router = useRouter();` adicionar:

```tsx
  const sp = useSearchParams();
  const { state: authState } = useAuth();
  const queryOrderId = sp.get('orderId');
```

Substituir a declaração de `customer` por pré-preenchimento:

```tsx
  const [customer, setCustomer] = useState<Customer>(() =>
    authState.status === 'authenticated'
      ? { name: authState.user.name, phone: authState.user.phone }
      : { name: '', phone: '' }
  );

  useEffect(() => {
    if (authState.status === 'authenticated' && !customer.name) {
      setCustomer({ name: authState.user.name, phone: authState.user.phone });
    }
    // intencional: só ressincroniza quando o login resolve, não a cada mudança no customer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status]);
```

Logo após os outros `useEffect` existentes, acrescentar:

```tsx
  useEffect(() => {
    if (queryOrderId && step !== 'sent') {
      setOrderId(queryOrderId);
      setSentEstimate({ min: 0, max: 0 });
      setStep('sent');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryOrderId]);
```

(O `sentEstimate` ficará genérico aqui — o `OrderStatusScreen` deve preferir `estimatedMinutes` do polling. Se a tela mostrar "0-0", revisar o `OrderStatusScreen` para tratar `0,0` como "carregando".)

- [ ] **Step 2: Atualizar teste existente do checkout para incluir useAuth mock**

No topo de `app/checkout/page.test.tsx`, garantir mock:

```tsx
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ state: { status: 'anonymous' } }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
```

(adaptar se o arquivo já tem mocks dessas libs — adicionar `useSearchParams` se ausente.)

- [ ] **Step 3: Acrescentar 2 testes novos no fim do arquivo**

```tsx
describe('checkout SP4b', () => {
  it('logado: nome/telefone vêm pré-preenchidos', async () => {
    vi.doMock('@/lib/auth-context', () => ({
      useAuth: () => ({
        state: { status: 'authenticated', user: { id: 'usr_1', email: 'a@b.c', name: 'João Silva', phone: '(21) 99999-0000', createdAt: '2026-01-01' } },
      }),
    }));
    const { default: Page } = await import('./page');
    render(<Page />);
    expect((screen.getByLabelText(/nome/i) as HTMLInputElement).value).toBe('João Silva');
  });
});
```

(Se o mock dinâmico via `vi.doMock` não funcionar bem com o setup atual, pode ser feito por arquivo separado com `vi.mock` no topo.)

- [ ] **Step 4: Rodar testes do checkout**

Run: `npm test -- app/checkout/page.test.tsx`
Expected: testes existentes verdes + novo verde.

- [ ] **Step 5: Commit**

```bash
git add app/checkout/page.tsx app/checkout/page.test.tsx
git commit -m "feat(sp4b): checkout pré-preenche dados do logado + aceita ?orderId="
```

---

### Task 15.4: Smoke final — full suite

- [ ] **Step 1: Backend completo**

Run: `cd backend && ./gradlew test`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 2: Front completo**

Run: `npm test && npm run lint && npm run build`
Expected: tudo verde. Régua: >200 testes.

- [ ] **Step 3: Smoke manual (stack rodando)**

Manual checklist — rodar com `cd backend && docker compose up -d && JWT_SECRET=$(openssl rand -base64 48) ADMIN_TOKEN=dev ./gradlew bootRun` em um terminal e `npm run dev` em outro:

- [ ] Cadastrar em `/cadastro` → header mostra "Olá, [Nome]" → `/meus-pedidos` mostra empty state.
- [ ] Logout no menu → header volta a "Entrar / Criar conta".
- [ ] Pedido logado: checkout pré-preenchido → finalizar → `psql -h localhost -p 5433 -U bragas -d bragas -c "SELECT id, user_id FROM orders ORDER BY created_at DESC LIMIT 1"` mostra o ULID do user.
- [ ] Pedido guest (sem login): `user_id` é null.
- [ ] `/meus-pedidos` lista pedido recém-criado; clicar abre `OrderStatusScreen` com polling.
- [ ] `/perfil` edita nome/telefone → header reflete. Trocar senha → usar senha antiga falha (401).
- [ ] `/esqueci-senha` com e-mail cadastrado → http://localhost:8025 mostra o e-mail com link → clicar abre `/redefinir-senha?token=...` → trocar senha → já loga.
- [ ] `/esqueci-senha` com e-mail desconhecido → mesma mensagem; MailHog não recebe nada.
- [ ] 6 logins errados em <1min do mesmo IP → 429.
- [ ] `curl -s http://localhost:8080/api/v1/me` (sem cookie) → 401 com `unauthenticated`.

- [ ] **Step 4: Push da branch**

```bash
git push -u origin feat/sp4b-auth
```

- [ ] **Step 5: Abrir PR**

```bash
gh pr create --title "feat(sp4b): auth do cliente (login opcional, JWT em cookie, reset por e-mail)" --body "$(cat <<'EOF'
## Summary
- Auth opcional do cliente final: signup/login/perfil/meus-pedidos via cookie httpOnly + JWT HS256 (7d).
- Reset de senha por e-mail (MailHog em dev, SMTP via env vars em prod).
- Rate limit in-memory (Bucket4j) nas rotas /auth/*.
- Orders ganham coluna `user_id` (nullable) — guest checkout continua funcionando.

## Test plan
- [ ] `cd backend && ./gradlew test` verde
- [ ] `npm test && npm run build` verde
- [ ] Smoke manual conforme `docs/superpowers/plans/2026-05-27-sp4b-auth-cliente.md` (Fase 15.4 step 3)

Spec: `docs/superpowers/specs/2026-05-27-sp4b-auth-cliente-design.md`
Plano: `docs/superpowers/plans/2026-05-27-sp4b-auth-cliente.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review (preenchido pelo autor do plano)

**Spec coverage:**
- §1 (decisões 1-12): cobertas em Fases 0-15.
- §4 (endpoints): Fase 7 (AuthController, MeController) + Fase 8 (OrderController).
- §5 (schema): Fase 1 (V2, V3).
- §6 (JWT/cookie/filter/rate limit/mail): Fases 3, 4, 5.
- §7 (front): Fases 10-15.
- §9 (testes backend): Fase 9 (cobre §13 do spec implicitamente — adicionar `JwtServiceTest`, `RateLimitFilterTest`, `PasswordResetServiceTest` já cobertos em Fase 3, 4, 6).
- §10 (critérios de sucesso): Fase 15.4 step 3.

**Placeholder scan:** sem TBD/TODO inline; um único ponto de "adapte conforme estrutura atual" no teste do Navbar (Fase 15.2 Step 2) — aceitável porque depende do que o teste atual já mocka.

**Type consistency:**
- `SignupRequest` no DTO (java) e em `types-api.ts` batem (email, password, name, phone).
- `OrdersPageResponse` java → `OrdersPage` ts (items/total/limit/offset).
- `bb_session` consistent entre `CookieFactory` e `JwtCookieAuthFilter`.
- `OrderResponse.userId` aparece no DTO Java (Fase 8.2) e em `types-api.ts` (Fase 10.1).

Plano cobre o spec ponta a ponta.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-27-sp4b-auth-cliente.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatcher cria um subagent fresh por task, reviewer entre tasks, iteração rápida.

**2. Inline Execution** — executa as tasks nesta sessão usando executing-plans, com checkpoints para revisão.

**Which approach?**


### Task 12.1: SignupForm

**Files:**
- Create: `components/auth/SignupForm.tsx`
- Test: `components/auth/SignupForm.test.tsx`

- [ ] **Step 1: Implementar componente**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { humanizeAuth } from '@/lib/humanize-auth';

export function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signup({ name, email, phone, password });
      router.push('/');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-paper">
      <h1 className="font-heading text-2xl font-extrabold">Criar conta</h1>

      <label htmlFor="signup-name" className="flex flex-col gap-1 text-sm">
        Nome completo
        <input id="signup-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
          required minLength={2} maxLength={120}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      <label htmlFor="signup-email" className="flex flex-col gap-1 text-sm">
        E-mail
        <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          required maxLength={200} autoComplete="email"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      <label htmlFor="signup-phone" className="flex flex-col gap-1 text-sm">
        Telefone
        <input id="signup-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          required minLength={8} maxLength={40} autoComplete="tel"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      <label htmlFor="signup-password" className="flex flex-col gap-1 text-sm">
        Senha (mín. 8 caracteres)
        <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          required minLength={8} maxLength={100} autoComplete="new-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      {errorMessage && (
        <p id="signup-error" role="alert" className="text-sm text-red-400">{errorMessage}</p>
      )}

      <button type="submit" disabled={submitting} aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60">
        {submitting ? 'Criando...' : 'Criar conta'}
      </button>

      <p className="text-sm text-muted">
        Já tem conta? <a href="/entrar" className="underline">Entrar</a>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from './SignupForm';
import { ApiError } from '@/lib/api-client';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const signupMock = vi.fn();
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ signup: signupMock }) }));

describe('SignupForm', () => {
  beforeEach(() => { signupMock.mockReset(); push.mockReset(); });

  it('submit chama signup e redireciona para /', async () => {
    signupMock.mockResolvedValue(undefined);
    render(<SignupForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nome completo/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'j@e.com');
    await user.type(screen.getByLabelText(/telefone/i), '(21) 99999-0000');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => expect(signupMock).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith('/');
  });

  it('409 email-already-taken mostra mensagem', async () => {
    signupMock.mockRejectedValue(new ApiError(409, 'email-already-taken', 'T', 'D'));
    render(<SignupForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nome completo/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'dup@e.com');
    await user.type(screen.getByLabelText(/telefone/i), '(21) 99999-0000');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/já está cadastrado/i),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('429 too-many-requests mostra mensagem de rate limit', async () => {
    signupMock.mockRejectedValue(new ApiError(429, 'too-many-requests', 'T', 'D'));
    render(<SignupForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nome completo/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.type(screen.getByLabelText(/telefone/i), '(21) 99999-0000');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/muitas tentativas/i),
    );
  });
});
```

- [ ] **Step 3: Rodar**

Run: `npm test -- components/auth/SignupForm.test.tsx`
Expected: 3 verdes.

- [ ] **Step 4: Commit**

```bash
git add components/auth/SignupForm.tsx components/auth/SignupForm.test.tsx
git commit -m "feat(sp4b): SignupForm + testes"
```

---

### Task 12.2: LoginForm

**Files:**
- Create: `components/auth/LoginForm.tsx`
- Test: `components/auth/LoginForm.test.tsx`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { humanizeAuth } from '@/lib/humanize-auth';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      router.push(sp.get('next') ?? '/meus-pedidos');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-paper">
      <h1 className="font-heading text-2xl font-extrabold">Entrar</h1>

      <label htmlFor="login-email" className="flex flex-col gap-1 text-sm">
        E-mail
        <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          required autoComplete="email"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      <label htmlFor="login-password" className="flex flex-col gap-1 text-sm">
        Senha
        <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          required autoComplete="current-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">{errorMessage}</p>
      )}

      <button type="submit" disabled={submitting} aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60">
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>

      <div className="flex justify-between text-sm text-muted">
        <a href="/esqueci-senha" className="underline">Esqueci minha senha</a>
        <a href="/cadastro" className="underline">Criar conta</a>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { ApiError } from '@/lib/api-client';

const push = vi.fn();
const getMock = vi.fn().mockReturnValue(null);
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: getMock }),
}));

const loginMock = vi.fn();
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ login: loginMock }) }));

describe('LoginForm', () => {
  beforeEach(() => { loginMock.mockReset(); push.mockReset(); getMock.mockReturnValue(null); });

  it('redireciona para /meus-pedidos por padrão', async () => {
    loginMock.mockResolvedValue(undefined);
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/meus-pedidos'));
  });

  it('redireciona para ?next= se presente', async () => {
    getMock.mockReturnValue('/perfil');
    loginMock.mockResolvedValue(undefined);
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/perfil'));
  });

  it('401 invalid-credentials mostra mensagem genérica', async () => {
    loginMock.mockRejectedValue(new ApiError(401, 'invalid-credentials', 'T', 'D'));
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.type(screen.getByLabelText(/senha/i), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/incorretos/i));
  });
});
```

- [ ] **Step 3: Rodar**

Run: `npm test -- components/auth/LoginForm.test.tsx`
Expected: 3 verdes.

- [ ] **Step 4: Commit**

```bash
git add components/auth/LoginForm.tsx components/auth/LoginForm.test.tsx
git commit -m "feat(sp4b): LoginForm + testes (next=, 401 genérico)"
```

---

### Task 12.3: ForgotForm

**Files:**
- Create: `components/auth/ForgotForm.tsx`
- Test: `components/auth/ForgotForm.test.tsx`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { humanizeAuth } from '@/lib/humanize-auth';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await api.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p className="text-paper">
        Se este e-mail estiver cadastrado, enviamos um link de redefinição.
        Confira sua caixa de entrada (e o spam).
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-paper">
      <h1 className="font-heading text-2xl font-extrabold">Esqueci minha senha</h1>

      <label htmlFor="forgot-email" className="flex flex-col gap-1 text-sm">
        E-mail
        <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          required className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      {errorMessage && <p role="alert" className="text-sm text-red-400">{errorMessage}</p>}

      <button type="submit" disabled={submitting} aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60">
        {submitting ? 'Enviando...' : 'Enviar link'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotForm } from './ForgotForm';
import * as api from '@/lib/api-client';

describe('ForgotForm', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('submit chama forgotPassword e mostra mensagem genérica', async () => {
    vi.spyOn(api, 'forgotPassword').mockResolvedValue();
    render(<ForgotForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));
    await waitFor(() =>
      expect(screen.getByText(/se este e-mail estiver cadastrado/i)).toBeInTheDocument(),
    );
    expect(api.forgotPassword).toHaveBeenCalledWith({ email: 'a@b.c' });
  });
});
```

- [ ] **Step 3: Rodar e commit**

Run: `npm test -- components/auth/ForgotForm.test.tsx`
Expected: verde.

```bash
git add components/auth/ForgotForm.tsx components/auth/ForgotForm.test.tsx
git commit -m "feat(sp4b): ForgotForm — sempre mostra mesma mensagem genérica"
```

---

### Task 12.4: ResetForm

**Files:**
- Create: `components/auth/ResetForm.tsx`
- Test: `components/auth/ResetForm.test.tsx`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { humanizeAuth } from '@/lib/humanize-auth';

export function ResetForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { refresh } = useAuth();
  const token = sp.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="text-paper">
        <h1 className="font-heading text-2xl font-extrabold">Link inválido</h1>
        <p className="mt-2 text-sm text-muted">
          O link de redefinição está incompleto. <a className="underline" href="/esqueci-senha">Peça um novo</a>.
        </p>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (newPassword !== confirm) {
      setErrorMessage('As senhas não conferem.');
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword({ token, newPassword });
      await refresh();
      router.push('/meus-pedidos');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-paper">
      <h1 className="font-heading text-2xl font-extrabold">Redefinir senha</h1>

      <label htmlFor="reset-new" className="flex flex-col gap-1 text-sm">
        Nova senha (mín. 8)
        <input id="reset-new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          required minLength={8} maxLength={100}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      <label htmlFor="reset-confirm" className="flex flex-col gap-1 text-sm">
        Confirmar senha
        <input id="reset-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          required minLength={8} maxLength={100}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      {errorMessage && <p role="alert" className="text-sm text-red-400">{errorMessage}</p>}

      <button type="submit" disabled={submitting} aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60">
        {submitting ? 'Redefinindo...' : 'Redefinir senha'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetForm } from './ResetForm';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';

const push = vi.fn();
const getMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: getMock }),
}));

const refresh = vi.fn();
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ refresh }) }));

describe('ResetForm', () => {
  beforeEach(() => { vi.restoreAllMocks(); push.mockReset(); refresh.mockReset(); });

  it('sem token mostra erro', () => {
    getMock.mockReturnValue(null);
    render(<ResetForm />);
    expect(screen.getByText(/link inválido/i)).toBeInTheDocument();
  });

  it('senhas diferentes mostra erro client', async () => {
    getMock.mockReturnValue('tok-123');
    render(<ResetForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^nova senha/i), 'senha12345');
    await user.type(screen.getByLabelText(/confirmar senha/i), 'diferente9');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/não conferem/i));
  });

  it('reset-token-invalid mostra mensagem', async () => {
    getMock.mockReturnValue('tok-123');
    vi.spyOn(api, 'resetPassword').mockRejectedValue(new ApiError(401, 'reset-token-invalid', 'T', 'D'));
    render(<ResetForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^nova senha/i), 'senha12345');
    await user.type(screen.getByLabelText(/confirmar senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/inválido ou expirado/i));
  });
});
```

- [ ] **Step 3: Rodar e commit**

Run: `npm test -- components/auth/ResetForm.test.tsx`
Expected: verdes.

```bash
git add components/auth/ResetForm.tsx components/auth/ResetForm.test.tsx
git commit -m "feat(sp4b): ResetForm — valida token, senhas iguais, refresh após sucesso"
```

---

### Task 12.5: ChangePasswordForm

**Files:**
- Create: `components/auth/ChangePasswordForm.tsx`
- Test: `components/auth/ChangePasswordForm.test.tsx`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { humanizeAuth } from '@/lib/humanize-auth';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccess(false);
    if (newPassword !== confirm) {
      setErrorMessage('As novas senhas não conferem.');
      return;
    }
    setSubmitting(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch (err) {
      if (err instanceof ApiError && err.type === 'invalid-credentials') {
        setErrorMessage('Senha atual incorreta.');
      } else {
        setErrorMessage(err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-paper">
      <h2 className="font-heading text-xl font-bold">Trocar senha</h2>

      <label htmlFor="cp-current" className="flex flex-col gap-1 text-sm">
        Senha atual
        <input id="cp-current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
          required autoComplete="current-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      <label htmlFor="cp-new" className="flex flex-col gap-1 text-sm">
        Nova senha (mín. 8)
        <input id="cp-new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          required minLength={8} maxLength={100} autoComplete="new-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      <label htmlFor="cp-confirm" className="flex flex-col gap-1 text-sm">
        Confirmar nova senha
        <input id="cp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          required minLength={8} maxLength={100} autoComplete="new-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper" />
      </label>

      {errorMessage && <p role="alert" className="text-sm text-red-400">{errorMessage}</p>}
      {success && <p role="status" className="text-sm text-green-400">Senha alterada com sucesso.</p>}

      <button type="submit" disabled={submitting} aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60">
        {submitting ? 'Trocando...' : 'Trocar senha'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordForm } from './ChangePasswordForm';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';

describe('ChangePasswordForm', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('senha atual errada mostra mensagem específica', async () => {
    vi.spyOn(api, 'changePassword').mockRejectedValue(new ApiError(401, 'invalid-credentials', 'T', 'D'));
    render(<ChangePasswordForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/senha atual/i), 'errada00');
    await user.type(screen.getByLabelText(/^nova senha/i), 'senha12345');
    await user.type(screen.getByLabelText(/confirmar nova senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /trocar senha/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/senha atual incorreta/i));
  });

  it('sucesso mostra confirmação', async () => {
    vi.spyOn(api, 'changePassword').mockResolvedValue();
    render(<ChangePasswordForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/senha atual/i), 'senha12345');
    await user.type(screen.getByLabelText(/^nova senha/i), 'nova-senha-456');
    await user.type(screen.getByLabelText(/confirmar nova senha/i), 'nova-senha-456');
    await user.click(screen.getByRole('button', { name: /trocar senha/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/alterada com sucesso/i));
  });
});
```

- [ ] **Step 3: Rodar e commit**

Run: `npm test -- components/auth/ChangePasswordForm.test.tsx`
Expected: verdes.

```bash
git add components/auth/ChangePasswordForm.tsx components/auth/ChangePasswordForm.test.tsx
git commit -m "feat(sp4b): ChangePasswordForm + testes"
```

---

## Fase 13 — Pages das telas de auth

### Task 13.1: Páginas (cadastro, entrar, esqueci, redefinir)

**Files:**
- Create: `app/cadastro/page.tsx`
- Create: `app/entrar/page.tsx`
- Create: `app/esqueci-senha/page.tsx`
- Create: `app/redefinir-senha/page.tsx`

- [ ] **Step 1: app/cadastro/page.tsx**

```tsx
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata = { title: 'Criar conta — Braga\'s Burger' };

export default function CadastroPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <SignupForm />
    </main>
  );
}
```

- [ ] **Step 2: app/entrar/page.tsx**

```tsx
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Entrar — Braga\'s Burger' };

export default function EntrarPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 3: app/esqueci-senha/page.tsx**

```tsx
import { ForgotForm } from '@/components/auth/ForgotForm';

export const metadata = { title: 'Esqueci a senha — Braga\'s Burger' };

export default function EsqueciSenhaPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <ForgotForm />
    </main>
  );
}
```

- [ ] **Step 4: app/redefinir-senha/page.tsx**

```tsx
import { Suspense } from 'react';
import { ResetForm } from '@/components/auth/ResetForm';

export const metadata = { title: 'Redefinir senha — Braga\'s Burger' };

export default function RedefinirSenhaPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Suspense>
        <ResetForm />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 5: Build de sanidade**

Run: `npm run build`
Expected: BUILD SUCCESSFUL — 4 rotas novas.

- [ ] **Step 6: Commit**

```bash
git add app/cadastro app/entrar app/esqueci-senha app/redefinir-senha
git commit -m "feat(sp4b): pages /cadastro, /entrar, /esqueci-senha, /redefinir-senha"
```

---


### Task 10.1: types-api.ts estendido

**Files:**
- Modify: `lib/types-api.ts`

- [ ] **Step 1: Adicionar tipos novos ao final do arquivo**

Anexar ao final de `lib/types-api.ts`:

```ts
// ── SP4b: auth do cliente ─────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotRequest {
  email: string;
}

export interface ResetRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateMeRequest {
  name?: string;
  phone?: string;
}

export interface OrderSummary {
  id: string;
  displayId: string;
  status: OrderStatus;
  total: number;
  itemsCount: number;
  createdAt: string;
}

export interface OrdersPage {
  items: OrderSummary[];
  total: number;
  limit: number;
  offset: number;
}
```

Acrescentar `userId?: string | null;` ao `OrderResponse` (back-compat — opcional):

```ts
export interface OrderResponse {
  id: string;
  displayId: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  customer: { name: string; phone: string };
  address?: ApiAddress;
  payment: PaymentMethodApi;
  changeFor?: number | null;
  items: OrderItemResponse[];
  couponCode?: string | null;
  totals: OrderTotals;
  estimatedMinutes: { min: number; max: number };
  createdAt: string;
  userId?: string | null;
  timestamps: OrderTimestamps;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types-api.ts
git commit -m "feat(sp4b): tipos de auth + userId em OrderResponse"
```

---

### Task 10.2: api-client com credentials:'include' e novas funções (TDD)

**Files:**
- Modify: `lib/api-client.ts`
- Test: `lib/api-client.test.ts` (estende)

- [ ] **Step 1: Modificar request<T> para incluir credentials**

Substituir o corpo da função `request<T>` em `lib/api-client.ts` por:

```ts
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(
      0,
      'network-error',
      'Sem conexão',
      'Não consegui falar com o servidor.',
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (res.ok) {
    return (await res.json()) as T;
  }

  let problem: ProblemDetails = {};
  try {
    problem = (await res.json()) as ProblemDetails;
  } catch {
    // resposta de erro sem corpo JSON — usa defaults
  }
  throw new ApiError(
    res.status,
    problem.type?.split('/').pop() ?? 'unknown',
    problem.title ?? 'Erro',
    problem.detail ?? `HTTP ${res.status}`,
  );
}
```

- [ ] **Step 2: Acrescentar funções de auth no final de api-client.ts**

```ts
import type {
  User,
  SignupRequest,
  LoginRequest,
  ForgotRequest,
  ResetRequest,
  ChangePasswordRequest,
  UpdateMeRequest,
  OrdersPage,
} from './types-api';

export async function signup(body: SignupRequest): Promise<User> {
  return request<User>('POST', '/auth/signup', body);
}

export async function login(body: LoginRequest): Promise<void> {
  await request<void>('POST', '/auth/login', body);
}

export async function logout(): Promise<void> {
  await request<void>('POST', '/auth/logout');
}

export async function forgotPassword(body: ForgotRequest): Promise<void> {
  await request<void>('POST', '/auth/forgot', body);
}

export async function resetPassword(body: ResetRequest): Promise<void> {
  await request<void>('POST', '/auth/reset', body);
}

export async function getMe(): Promise<User> {
  return request<User>('GET', '/me');
}

export async function updateMe(body: UpdateMeRequest): Promise<User> {
  return request<User>('PATCH', '/me', body);
}

export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await request<void>('POST', '/me/change-password', body);
}

export async function listMyOrders(limit = 20, offset = 0): Promise<OrdersPage> {
  return request<OrdersPage>('GET', `/me/orders?limit=${limit}&offset=${offset}`);
}
```

Mover os imports de tipo para o topo do arquivo (junto aos existentes) e remover a duplicação.

- [ ] **Step 3: Estender lib/api-client.test.ts**

Adicionar ao final do arquivo (mantendo testes existentes):

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as api from './api-client';
import { ApiError } from './api-client';

describe('api-client auth (SP4b)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('signup chama POST /auth/signup com credentials:include', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'usr_x', email: 'a@b.c', name: 'A', phone: 'p', createdAt: '2026-01-01' }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = await api.signup({ email: 'a@b.c', password: 'senha12345', name: 'A', phone: 'p' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/signup'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(user.id).toBe('usr_x');
  });

  it('login retorna void (204)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })));
    await expect(api.login({ email: 'a@b.c', password: 'senha12345' })).resolves.toBeUndefined();
  });

  it('login com 401 invalid-credentials vira ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        type: 'https://bragas.com/errors/invalid-credentials',
        title: 'Credenciais inválidas', status: 401, detail: 'E-mail ou senha incorretos.'
      }), { status: 401, headers: { 'Content-Type': 'application/problem+json' } }),
    ));
    await expect(api.login({ email: 'x@y.z', password: 'errada' })).rejects.toMatchObject({
      status: 401, type: 'invalid-credentials',
    });
  });

  it('signup com 409 email-already-taken vira ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        type: 'https://bragas.com/errors/email-already-taken',
        title: 'E-mail já cadastrado', status: 409, detail: 'já existe',
      }), { status: 409, headers: { 'Content-Type': 'application/problem+json' } }),
    ));
    await expect(api.signup({ email: 'd@d.d', password: 'senha12345', name: 'D', phone: 'p' }))
      .rejects.toMatchObject({ status: 409, type: 'email-already-taken' });
  });

  it('429 too-many-requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        type: 'https://bragas.com/errors/too-many-requests',
        title: 'Muitas requisições', status: 429, detail: 'aguarde',
      }), { status: 429, headers: { 'Content-Type': 'application/problem+json' } }),
    ));
    await expect(api.forgotPassword({ email: 'a@b.c' }))
      .rejects.toMatchObject({ status: 429, type: 'too-many-requests' });
  });

  it('listMyOrders monta query string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [], total: 0, limit: 20, offset: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ));
    await api.listMyOrders(10, 5);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/me/orders?limit=10&offset=5'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
```

- [ ] **Step 4: Rodar**

Run: `npm test -- lib/api-client.test.ts`
Expected: todos os testes verdes (novos + existentes).

- [ ] **Step 5: Commit**

```bash
git add lib/api-client.ts lib/api-client.test.ts
git commit -m "feat(sp4b): api-client com credentials:'include' + funções de auth"
```

---

## Fase 11 — AuthProvider + humanize-auth

### Task 11.1: lib/humanize-auth.ts

**Files:**
- Create: `lib/humanize-auth.ts`
- Test: `lib/humanize-auth.test.ts`

- [ ] **Step 1: Implementar**

```ts
import { ApiError } from './api-client';

export function humanizeAuth(err: ApiError): string {
  switch (err.type) {
    case 'email-already-taken':
      return 'Este e-mail já está cadastrado. Use Entrar ou redefina a senha.';
    case 'invalid-credentials':
      return 'E-mail ou senha incorretos.';
    case 'unauthenticated':
      return 'Sua sessão expirou. Faça login de novo.';
    case 'reset-token-invalid':
      return 'Link de redefinição inválido ou expirado. Peça um novo.';
    case 'too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    case 'validation-failed':
      return 'Confira os campos preenchidos.';
    case 'network-error':
      return 'Sem conexão com o servidor. Tente de novo em alguns instantes.';
    default:
      return err.detail || 'Algo deu errado. Tente de novo.';
  }
}
```

- [ ] **Step 2: Teste**

```ts
import { describe, it, expect } from 'vitest';
import { ApiError } from './api-client';
import { humanizeAuth } from './humanize-auth';

describe('humanizeAuth', () => {
  it.each([
    ['email-already-taken', 'Este e-mail já está cadastrado. Use Entrar ou redefina a senha.'],
    ['invalid-credentials', 'E-mail ou senha incorretos.'],
    ['unauthenticated', 'Sua sessão expirou. Faça login de novo.'],
    ['reset-token-invalid', 'Link de redefinição inválido ou expirado. Peça um novo.'],
    ['too-many-requests', 'Muitas tentativas. Aguarde um pouco e tente de novo.'],
    ['validation-failed', 'Confira os campos preenchidos.'],
    ['network-error', 'Sem conexão com o servidor. Tente de novo em alguns instantes.'],
  ])('%s → mensagem específica', (type, expected) => {
    const err = new ApiError(401, type, 'T', 'D');
    expect(humanizeAuth(err)).toBe(expected);
  });

  it('fallback usa err.detail', () => {
    const err = new ApiError(500, 'unknown', 'T', 'Erro inesperado');
    expect(humanizeAuth(err)).toBe('Erro inesperado');
  });
});
```

- [ ] **Step 3: Rodar**

Run: `npm test -- lib/humanize-auth.test.ts`
Expected: verdes.

- [ ] **Step 4: Commit**

```bash
git add lib/humanize-auth.ts lib/humanize-auth.test.ts
git commit -m "feat(sp4b): humanize-auth — mapa ApiError.type → pt-BR"
```

---

### Task 11.2: lib/auth-context.tsx

**Files:**
- Create: `lib/auth-context.tsx`
- Test: `lib/auth-context.test.tsx`

- [ ] **Step 1: Implementar**

```tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import * as api from './api-client';
import { ApiError } from './api-client';
import type { LoginRequest, SignupRequest, User } from './types-api';

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User };

export interface AuthContextValue {
  state: AuthState;
  login: (body: LoginRequest) => Promise<void>;
  signup: (body: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const user = await api.getMe();
      setState({ status: 'authenticated', user });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState({ status: 'anonymous' });
      } else {
        setState({ status: 'anonymous' });
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (body: LoginRequest) => {
    await api.login(body);
    const user = await api.getMe();
    setState({ status: 'authenticated', user });
  }, []);

  const signup = useCallback(async (body: SignupRequest) => {
    const user = await api.signup(body);
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setState({ status: 'anonymous' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-context';
import * as api from './api-client';
import { ApiError } from './api-client';

vi.mock('./api-client', async (orig) => ({ ...(await orig<typeof import('./api-client')>()) }));

function Probe() {
  const { state } = useAuth();
  return <div>state:{state.status}{state.status === 'authenticated' ? `:${state.user.email}` : ''}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('getMe 200 → authenticated', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({
      id: 'usr_1', email: 'a@b.c', name: 'A', phone: 'p', createdAt: '2026-01-01',
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('state:authenticated:a@b.c')).toBeInTheDocument());
  });

  it('getMe 401 → anonymous', async () => {
    vi.spyOn(api, 'getMe').mockRejectedValue(new ApiError(401, 'unauthenticated', 'T', 'D'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('state:anonymous')).toBeInTheDocument());
  });

  it('login() seta authenticated', async () => {
    vi.spyOn(api, 'getMe')
      .mockRejectedValueOnce(new ApiError(401, 'unauthenticated', 'T', 'D'))
      .mockResolvedValueOnce({ id: 'usr_1', email: 'a@b.c', name: 'A', phone: 'p', createdAt: '2026-01-01' });
    vi.spyOn(api, 'login').mockResolvedValue();

    function Btn() {
      const { state, login } = useAuth();
      return (
        <div>
          <span>state:{state.status}</span>
          <button onClick={() => login({ email: 'a@b.c', password: 'senha12345' })}>go</button>
        </div>
      );
    }
    render(<AuthProvider><Btn /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('state:anonymous')).toBeInTheDocument());

    await act(async () => { screen.getByText('go').click(); });
    await waitFor(() => expect(screen.getByText('state:authenticated')).toBeInTheDocument());
  });

  it('logout() volta para anonymous', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ id: 'usr_1', email: 'a@b.c', name: 'A', phone: 'p', createdAt: '2026-01-01' });
    vi.spyOn(api, 'logout').mockResolvedValue();

    function Btn() {
      const { state, logout } = useAuth();
      return (
        <div>
          <span>state:{state.status}</span>
          <button onClick={() => logout()}>out</button>
        </div>
      );
    }
    render(<AuthProvider><Btn /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('state:authenticated')).toBeInTheDocument());
    await act(async () => { screen.getByText('out').click(); });
    await waitFor(() => expect(screen.getByText('state:anonymous')).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Rodar**

Run: `npm test -- lib/auth-context.test.tsx`
Expected: 4 testes verdes.

- [ ] **Step 4: Commit**

```bash
git add lib/auth-context.tsx lib/auth-context.test.tsx
git commit -m "feat(sp4b): AuthProvider + useAuth — mount chama /me; login/signup/logout"
```

---

### Task 11.3: Plug AuthProvider em app/layout.tsx

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Envolver children**

Substituir o JSX retornado em `app/layout.tsx` por:

```tsx
import { AuthProvider } from '@/lib/auth-context';

// ... resto do arquivo igual

  return (
    <html lang="pt-BR" className={`${poppins.variable} ${inter.variable} antialiased`}>
      <body>
        <AuthProvider>
          {children}
          <CartLauncher />
          <InstallBanner />
          <RegisterServiceWorker />
        </AuthProvider>
      </body>
    </html>
  );
```

- [ ] **Step 2: Rodar suite inteira (sanidade)**

Run: `npm test`
Expected: verde (régua >180 testes).

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(sp4b): AuthProvider envolve app inteiro em layout.tsx"
```

---


### Task 8.1: Order.user (campo + getter + setter)

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/order/domain/Order.java`

- [ ] **Step 1: Adicionar campo, getter e setter**

No topo do arquivo adicionar import:

```java
import com.bragas.api.auth.domain.User;
```

Acrescentar dentro da classe `Order`, junto aos outros campos (antes do `@OneToMany items`):

```java
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
```

Adicionar getter/setter na seção de getters:

```java
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
```

- [ ] **Step 2: Compilar**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/domain/Order.java
git commit -m "feat(sp4b): Order.user (@ManyToOne FK nullable)"
```

---

### Task 8.2: OrderResponse.userId

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/order/dto/OrderResponse.java`

- [ ] **Step 1: Adicionar userId no record e mapper**

Substituir o `record OrderResponse(...)` para incluir `userId` antes de `timestamps`:

```java
public record OrderResponse(
    String id,
    String displayId,
    OrderStatus status,
    FulfillmentType fulfillmentType,
    Customer customer,
    Address address,
    PaymentMethod payment,
    BigDecimal changeFor,
    List<Item> items,
    String couponCode,
    Totals totals,
    Range estimatedMinutes,
    OffsetDateTime createdAt,
    String userId,
    Timestamps timestamps
) {
```

No `from(Order o)`, ajustar o construtor para passar `o.getUser() != null ? o.getUser().getId() : null` no penúltimo argumento (antes do Timestamps):

```java
        return new OrderResponse(
            o.getId(),
            o.getDisplayId(),
            o.getStatus(),
            o.getFulfillmentType(),
            new Customer(o.getCustomerName(), o.getCustomerPhone()),
            address,
            o.getPayment(),
            o.getChangeFor(),
            items,
            o.getCouponCode(),
            new Totals(o.getSubtotal(), o.getCouponDiscount(), o.getDeliveryFee(), o.getTotal()),
            new Range(o.getEstimatedMin(), o.getEstimatedMax()),
            o.getCreatedAt(),
            o.getUser() != null ? o.getUser().getId() : null,
            new Timestamps(o.getReceivedAt(), o.getPreparingAt(), o.getOutAt(), o.getDeliveredAt(), o.getCancelledAt())
        );
```

- [ ] **Step 2: Compilar**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/dto/OrderResponse.java
git commit -m "feat(sp4b): OrderResponse.userId (back-compat: null para guest)"
```

---

### Task 8.3: OrderController/Service extrai user do SecurityContext

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/order/OrderController.java`
- Modify: `backend/src/main/java/com/bragas/api/order/OrderService.java`

- [ ] **Step 1: Modificar OrderController.create**

Substituir o método `create` em `OrderController.java`:

```java
    @PostMapping
    public ResponseEntity<OrderResponse> create(@RequestBody @Valid CreateOrderRequest req,
                                                 @org.springframework.security.core.annotation.AuthenticationPrincipal com.bragas.api.auth.domain.User user) {
        var order = service.create(req, user);
        var resp = OrderResponse.from(order);
        return ResponseEntity.created(URI.create("/api/v1/orders/" + order.getId())).body(resp);
    }
```

- [ ] **Step 2: Modificar OrderService.create**

Em `OrderService.java`, alterar a assinatura de `create` para receber `User user`:

```java
    @Transactional
    public Order create(CreateOrderRequest req, com.bragas.api.auth.domain.User user) {
```

E logo antes do `return repo.save(order);` adicionar:

```java
        order.setUser(user);
```

(o `user` pode ser `null` — guest checkout).

- [ ] **Step 3: Atualizar testes existentes que chamam create**

Run: `cd backend && ./gradlew compileTestJava`
Expected: pode mostrar erros em `OrderServiceTest`/`OrderControllerIT` que chamam `service.create(req)` sem o segundo parâmetro.

Corrigir todas as chamadas afetadas para `service.create(req, null)`. Identificar com:
```
grep -rn "service.create(" backend/src/test
grep -rn "orderService.create(" backend/src/test
```
E adicionar `, null` ao final de cada chamada.

- [ ] **Step 4: Rodar testes existentes**

Run: `cd backend && ./gradlew test --tests "*Order*"`
Expected: todos verdes (continuidade do SP3).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/OrderController.java backend/src/main/java/com/bragas/api/order/OrderService.java backend/src/test
git commit -m "feat(sp4b): OrderController/Service extrai user do SecurityContext"
```

---

## Fase 9 — Integration tests do backend

### Task 9.1: TestMailConfig (substitui SMTP nos testes)

**Files:**
- Create: `backend/src/test/java/com/bragas/api/auth/TestMailConfig.java`

- [ ] **Step 1: Criar TestConfiguration**

```java
package com.bragas.api.auth;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.util.ArrayList;
import java.util.List;

@TestConfiguration
public class TestMailConfig {

    public static class CapturingMailService implements MailService {
        public final List<Sent> sent = new ArrayList<>();
        public record Sent(String to, String link) {}

        @Override
        public void sendPasswordReset(String to, String link) {
            sent.add(new Sent(to, link));
        }
    }

    @Bean
    @Primary
    public MailService capturingMailService() {
        return new CapturingMailService();
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/test/java/com/bragas/api/auth/TestMailConfig.java
git commit -m "test(sp4b): TestMailConfig com CapturingMailService"
```

---

### Task 9.2: AuthControllerIT

**Files:**
- Create: `backend/src/test/java/com/bragas/api/auth/AuthControllerIT.java`

- [ ] **Step 1: Escrever os testes**

```java
package com.bragas.api.auth;

import com.bragas.api.auth.dto.SignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Import(TestMailConfig.class)
class AuthControllerIT {

    @Container @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository userRepo;
    @Autowired PasswordResetTokenRepository tokenRepo;
    @Autowired MailService mail;

    @BeforeEach
    void clean() {
        tokenRepo.deleteAll();
        userRepo.deleteAll();
        ((TestMailConfig.CapturingMailService) mail).sent.clear();
    }

    @Test
    void signup_creates_user_and_sets_cookie() throws Exception {
        var req = new SignupRequest("joao@example.com", "senha12345", "João", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("bb_session=")))
            .andExpect(jsonPath("$.email").value("joao@example.com"));

        assertThat(userRepo.existsByEmail("joao@example.com")).isTrue();
    }

    @Test
    void signup_duplicate_email_returns_409() throws Exception {
        var req = new SignupRequest("dup@example.com", "senha12345", "Dup", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(req)))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(req)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/email-already-taken"));
    }

    @Test
    void login_with_correct_password_sets_cookie() throws Exception {
        var su = new SignupRequest("li@example.com", "senha12345", "Li", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));

        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"li@example.com","password":"senha12345"}
                    """))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("bb_session=")));
    }

    @Test
    void login_with_wrong_password_returns_401_generic() throws Exception {
        var su = new SignupRequest("li2@example.com", "senha12345", "Li", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));

        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"li2@example.com","password":"errada00"}
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void login_unknown_email_returns_same_401() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"nao-existe@example.com","password":"senha12345"}
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void logout_clears_cookie() throws Exception {
        mvc.perform(post("/api/v1/auth/logout"))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
    }

    @Test
    void forgot_for_unknown_email_returns_204_silently() throws Exception {
        mvc.perform(post("/api/v1/auth/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"email":"nao-existe@example.com"}"""))
            .andExpect(status().isNoContent());
        assertThat(((TestMailConfig.CapturingMailService) mail).sent).isEmpty();
    }

    @Test
    void forgot_for_known_email_sends_email_and_returns_204() throws Exception {
        var su = new SignupRequest("forg@example.com", "senha12345", "F", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));

        mvc.perform(post("/api/v1/auth/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"email":"forg@example.com"}"""))
            .andExpect(status().isNoContent());

        var sent = ((TestMailConfig.CapturingMailService) mail).sent;
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).to()).isEqualTo("forg@example.com");
        assertThat(sent.get(0).link()).contains("?token=");
    }

    @Test
    void reset_with_valid_token_succeeds_and_sets_cookie() throws Exception {
        var su = new SignupRequest("rst@example.com", "senha12345", "R", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));
        mvc.perform(post("/api/v1/auth/forgot").contentType(MediaType.APPLICATION_JSON).content("""{"email":"rst@example.com"}"""));

        String link = ((TestMailConfig.CapturingMailService) mail).sent.get(0).link();
        String token = link.substring(link.indexOf("?token=") + 7);

        mvc.perform(post("/api/v1/auth/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"token":"%s","newPassword":"nova-senha-456"}""".formatted(token)))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("bb_session=")));
    }

    @Test
    void reset_with_reused_token_returns_401() throws Exception {
        var su = new SignupRequest("ru@example.com", "senha12345", "Ru", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));
        mvc.perform(post("/api/v1/auth/forgot").contentType(MediaType.APPLICATION_JSON).content("""{"email":"ru@example.com"}"""));
        String link = ((TestMailConfig.CapturingMailService) mail).sent.get(0).link();
        String token = link.substring(link.indexOf("?token=") + 7);
        String body = """{"token":"%s","newPassword":"nova-senha-456"}""".formatted(token);

        mvc.perform(post("/api/v1/auth/reset").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/reset").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/reset-token-invalid"));
    }

    @Test
    void reset_with_unknown_token_returns_401() throws Exception {
        mvc.perform(post("/api/v1/auth/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"token":"garbage","newPassword":"nova-senha-456"}"""))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/reset-token-invalid"));
    }
}
```

Configurar `JWT_SECRET` para o teste — adicionar `backend/src/test/resources/application.yml`:

```yaml
app:
  auth:
    jwtSecret: test-secret-with-at-least-32-bytes-of-padding-yay-yay-yay
    cookieSecure: false
    jwtTtlSeconds: 3600
  admin:
    token: test-admin
  mail:
    from: test@bragas.local
    resetBaseUrl: http://localhost:3000/redefinir-senha
```

- [ ] **Step 2: Rodar — deve passar**

Run: `cd backend && ./gradlew test --tests AuthControllerIT`
Expected: BUILD SUCCESSFUL, todos os testes verdes.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/bragas/api/auth/AuthControllerIT.java backend/src/test/resources/application.yml
git commit -m "test(sp4b): AuthControllerIT (signup/login/logout/forgot/reset)"
```

---

### Task 9.3: MeControllerIT

**Files:**
- Create: `backend/src/test/java/com/bragas/api/auth/MeControllerIT.java`

- [ ] **Step 1: Escrever os testes**

```java
package com.bragas.api.auth;

import com.bragas.api.auth.dto.SignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Import(TestMailConfig.class)
class MeControllerIT {

    @Container @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository userRepo;

    @BeforeEach
    void clean() { userRepo.deleteAll(); }

    @Test
    void get_me_without_cookie_returns_401() throws Exception {
        mvc.perform(get("/api/v1/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/unauthenticated"));
    }

    @Test
    void get_me_with_valid_cookie_returns_user() throws Exception {
        Cookie cookie = signupAndExtractCookie("me1@example.com");
        mvc.perform(get("/api/v1/me").cookie(cookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("me1@example.com"));
    }

    @Test
    void patch_me_updates_name_and_phone() throws Exception {
        Cookie cookie = signupAndExtractCookie("me2@example.com");
        mvc.perform(patch("/api/v1/me").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name":"Novo Nome","phone":"(21) 88888-1234"}"""))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Novo Nome"))
            .andExpect(jsonPath("$.phone").value("(21) 88888-1234"));
    }

    @Test
    void change_password_with_wrong_current_returns_401() throws Exception {
        Cookie cookie = signupAndExtractCookie("me3@example.com");
        mvc.perform(post("/api/v1/me/change-password").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"currentPassword":"errada","newPassword":"nova-senha-456"}"""))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void change_password_happy_path_returns_204() throws Exception {
        Cookie cookie = signupAndExtractCookie("me4@example.com");
        mvc.perform(post("/api/v1/me/change-password").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"currentPassword":"senha12345","newPassword":"nova-senha-456"}"""))
            .andExpect(status().isNoContent());
    }

    private Cookie signupAndExtractCookie(String email) throws Exception {
        var req = new SignupRequest(email, "senha12345", "U", "(21) 99999-0000");
        MvcResult r = mvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
            .andReturn();
        String setCookie = r.getResponse().getHeader("Set-Cookie");
        String value = setCookie.split(";")[0].split("=", 2)[1];
        return new Cookie("bb_session", value);
    }
}
```

- [ ] **Step 2: Rodar**

Run: `cd backend && ./gradlew test --tests MeControllerIT`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/bragas/api/auth/MeControllerIT.java
git commit -m "test(sp4b): MeControllerIT (GET/PATCH/change-password)"
```

---

### Task 9.4: OrderUserLinkIT

**Files:**
- Create: `backend/src/test/java/com/bragas/api/auth/OrderUserLinkIT.java`

- [ ] **Step 1: Escrever testes**

```java
package com.bragas.api.auth;

import com.bragas.api.auth.dto.SignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Import(TestMailConfig.class)
class OrderUserLinkIT {

    @Container @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository userRepo;

    @BeforeEach
    void clean() { userRepo.deleteAll(); }

    private static final String VALID_ORDER_JSON = """
        {
          "customer": {"name":"J","phone":"(21) 99999-0000"},
          "fulfillmentType": "DELIVERY",
          "address": {"cep":"20000-000","street":"R","number":"1","neighborhood":"Higienópolis"},
          "payment": "CREDIT",
          "items": [{"productId":"chicken","quantity":2}]
        }
        """;

    @Test
    void order_created_with_cookie_persists_user_id() throws Exception {
        Cookie cookie = signupAndExtractCookie("buyer@example.com");
        mvc.perform(post("/api/v1/orders").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER_JSON))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.userId").isNotEmpty());
    }

    @Test
    void order_created_without_cookie_has_null_user_id() throws Exception {
        mvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER_JSON))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.userId").isEmpty());
    }

    @Test
    void me_orders_returns_only_user_orders() throws Exception {
        Cookie a = signupAndExtractCookie("a@example.com");
        Cookie b = signupAndExtractCookie("b@example.com");
        mvc.perform(post("/api/v1/orders").cookie(a).contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER_JSON))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/orders").cookie(b).contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER_JSON))
            .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/me/orders").cookie(a))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(1));
    }

    private Cookie signupAndExtractCookie(String email) throws Exception {
        var req = new SignupRequest(email, "senha12345", "U", "(21) 99999-0000");
        MvcResult r = mvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
            .andReturn();
        String setCookie = r.getResponse().getHeader("Set-Cookie");
        String value = setCookie.split(";")[0].split("=", 2)[1];
        return new Cookie("bb_session", value);
    }
}
```

- [ ] **Step 2: Rodar**

Run: `cd backend && ./gradlew test --tests OrderUserLinkIT`
Expected: 3 testes verdes.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/bragas/api/auth/OrderUserLinkIT.java
git commit -m "test(sp4b): OrderUserLinkIT (cookie → orders.user_id; GET /me/orders isola por user)"
```

---

### Task 9.5: Smoke check do backend completo

- [ ] **Step 1: Rodar TODOS os testes do backend**

Run: `cd backend && ./gradlew test`
Expected: BUILD SUCCESSFUL, todos verdes (SP3 + SP4a + SP4b).

- [ ] **Step 2: Se algum quebrar, investigar e fixar**

Cenários comuns: rate limit interferindo em testes que mandam muitos requests; CORS quebrado; testes do SP3 que não passavam `null` em `service.create(req, null)`. Corrigir e re-rodar.

- [ ] **Step 3: Commit (se houver correções)**

```bash
git add -u
git commit -m "fix(sp4b): ajustes de teste para coexistir com auth"
```

---


### Task 5.1: MailService (interface + impl)

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/MailService.java`
- Create: `backend/src/main/java/com/bragas/api/auth/SpringMailService.java`

- [ ] **Step 1: Interface**

```java
package com.bragas.api.auth;

public interface MailService {
    void sendPasswordReset(String to, String resetLink);
}
```

- [ ] **Step 2: Impl com JavaMailSender + @Async**

```java
package com.bragas.api.auth;

import com.bragas.api.common.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class SpringMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(SpringMailService.class);

    private final JavaMailSender mailSender;
    private final String from;

    public SpringMailService(JavaMailSender mailSender, AppProperties props) {
        this.mailSender = mailSender;
        this.from = props.mail().from();
    }

    @Override
    @Async
    public void sendPasswordReset(String to, String resetLink) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject("Braga's Burger — Redefinir senha");
            msg.setText("""
                Olá,

                Recebemos um pedido para redefinir sua senha na Braga's Burger.

                Clique no link abaixo (válido por 1 hora):
                %s

                Se não foi você, ignore este e-mail.

                — Equipe Braga's Burger
                """.formatted(resetLink));
            mailSender.send(msg);
        } catch (Exception ex) {
            log.error("Falha ao enviar e-mail de reset para {}: {}", to, ex.getMessage());
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/MailService.java backend/src/main/java/com/bragas/api/auth/SpringMailService.java
git commit -m "feat(sp4b): MailService + SpringMailService (@Async, swallow failures)"
```

---

## Fase 6 — PasswordResetService + AuthService

### Task 6.1: PasswordResetService (TDD)

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/PasswordResetService.java`
- Test: `backend/src/test/java/com/bragas/api/auth/PasswordResetServiceTest.java`

- [ ] **Step 1: Escrever teste**

```java
package com.bragas.api.auth;

import org.junit.jupiter.api.Test;

import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordResetServiceTest {

    @Test
    void generates_url_safe_token_of_expected_length() {
        var svc = new PasswordResetService();
        String token = svc.generateToken();
        assertThat(token).matches("^[A-Za-z0-9_-]+$");
        assertThat(token.length()).isGreaterThanOrEqualTo(40);
    }

    @Test
    void hash_is_deterministic_sha256_hex() throws Exception {
        var svc = new PasswordResetService();
        String token = "abc";
        String expected = HexFormat.of().formatHex(
            MessageDigest.getInstance("SHA-256").digest("abc".getBytes()));
        assertThat(svc.hash(token)).isEqualTo(expected);
    }

    @Test
    void different_tokens_hash_differently() {
        var svc = new PasswordResetService();
        assertThat(svc.hash("a")).isNotEqualTo(svc.hash("b"));
    }
}
```

- [ ] **Step 2: Rodar — falha**

Run: `cd backend && ./gradlew test --tests PasswordResetServiceTest`
Expected: compile error.

- [ ] **Step 3: Implementar**

```java
package com.bragas.api.auth;

import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class PasswordResetService {

    private final SecureRandom random = new SecureRandom();

    public String generateToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hash(String token) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(token.getBytes()));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponível", ex);
        }
    }
}
```

- [ ] **Step 4: Rodar — passa**

Run: `cd backend && ./gradlew test --tests PasswordResetServiceTest`
Expected: 3 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/PasswordResetService.java backend/src/test/java/com/bragas/api/auth/PasswordResetServiceTest.java
git commit -m "feat(sp4b): PasswordResetService — gera token base64url, hash SHA-256 hex"
```

---

### Task 6.2: DTOs de auth

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/dto/SignupRequest.java`
- Create: `backend/src/main/java/com/bragas/api/auth/dto/LoginRequest.java`
- Create: `backend/src/main/java/com/bragas/api/auth/dto/ForgotRequest.java`
- Create: `backend/src/main/java/com/bragas/api/auth/dto/ResetRequest.java`
- Create: `backend/src/main/java/com/bragas/api/auth/dto/ChangePasswordRequest.java`
- Create: `backend/src/main/java/com/bragas/api/auth/dto/UpdateMeRequest.java`
- Create: `backend/src/main/java/com/bragas/api/auth/dto/MeResponse.java`
- Create: `backend/src/main/java/com/bragas/api/auth/dto/OrderSummaryResponse.java`
- Create: `backend/src/main/java/com/bragas/api/auth/dto/OrdersPageResponse.java`

- [ ] **Step 1: SignupRequest**

```java
package com.bragas.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @NotBlank @Email @Size(max = 200) String email,
    @NotBlank @Size(min = 8, max = 100) String password,
    @NotBlank @Size(min = 2, max = 120) String name,
    @NotBlank @Size(min = 8, max = 40) String phone
) {}
```

- [ ] **Step 2: LoginRequest**

```java
package com.bragas.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank @Email String email,
    @NotBlank String password
) {}
```

- [ ] **Step 3: ForgotRequest**

```java
package com.bragas.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotRequest(@NotBlank @Email String email) {}
```

- [ ] **Step 4: ResetRequest**

```java
package com.bragas.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetRequest(
    @NotBlank String token,
    @NotBlank @Size(min = 8, max = 100) String newPassword
) {}
```

- [ ] **Step 5: ChangePasswordRequest**

```java
package com.bragas.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
    @NotBlank String currentPassword,
    @NotBlank @Size(min = 8, max = 100) String newPassword
) {}
```

- [ ] **Step 6: UpdateMeRequest**

```java
package com.bragas.api.auth.dto;

import jakarta.validation.constraints.Size;

public record UpdateMeRequest(
    @Size(min = 2, max = 120) String name,
    @Size(min = 8, max = 40) String phone
) {}
```

- [ ] **Step 7: MeResponse**

```java
package com.bragas.api.auth.dto;

import com.bragas.api.auth.domain.User;

import java.time.OffsetDateTime;

public record MeResponse(
    String id,
    String email,
    String name,
    String phone,
    OffsetDateTime createdAt
) {
    public static MeResponse from(User u) {
        return new MeResponse(u.getId(), u.getEmail(), u.getName(), u.getPhone(), u.getCreatedAt());
    }
}
```

- [ ] **Step 8: OrderSummaryResponse + OrdersPageResponse**

`OrderSummaryResponse.java`:
```java
package com.bragas.api.auth.dto;

import com.bragas.api.order.domain.Order;
import com.bragas.api.order.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record OrderSummaryResponse(
    String id,
    String displayId,
    OrderStatus status,
    BigDecimal total,
    int itemsCount,
    OffsetDateTime createdAt
) {
    public static OrderSummaryResponse from(Order o) {
        return new OrderSummaryResponse(
            o.getId(), o.getDisplayId(), o.getStatus(),
            o.getTotal(), o.getItems().size(), o.getCreatedAt()
        );
    }
}
```

`OrdersPageResponse.java`:
```java
package com.bragas.api.auth.dto;

import java.util.List;

public record OrdersPageResponse(
    List<OrderSummaryResponse> items,
    long total,
    int limit,
    int offset
) {}
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/dto/
git commit -m "feat(sp4b): DTOs de auth (SignupRequest, LoginRequest, MeResponse, etc.)"
```

---

### Task 6.3: AuthService

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/AuthService.java`

- [ ] **Step 1: Implementar**

```java
package com.bragas.api.auth;

import com.bragas.api.auth.domain.PasswordResetToken;
import com.bragas.api.auth.domain.User;
import com.bragas.api.auth.dto.SignupRequest;
import com.bragas.api.common.AppProperties;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;

@Service
public class AuthService {

    private static final Duration RESET_TTL = Duration.ofHours(1);

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final PasswordResetService resetService;
    private final MailService mail;
    private final String resetBaseUrl;
    private final Clock clock;

    public AuthService(UserRepository users, PasswordResetTokenRepository tokens,
                       PasswordEncoder encoder, PasswordResetService resetService,
                       MailService mail, AppProperties props, Clock clock) {
        this.users = users;
        this.tokens = tokens;
        this.encoder = encoder;
        this.resetService = resetService;
        this.mail = mail;
        this.resetBaseUrl = props.mail().resetBaseUrl();
        this.clock = clock;
    }

    @Transactional
    public User signup(SignupRequest req) {
        String email = req.email().toLowerCase().trim();
        if (users.existsByEmail(email)) {
            throw new EmailAlreadyTakenException(email);
        }
        String hash = encoder.encode(req.password());
        User u = User.create(email, hash, req.name(), req.phone(), OffsetDateTime.now(clock));
        return users.save(u);
    }

    @Transactional(readOnly = true)
    public User login(String email, String password) {
        String normalized = email.toLowerCase().trim();
        User u = users.findByEmail(normalized).orElseThrow(InvalidCredentialsException::new);
        if (!encoder.matches(password, u.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return u;
    }

    @Transactional
    public void triggerReset(String email) {
        String normalized = email.toLowerCase().trim();
        users.findByEmail(normalized).ifPresent(u -> {
            String token = resetService.generateToken();
            String hash = resetService.hash(token);
            OffsetDateTime now = OffsetDateTime.now(clock);
            tokens.save(PasswordResetToken.create(hash, u.getId(), now, now.plus(RESET_TTL)));
            mail.sendPasswordReset(u.getEmail(), resetBaseUrl + "?token=" + token);
        });
    }

    @Transactional
    public User applyReset(String token, String newPassword) {
        String hash = resetService.hash(token);
        PasswordResetToken t = tokens.findByTokenHash(hash).orElseThrow(ResetTokenInvalidException::new);
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (!t.isValid(now)) throw new ResetTokenInvalidException();
        User u = users.findById(t.getUserId()).orElseThrow(ResetTokenInvalidException::new);
        u.setPasswordHash(encoder.encode(newPassword));
        t.markUsed(now);
        return u;
    }

    @Transactional
    public void changePassword(String userId, String currentPassword, String newPassword) {
        User u = users.findById(userId).orElseThrow(InvalidCredentialsException::new);
        if (!encoder.matches(currentPassword, u.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        u.setPasswordHash(encoder.encode(newPassword));
    }

    @Transactional
    public User updateMe(String userId, String name, String phone) {
        User u = users.findById(userId).orElseThrow(InvalidCredentialsException::new);
        if (name != null && !name.isBlank()) u.setName(name);
        if (phone != null && !phone.isBlank()) u.setPhone(phone);
        return u;
    }
}
```

- [ ] **Step 2: Compilar**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/AuthService.java
git commit -m "feat(sp4b): AuthService — signup/login/reset/changePassword/updateMe"
```

---

### Task 6.4: CookieFactory utility

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/CookieFactory.java`

- [ ] **Step 1: Implementar**

```java
package com.bragas.api.auth;

import com.bragas.api.common.AppProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieFactory {

    public static final String SESSION_COOKIE = "bb_session";

    private final boolean secure;
    private final long ttlSeconds;

    public CookieFactory(AppProperties props) {
        this.secure = props.auth().cookieSecure();
        this.ttlSeconds = props.auth().jwtTtlSeconds();
    }

    public ResponseCookie session(String jwt) {
        return ResponseCookie.from(SESSION_COOKIE, jwt)
            .httpOnly(true)
            .secure(secure)
            .sameSite("Lax")
            .path("/")
            .maxAge(ttlSeconds)
            .build();
    }

    public ResponseCookie expire() {
        return ResponseCookie.from(SESSION_COOKIE, "")
            .httpOnly(true)
            .secure(secure)
            .sameSite("Lax")
            .path("/")
            .maxAge(0)
            .build();
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/CookieFactory.java
git commit -m "feat(sp4b): CookieFactory — bb_session com httpOnly/Secure/SameSite=Lax"
```

---

## Fase 7 — Controllers de auth e /me

### Task 7.1: AuthController

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/AuthController.java`

- [ ] **Step 1: Implementar**

```java
package com.bragas.api.auth;

import com.bragas.api.auth.dto.*;
import com.bragas.api.auth.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final CookieFactory cookies;

    public AuthController(AuthService authService, JwtService jwtService, CookieFactory cookies) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.cookies = cookies;
    }

    @PostMapping("/signup")
    public ResponseEntity<MeResponse> signup(@RequestBody @Valid SignupRequest req) {
        User u = authService.signup(req);
        return ResponseEntity.status(201)
            .header(HttpHeaders.SET_COOKIE, cookies.session(jwtService.issue(u.getId())).toString())
            .body(MeResponse.from(u));
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody @Valid LoginRequest req) {
        User u = authService.login(req.email(), req.password());
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.session(jwtService.issue(u.getId())).toString())
            .build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.expire().toString())
            .build();
    }

    @PostMapping("/forgot")
    public ResponseEntity<Void> forgot(@RequestBody @Valid ForgotRequest req) {
        authService.triggerReset(req.email());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset")
    public ResponseEntity<Void> reset(@RequestBody @Valid ResetRequest req) {
        User u = authService.applyReset(req.token(), req.newPassword());
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.session(jwtService.issue(u.getId())).toString())
            .build();
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/AuthController.java
git commit -m "feat(sp4b): AuthController — signup/login/logout/forgot/reset"
```

---

### Task 7.2: MeController

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/MeController.java`

- [ ] **Step 1: Implementar**

```java
package com.bragas.api.auth;

import com.bragas.api.auth.domain.User;
import com.bragas.api.auth.dto.*;
import com.bragas.api.order.OrderRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    private final AuthService authService;
    private final OrderRepository orderRepository;

    public MeController(AuthService authService, OrderRepository orderRepository) {
        this.authService = authService;
        this.orderRepository = orderRepository;
    }

    @GetMapping
    public MeResponse me(@AuthenticationPrincipal User user) {
        if (user == null) throw new UnauthenticatedException();
        return MeResponse.from(user);
    }

    @PatchMapping
    public MeResponse update(@AuthenticationPrincipal User user, @RequestBody @Valid UpdateMeRequest req) {
        if (user == null) throw new UnauthenticatedException();
        return MeResponse.from(authService.updateMe(user.getId(), req.name(), req.phone()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal User user,
                                                @RequestBody @Valid ChangePasswordRequest req) {
        if (user == null) throw new UnauthenticatedException();
        authService.changePassword(user.getId(), req.currentPassword(), req.newPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/orders")
    public OrdersPageResponse orders(@AuthenticationPrincipal User user,
                                      @RequestParam(defaultValue = "20") int limit,
                                      @RequestParam(defaultValue = "0") int offset) {
        if (user == null) throw new UnauthenticatedException();
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        int safeOffset = Math.max(offset, 0);
        var page = orderRepository.findByUserId(user.getId(),
            PageRequest.of(safeOffset / safeLimit, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")));
        var items = page.getContent().stream().map(OrderSummaryResponse::from).toList();
        return new OrdersPageResponse(items, page.getTotalElements(), safeLimit, safeOffset);
    }
}
```

- [ ] **Step 2: Adicionar findByUserId em OrderRepository**

Editar `backend/src/main/java/com/bragas/api/order/OrderRepository.java` — adicionar método `findByUserId`:

```java
package com.bragas.api.order;

import com.bragas.api.order.domain.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, String> {
    Optional<Order> findByDisplayId(String displayId);
    boolean existsByDisplayId(String displayId);
    Page<Order> findByUserId(String userId, Pageable pageable);
}
```

Verificar primeiro com `Read` o conteúdo atual de `OrderRepository.java` para ajustar exatamente (manter os métodos já existentes; o `existsByDisplayId` pode ou não estar presente — preservar).

- [ ] **Step 3: Compilar**

Run: `cd backend && ./gradlew compileJava`
Expected: pode falhar se `Order.user` ainda não existir (vem na Fase 8). Se falhar com "findByUserId requires property userId", deixar passar até a Fase 8 e voltar.

- [ ] **Step 4: Commit (mesmo se compile falhar — vai destravar com Fase 8)**

```bash
git add backend/src/main/java/com/bragas/api/auth/MeController.java backend/src/main/java/com/bragas/api/order/OrderRepository.java
git commit -m "feat(sp4b): MeController + OrderRepository.findByUserId"
```

---


### Task 4.1: JwtCookieAuthFilter

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/JwtCookieAuthFilter.java`

- [ ] **Step 1: Implementar o filtro**

```java
package com.bragas.api.auth;

import com.bragas.api.auth.domain.User;
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

public class JwtCookieAuthFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "bb_session";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtCookieAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null) {
            jwtService.verifyAndExtractUserId(token)
                .flatMap(userRepository::findById)
                .ifPresent(user -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                        user, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
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

- [ ] **Step 2: Compilar**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/JwtCookieAuthFilter.java
git commit -m "feat(sp4b): JwtCookieAuthFilter — lê cookie bb_session, popula SecurityContext"
```

---

### Task 4.2: RateLimitFilter (TDD)

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/RateLimitFilter.java`
- Test: `backend/src/test/java/com/bragas/api/auth/RateLimitFilterTest.java`

- [ ] **Step 1: Escrever teste**

Criar `backend/src/test/java/com/bragas/api/auth/RateLimitFilterTest.java`:

```java
package com.bragas.api.auth;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RateLimitFilterTest {

    @Test
    void allows_up_to_limit_then_blocks() throws Exception {
        var filter = new RateLimitFilter();
        var chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            var req = login(); var res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
        }
        verify(chain, org.mockito.Mockito.times(5)).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());

        var req = login(); var res = new MockHttpServletResponse();
        assertThatThrownBy(() -> filter.doFilter(req, res, chain))
            .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void different_ips_have_independent_buckets() throws Exception {
        var filter = new RateLimitFilter();
        var chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            var req = login(); req.setRemoteAddr("1.1.1.1");
            filter.doFilter(req, new MockHttpServletResponse(), chain);
        }
        var other = login(); other.setRemoteAddr("2.2.2.2");
        filter.doFilter(other, new MockHttpServletResponse(), chain);
        verify(chain, org.mockito.Mockito.times(6)).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void non_auth_routes_pass_unchanged() throws Exception {
        var filter = new RateLimitFilter();
        var chain = mock(FilterChain.class);
        var req = new MockHttpServletRequest("POST", "/api/v1/orders");
        for (int i = 0; i < 50; i++) {
            filter.doFilter(req, new MockHttpServletResponse(), chain);
        }
        verify(chain, org.mockito.Mockito.times(50)).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    private MockHttpServletRequest login() {
        var r = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        r.setRemoteAddr("9.9.9.9");
        return r;
    }
}
```

- [ ] **Step 2: Rodar — falha (classe não existe)**

Run: `cd backend && ./gradlew test --tests RateLimitFilterTest`
Expected: compile error.

- [ ] **Step 3: Implementar RateLimitFilter**

Criar `backend/src/main/java/com/bragas/api/auth/RateLimitFilter.java`:

```java
package com.bragas.api.auth;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RateLimitFilter extends OncePerRequestFilter {

    private record Rule(String pathPrefix, long capacity, Duration refill) {}

    private static final Rule[] RULES = new Rule[] {
        new Rule("/api/v1/auth/login",   5, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/signup",  3, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/forgot",  2, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/reset",   5, Duration.ofMinutes(1)),
    };

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Rule rule = matchRule(request);
        if (rule == null) {
            chain.doFilter(request, response);
            return;
        }
        String key = clientIp(request) + ":" + rule.pathPrefix;
        Bucket bucket = buckets.computeIfAbsent(key, k -> Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(rule.capacity).refillGreedy(rule.capacity, rule.refill).build())
            .build());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfter = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            throw new RateLimitExceededException(retryAfter);
        }
        chain.doFilter(request, response);
    }

    private Rule matchRule(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return null;
        String uri = request.getRequestURI();
        for (Rule r : RULES) if (uri.equals(r.pathPrefix)) return r;
        return null;
    }

    private static String clientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) return fwd.split(",")[0].trim();
        return req.getRemoteAddr();
    }
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `cd backend && ./gradlew test --tests RateLimitFilterTest`
Expected: 3 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/RateLimitFilter.java backend/src/test/java/com/bragas/api/auth/RateLimitFilterTest.java
git commit -m "feat(sp4b): RateLimitFilter — Bucket4j in-memory por IP nas rotas /auth/*"
```

---

### Task 4.3: AuthenticationEntryPoint + SecurityConfig atualizado

**Files:**
- Create: `backend/src/main/java/com/bragas/api/auth/ProblemDetailsAuthEntryPoint.java`
- Modify: `backend/src/main/java/com/bragas/api/common/SecurityConfig.java`

- [ ] **Step 1: Criar entry point**

```java
package com.bragas.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import java.io.IOException;

public class ProblemDetailsAuthEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException {
        response.setStatus(401);
        response.setContentType("application/problem+json");
        String body = """
            {
              "type": "https://bragas.com/errors/unauthenticated",
              "title": "Não autenticado",
              "status": 401,
              "detail": "Faça login para acessar este recurso.",
              "instance": "%s"
            }
            """.formatted(request.getRequestURI());
        response.getWriter().write(body);
    }
}
```

- [ ] **Step 2: Substituir SecurityConfig**

Substituir o conteúdo de `backend/src/main/java/com/bragas/api/common/SecurityConfig.java` por:

```java
package com.bragas.api.common;

import com.bragas.api.auth.JwtCookieAuthFilter;
import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.ProblemDetailsAuthEntryPoint;
import com.bragas.api.auth.RateLimitFilter;
import com.bragas.api.auth.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final String adminToken;
    private final List<String> corsOrigins;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public SecurityConfig(AppProperties props, JwtService jwtService, UserRepository userRepository) {
        this.adminToken = props.admin() == null ? null : props.admin().token();
        this.corsOrigins = props.cors() == null ? null : props.cors().allowedOrigins();
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/orders/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/orders").permitAll()
                .requestMatchers("/api/v1/me/**").authenticated()
                .anyRequest().permitAll()
            )
            .exceptionHandling(e -> e.authenticationEntryPoint(new ProblemDetailsAuthEntryPoint()))
            .addFilterBefore(new RateLimitFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new JwtCookieAuthFilter(jwtService, userRepository), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new AdminTokenFilter(adminToken), AuthorizationFilter.class);
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

- [ ] **Step 3: Compilar e rodar testes existentes (sanidade)**

Run: `cd backend && ./gradlew compileJava test --tests OrderControllerIT`
Expected: BUILD SUCCESSFUL (pode haver falha de RateLimit em testes que mandam vários requests — se algum quebrar, anotar e ajustar; mas o `OrderControllerIT` não passa por `/auth/*`, deve continuar verde).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/bragas/api/auth/ProblemDetailsAuthEntryPoint.java backend/src/main/java/com/bragas/api/common/SecurityConfig.java
git commit -m "feat(sp4b): SecurityConfig com JwtCookieAuthFilter, RateLimitFilter, CORS allowCredentials"
```

---


