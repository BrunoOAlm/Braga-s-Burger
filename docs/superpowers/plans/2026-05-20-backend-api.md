# Backend de Pedidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir do zero o backend Java/Spring que recebe, armazena e expõe pedidos do Braga's Burger, com endpoint protegido pra atualizar status, em `backend/` na raiz do repo atual.

**Architecture:** Spring Boot 3 + Postgres 16 (Docker), pacotes por feature (`order/`, `catalog/`, `store/`, `common/`), camadas finas (Controller HTTP → Service de negócio → Repository JPA → Domain puro). Catálogos (produtos, cupons, taxas) são imutáveis em memória, carregados de JSON estático no startup. Servidor recalcula todos os totais — cliente nunca é fonte de verdade pra dinheiro.

**Tech Stack:** Java 21 LTS, Spring Boot 3.3.5 (ou versão atual ≥3.3), Spring Web + Data JPA + Validation + Security, Gradle Kotlin DSL, PostgreSQL 16 + Flyway, JUnit 5 + Testcontainers, ULID Creator (`com.github.f4b6a3:ulid-creator:5.2.3`). Sem Lombok — usar Java records.

**Reference spec:** `docs/superpowers/specs/2026-05-20-backend-api-design.md`

**Ambiente local:** Java 21 em `C:\Program Files\Java\jdk-21.0.10`. Configure `JAVA_HOME` apontando pra essa pasta antes de rodar Gradle (ou use o wrapper `./gradlew` que respeita `JAVA_HOME`).

---

## File structure

**Criar (tudo dentro de `backend/`):**

```
backend/
├── build.gradle.kts
├── settings.gradle.kts
├── gradlew, gradlew.bat, gradle/wrapper/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── src/
    ├── main/
    │   ├── java/com/bragas/api/
    │   │   ├── BragasApiApplication.java
    │   │   ├── order/
    │   │   │   ├── OrderController.java
    │   │   │   ├── OrderAdminController.java
    │   │   │   ├── OrderService.java
    │   │   │   ├── OrderRepository.java
    │   │   │   ├── OrderItemRepository.java
    │   │   │   ├── domain/
    │   │   │   │   ├── Order.java
    │   │   │   │   ├── OrderItem.java
    │   │   │   │   ├── OrderStatus.java
    │   │   │   │   ├── FulfillmentType.java
    │   │   │   │   ├── PaymentMethod.java
    │   │   │   │   └── OrderStatusTransition.java
    │   │   │   ├── dto/
    │   │   │   │   ├── CreateOrderRequest.java
    │   │   │   │   ├── UpdateStatusRequest.java
    │   │   │   │   └── OrderResponse.java
    │   │   │   └── pricing/
    │   │   │       ├── OrderPricingCalculator.java
    │   │   │       ├── OrderEstimateCalculator.java
    │   │   │       └── DisplayIdGenerator.java
    │   │   ├── catalog/
    │   │   │   ├── ProductCatalog.java
    │   │   │   ├── CouponCatalog.java
    │   │   │   ├── DeliveryAreaCatalog.java
    │   │   │   ├── CatalogConfig.java
    │   │   │   └── domain/
    │   │   │       ├── Product.java
    │   │   │       ├── Coupon.java
    │   │   │       └── DeliveryArea.java
    │   │   ├── store/
    │   │   │   ├── StoreProperties.java
    │   │   │   ├── StoreStatus.java
    │   │   │   └── OpeningHours.java
    │   │   └── common/
    │   │       ├── AdminTokenFilter.java
    │   │       ├── SecurityConfig.java
    │   │       ├── ApiExceptionHandler.java
    │   │       ├── ApiError.java
    │   │       ├── DomainValidationException.java
    │   │       ├── OrderNotFoundException.java
    │   │       ├── InvalidStatusTransitionException.java
    │   │       ├── ClockConfig.java
    │   │       └── RequestLogFilter.java
    │   └── resources/
    │       ├── application.yml
    │       ├── application-dev.yml
    │       ├── application-prod.yml
    │       ├── logback-spring.xml
    │       ├── data/{products,coupons,delivery-areas}.json
    │       └── db/migration/V1__create_orders.sql
    └── test/
        ├── java/com/bragas/api/
        │   ├── BragasApiApplicationIT.java
        │   ├── catalog/{ProductCatalog,CouponCatalog,DeliveryAreaCatalog}Test.java
        │   ├── store/StoreStatusTest.java
        │   ├── order/
        │   │   ├── OrderTest.java
        │   │   ├── domain/OrderStatusTransitionTest.java
        │   │   ├── pricing/{OrderPricingCalculator,OrderEstimateCalculator,DisplayIdGenerator}Test.java
        │   │   ├── OrderControllerIT.java
        │   │   └── OrderAdminControllerIT.java
        │   └── common/FlywayMigrationIT.java
        └── resources/application-test.yml
```

**Modificar:**
- `.gitignore` (raiz): adicionar `backend/build/`, `backend/.gradle/`, `backend/.env`.

---

## Task 1 — Bootstrap do projeto Spring Boot

**Files:**
- Create: `backend/build.gradle.kts`, `backend/settings.gradle.kts`, wrapper files, `backend/src/main/java/com/bragas/api/BragasApiApplication.java`, `backend/src/main/resources/application.yml`, `backend/.gitignore`, `backend/docker-compose.yml`, `backend/.env.example`
- Modify: `.gitignore` (raiz)

- [ ] **Step 1: Configurar JAVA_HOME no shell atual**

Bash (mingw):
```bash
export JAVA_HOME="/c/Program Files/Java/jdk-21.0.10"
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

Expected: `java version "21.0.10"`.

- [ ] **Step 2: Gerar esqueleto via Spring Initializr**

```bash
mkdir -p backend && cd backend
curl https://start.spring.io/starter.zip \
  -d type=gradle-project-kotlin \
  -d language=java \
  -d bootVersion=3.3.5 \
  -d baseDir=. \
  -d groupId=com.bragas \
  -d artifactId=bragas-api \
  -d name=bragas-api \
  -d description="Backend de pedidos do Braga's Burger" \
  -d packageName=com.bragas.api \
  -d packaging=jar \
  -d javaVersion=21 \
  -d dependencies=web,data-jpa,validation,security,actuator,postgresql,flyway,testcontainers \
  -o starter.zip
unzip starter.zip && rm starter.zip
ls
```

Expected: arquivos `build.gradle.kts`, `settings.gradle.kts`, `gradlew`, `gradle/`, `src/main/java/com/bragas/api/BragasApiApplication.java`, `src/main/resources/application.properties` (vamos trocar pra YAML).

Se `start.spring.io` estiver fora do ar, abra https://start.spring.io no browser, monte com as mesmas opções, baixe e extraia em `backend/`.

- [ ] **Step 3: Adicionar deps extras no `build.gradle.kts`**

Abrir `backend/build.gradle.kts`, achar o bloco `dependencies { ... }` e acrescentar (mantendo as existentes):

```kotlin
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("com.github.f4b6a3:ulid-creator:5.2.3")
    implementation("net.logstash.logback:logstash-logback-encoder:7.4")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
```

- [ ] **Step 4: Trocar `application.properties` por `application.yml`**

```bash
rm src/main/resources/application.properties
```

Criar `src/main/resources/application.yml`:

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
      mon: null
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
```

Criar `src/main/resources/application-dev.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/bragas
    username: bragas
    password: bragas
  jpa:
    show-sql: false

logging:
  level:
    root: INFO
    com.bragas.api: DEBUG
```

Criar `src/main/resources/application-prod.yml`:

```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASSWORD}

logging:
  level:
    root: INFO
```

- [ ] **Step 5: Criar `docker-compose.yml`**

`backend/docker-compose.yml`:

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
      - "5432:5432"
    volumes:
      - bragas-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bragas -d bragas"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  bragas-postgres-data:
```

- [ ] **Step 6: Criar `.env.example` e `.gitignore` do backend**

`backend/.env.example`:
```
ADMIN_TOKEN=changeme-em-producao
SPRING_PROFILES_ACTIVE=dev
```

`backend/.gitignore`:
```
build/
.gradle/
.env
out/
*.iml
.idea/
.vscode/
HELP.md
```

- [ ] **Step 7: Atualizar `.gitignore` da raiz**

Acrescentar ao `.gitignore` da raiz do repo:

```
# Backend
backend/build/
backend/.gradle/
backend/.env
```

- [ ] **Step 8: Adicionar plugin de Flyway no `build.gradle.kts`**

Não é necessário pro core; já vem via `flyway-core`. Mas adicione no topo do arquivo (em `plugins { ... }`):

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
}
```

(Já deve estar lá se veio do Initializr; só confirmar.)

- [ ] **Step 9: Confirmar build mínimo (sem rodar app ainda)**

A partir da raiz do repo:

```bash
export JAVA_HOME="/c/Program Files/Java/jdk-21.0.10" && cd backend && ./gradlew --version
```

Expected: imprime versão Gradle e JVM 21.

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 10: Commit**

Da raiz do repo:

```bash
git add backend/ .gitignore && git commit -m "feat(backend): bootstrap Spring Boot 3 com Postgres + Docker"
```

---

## Task 2 — Enums de domínio + matriz de transições

**Files:**
- Create: `backend/src/main/java/com/bragas/api/order/domain/OrderStatus.java`
- Create: `backend/src/main/java/com/bragas/api/order/domain/FulfillmentType.java`
- Create: `backend/src/main/java/com/bragas/api/order/domain/PaymentMethod.java`
- Create: `backend/src/main/java/com/bragas/api/order/domain/OrderStatusTransition.java`
- Test: `backend/src/test/java/com/bragas/api/order/domain/OrderStatusTransitionTest.java`

- [ ] **Step 1: Criar os 3 enums**

`OrderStatus.java`:
```java
package com.bragas.api.order.domain;

public enum OrderStatus {
    RECEIVED, PREPARING, OUT, DELIVERED, CANCELLED
}
```

`FulfillmentType.java`:
```java
package com.bragas.api.order.domain;

public enum FulfillmentType { DELIVERY, PICKUP }
```

`PaymentMethod.java`:
```java
package com.bragas.api.order.domain;

public enum PaymentMethod { PIX, CASH, CREDIT, DEBIT }
```

- [ ] **Step 2: Escrever teste falhando da matriz de transições**

`OrderStatusTransitionTest.java`:

```java
package com.bragas.api.order.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static com.bragas.api.order.domain.OrderStatus.*;
import static org.assertj.core.api.Assertions.assertThat;

class OrderStatusTransitionTest {

    @Test
    void receivedCanGoToPreparingOrCancelled() {
        assertThat(OrderStatusTransition.isValid(RECEIVED, PREPARING)).isTrue();
        assertThat(OrderStatusTransition.isValid(RECEIVED, CANCELLED)).isTrue();
    }

    @Test
    void preparingCanGoToOutOrCancelled() {
        assertThat(OrderStatusTransition.isValid(PREPARING, OUT)).isTrue();
        assertThat(OrderStatusTransition.isValid(PREPARING, CANCELLED)).isTrue();
    }

    @Test
    void outCanGoToDeliveredOrCancelled() {
        assertThat(OrderStatusTransition.isValid(OUT, DELIVERED)).isTrue();
        assertThat(OrderStatusTransition.isValid(OUT, CANCELLED)).isTrue();
    }

    @Test
    void deliveredIsFinal() {
        for (OrderStatus to : OrderStatus.values()) {
            assertThat(OrderStatusTransition.isValid(DELIVERED, to))
                .as("delivered → %s", to)
                .isFalse();
        }
    }

    @Test
    void cancelledIsFinal() {
        for (OrderStatus to : OrderStatus.values()) {
            assertThat(OrderStatusTransition.isValid(CANCELLED, to)).isFalse();
        }
    }

    @ParameterizedTest
    @MethodSource("invalidTransitions")
    void rejectsInvalidTransitions(OrderStatus from, OrderStatus to) {
        assertThat(OrderStatusTransition.isValid(from, to)).isFalse();
    }

    static Stream<Object[]> invalidTransitions() {
        return Stream.of(
            new Object[]{RECEIVED, OUT},
            new Object[]{RECEIVED, DELIVERED},
            new Object[]{PREPARING, RECEIVED},
            new Object[]{PREPARING, DELIVERED},
            new Object[]{OUT, RECEIVED},
            new Object[]{OUT, PREPARING}
        );
    }

    @Test
    void selfTransitionIsInvalid() {
        for (OrderStatus s : OrderStatus.values()) {
            assertThat(OrderStatusTransition.isValid(s, s)).isFalse();
        }
    }
}
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
./gradlew test --tests OrderStatusTransitionTest 2>&1 | tail -10
```

Expected: erro de compilação (`OrderStatusTransition` não existe).

- [ ] **Step 4: Implementar `OrderStatusTransition`**

```java
package com.bragas.api.order.domain;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public final class OrderStatusTransition {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED;

    static {
        ALLOWED = new EnumMap<>(OrderStatus.class);
        ALLOWED.put(OrderStatus.RECEIVED,  EnumSet.of(OrderStatus.PREPARING, OrderStatus.CANCELLED));
        ALLOWED.put(OrderStatus.PREPARING, EnumSet.of(OrderStatus.OUT,        OrderStatus.CANCELLED));
        ALLOWED.put(OrderStatus.OUT,       EnumSet.of(OrderStatus.DELIVERED,  OrderStatus.CANCELLED));
        ALLOWED.put(OrderStatus.DELIVERED, EnumSet.noneOf(OrderStatus.class));
        ALLOWED.put(OrderStatus.CANCELLED, EnumSet.noneOf(OrderStatus.class));
    }

    private OrderStatusTransition() {}

    public static boolean isValid(OrderStatus from, OrderStatus to) {
        return ALLOWED.getOrDefault(from, EnumSet.noneOf(OrderStatus.class)).contains(to);
    }
}
```

- [ ] **Step 5: Rodar e ver passar**

```bash
./gradlew test --tests OrderStatusTransitionTest 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL` com todos os testes passando.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/domain/ backend/src/test/java/com/bragas/api/order/domain/
git commit -m "feat(order): enums e matriz de transição de status"
```

---

## Task 3 — Store opening hours + StoreStatus

**Files:**
- Create: `backend/src/main/java/com/bragas/api/store/OpeningHours.java`
- Create: `backend/src/main/java/com/bragas/api/store/StoreProperties.java`
- Create: `backend/src/main/java/com/bragas/api/store/StoreStatus.java`
- Test: `backend/src/test/java/com/bragas/api/store/StoreStatusTest.java`

- [ ] **Step 1: Criar record `OpeningHours`**

```java
package com.bragas.api.store;

import java.time.LocalTime;

public record OpeningHours(LocalTime open, LocalTime close) {}
```

- [ ] **Step 2: Criar `StoreProperties`**

```java
package com.bragas.api.store;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.util.Map;

@ConfigurationProperties(prefix = "app.store")
public record StoreProperties(
    BigDecimal minOrder,
    int averagePrepTime,
    Map<String, OpeningHours> openingHours
) {}
```

E habilitar properties no app principal — abrir `BragasApiApplication.java` e adicionar:

```java
package com.bragas.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BragasApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(BragasApiApplication.class, args);
    }
}
```

- [ ] **Step 3: Escrever teste falhando**

`StoreStatusTest.java`:

```java
package com.bragas.api.store;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StoreStatusTest {

    private StoreStatus storeStatus(Map<String, OpeningHours> hours) {
        return new StoreStatus(hours);
    }

    private Map<String, OpeningHours> defaultHours() {
        var m = new HashMap<String, OpeningHours>();
        m.put("sun", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(0, 0)));
        m.put("mon", null);
        m.put("tue", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(23, 40)));
        m.put("wed", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(23, 40)));
        m.put("thu", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(23, 40)));
        m.put("fri", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(0, 0)));
        m.put("sat", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(0, 0)));
        return m;
    }

    @Test
    void closedOnMonday() {
        // 2026-05-18 é segunda
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 18, 19, 0))).isFalse();
    }

    @Test
    void openOnTuesdayAt19h() {
        // 2026-05-19 é terça
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 19, 19, 0))).isTrue();
    }

    @Test
    void closedTuesdayBefore18h() {
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 19, 17, 59))).isFalse();
    }

    @Test
    void closedTuesdayAfter2340() {
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 19, 23, 41))).isFalse();
    }

    @Test
    void openFridayAt23h() {
        // 2026-05-22 é sexta — fecha 00:00 (próximo dia)
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 22, 23, 0))).isTrue();
    }

    @Test
    void closedSundayAt17h59() {
        // 2026-05-17 é domingo — abre 18:00
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 17, 17, 59))).isFalse();
    }
}
```

- [ ] **Step 4: Rodar e ver falhar**

```bash
./gradlew test --tests StoreStatusTest 2>&1 | tail -10
```

Expected: erro de compilação.

- [ ] **Step 5: Implementar `StoreStatus`**

```java
package com.bragas.api.store;

import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

@Component
public class StoreStatus {

    private static final String[] DAY_KEYS = { "mon", "tue", "wed", "thu", "fri", "sat", "sun" };

    private final Map<String, OpeningHours> hours;

    public StoreStatus(StoreProperties props) {
        this(props.openingHours());
    }

    // construtor secundário, usado em testes
    public StoreStatus(Map<String, OpeningHours> hours) {
        this.hours = hours;
    }

    public boolean isOpen(LocalDateTime now) {
        OpeningHours today = hours.get(keyFor(now.getDayOfWeek()));
        if (today == null) return false;

        LocalTime t = now.toLocalTime();
        LocalTime open  = today.open();
        LocalTime close = today.close();

        // fecha 00:00 = vira pra dia seguinte
        if (close.equals(LocalTime.MIDNIGHT)) {
            return !t.isBefore(open);
        }
        // janela normal
        return !t.isBefore(open) && t.isBefore(close);
    }

    private static String keyFor(DayOfWeek d) {
        return DAY_KEYS[d.getValue() - 1];
    }
}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
./gradlew test --tests StoreStatusTest 2>&1 | tail -10
```

Expected: 6/6 verde.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/bragas/api/store/ backend/src/test/java/com/bragas/api/store/ backend/src/main/java/com/bragas/api/BragasApiApplication.java
git commit -m "feat(store): StoreStatus.isOpen com horários por dia"
```

---

## Task 4 — Catálogos (Product/Coupon/DeliveryArea) + JSON + loaders

**Files:**
- Create: `backend/src/main/java/com/bragas/api/catalog/domain/{Product,Coupon,DeliveryArea}.java`
- Create: `backend/src/main/java/com/bragas/api/catalog/{ProductCatalog,CouponCatalog,DeliveryAreaCatalog,CatalogConfig}.java`
- Create: `backend/src/main/resources/data/{products,coupons,delivery-areas}.json`
- Test: `backend/src/test/java/com/bragas/api/catalog/{ProductCatalog,CouponCatalog,DeliveryAreaCatalog}Test.java`

- [ ] **Step 1: Criar os records de domínio**

`catalog/domain/Product.java`:
```java
package com.bragas.api.catalog.domain;

import java.math.BigDecimal;

public record Product(
    String id,
    String categoryId,
    String name,
    BigDecimal price,
    boolean available
) {}
```

`catalog/domain/Coupon.java`:
```java
package com.bragas.api.catalog.domain;

import java.math.BigDecimal;

public record Coupon(
    String code,
    Type type,
    BigDecimal value,
    BigDecimal minSubtotal  // pode ser null
) {
    public enum Type { PERCENT, FIXED }
}
```

`catalog/domain/DeliveryArea.java`:
```java
package com.bragas.api.catalog.domain;

import java.math.BigDecimal;

public record DeliveryArea(String neighborhood, BigDecimal fee) {}
```

- [ ] **Step 2: Criar JSON de seed**

`backend/src/main/resources/data/products.json` — copiar do `data/menu.ts` do front. Comece com 5 itens mínimos pro MVP (você pode ampliar depois):

```json
[
  { "id": "chicken",         "categoryId": "burgers", "name": "Chicken",         "price": 25.90, "available": true },
  { "id": "crispy-catupiry", "categoryId": "burgers", "name": "Crispy Catupiry", "price": 39.90, "available": true },
  { "id": "fritas-grande",   "categoryId": "porcoes", "name": "Fritas Grande",   "price": 29.90, "available": true },
  { "id": "coca-cola-2l",    "categoryId": "bebidas", "name": "Coca-Cola 2L",    "price": 14.90, "available": true },
  { "id": "esgotado-test",   "categoryId": "burgers", "name": "Teste Esgotado",  "price": 10.00, "available": false }
]
```

`backend/src/main/resources/data/coupons.json`:

```json
[
  { "code": "BEMVINDO10", "type": "PERCENT", "value": 10, "minSubtotal": null },
  { "code": "FRETE5",     "type": "FIXED",   "value":  5, "minSubtotal":   40 }
]
```

`backend/src/main/resources/data/delivery-areas.json`:

```json
[
  { "neighborhood": "Higienópolis", "fee": 4.99 },
  { "neighborhood": "Tijuca",       "fee": 6.99 },
  { "neighborhood": "Méier",        "fee": 7.99 }
]
```

- [ ] **Step 3: Escrever testes falhando dos 3 catálogos**

`ProductCatalogTest.java`:

```java
package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Product;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

class ProductCatalogTest {

    private ProductCatalog catalog(List<Product> products) {
        return new ProductCatalog(products);
    }

    @Test
    void findByIdReturnsProductWhenExists() {
        var p = new Product("chicken", "burgers", "Chicken", new BigDecimal("25.90"), true);
        assertThat(catalog(List.of(p)).findById("chicken")).contains(p);
    }

    @Test
    void findByIdReturnsEmptyWhenNotExists() {
        assertThat(catalog(List.of()).findById("nope")).isEmpty();
    }

    @Test
    void requireAllPassesWhenAllExistAndAvailable() {
        var p1 = new Product("a", "x", "A", new BigDecimal("1"), true);
        var p2 = new Product("b", "x", "B", new BigDecimal("2"), true);
        assertThatCode(() -> catalog(List.of(p1, p2)).requireAll(List.of("a", "b")))
            .doesNotThrowAnyException();
    }

    @Test
    void requireAllThrowsWhenAnyMissing() {
        var p = new Product("a", "x", "A", new BigDecimal("1"), true);
        assertThatThrownBy(() -> catalog(List.of(p)).requireAll(List.of("a", "missing")))
            .isInstanceOf(ProductCatalog.UnknownProductException.class)
            .hasMessageContaining("missing");
    }

    @Test
    void requireAllThrowsWhenAnyUnavailable() {
        var off = new Product("off", "x", "Off", new BigDecimal("1"), false);
        assertThatThrownBy(() -> catalog(List.of(off)).requireAll(List.of("off")))
            .isInstanceOf(ProductCatalog.UnavailableProductException.class)
            .hasMessageContaining("off");
    }
}
```

`CouponCatalogTest.java`:

```java
package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Coupon;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CouponCatalogTest {

    @Test
    void findReturnsCouponWhenExists() {
        var c = new Coupon("BEMVINDO10", Coupon.Type.PERCENT, new BigDecimal("10"), null);
        var cat = new CouponCatalog(List.of(c));
        assertThat(cat.find("BEMVINDO10")).contains(c);
    }

    @Test
    void findIsCaseSensitive() {
        var c = new Coupon("BEMVINDO10", Coupon.Type.PERCENT, new BigDecimal("10"), null);
        assertThat(new CouponCatalog(List.of(c)).find("bemvindo10")).isEmpty();
    }

    @Test
    void findReturnsEmptyWhenNotExists() {
        assertThat(new CouponCatalog(List.of()).find("NADA")).isEmpty();
    }
}
```

`DeliveryAreaCatalogTest.java`:

```java
package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.DeliveryArea;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DeliveryAreaCatalogTest {

    @Test
    void findFeeReturnsFeeWhenExists() {
        var a = new DeliveryArea("Higienópolis", new BigDecimal("4.99"));
        assertThat(new DeliveryAreaCatalog(List.of(a)).findFee("Higienópolis"))
            .contains(new BigDecimal("4.99"));
    }

    @Test
    void findFeeIsCaseInsensitive() {
        var a = new DeliveryArea("Higienópolis", new BigDecimal("4.99"));
        assertThat(new DeliveryAreaCatalog(List.of(a)).findFee("higienópolis"))
            .contains(new BigDecimal("4.99"));
    }

    @Test
    void findFeeReturnsEmptyWhenNotExists() {
        assertThat(new DeliveryAreaCatalog(List.of()).findFee("X")).isEmpty();
    }
}
```

- [ ] **Step 4: Rodar e ver falhar**

```bash
./gradlew test --tests "com.bragas.api.catalog.*" 2>&1 | tail -10
```

Expected: erros de compilação.

- [ ] **Step 5: Implementar os 3 catálogos**

`ProductCatalog.java`:

```java
package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Product;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class ProductCatalog {

    private final Map<String, Product> byId;

    public ProductCatalog(List<Product> products) {
        var m = new LinkedHashMap<String, Product>();
        for (var p : products) {
            m.put(p.id(), p);
        }
        this.byId = Map.copyOf(m);
    }

    public Optional<Product> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }

    public void requireAll(Collection<String> ids) {
        for (var id : ids) {
            var p = byId.get(id);
            if (p == null) throw new UnknownProductException(id);
            if (!p.available()) throw new UnavailableProductException(id);
        }
    }

    public static class UnknownProductException extends RuntimeException {
        public UnknownProductException(String id) { super("Produto não encontrado: " + id); }
    }

    public static class UnavailableProductException extends RuntimeException {
        public UnavailableProductException(String id) { super("Produto indisponível: " + id); }
    }
}
```

`CouponCatalog.java`:

```java
package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Coupon;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class CouponCatalog {

    private final Map<String, Coupon> byCode;

    public CouponCatalog(List<Coupon> coupons) {
        var m = new LinkedHashMap<String, Coupon>();
        for (var c : coupons) m.put(c.code(), c);
        this.byCode = Map.copyOf(m);
    }

    public Optional<Coupon> find(String code) {
        return Optional.ofNullable(byCode.get(code));
    }
}
```

`DeliveryAreaCatalog.java`:

```java
package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.DeliveryArea;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

public class DeliveryAreaCatalog {

    private final Map<String, BigDecimal> byNeighborhood;

    public DeliveryAreaCatalog(List<DeliveryArea> areas) {
        var m = new LinkedHashMap<String, BigDecimal>();
        for (var a : areas) m.put(normalize(a.neighborhood()), a.fee());
        this.byNeighborhood = Map.copyOf(m);
    }

    public Optional<BigDecimal> findFee(String neighborhood) {
        return Optional.ofNullable(byNeighborhood.get(normalize(neighborhood)));
    }

    private static String normalize(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }
}
```

- [ ] **Step 6: Criar `CatalogConfig` que carrega os JSONs**

`CatalogConfig.java`:

```java
package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.catalog.domain.DeliveryArea;
import com.bragas.api.catalog.domain.Product;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Configuration
public class CatalogConfig {

    private final ObjectMapper mapper = new ObjectMapper();

    @Bean
    public ProductCatalog productCatalog() throws IOException {
        return new ProductCatalog(load("data/products.json", new TypeReference<>() {}));
    }

    @Bean
    public CouponCatalog couponCatalog() throws IOException {
        return new CouponCatalog(load("data/coupons.json", new TypeReference<>() {}));
    }

    @Bean
    public DeliveryAreaCatalog deliveryAreaCatalog() throws IOException {
        return new DeliveryAreaCatalog(load("data/delivery-areas.json", new TypeReference<>() {}));
    }

    private <T> List<T> load(String path, TypeReference<List<T>> typeRef) throws IOException {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            List<T> list = mapper.readValue(in, typeRef);
            if (list == null || list.isEmpty()) {
                throw new IllegalStateException("Catalog vazio: " + path);
            }
            return list;
        }
    }
}
```

- [ ] **Step 7: Rodar e ver passar**

```bash
./gradlew test --tests "com.bragas.api.catalog.*" 2>&1 | tail -10
```

Expected: 11/11 verde.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/bragas/api/catalog/ backend/src/test/java/com/bragas/api/catalog/ backend/src/main/resources/data/
git commit -m "feat(catalog): Product/Coupon/DeliveryArea catalogs carregados de JSON"
```

---

## Task 5 — Calculadoras (Pricing + Estimate + DisplayIdGenerator)

**Files:**
- Create: `backend/src/main/java/com/bragas/api/order/pricing/OrderPricingCalculator.java`
- Create: `backend/src/main/java/com/bragas/api/order/pricing/OrderEstimateCalculator.java`
- Create: `backend/src/main/java/com/bragas/api/order/pricing/DisplayIdGenerator.java`
- Test: `backend/src/test/java/com/bragas/api/order/pricing/*Test.java`

- [ ] **Step 1: Teste falhando do `OrderPricingCalculator`**

`OrderPricingCalculatorTest.java`:

```java
package com.bragas.api.order.pricing;

import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.catalog.domain.Product;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

class OrderPricingCalculatorTest {

    private final OrderPricingCalculator calc = new OrderPricingCalculator();

    private Product p(String id, String price) {
        return new Product(id, "burgers", id, new BigDecimal(price), true);
    }

    private OrderPricingCalculator.Line line(Product prod, int qty) {
        return new OrderPricingCalculator.Line(prod, qty);
    }

    @Test
    void subtotalSomaPriceVezesQuantity() {
        var lines = List.of(line(p("a", "10.00"), 2), line(p("b", "5.50"), 3));
        var totals = calc.compute(lines, Optional.empty(), Optional.empty());
        assertThat(totals.subtotal()).isEqualByComparingTo("36.50");
    }

    @Test
    void discountPercent() {
        var lines = List.of(line(p("a", "100.00"), 1));
        var coupon = new Coupon("X", Coupon.Type.PERCENT, new BigDecimal("10"), null);
        var totals = calc.compute(lines, Optional.of(coupon), Optional.empty());
        assertThat(totals.discount()).isEqualByComparingTo("10.00");
    }

    @Test
    void discountFixed() {
        var lines = List.of(line(p("a", "100.00"), 1));
        var coupon = new Coupon("X", Coupon.Type.FIXED, new BigDecimal("15"), null);
        var totals = calc.compute(lines, Optional.of(coupon), Optional.empty());
        assertThat(totals.discount()).isEqualByComparingTo("15.00");
    }

    @Test
    void discountClampedToSubtotal() {
        var lines = List.of(line(p("a", "10.00"), 1));
        var coupon = new Coupon("X", Coupon.Type.FIXED, new BigDecimal("999"), null);
        var totals = calc.compute(lines, Optional.of(coupon), Optional.empty());
        assertThat(totals.discount()).isEqualByComparingTo("10.00");
        assertThat(totals.total()).isEqualByComparingTo("0.00");
    }

    @Test
    void deliveryFeeAdicionaNoTotal() {
        var lines = List.of(line(p("a", "30.00"), 1));
        var totals = calc.compute(lines, Optional.empty(), Optional.of(new BigDecimal("4.99")));
        assertThat(totals.deliveryFee()).isEqualByComparingTo("4.99");
        assertThat(totals.total()).isEqualByComparingTo("34.99");
    }

    @Test
    void semCupomDiscountZero() {
        var lines = List.of(line(p("a", "30.00"), 1));
        var totals = calc.compute(lines, Optional.empty(), Optional.empty());
        assertThat(totals.discount()).isEqualByComparingTo("0.00");
    }
}
```

- [ ] **Step 2: Implementar `OrderPricingCalculator`**

```java
package com.bragas.api.order.pricing;

import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.catalog.domain.Product;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Component
public class OrderPricingCalculator {

    public record Line(Product product, int quantity) {}

    public record Totals(BigDecimal subtotal, BigDecimal discount, BigDecimal deliveryFee, BigDecimal total) {}

    public Totals compute(List<Line> lines, Optional<Coupon> coupon, Optional<BigDecimal> deliveryFee) {
        BigDecimal subtotal = BigDecimal.ZERO;
        for (var l : lines) {
            subtotal = subtotal.add(l.product().price().multiply(BigDecimal.valueOf(l.quantity())));
        }
        subtotal = scale(subtotal);

        BigDecimal discount = coupon.map(c -> applyCoupon(subtotal, c)).orElse(BigDecimal.ZERO);
        discount = scale(discount.min(subtotal));

        BigDecimal fee = scale(deliveryFee.orElse(BigDecimal.ZERO));
        BigDecimal total = scale(subtotal.subtract(discount).add(fee));

        return new Totals(subtotal, discount, fee, total);
    }

    private BigDecimal applyCoupon(BigDecimal subtotal, Coupon c) {
        return switch (c.type()) {
            case PERCENT -> subtotal.multiply(c.value()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case FIXED   -> c.value();
        };
    }

    private static BigDecimal scale(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
```

- [ ] **Step 3: Rodar pricing**

```bash
./gradlew test --tests OrderPricingCalculatorTest 2>&1 | tail -10
```

Expected: 6/6 verde.

- [ ] **Step 4: Teste falhando do `OrderEstimateCalculator`**

`OrderEstimateCalculatorTest.java`:

```java
package com.bragas.api.order.pricing;

import com.bragas.api.order.domain.FulfillmentType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class OrderEstimateCalculatorTest {

    private final OrderEstimateCalculator calc = new OrderEstimateCalculator();

    @Test
    void pickupRetornaApenasPrepTime() {
        var range = calc.compute(FulfillmentType.PICKUP, 25, Optional.empty());
        assertThat(range.min()).isEqualTo(20);
        assertThat(range.max()).isEqualTo(30);
    }

    @Test
    void delivery499Adiciona10Min() {
        var range = calc.compute(FulfillmentType.DELIVERY, 25, Optional.of(new BigDecimal("4.99")));
        assertThat(range.min()).isEqualTo(30);
        assertThat(range.max()).isEqualTo(40);
    }

    @Test
    void delivery1099Adiciona40Min() {
        var range = calc.compute(FulfillmentType.DELIVERY, 25, Optional.of(new BigDecimal("10.99")));
        assertThat(range.min()).isEqualTo(60);
        assertThat(range.max()).isEqualTo(70);
    }

    @Test
    void deliveryArredondaParaFaixaMaisProxima() {
        // 6.50 → mais perto de 6.99 (delta 0.49) que de 5.99 (delta 0.51) → 20 min
        var range = calc.compute(FulfillmentType.DELIVERY, 25, Optional.of(new BigDecimal("6.50")));
        assertThat(range.min()).isEqualTo(40);
        assertThat(range.max()).isEqualTo(50);
    }
}
```

- [ ] **Step 5: Implementar `OrderEstimateCalculator`**

```java
package com.bragas.api.order.pricing;

import com.bragas.api.order.domain.FulfillmentType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Component
public class OrderEstimateCalculator {

    public record Range(int min, int max) {}

    private record FeeMinutes(BigDecimal fee, int minutes) {}

    private static final List<FeeMinutes> TABLE = List.of(
        new FeeMinutes(new BigDecimal("4.99"),  10),
        new FeeMinutes(new BigDecimal("5.99"),  15),
        new FeeMinutes(new BigDecimal("6.99"),  20),
        new FeeMinutes(new BigDecimal("7.99"),  25),
        new FeeMinutes(new BigDecimal("8.99"),  30),
        new FeeMinutes(new BigDecimal("9.99"),  35),
        new FeeMinutes(new BigDecimal("10.99"), 40)
    );

    public Range compute(FulfillmentType type, int prepTime, Optional<BigDecimal> deliveryFee) {
        int total = prepTime;
        if (type == FulfillmentType.DELIVERY && deliveryFee.isPresent()) {
            total += closestMinutes(deliveryFee.get());
        }
        return new Range(total - 5, total + 5);
    }

    private static int closestMinutes(BigDecimal fee) {
        FeeMinutes best = TABLE.get(0);
        BigDecimal bestDelta = fee.subtract(best.fee()).abs();
        for (var row : TABLE) {
            var delta = fee.subtract(row.fee()).abs();
            if (delta.compareTo(bestDelta) < 0) {
                best = row;
                bestDelta = delta;
            }
        }
        return best.minutes();
    }
}
```

- [ ] **Step 6: Rodar estimate**

```bash
./gradlew test --tests OrderEstimateCalculatorTest 2>&1 | tail -10
```

Expected: 4/4 verde.

- [ ] **Step 7: Teste falhando do `DisplayIdGenerator`**

`DisplayIdGeneratorTest.java`:

```java
package com.bragas.api.order.pricing;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.*;

class DisplayIdGeneratorTest {

    @Test
    void formatoHashtagComQuatroDigitos() {
        var gen = new DisplayIdGenerator(any -> false);
        var id = gen.next();
        assertThat(id).matches("^#\\d{4}$");
    }

    @Test
    void retryQuandoColide() {
        Set<String> taken = new HashSet<>(Set.of("#0001", "#0002"));
        Predicate<String> exists = taken::contains;

        var sequence = new java.util.ArrayDeque<>(java.util.List.of("#0001", "#0002", "#0003"));
        var gen = new DisplayIdGenerator(exists, sequence::poll);

        assertThat(gen.next()).isEqualTo("#0003");
    }

    @Test
    void falhaApos10Colisoes() {
        var gen = new DisplayIdGenerator(any -> true);
        assertThatThrownBy(gen::next)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("colisão");
    }
}
```

- [ ] **Step 8: Implementar `DisplayIdGenerator`**

```java
package com.bragas.api.order.pricing;

import org.springframework.stereotype.Component;

import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Predicate;
import java.util.function.Supplier;

@Component
public class DisplayIdGenerator {

    private static final int MAX_ATTEMPTS = 10;

    private final Predicate<String> existsInRepository;
    private final Supplier<String> candidateSource;

    public DisplayIdGenerator(Predicate<String> existsInRepository) {
        this(existsInRepository, DisplayIdGenerator::randomCandidate);
    }

    // construtor para testes
    public DisplayIdGenerator(Predicate<String> existsInRepository, Supplier<String> candidateSource) {
        this.existsInRepository = existsInRepository;
        this.candidateSource = candidateSource;
    }

    public String next() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            String candidate = candidateSource.get();
            if (!existsInRepository.test(candidate)) return candidate;
        }
        throw new IllegalStateException("Não consegui gerar displayId sem colisão em " + MAX_ATTEMPTS + " tentativas");
    }

    private static String randomCandidate() {
        int n = ThreadLocalRandom.current().nextInt(0, 10_000);
        return String.format("#%04d", n);
    }
}
```

Observação: o `Predicate<String> existsInRepository` vai ser fornecido por uma config bean que recebe o `OrderRepository` (faremos em Task 7). Por ora, o teste injeta um mock.

- [ ] **Step 9: Rodar generator**

```bash
./gradlew test --tests DisplayIdGeneratorTest 2>&1 | tail -10
```

Expected: 3/3 verde.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/pricing/ backend/src/test/java/com/bragas/api/order/pricing/
git commit -m "feat(pricing): calculadoras de preço, estimativa e displayId"
```

---

## Task 6 — Migration V1 + JPA entities

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__create_orders.sql`
- Create: `backend/src/main/java/com/bragas/api/order/domain/Order.java`
- Create: `backend/src/main/java/com/bragas/api/order/domain/OrderItem.java`
- Test: `backend/src/test/java/com/bragas/api/order/OrderTest.java`

- [ ] **Step 1: Criar migration V1**

`backend/src/main/resources/db/migration/V1__create_orders.sql`:

```sql
CREATE TABLE orders (
  id                   VARCHAR(32)   PRIMARY KEY,
  display_id           VARCHAR(5)    NOT NULL UNIQUE,
  status               VARCHAR(20)   NOT NULL DEFAULT 'RECEIVED'
                       CHECK (status IN ('RECEIVED','PREPARING','OUT','DELIVERED','CANCELLED')),

  customer_name        VARCHAR(120)  NOT NULL,
  customer_phone       VARCHAR(40)   NOT NULL,

  fulfillment_type     VARCHAR(20)   NOT NULL
                       CHECK (fulfillment_type IN ('DELIVERY','PICKUP')),
  address_cep          VARCHAR(10),
  address_street       VARCHAR(200),
  address_number       VARCHAR(20),
  address_neighborhood VARCHAR(120),
  address_complement   VARCHAR(200),
  address_reference    VARCHAR(200),

  payment              VARCHAR(20)   NOT NULL
                       CHECK (payment IN ('PIX','CASH','CREDIT','DEBIT')),
  change_for           NUMERIC(10,2),

  coupon_code          VARCHAR(40),
  coupon_discount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal             NUMERIC(10,2) NOT NULL,
  delivery_fee         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                NUMERIC(10,2) NOT NULL,

  estimated_min        INT NOT NULL,
  estimated_max        INT NOT NULL,

  received_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  preparing_at         TIMESTAMPTZ,
  out_at               TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT delivery_has_address CHECK (
    fulfillment_type = 'PICKUP'
    OR (address_street IS NOT NULL AND address_neighborhood IS NOT NULL)
  )
);

CREATE INDEX idx_orders_display_id ON orders (display_id);
CREATE INDEX idx_orders_status     ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

CREATE TABLE order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      VARCHAR(32)  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  position      INT          NOT NULL,
  product_id    VARCHAR(80)  NOT NULL,
  product_name  VARCHAR(200) NOT NULL,
  unit_price    NUMERIC(10,2) NOT NULL,
  quantity      INT          NOT NULL CHECK (quantity > 0),
  notes         TEXT,
  UNIQUE (order_id, position)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

Observação: usamos `VARCHAR(...) CHECK (...)` em vez de tipos `ENUM` do Postgres, pra simplificar o mapeamento com Hibernate (`@Enumerated(EnumType.STRING)` mapeia direto).

- [ ] **Step 2: Criar entity `Order`**

`Order.java`:

```java
package com.bragas.api.order.domain;

import com.github.f4b6a3.ulid.UlidCreator;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @Column(length = 32)
    private String id;

    @Column(name = "display_id", length = 5, nullable = false, unique = true)
    private String displayId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(name = "customer_name", nullable = false, length = 120)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 40)
    private String customerPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_type", nullable = false, length = 20)
    private FulfillmentType fulfillmentType;

    @Column(name = "address_cep", length = 10)          private String addressCep;
    @Column(name = "address_street", length = 200)      private String addressStreet;
    @Column(name = "address_number", length = 20)       private String addressNumber;
    @Column(name = "address_neighborhood", length = 120) private String addressNeighborhood;
    @Column(name = "address_complement", length = 200)  private String addressComplement;
    @Column(name = "address_reference", length = 200)   private String addressReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod payment;

    @Column(name = "change_for", precision = 10, scale = 2)
    private BigDecimal changeFor;

    @Column(name = "coupon_code", length = 40)
    private String couponCode;

    @Column(name = "coupon_discount", precision = 10, scale = 2, nullable = false)
    private BigDecimal couponDiscount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "delivery_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "estimated_min", nullable = false) private int estimatedMin;
    @Column(name = "estimated_max", nullable = false) private int estimatedMax;

    @Column(name = "received_at",  nullable = false) private OffsetDateTime receivedAt;
    @Column(name = "preparing_at")                    private OffsetDateTime preparingAt;
    @Column(name = "out_at")                          private OffsetDateTime outAt;
    @Column(name = "delivered_at")                    private OffsetDateTime deliveredAt;
    @Column(name = "cancelled_at")                    private OffsetDateTime cancelledAt;

    @Column(name = "created_at", nullable = false, updatable = false) private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false) private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position ASC")
    private List<OrderItem> items = new ArrayList<>();

    protected Order() {}

    public static Order create(String displayId, String customerName, String customerPhone,
                                FulfillmentType fulfillmentType, PaymentMethod payment,
                                OffsetDateTime now) {
        Order o = new Order();
        o.id = "ord_" + UlidCreator.getUlid();
        o.displayId = displayId;
        o.status = OrderStatus.RECEIVED;
        o.customerName = customerName;
        o.customerPhone = customerPhone;
        o.fulfillmentType = fulfillmentType;
        o.payment = payment;
        o.receivedAt = now;
        o.createdAt = now;
        return o;
    }

    public void applyTransition(OrderStatus to, OffsetDateTime when) {
        if (!OrderStatusTransition.isValid(this.status, to)) {
            throw new IllegalStateException("Transição inválida: " + status + " → " + to);
        }
        this.status = to;
        switch (to) {
            case PREPARING -> this.preparingAt = when;
            case OUT       -> this.outAt = when;
            case DELIVERED -> this.deliveredAt = when;
            case CANCELLED -> this.cancelledAt = when;
            default -> {}
        }
    }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
    }

    // Getters + setters (gerados pela IDE ou escritos à mão)
    public String getId() { return id; }
    public String getDisplayId() { return displayId; }
    public OrderStatus getStatus() { return status; }
    public String getCustomerName() { return customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public FulfillmentType getFulfillmentType() { return fulfillmentType; }
    public String getAddressCep() { return addressCep; }
    public String getAddressStreet() { return addressStreet; }
    public String getAddressNumber() { return addressNumber; }
    public String getAddressNeighborhood() { return addressNeighborhood; }
    public String getAddressComplement() { return addressComplement; }
    public String getAddressReference() { return addressReference; }
    public PaymentMethod getPayment() { return payment; }
    public BigDecimal getChangeFor() { return changeFor; }
    public String getCouponCode() { return couponCode; }
    public BigDecimal getCouponDiscount() { return couponDiscount; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getDeliveryFee() { return deliveryFee; }
    public BigDecimal getTotal() { return total; }
    public int getEstimatedMin() { return estimatedMin; }
    public int getEstimatedMax() { return estimatedMax; }
    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public OffsetDateTime getPreparingAt() { return preparingAt; }
    public OffsetDateTime getOutAt() { return outAt; }
    public OffsetDateTime getDeliveredAt() { return deliveredAt; }
    public OffsetDateTime getCancelledAt() { return cancelledAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public List<OrderItem> getItems() { return items; }

    public void setAddress(String cep, String street, String number, String neighborhood, String complement, String reference) {
        this.addressCep = cep;
        this.addressStreet = street;
        this.addressNumber = number;
        this.addressNeighborhood = neighborhood;
        this.addressComplement = complement;
        this.addressReference = reference;
    }
    public void setChangeFor(BigDecimal changeFor) { this.changeFor = changeFor; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public void setCouponDiscount(BigDecimal couponDiscount) { this.couponDiscount = couponDiscount; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public void setDeliveryFee(BigDecimal deliveryFee) { this.deliveryFee = deliveryFee; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public void setEstimatedMin(int estimatedMin) { this.estimatedMin = estimatedMin; }
    public void setEstimatedMax(int estimatedMax) { this.estimatedMax = estimatedMax; }
}
```

- [ ] **Step 3: Criar entity `OrderItem`**

`OrderItem.java`:

```java
package com.bragas.api.order.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false)
    private int position;

    @Column(name = "product_id", nullable = false, length = 80)
    private String productId;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(columnDefinition = "TEXT")
    private String notes;

    protected OrderItem() {}

    public OrderItem(int position, String productId, String productName, BigDecimal unitPrice, int quantity, String notes) {
        this.position = position;
        this.productId = productId;
        this.productName = productName;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
        this.notes = notes;
    }

    void setOrder(Order order) { this.order = order; }

    public int getPosition() { return position; }
    public String getProductId() { return productId; }
    public String getProductName() { return productName; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public String getNotes() { return notes; }
}
```

- [ ] **Step 4: Teste falhando de `Order.applyTransition`**

`OrderTest.java`:

```java
package com.bragas.api.order;

import com.bragas.api.order.domain.FulfillmentType;
import com.bragas.api.order.domain.Order;
import com.bragas.api.order.domain.OrderStatus;
import com.bragas.api.order.domain.PaymentMethod;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.*;

class OrderTest {

    private static final OffsetDateTime T0 = OffsetDateTime.of(2026, 5, 20, 18, 0, 0, 0, ZoneOffset.UTC);
    private static final OffsetDateTime T1 = T0.plusMinutes(5);

    private Order receivedOrder() {
        return Order.create("#1234", "João", "(21) 99999-0000",
            FulfillmentType.DELIVERY, PaymentMethod.CREDIT, T0);
    }

    @Test
    void aplicaTransitionValidaEMarcaTimestamp() {
        var o = receivedOrder();
        o.applyTransition(OrderStatus.PREPARING, T1);
        assertThat(o.getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(o.getPreparingAt()).isEqualTo(T1);
    }

    @Test
    void rejeitaTransitionInvalida() {
        var o = receivedOrder();
        assertThatThrownBy(() -> o.applyTransition(OrderStatus.DELIVERED, T1))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejeitaTransitionDeEstadoFinal() {
        var o = receivedOrder();
        o.applyTransition(OrderStatus.CANCELLED, T1);
        assertThatThrownBy(() -> o.applyTransition(OrderStatus.PREPARING, T1))
            .isInstanceOf(IllegalStateException.class);
    }
}
```

- [ ] **Step 5: Rodar e ver passar**

A entity já implementa `applyTransition`. Rodar:

```bash
./gradlew test --tests OrderTest 2>&1 | tail -10
```

Expected: 3/3 verde.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/ backend/src/main/java/com/bragas/api/order/domain/Order.java backend/src/main/java/com/bragas/api/order/domain/OrderItem.java backend/src/test/java/com/bragas/api/order/OrderTest.java
git commit -m "feat(order): migration V1 + entidades JPA Order/OrderItem"
```

---

## Task 7 — Repositories + Flyway IT + DisplayIdGenerator bean wiring

**Files:**
- Create: `backend/src/main/java/com/bragas/api/order/OrderRepository.java`
- Create: `backend/src/main/java/com/bragas/api/order/OrderItemRepository.java`
- Create: `backend/src/main/java/com/bragas/api/common/ClockConfig.java`
- Create: `backend/src/main/java/com/bragas/api/order/pricing/DisplayIdGeneratorConfig.java`
- Test: `backend/src/test/java/com/bragas/api/common/FlywayMigrationIT.java`
- Test: `backend/src/test/resources/application-test.yml`

- [ ] **Step 1: Criar repositories**

`OrderRepository.java`:

```java
package com.bragas.api.order;

import com.bragas.api.order.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, String> {
    Optional<Order> findByDisplayId(String displayId);
    boolean existsByDisplayId(String displayId);
}
```

`OrderItemRepository.java`:

```java
package com.bragas.api.order;

import com.bragas.api.order.domain.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {}
```

- [ ] **Step 2: Criar `ClockConfig`**

`common/ClockConfig.java`:

```java
package com.bragas.api.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneOffset;

@Configuration
public class ClockConfig {
    @Bean
    public Clock clock() {
        return Clock.system(ZoneOffset.UTC);
    }
}
```

- [ ] **Step 3: Criar `DisplayIdGeneratorConfig` que liga o generator ao repository**

Substituir a anotação `@Component` em `DisplayIdGenerator` por nada (manter só o construtor) — quem cria o bean é a config. Mas mais simples: deixar o `@Component` e adicionar um construtor que recebe o repository.

Reabrir `DisplayIdGenerator.java` e trocar os dois construtores por:

```java
public DisplayIdGenerator(OrderRepository repo) {
    this(repo::existsByDisplayId, DisplayIdGenerator::randomCandidate);
}

// usado em testes
DisplayIdGenerator(java.util.function.Predicate<String> existsInRepository,
                   java.util.function.Supplier<String> candidateSource) {
    this.existsInRepository = existsInRepository;
    this.candidateSource = candidateSource;
}
```

E importar `com.bragas.api.order.OrderRepository`.

- [ ] **Step 4: Criar `application-test.yml`**

`backend/src/test/resources/application-test.yml`:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.format_sql: false

logging:
  level:
    org.hibernate.SQL: WARN

app:
  store:
    minOrder: 25.00
    averagePrepTime: 25
    openingHours:
      sun: { open: "18:00", close: "00:00" }
      mon: null
      tue: { open: "18:00", close: "23:40" }
      wed: { open: "18:00", close: "23:40" }
      thu: { open: "18:00", close: "23:40" }
      fri: { open: "18:00", close: "00:00" }
      sat: { open: "18:00", close: "00:00" }
  admin:
    token: test-admin-token
  cors:
    allowedOrigins: []
```

- [ ] **Step 5: Criar `FlywayMigrationIT`**

`backend/src/test/java/com/bragas/api/common/FlywayMigrationIT.java`:

```java
package com.bragas.api.common;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.Connection;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class FlywayMigrationIT {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("bragas")
        .withUsername("bragas")
        .withPassword("bragas");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",      postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired DataSource dataSource;

    @Test
    void migrationCriouTabelasOrdersEOrderItems() throws Exception {
        try (Connection c = dataSource.getConnection()) {
            try (var rs = c.getMetaData().getTables(null, null, "orders", null)) {
                assertThat(rs.next()).isTrue();
            }
            try (var rs = c.getMetaData().getTables(null, null, "order_items", null)) {
                assertThat(rs.next()).isTrue();
            }
        }
    }
}
```

- [ ] **Step 6: Rodar IT (precisa Docker em execução)**

```bash
./gradlew test --tests FlywayMigrationIT 2>&1 | tail -15
```

Expected: 1/1 verde. Primeira execução leva ~30s baixando imagem do Postgres.

Se falhar com "Cannot connect to Docker daemon": abra Docker Desktop, espere ficar `Running`, repita.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/OrderRepository.java backend/src/main/java/com/bragas/api/order/OrderItemRepository.java backend/src/main/java/com/bragas/api/common/ClockConfig.java backend/src/main/java/com/bragas/api/order/pricing/DisplayIdGenerator.java backend/src/test/java/com/bragas/api/common/FlywayMigrationIT.java backend/src/test/resources/application-test.yml
git commit -m "feat(order): repositories + Flyway IT com Testcontainers"
```

---

## Task 8 — DTOs

**Files:**
- Create: `backend/src/main/java/com/bragas/api/order/dto/CreateOrderRequest.java`
- Create: `backend/src/main/java/com/bragas/api/order/dto/UpdateStatusRequest.java`
- Create: `backend/src/main/java/com/bragas/api/order/dto/OrderResponse.java`

- [ ] **Step 1: Criar `CreateOrderRequest`**

`CreateOrderRequest.java`:

```java
package com.bragas.api.order.dto;

import com.bragas.api.order.domain.FulfillmentType;
import com.bragas.api.order.domain.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

public record CreateOrderRequest(
    @NotNull @Valid Customer customer,
    @NotNull FulfillmentType fulfillmentType,
    @Valid Address address,
    @NotNull PaymentMethod payment,
    @DecimalMin("0.00") BigDecimal changeFor,
    @NotEmpty @Valid List<Item> items,
    @Size(max = 40) String couponCode
) {
    public record Customer(
        @NotBlank @Size(min = 2, max = 120) String name,
        @NotBlank @Size(min = 8, max = 40)  String phone
    ) {}

    public record Address(
        @Size(max = 10)  String cep,
        @NotBlank @Size(max = 200) String street,
        @NotBlank @Size(max = 20)  String number,
        @NotBlank @Size(max = 120) String neighborhood,
        @Size(max = 200) String complement,
        @Size(max = 200) String reference
    ) {}

    public record Item(
        @NotBlank String productId,
        @Min(1)   int quantity,
        @Size(max = 200) String notes
    ) {}
}
```

- [ ] **Step 2: Criar `UpdateStatusRequest`**

`UpdateStatusRequest.java`:

```java
package com.bragas.api.order.dto;

import com.bragas.api.order.domain.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(
    @NotNull OrderStatus to
) {}
```

- [ ] **Step 3: Criar `OrderResponse`**

`OrderResponse.java`:

```java
package com.bragas.api.order.dto;

import com.bragas.api.order.domain.FulfillmentType;
import com.bragas.api.order.domain.Order;
import com.bragas.api.order.domain.OrderStatus;
import com.bragas.api.order.domain.PaymentMethod;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

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
    Timestamps timestamps
) {
    public record Customer(String name, String phone) {}
    public record Address(String cep, String street, String number, String neighborhood, String complement, String reference) {}
    public record Item(String productId, String productName, BigDecimal unitPrice, int quantity, String notes) {}
    public record Totals(BigDecimal subtotal, BigDecimal discount, BigDecimal deliveryFee, BigDecimal total) {}
    public record Range(int min, int max) {}
    public record Timestamps(
        OffsetDateTime receivedAt,
        OffsetDateTime preparingAt,
        OffsetDateTime outAt,
        OffsetDateTime deliveredAt,
        OffsetDateTime cancelledAt
    ) {}

    public static OrderResponse from(Order o) {
        Address address = o.getAddressStreet() == null ? null : new Address(
            o.getAddressCep(), o.getAddressStreet(), o.getAddressNumber(),
            o.getAddressNeighborhood(), o.getAddressComplement(), o.getAddressReference()
        );

        List<Item> items = o.getItems().stream()
            .map(i -> new Item(i.getProductId(), i.getProductName(), i.getUnitPrice(), i.getQuantity(), i.getNotes()))
            .toList();

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
            new Timestamps(o.getReceivedAt(), o.getPreparingAt(), o.getOutAt(), o.getDeliveredAt(), o.getCancelledAt())
        );
    }
}
```

- [ ] **Step 4: Compilar pra garantir que tudo casa**

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/dto/
git commit -m "feat(order): DTOs de request e response com validação"
```

---

## Task 9 — Exceções de domínio + ApiError + ApiExceptionHandler

**Files:**
- Create: `backend/src/main/java/com/bragas/api/common/DomainValidationException.java`
- Create: `backend/src/main/java/com/bragas/api/common/OrderNotFoundException.java`
- Create: `backend/src/main/java/com/bragas/api/common/InvalidStatusTransitionException.java`
- Create: `backend/src/main/java/com/bragas/api/common/ApiError.java`
- Create: `backend/src/main/java/com/bragas/api/common/ApiExceptionHandler.java`

- [ ] **Step 1: Criar exceções**

`DomainValidationException.java`:

```java
package com.bragas.api.common;

public class DomainValidationException extends RuntimeException {
    private final String typeSlug;
    private final String title;

    public DomainValidationException(String typeSlug, String title, String detail) {
        super(detail);
        this.typeSlug = typeSlug;
        this.title = title;
    }

    public String getTypeSlug() { return typeSlug; }
    public String getTitle() { return title; }
}
```

`OrderNotFoundException.java`:

```java
package com.bragas.api.common;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(String idOrDisplay) {
        super("Pedido não encontrado: " + idOrDisplay);
    }
}
```

`InvalidStatusTransitionException.java`:

```java
package com.bragas.api.common;

import com.bragas.api.order.domain.OrderStatus;

public class InvalidStatusTransitionException extends RuntimeException {
    public InvalidStatusTransitionException(OrderStatus from, OrderStatus to) {
        super("Transição inválida: " + from + " → " + to);
    }
}
```

- [ ] **Step 2: Criar `ApiError`**

```java
package com.bragas.api.common;

import java.util.List;

public record ApiError(
    String type,
    String title,
    int status,
    String detail,
    String instance,
    List<FieldError> errors
) {
    public record FieldError(String field, String message) {}

    public static ApiError of(String typeSlug, String title, int status, String detail, String instance) {
        return new ApiError("https://bragas.com/errors/" + typeSlug, title, status, detail, instance, null);
    }

    public static ApiError validation(String detail, String instance, List<FieldError> fieldErrors) {
        return new ApiError(
            "https://bragas.com/errors/validation-failed",
            "Validação falhou", 400, detail, instance, fieldErrors
        );
    }
}
```

- [ ] **Step 3: Criar `ApiExceptionHandler`**

```java
package com.bragas.api.common;

import com.bragas.api.catalog.ProductCatalog.UnknownProductException;
import com.bragas.api.catalog.ProductCatalog.UnavailableProductException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<ApiError.FieldError> fields = ex.getBindingResult().getFieldErrors().stream()
            .map(f -> new ApiError.FieldError(f.getField(), f.getDefaultMessage()))
            .toList();
        return problem(HttpStatus.BAD_REQUEST,
            ApiError.validation("Um ou mais campos inválidos", req.getRequestURI(), fields));
    }

    @ExceptionHandler(DomainValidationException.class)
    public ResponseEntity<ApiError> handleDomain(DomainValidationException ex, HttpServletRequest req) {
        return problem(HttpStatus.BAD_REQUEST,
            ApiError.of(ex.getTypeSlug(), ex.getTitle(), 400, ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler({ UnknownProductException.class, UnavailableProductException.class })
    public ResponseEntity<ApiError> handleProductIssue(RuntimeException ex, HttpServletRequest req) {
        String slug = ex instanceof UnavailableProductException ? "product-unavailable" : "product-not-found";
        String title = ex instanceof UnavailableProductException ? "Produto indisponível" : "Produto não encontrado";
        return problem(HttpStatus.BAD_REQUEST,
            ApiError.of(slug, title, 400, ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(OrderNotFoundException ex, HttpServletRequest req) {
        return problem(HttpStatus.NOT_FOUND,
            ApiError.of("order-not-found", "Pedido não encontrado", 404, ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ResponseEntity<ApiError> handleInvalidTransition(InvalidStatusTransitionException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT,
            ApiError.of("invalid-status-transition", "Transição inválida", 409, ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleAny(Exception ex, HttpServletRequest req) {
        return problem(HttpStatus.INTERNAL_SERVER_ERROR,
            ApiError.of("internal-error", "Erro interno", 500, "Algo deu errado.", req.getRequestURI()));
    }

    private ResponseEntity<ApiError> problem(HttpStatus status, ApiError body) {
        return ResponseEntity.status(status)
            .contentType(MediaType.valueOf("application/problem+json"))
            .body(body);
    }
}
```

- [ ] **Step 4: Compilar**

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/bragas/api/common/
git commit -m "feat(common): Problem Details handler + exceções de domínio"
```

---

## Task 10 — Segurança: AdminTokenFilter + SecurityConfig

**Files:**
- Create: `backend/src/main/java/com/bragas/api/common/AdminTokenFilter.java`
- Create: `backend/src/main/java/com/bragas/api/common/SecurityConfig.java`

- [ ] **Step 1: Criar `AdminTokenFilter`**

```java
package com.bragas.api.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class AdminTokenFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-Admin-Token";

    private final byte[] expectedToken;

    public AdminTokenFilter(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("ADMIN_TOKEN não configurado");
        }
        this.expectedToken = token.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String provided = request.getHeader(HEADER);
        if (provided == null) {
            writeProblem(response, request, 401, "admin-token-missing", "Token de admin ausente");
            return;
        }
        byte[] providedBytes = provided.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expectedToken, providedBytes)) {
            writeProblem(response, request, 401, "admin-token-invalid", "Token de admin inválido");
            return;
        }
        chain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/admin/");
    }

    private static void writeProblem(HttpServletResponse response, HttpServletRequest request,
                                      int status, String slug, String title) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.valueOf("application/problem+json").toString());
        String body = """
            {
              "type": "https://bragas.com/errors/%s",
              "title": "%s",
              "status": %d,
              "instance": "%s"
            }
            """.formatted(slug, title, status, request.getRequestURI());
        response.getWriter().write(body);
    }
}
```

- [ ] **Step 2: Criar `SecurityConfig`**

```java
package com.bragas.api.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final String adminToken;
    private final List<String> corsOrigins;

    public SecurityConfig(@Value("${app.admin.token}") String adminToken,
                          @Value("${app.cors.allowedOrigins}") List<String> corsOrigins) {
        this.adminToken = adminToken;
        this.corsOrigins = corsOrigins;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsSource()))
            .authorizeHttpRequests(a -> a.anyRequest().permitAll())
            .addFilterBefore(new AdminTokenFilter(adminToken), AuthorizationFilter.class);
        return http.build();
    }

    private CorsConfigurationSource corsSource() {
        var cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(corsOrigins);
        cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        var src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/api/**", cfg);
        return src;
    }
}
```

- [ ] **Step 3: Verificar que o app compila**

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/bragas/api/common/AdminTokenFilter.java backend/src/main/java/com/bragas/api/common/SecurityConfig.java
git commit -m "feat(security): AdminTokenFilter + SecurityConfig com CORS"
```

---

## Task 11 — OrderService

**Files:**
- Create: `backend/src/main/java/com/bragas/api/order/OrderService.java`

- [ ] **Step 1: Implementar `OrderService`**

```java
package com.bragas.api.order;

import com.bragas.api.catalog.CouponCatalog;
import com.bragas.api.catalog.DeliveryAreaCatalog;
import com.bragas.api.catalog.ProductCatalog;
import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.common.DomainValidationException;
import com.bragas.api.common.InvalidStatusTransitionException;
import com.bragas.api.common.OrderNotFoundException;
import com.bragas.api.order.domain.*;
import com.bragas.api.order.dto.CreateOrderRequest;
import com.bragas.api.order.pricing.DisplayIdGenerator;
import com.bragas.api.order.pricing.OrderEstimateCalculator;
import com.bragas.api.order.pricing.OrderPricingCalculator;
import com.bragas.api.store.StoreProperties;
import com.bragas.api.store.StoreStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    private final OrderRepository repo;
    private final ProductCatalog products;
    private final CouponCatalog coupons;
    private final DeliveryAreaCatalog areas;
    private final StoreStatus storeStatus;
    private final StoreProperties storeProps;
    private final OrderPricingCalculator pricing;
    private final OrderEstimateCalculator estimator;
    private final DisplayIdGenerator displayIds;
    private final Clock clock;

    public OrderService(OrderRepository repo, ProductCatalog products, CouponCatalog coupons,
                        DeliveryAreaCatalog areas, StoreStatus storeStatus, StoreProperties storeProps,
                        OrderPricingCalculator pricing, OrderEstimateCalculator estimator,
                        DisplayIdGenerator displayIds, Clock clock) {
        this.repo = repo;
        this.products = products;
        this.coupons = coupons;
        this.areas = areas;
        this.storeStatus = storeStatus;
        this.storeProps = storeProps;
        this.pricing = pricing;
        this.estimator = estimator;
        this.displayIds = displayIds;
        this.clock = clock;
    }

    @Transactional
    public Order create(CreateOrderRequest req) {
        OffsetDateTime now = OffsetDateTime.now(clock);

        // 1. Loja aberta?
        if (!storeStatus.isOpen(LocalDateTime.now(clock))) {
            throw new DomainValidationException("store-closed", "Loja fechada", "A loja está fechada agora.");
        }

        // 2. Produtos existem e estão disponíveis
        List<String> productIds = req.items().stream().map(CreateOrderRequest.Item::productId).toList();
        products.requireAll(productIds);

        // 3. Endereço/bairro
        Optional<BigDecimal> fee = Optional.empty();
        if (req.fulfillmentType() == FulfillmentType.DELIVERY) {
            if (req.address() == null) {
                throw new DomainValidationException("address-required", "Endereço obrigatório",
                    "Entrega exige endereço.");
            }
            fee = areas.findFee(req.address().neighborhood());
            if (fee.isEmpty()) {
                throw new DomainValidationException("delivery-area-not-served", "Bairro não atendido",
                    "Não entregamos em " + req.address().neighborhood());
            }
        }

        // 4. Cupom
        Optional<Coupon> coupon = Optional.ofNullable(req.couponCode()).flatMap(coupons::find);
        if (req.couponCode() != null && coupon.isEmpty()) {
            throw new DomainValidationException("coupon-invalid", "Cupom inválido",
                "Cupom " + req.couponCode() + " não existe.");
        }

        // 5. Cálculo
        List<OrderPricingCalculator.Line> lines = req.items().stream()
            .map(i -> new OrderPricingCalculator.Line(
                products.findById(i.productId()).orElseThrow(), i.quantity()))
            .toList();
        var totals = pricing.compute(lines, coupon, fee);

        // 6. minSubtotal do cupom
        if (coupon.isPresent() && coupon.get().minSubtotal() != null
            && totals.subtotal().compareTo(coupon.get().minSubtotal()) < 0) {
            throw new DomainValidationException("coupon-min-not-met", "Cupom requer mínimo",
                "Cupom " + coupon.get().code() + " exige subtotal mínimo de " + coupon.get().minSubtotal());
        }

        // 7. Pedido mínimo
        if (totals.subtotal().compareTo(storeProps.minOrder()) < 0) {
            throw new DomainValidationException("order-min-not-met", "Pedido abaixo do mínimo",
                "Subtotal " + totals.subtotal() + " < mínimo " + storeProps.minOrder());
        }

        // 8. Troco suficiente
        if (req.payment() == PaymentMethod.CASH && req.changeFor() != null
            && req.changeFor().compareTo(totals.total()) < 0) {
            throw new DomainValidationException("change-insufficient", "Troco insuficiente",
                "Troco " + req.changeFor() + " < total " + totals.total());
        }

        // 9. Estimativa
        var range = estimator.compute(req.fulfillmentType(), storeProps.averagePrepTime(), fee);

        // 10. Cria entidade
        String displayId = displayIds.next();
        Order order = Order.create(displayId, req.customer().name(), req.customer().phone(),
            req.fulfillmentType(), req.payment(), now);

        if (req.fulfillmentType() == FulfillmentType.DELIVERY) {
            var a = req.address();
            order.setAddress(a.cep(), a.street(), a.number(), a.neighborhood(), a.complement(), a.reference());
        }
        if (req.payment() == PaymentMethod.CASH) order.setChangeFor(req.changeFor());

        order.setCouponCode(coupon.map(Coupon::code).orElse(null));
        order.setCouponDiscount(totals.discount());
        order.setSubtotal(totals.subtotal());
        order.setDeliveryFee(totals.deliveryFee());
        order.setTotal(totals.total());
        order.setEstimatedMin(range.min());
        order.setEstimatedMax(range.max());

        int pos = 0;
        for (var i : req.items()) {
            var product = products.findById(i.productId()).orElseThrow();
            order.addItem(new OrderItem(pos++, product.id(), product.name(), product.price(), i.quantity(), i.notes()));
        }

        return repo.save(order);
    }

    @Transactional(readOnly = true)
    public Order findById(String id) {
        return repo.findById(id).orElseThrow(() -> new OrderNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public Order findByDisplayId(String displayId) {
        return repo.findByDisplayId(displayId).orElseThrow(() -> new OrderNotFoundException(displayId));
    }

    @Transactional
    public Order transitionStatus(String id, OrderStatus to) {
        Order order = repo.findById(id).orElseThrow(() -> new OrderNotFoundException(id));
        if (!OrderStatusTransition.isValid(order.getStatus(), to)) {
            throw new InvalidStatusTransitionException(order.getStatus(), to);
        }
        order.applyTransition(to, OffsetDateTime.now(clock));
        return repo.save(order);
    }
}
```

- [ ] **Step 2: Compilar**

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/OrderService.java
git commit -m "feat(order): OrderService com validações e recálculo de totais"
```

---

## Task 12 — Controllers (público + admin)

**Files:**
- Create: `backend/src/main/java/com/bragas/api/order/OrderController.java`
- Create: `backend/src/main/java/com/bragas/api/order/OrderAdminController.java`

- [ ] **Step 1: Criar `OrderController`**

```java
package com.bragas.api.order;

import com.bragas.api.order.dto.CreateOrderRequest;
import com.bragas.api.order.dto.OrderResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@RequestBody @Valid CreateOrderRequest req) {
        var order = service.create(req);
        var resp = OrderResponse.from(order);
        return ResponseEntity.created(URI.create("/api/v1/orders/" + order.getId())).body(resp);
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable String id) {
        return OrderResponse.from(service.findById(id));
    }

    @GetMapping("/by-display/{displayId}")
    public OrderResponse getByDisplayId(@PathVariable String displayId) {
        // o cliente pode passar `#3417` URL-encoded (`%233417`) ou só `3417`; aceitamos ambos
        String normalized = displayId.startsWith("#") ? displayId : "#" + displayId;
        return OrderResponse.from(service.findByDisplayId(normalized));
    }
}
```

- [ ] **Step 2: Criar `OrderAdminController`**

```java
package com.bragas.api.order;

import com.bragas.api.order.dto.OrderResponse;
import com.bragas.api.order.dto.UpdateStatusRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/orders")
public class OrderAdminController {

    private final OrderService service;

    public OrderAdminController(OrderService service) {
        this.service = service;
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable String id, @RequestBody @Valid UpdateStatusRequest req) {
        return OrderResponse.from(service.transitionStatus(id, req.to()));
    }
}
```

- [ ] **Step 3: Compilar**

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/OrderController.java backend/src/main/java/com/bragas/api/order/OrderAdminController.java
git commit -m "feat(order): controllers públicos + admin"
```

---

## Task 13 — Integration tests do OrderController

**Files:**
- Create: `backend/src/test/java/com/bragas/api/order/OrderControllerIT.java`
- Create: `backend/src/test/java/com/bragas/api/BragasApiApplicationIT.java`

- [ ] **Step 1: Criar `BragasApiApplicationIT` (context loads)**

```java
package com.bragas.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class BragasApiApplicationIT {

    @Container @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("bragas").withUsername("bragas").withPassword("bragas");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",      postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void contextLoads() {}
}
```

- [ ] **Step 2: Criar `OrderControllerIT`**

```java
package com.bragas.api.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class OrderControllerIT {

    @Container @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("bragas").withUsername("bragas").withPassword("bragas");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",      postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    // Fixar clock em terça 2026-05-19 às 19h (loja aberta)
    @TestConfiguration
    static class TestClock {
        @Bean @Primary
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-05-19T19:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    private String body(String json) { return json; }

    @BeforeEach
    void cleanup(@Autowired OrderRepository repo) {
        repo.deleteAll();
    }

    private static final String VALID_DELIVERY = """
        {
          "customer": { "name": "João", "phone": "(21) 99999-0000" },
          "fulfillmentType": "DELIVERY",
          "address": { "cep": "20000-000", "street": "Rua A", "number": "1", "neighborhood": "Higienópolis" },
          "payment": "CREDIT",
          "items": [
            { "productId": "chicken", "quantity": 1 },
            { "productId": "crispy-catupiry", "quantity": 1 }
          ]
        }
        """;

    private static final String VALID_PICKUP = """
        {
          "customer": { "name": "João", "phone": "(21) 99999-0000" },
          "fulfillmentType": "PICKUP",
          "payment": "PIX",
          "items": [
            { "productId": "chicken", "quantity": 1 },
            { "productId": "crispy-catupiry", "quantity": 1 }
          ]
        }
        """;

    @Test
    void postDeliveryHappyPath() throws Exception {
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_DELIVERY))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id", startsWith("ord_")))
            .andExpect(jsonPath("$.displayId", matchesPattern("^#\\d{4}$")))
            .andExpect(jsonPath("$.status").value("RECEIVED"))
            .andExpect(jsonPath("$.totals.subtotal").value(65.80))
            .andExpect(jsonPath("$.totals.deliveryFee").value(4.99))
            .andExpect(jsonPath("$.totals.total").value(70.79))
            .andExpect(jsonPath("$.timestamps.receivedAt").isNotEmpty())
            .andExpect(jsonPath("$.timestamps.preparingAt").value(nullValue()));
    }

    @Test
    void postPickupHappyPath() throws Exception {
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_PICKUP))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.totals.deliveryFee").value(0.00))
            .andExpect(jsonPath("$.estimatedMinutes.min").value(20))
            .andExpect(jsonPath("$.estimatedMinutes.max").value(30));
    }

    @Test
    void productNotFound() throws Exception {
        String body = """
            {
              "customer": { "name": "João", "phone": "(21) 99999-0000" },
              "fulfillmentType": "PICKUP",
              "payment": "PIX",
              "items": [{ "productId": "nao-existe", "quantity": 1 }]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentType("application/problem+json"))
            .andExpect(jsonPath("$.type", endsWith("product-not-found")));
    }

    @Test
    void productUnavailable() throws Exception {
        String body = """
            {
              "customer": { "name": "João", "phone": "(21) 99999-0000" },
              "fulfillmentType": "PICKUP",
              "payment": "PIX",
              "items": [
                { "productId": "chicken", "quantity": 1 },
                { "productId": "crispy-catupiry", "quantity": 1 },
                { "productId": "esgotado-test", "quantity": 1 }
              ]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type", endsWith("product-unavailable")));
    }

    @Test
    void neighborhoodNotServed() throws Exception {
        String body = """
            {
              "customer": { "name": "João", "phone": "(21) 99999-0000" },
              "fulfillmentType": "DELIVERY",
              "address": { "street": "X", "number": "1", "neighborhood": "Copacabana" },
              "payment": "PIX",
              "items": [
                { "productId": "chicken", "quantity": 1 },
                { "productId": "crispy-catupiry", "quantity": 1 }
              ]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type", endsWith("delivery-area-not-served")));
    }

    @Test
    void orderUnderMinimum() throws Exception {
        // só 1 fritas (29.90, acima do mín de 25) → não usa. Vou usar quantidade fracionada não, item com preço baixo:
        // não temos item < R$ 25. Vou testar com coca-cola só (14.90).
        String body = """
            {
              "customer": { "name": "João", "phone": "(21) 99999-0000" },
              "fulfillmentType": "PICKUP",
              "payment": "PIX",
              "items": [{ "productId": "coca-cola-2l", "quantity": 1 }]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type", endsWith("order-min-not-met")));
    }

    @Test
    void getByIdHappyPath() throws Exception {
        String created = mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_DELIVERY))
            .andReturn().getResponse().getContentAsString();
        String id = mapper.readTree(created).get("id").asText();

        mvc.perform(get("/api/v1/orders/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id));
    }

    @Test
    void getByIdNotFound() throws Exception {
        mvc.perform(get("/api/v1/orders/ord_nao_existe"))
            .andExpect(status().isNotFound())
            .andExpect(content().contentType("application/problem+json"))
            .andExpect(jsonPath("$.type", endsWith("order-not-found")));
    }

    @Test
    void getByDisplayId() throws Exception {
        String created = mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_DELIVERY))
            .andReturn().getResponse().getContentAsString();
        JsonNode j = mapper.readTree(created);
        String display = j.get("displayId").asText();

        mvc.perform(get("/api/v1/orders/by-display/" + display))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.displayId").value(display));
    }

    @Test
    void validationErrorWhenMissingCustomer() throws Exception {
        String body = """
            {
              "fulfillmentType": "PICKUP",
              "payment": "PIX",
              "items": [{ "productId": "chicken", "quantity": 1 }]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type", endsWith("validation-failed")));
    }
}
```

- [ ] **Step 3: Rodar `OrderControllerIT`**

Garanta que Docker Desktop está rodando. Depois:

```bash
./gradlew test --tests OrderControllerIT 2>&1 | tail -25
```

Expected: 10/10 verde. Primeira execução pode demorar bastante (subir o Postgres, carregar contexto Spring).

Se algum falhar com `415 Unsupported Media Type` em vez de 4xx esperado: confira que o controller produz `application/problem+json` via o handler (ele faz; pode ser cache do build — `./gradlew clean test`).

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/com/bragas/api/BragasApiApplicationIT.java backend/src/test/java/com/bragas/api/order/OrderControllerIT.java
git commit -m "test(order): IT do OrderController com Testcontainers (10 cenários)"
```

---

## Task 14 — Integration tests do OrderAdminController

**Files:**
- Create: `backend/src/test/java/com/bragas/api/order/OrderAdminControllerIT.java`

- [ ] **Step 1: Criar `OrderAdminControllerIT`**

```java
package com.bragas.api.order;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class OrderAdminControllerIT {

    @Container @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("bragas").withUsername("bragas").withPassword("bragas");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",      postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @TestConfiguration
    static class TestClock {
        @Bean @Primary
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-05-19T19:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @BeforeEach
    void cleanup(@Autowired OrderRepository repo) {
        repo.deleteAll();
    }

    private static final String VALID_ORDER = """
        {
          "customer": { "name": "João", "phone": "(21) 99999-0000" },
          "fulfillmentType": "PICKUP",
          "payment": "PIX",
          "items": [
            { "productId": "chicken", "quantity": 1 },
            { "productId": "crispy-catupiry", "quantity": 1 }
          ]
        }
        """;

    private String createOrderAndReturnId() throws Exception {
        String created = mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_ORDER))
            .andReturn().getResponse().getContentAsString();
        return mapper.readTree(created).get("id").asText();
    }

    @Test
    void patchSemTokenRetorna401() throws Exception {
        String id = createOrderAndReturnId();
        mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                .contentType("application/json")
                .content("{\"to\":\"PREPARING\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type", endsWith("admin-token-missing")));
    }

    @Test
    void patchTokenErradoRetorna401() throws Exception {
        String id = createOrderAndReturnId();
        mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                .header("X-Admin-Token", "errado")
                .contentType("application/json")
                .content("{\"to\":\"PREPARING\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type", endsWith("admin-token-invalid")));
    }

    @Test
    void transicaoValidaGravaTimestamp() throws Exception {
        String id = createOrderAndReturnId();
        mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                .header("X-Admin-Token", "test-admin-token")
                .contentType("application/json")
                .content("{\"to\":\"PREPARING\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PREPARING"))
            .andExpect(jsonPath("$.timestamps.preparingAt").value(notNullValue()))
            .andExpect(jsonPath("$.timestamps.outAt").value(nullValue()));
    }

    @Test
    void transicaoInvalidaRetorna409() throws Exception {
        String id = createOrderAndReturnId();
        mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                .header("X-Admin-Token", "test-admin-token")
                .contentType("application/json")
                .content("{\"to\":\"DELIVERED\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type", endsWith("invalid-status-transition")));
    }

    @Test
    void pedidoInexistenteRetorna404() throws Exception {
        mvc.perform(patch("/api/v1/admin/orders/ord_nao_existe/status")
                .header("X-Admin-Token", "test-admin-token")
                .contentType("application/json")
                .content("{\"to\":\"PREPARING\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.type", endsWith("order-not-found")));
    }

    @Test
    void fluxoCompletoReceivedPreparingOutDelivered() throws Exception {
        String id = createOrderAndReturnId();
        for (String to : new String[]{"PREPARING", "OUT", "DELIVERED"}) {
            mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                    .header("X-Admin-Token", "test-admin-token")
                    .contentType("application/json")
                    .content("{\"to\":\"" + to + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(to));
        }
    }
}
```

- [ ] **Step 2: Rodar admin IT**

```bash
./gradlew test --tests OrderAdminControllerIT 2>&1 | tail -15
```

Expected: 6/6 verde.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/bragas/api/order/OrderAdminControllerIT.java
git commit -m "test(order): IT do OrderAdminController (token + transições)"
```

---

## Task 15 — Logging request filter + logback

**Files:**
- Create: `backend/src/main/java/com/bragas/api/common/RequestLogFilter.java`
- Create: `backend/src/main/resources/logback-spring.xml`

- [ ] **Step 1: Criar `RequestLogFilter`**

```java
package com.bragas.api.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLogFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger("api.request");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);
        } finally {
            long ms = System.currentTimeMillis() - start;
            log.info("{} {} -> {} in {}ms", req.getMethod(), req.getRequestURI(), res.getStatus(), ms);
        }
    }
}
```

- [ ] **Step 2: Criar `logback-spring.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>

    <springProfile name="dev,test">
        <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <springProfile name="prod">
        <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON"/>
        </root>
    </springProfile>
</configuration>
```

- [ ] **Step 3: Compilar + rodar testes pra garantir que filter não quebra nada**

```bash
./gradlew test 2>&1 | tail -15
```

Expected: tudo ainda verde.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/bragas/api/common/RequestLogFilter.java backend/src/main/resources/logback-spring.xml
git commit -m "feat(observability): RequestLogFilter + logback (texto/dev, JSON/prod)"
```

---

## Task 16 — Bring up real stack and smoke test via cURL

**Files:** nenhum (smoke manual).

- [ ] **Step 1: Subir Postgres local**

```bash
cd backend
docker compose up -d
docker compose ps
```

Expected: container `bragas-postgres` `Up (healthy)`.

- [ ] **Step 2: Subir o app**

Em outra aba do terminal, na pasta `backend/`:

```bash
export JAVA_HOME="/c/Program Files/Java/jdk-21.0.10"
export ADMIN_TOKEN="local-dev-token"
./gradlew bootRun 2>&1 | tee /tmp/bragas-api.log
```

Espere ver `Started BragasApiApplication`.

- [ ] **Step 3: Testar `/actuator/health`**

```bash
curl -s http://localhost:8080/actuator/health
```

Expected: `{"status":"UP"}`.

- [ ] **Step 4: Criar um pedido**

```bash
curl -i -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": { "name": "João Smoke", "phone": "(21) 99999-0000" },
    "fulfillmentType": "DELIVERY",
    "address": { "cep": "20000-000", "street": "Rua A", "number": "1", "neighborhood": "Higienópolis" },
    "payment": "CREDIT",
    "items": [
      { "productId": "chicken", "quantity": 1 },
      { "productId": "crispy-catupiry", "quantity": 1 }
    ]
  }'
```

Expected: HTTP `201`, body com `id`, `displayId`, totals correto. **Anote o `id`.**

(Se voltar `400 store-closed`, é porque sua hora local não está num horário de loja aberta. Você pode rodar o app com o perfil de teste pra desabilitar a verificação, ou aguardar um horário aberto, ou ajustar `application-dev.yml` temporariamente.)

- [ ] **Step 5: Buscar por id**

```bash
curl -s http://localhost:8080/api/v1/orders/<COLE-O-ID-AQUI>
```

Expected: 200 com o mesmo pedido.

- [ ] **Step 6: Buscar por displayId**

```bash
curl -s "http://localhost:8080/api/v1/orders/by-display/%23<XXXX>"
```

Substitua `<XXXX>` pelos 4 dígitos do `displayId` (sem o `#` — o `%23` é o `#`).

Expected: 200 com o mesmo pedido.

- [ ] **Step 7: Atualizar status sem token (deve dar 401)**

```bash
curl -i -X PATCH http://localhost:8080/api/v1/admin/orders/<id>/status \
  -H "Content-Type: application/json" \
  -d '{"to":"PREPARING"}'
```

Expected: 401 `admin-token-missing`.

- [ ] **Step 8: Atualizar status com token**

```bash
curl -i -X PATCH http://localhost:8080/api/v1/admin/orders/<id>/status \
  -H "X-Admin-Token: local-dev-token" \
  -H "Content-Type: application/json" \
  -d '{"to":"PREPARING"}'
```

Expected: 200 com `status: "PREPARING"`, `timestamps.preparingAt` preenchido.

- [ ] **Step 9: Transição inválida (deve dar 409)**

```bash
curl -i -X PATCH http://localhost:8080/api/v1/admin/orders/<id>/status \
  -H "X-Admin-Token: local-dev-token" \
  -H "Content-Type: application/json" \
  -d '{"to":"RECEIVED"}'
```

Expected: 409 `invalid-status-transition`.

- [ ] **Step 10: Parar app + Postgres**

`Ctrl+C` no terminal do `bootRun`. Depois:

```bash
docker compose down
```

---

## Task 17 — Verificação final

- [ ] **Step 1: Build limpo**

```bash
export JAVA_HOME="/c/Program Files/Java/jdk-21.0.10" && cd backend && ./gradlew clean build 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`. JAR em `build/libs/bragas-api-0.0.1-SNAPSHOT.jar` (ou nome semelhante).

- [ ] **Step 2: Todos os testes verdes**

```bash
./gradlew test 2>&1 | tail -10
```

Expected: tudo verde. Total esperado: ~40 testes (Domain + Catalog + Pricing + Store + IT × 2).

- [ ] **Step 3: Tree limpo**

```bash
cd .. && git status
```

Expected: nada untracked, nada modificado.

- [ ] **Step 4: Confirmar histórico**

```bash
git log --oneline master..HEAD
```

Expected: ~17 commits, todos com mensagens `feat(...)` / `test(...)` claras.

- [ ] **Step 5: Walkthrough dos critérios de sucesso (§15 do spec)**

Marque manualmente, item a item, lendo `docs/superpowers/specs/2026-05-20-backend-api-design.md` §15:

- [ ] `docker compose up -d` sobe Postgres saudável.
- [ ] `./gradlew bootRun` sobe o app.
- [ ] `./gradlew test` passa.
- [ ] `./gradlew build` produz JAR.
- [ ] POST `/api/v1/orders` válido → 201 com totais corretos.
- [ ] POST com produto inexistente → 400 `product-not-found`.
- [ ] POST com bairro não atendido → 400 `delivery-area-not-served`.
- [ ] POST com subtotal < R$ 25 → 400 `order-min-not-met`.
- [ ] GET por id → 200.
- [ ] GET por displayId → 200.
- [ ] PATCH sem token → 401.
- [ ] PATCH com token OK e transição válida → 200 com timestamp.
- [ ] PATCH transição inválida → 409.
- [ ] `/actuator/health` retorna 200.

Se algum item falhar, voltar e corrigir.

---

## Spec coverage check

| Spec section | Covered by |
|--------------|------------|
| §1 Contexto e escopo | Todas as tasks |
| §2 Stack | Task 1 |
| §3 Estrutura de pastas | Task 1 |
| §4 API REST endpoints + shapes | Tasks 8, 12, 13, 14 |
| §4.6 Fluxo de status | Task 2 (transitions) + Task 11 (service) |
| §5 Fonte autoritativa + JSON estático | Task 4 |
| §5.4 application.yml + storeProperties | Task 1, 3 |
| §5.5 Validações do POST | Task 11 (OrderService) |
| §5.6 Cálculo de totais | Task 5 |
| §6 Schema do banco | Task 6 |
| §7 Camadas do código | Tasks 6–12 |
| §8 Problem Details errors | Task 9 |
| §9 Segurança | Task 10 |
| §10 Observabilidade | Task 15 |
| §11 Perfis | Task 1 |
| §12 Docker Compose | Task 1 |
| §13 Testes | Tasks 2, 3, 4, 5, 6, 7, 13, 14 |
| §14 Mudanças por arquivo | Tasks 1, 17 |
| §15 Critérios de sucesso | Task 16, 17 |
