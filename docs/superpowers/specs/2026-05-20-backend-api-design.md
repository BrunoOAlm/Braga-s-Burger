# Spec de Design — Backend de Pedidos (Sub-projeto 3)

**Data:** 2026-05-20
**Sub-projeto:** 3 de 6 — Backend / API
**Spec anterior:** `2026-05-18-carrinho-checkout-design.md` (sub-projeto 2, mergeado em master via PR #3)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

Sub-projetos 1 (landing/cardápio) e 2 (carrinho/checkout) estão concluídos e mergeados
em master. Hoje os pedidos saem direto pro WhatsApp da loja — não há nada gravado em
lugar nenhum, e a `OrderStatusScreen.v2` mostra o status fixo em "Recebido" porque
não tem ninguém pra atualizar.

Este sub-projeto entrega o **backend mínimo**: um serviço Java/Spring que **recebe**,
**armazena** e **expõe** pedidos, com um endpoint protegido pra atualizar status. O
front **não** é alterado neste sub-projeto — a integração com o `OrderStatusScreen.v2`
fica para o sub-projeto 4 (Integração + Login), junto com a autenticação real.

O backend é validado de ponta a ponta via testes de integração (com Postgres real em
Testcontainers) e exercitável via Postman/cURL.

### Escopo

**Dentro:**
- Esqueleto Spring Boot 3 em `backend/` na raiz do repo atual.
- `docker-compose.yml` que sobe um Postgres local para dev.
- Migrations Flyway pro schema de pedidos.
- 4 endpoints REST sob `/api/v1`: criar pedido, buscar por id, buscar por displayId,
  e atualizar status (este último em `/api/v1/admin/` protegido por header
  `X-Admin-Token`).
- Recálculo de subtotal/desconto/taxa/total **no servidor** — o cliente envia
  produtos e quantidades, o servidor diz quanto é. Cliente nunca é fonte da verdade
  pra dinheiro.
- Fontes autoritativas em arquivos JSON estáticos (`products.json`, `coupons.json`,
  `delivery-areas.json`) lidos no startup. Reproduzem o conteúdo dos `data/*.ts` do
  front. Sub-projeto 5 (admin) vai migrar pro banco.
- Validações de negócio: loja aberta, pedido mínimo, bairro atendido, troco
  suficiente, etc.
- Tratamento de erros via `@RestControllerAdvice` retornando Problem Details (RFC 7807).
- Logs estruturados (JSON em prod, texto em dev), sem PII.
- Testes unitários (sem Spring) + integração (com Testcontainers).

**Fora do escopo (bloqueio técnico ou sub-projeto futuro):**
- **Front consumindo a API** — sub-projeto 4.
- **Autenticação real** (login, sessão, roles) — sub-projeto 4. O `X-Admin-Token` é
  ponte declarada como temporária.
- **Painel admin pra atualizar status pela UI** — sub-projeto 5.
- **Cardápio editável** — sub-projeto 5 vai migrar produtos pra tabela. Por enquanto
  são imutáveis em JSON.
- **Pagamento online** — fora do projeto inteiro (cliente cobra na entrega/balcão).
- **Rate limiting, HTTPS, headers de segurança avançados, observabilidade externa
  (Prometheus, Sentry, etc)** — sub-projeto 6 (deploy).
- **Testes E2E (front → back)** — sub-projeto 6.

### Decisões travadas no brainstorming (2026-05-20)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Escopo MVP | Só pedidos (POST/GET/PATCH status). Sem cardápio nem cupons gerenciáveis. |
| 2 | Repo | Pasta `backend/` no mesmo repo do front. |
| 3 | Build | Gradle Kotlin DSL. |
| 4 | Banco local | Postgres 16 via Docker Compose. Testes com Testcontainers. |
| 5 | Atualizar status | Endpoint `/admin/...` protegido por header `X-Admin-Token` (env var). |
| 6 | Identificador técnico | ULID opaco (`ord_...`) como id principal; `displayId` (`#XXXX`) só pra humanos. |
| 7 | Schema | Normalizado: `orders` (com colunas, sem JSONB) + `order_items`. |
| 8 | Fonte de preço/cupom/taxa | JSON estático em `resources/data/`, carregado no startup. |
| 9 | Nomenclatura | `fulfillmentType` (em vez de `method`); `to` no body do PATCH (em vez de `status`). |
| 10 | Timestamps por status | Colunas em `orders` (5 colunas: `received_at`, `preparing_at`, `out_at`, `delivered_at`, `cancelled_at`). |

---

## 2. Stack

| Componente | Versão | Função |
|-----------|--------|--------|
| Java | 21 (LTS) | Linguagem |
| Spring Boot | 3.3.x | Framework |
| Spring Web | (do BOM) | HTTP / MVC |
| Spring Data JPA | (do BOM) | ORM com Hibernate |
| Spring Validation | (do BOM) | Bean Validation (JSR 380) |
| Spring Security | (do BOM) | Mínimo: filtro de admin token |
| Flyway | (do BOM) | Migrations |
| PostgreSQL | 16 | Banco (dev em Docker, prod fica pro sub-projeto 6) |
| Testcontainers | 1.20.x | Postgres em container nos testes de integração |
| JUnit 5 | (do BOM) | Testes |
| Mockito | (do BOM) | Mocks em unitários |
| Logstash Logback Encoder | 7.x | Logs JSON em prod |
| Gradle Kotlin DSL | 8.x | Build |
| ULID Creator | 5.x | IDs (`com.github.f4b6a3:ulid-creator`) |
| Lombok | 1.18.x | Reduzir boilerplate (`@Getter`, `@Builder` em DTOs) |

Tudo via Spring Initializr (`start.spring.io`) na criação do projeto.

---

## 3. Estrutura de pastas

```
Braga's Burger/                          ← repo atual
├── app/                                 ← front (intocado)
├── components/                          ← front (intocado)
├── lib/                                 ← front (intocado)
├── data/                                ← front (intocado — fonte original)
├── backend/                             ← NOVO
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradlew, gradlew.bat, gradle/
│   ├── docker-compose.yml               ← Postgres local
│   ├── .env.example                     ← ADMIN_TOKEN=changeme
│   ├── .gitignore                       ← ignora build/, .gradle/, .env
│   └── src/
│       ├── main/
│       │   ├── java/com/bragas/api/
│       │   │   ├── BragasApiApplication.java
│       │   │   ├── order/
│       │   │   │   ├── OrderController.java
│       │   │   │   ├── OrderAdminController.java
│       │   │   │   ├── OrderService.java
│       │   │   │   ├── OrderRepository.java
│       │   │   │   ├── OrderItemRepository.java
│       │   │   │   ├── domain/
│       │   │   │   │   ├── Order.java
│       │   │   │   │   ├── OrderItem.java
│       │   │   │   │   ├── OrderStatus.java
│       │   │   │   │   ├── FulfillmentType.java
│       │   │   │   │   ├── PaymentMethod.java
│       │   │   │   │   └── OrderStatusTransition.java
│       │   │   │   ├── dto/
│       │   │   │   │   ├── CreateOrderRequest.java
│       │   │   │   │   ├── UpdateStatusRequest.java
│       │   │   │   │   └── OrderResponse.java
│       │   │   │   └── pricing/
│       │   │   │       ├── OrderPricingCalculator.java
│       │   │   │       ├── OrderEstimateCalculator.java
│       │   │   │       └── DisplayIdGenerator.java
│       │   │   ├── catalog/
│       │   │   │   ├── ProductCatalog.java
│       │   │   │   ├── CouponCatalog.java
│       │   │   │   ├── DeliveryAreaCatalog.java
│       │   │   │   ├── CatalogConfig.java
│       │   │   │   └── domain/
│       │   │   │       ├── Product.java
│       │   │   │       ├── Coupon.java
│       │   │   │       └── DeliveryArea.java
│       │   │   ├── store/
│       │   │   │   ├── StoreProperties.java
│       │   │   │   ├── StoreStatus.java
│       │   │   │   └── OpeningHours.java
│       │   │   └── common/
│       │   │       ├── AdminTokenFilter.java
│       │   │       ├── SecurityConfig.java
│       │   │       ├── ApiExceptionHandler.java
│       │   │       ├── ApiError.java
│       │   │       ├── DomainValidationException.java
│       │   │       └── ClockConfig.java
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-dev.yml
│       │       ├── application-prod.yml
│       │       ├── logback-spring.xml
│       │       ├── data/
│       │       │   ├── products.json
│       │       │   ├── coupons.json
│       │       │   └── delivery-areas.json
│       │       └── db/migration/
│       │           └── V1__create_orders.sql
│       └── test/
│           ├── java/com/bragas/api/
│           │   ├── order/
│           │   │   ├── OrderControllerIT.java
│           │   │   ├── OrderAdminControllerIT.java
│           │   │   ├── OrderTest.java
│           │   │   ├── domain/
│           │   │   │   └── OrderStatusTransitionTest.java
│           │   │   └── pricing/
│           │   │       ├── OrderPricingCalculatorTest.java
│           │   │       ├── OrderEstimateCalculatorTest.java
│           │   │       └── DisplayIdGeneratorTest.java
│           │   ├── catalog/
│           │   │   ├── ProductCatalogTest.java
│           │   │   ├── CouponCatalogTest.java
│           │   │   └── DeliveryAreaCatalogTest.java
│           │   ├── store/
│           │   │   └── StoreStatusTest.java
│           │   ├── common/
│           │   │   └── FlywayMigrationIT.java
│           │   └── BragasApiApplicationIT.java   ← context loads
│           └── resources/
│               └── application-test.yml
└── .gitignore                            ← acrescentar backend/build, backend/.gradle, backend/.env
```

---

## 4. API REST

### 4.1. Convenções gerais

- Prefixo: `/api/v1`.
- Encoding: UTF-8.
- Content-Type: `application/json` para sucessos, `application/problem+json` para erros.
- IDs: ULID prefixado (`ord_01HXYZ...`) — opaco do ponto de vista do consumidor.
- `displayId`: `#XXXX` (4 dígitos numéricos), gerado pelo servidor.
- Datas: ISO-8601 UTC (`2026-05-20T18:00:00Z`).
- Valores monetários: `BigDecimal` com escala 2; serializados como número JSON (`51.61`).

### 4.2. `POST /api/v1/orders` — criar pedido

Público. Cliente envia o que comprou; servidor calcula tudo e responde com o pedido criado.

**Request body:**

```json
{
  "customer": { "name": "João Silva", "phone": "(21) 99999-0000" },
  "fulfillmentType": "delivery",
  "address": {
    "cep": "20000-000",
    "street": "Rua Teste",
    "number": "42",
    "neighborhood": "Higienópolis",
    "complement": "apto 302",
    "reference": "prédio cinza"
  },
  "payment": "credit",
  "changeFor": null,
  "items": [
    { "productId": "chicken", "quantity": 1, "notes": "" },
    { "productId": "crispy-catupiry", "quantity": 2, "notes": "sem cebola" }
  ],
  "couponCode": "BEMVINDO10"
}
```

Regras dos campos:
- `customer.name`: 2–120 chars, obrigatório.
- `customer.phone`: 8–40 chars, obrigatório.
- `fulfillmentType`: `delivery` | `pickup`, obrigatório.
- `address`: obrigatório se `fulfillmentType=delivery`; ignorado se `pickup`.
- `address.cep`, `street`, `number`, `neighborhood`: obrigatórios em delivery.
- `payment`: `pix` | `cash` | `credit` | `debit`, obrigatório.
- `changeFor`: número ≥ 0, obrigatório se `payment=cash` e quer troco; opcional caso contrário.
- `items`: array com ≥ 1 elemento.
- `items[].productId`: string, obrigatório.
- `items[].quantity`: inteiro ≥ 1.
- `items[].notes`: string, opcional, máx 200 chars.
- `couponCode`: string, opcional.

**Response 201:**

```json
{
  "id": "ord_01HXYZABCDEFGHJKMNPQRSTV",
  "displayId": "#3417",
  "status": "received",
  "fulfillmentType": "delivery",
  "customer": { "name": "João Silva", "phone": "(21) 99999-0000" },
  "address": { ... },
  "payment": "credit",
  "changeFor": null,
  "items": [
    { "productId": "chicken",       "productName": "Chicken",          "unitPrice": 25.90, "quantity": 1, "notes": "" },
    { "productId": "crispy-catupiry","productName": "Crispy Catupiry", "unitPrice": 39.90, "quantity": 2, "notes": "sem cebola" }
  ],
  "couponCode": "BEMVINDO10",
  "totals": {
    "subtotal":    105.70,
    "discount":     10.57,
    "deliveryFee":   4.99,
    "total":        100.12
  },
  "estimatedMinutes": { "min": 30, "max": 50 },
  "createdAt": "2026-05-20T18:00:00Z",
  "timestamps": {
    "receivedAt":  "2026-05-20T18:00:00Z",
    "preparingAt": null,
    "outAt":       null,
    "deliveredAt": null,
    "cancelledAt": null
  }
}
```

`Location` header: `/api/v1/orders/ord_01HXYZ...`.

### 4.3. `GET /api/v1/orders/:id` — buscar por id técnico

Público. `id` é o ULID. Front faz polling neste endpoint pra atualizar a tela.

**Response 200:** mesmo shape do POST 201.
**Response 404** se id não existe.

### 4.4. `GET /api/v1/orders/by-display/:displayId` — buscar por displayId

Público. `displayId` é o `#XXXX` (com `#` URL-encoded). Útil quando o cliente só tem o número curto em mãos.

**Response 200:** mesmo shape.
**Response 404** se displayId não existe.

### 4.5. `PATCH /api/v1/admin/orders/:id/status` — atualizar status

Protegido. Header `X-Admin-Token` obrigatório e igual ao `ADMIN_TOKEN` do ambiente.

**Request:**

```json
{ "to": "preparing" }
```

`to` ∈ `{ "preparing", "out", "delivered", "cancelled" }`. Não inclui `received`
(estado inicial automático).

**Response 200:** o pedido atualizado, com o timestamp da nova etapa preenchido em
`timestamps`.

**Erros:**
- `401` — token ausente/inválido.
- `404` — id não encontrado.
- `409` — transição inválida (ex.: `delivered → received`).

### 4.6. Fluxo de status

```
received ──► preparing ──► out ──► delivered (final)
   │            │           │
   ▼            ▼           ▼
cancelled (final, alcançável de received|preparing|out)
```

Regras:
- Estado inicial: `received` (gravado no POST).
- Transições válidas (matriz completa em `OrderStatusTransition`):
  - `received    → {preparing, cancelled}`
  - `preparing   → {out, cancelled}`
  - `out         → {delivered, cancelled}`
  - `delivered   → {}` (final)
  - `cancelled   → {}` (final)
- Toda transição válida grava o timestamp correspondente.

---

## 5. Fonte autoritativa de preço, cupom e taxa

### 5.1. Por que JSON estático no MVP

Migrar cardápio pro banco fura o escopo "só pedidos". Cliente quer iterar rápido. O
cardápio (~80 produtos) é estável: atualização rara, sempre manual. Sub-projeto 5
(painel admin) vai migrar pro banco quando admin precisar editar produtos sem deploy.

**Trade-off aceito:** quando o `data/menu.ts` do front mudar, é preciso atualizar
manualmente o `backend/src/main/resources/data/products.json`. Mesma coisa pra
cupons e taxas. Como são raros, vale o atrito.

### 5.2. Arquivos

`backend/src/main/resources/data/products.json` (formato espelha `Product` do front):

```json
[
  {
    "id": "chicken",
    "categoryId": "burgers",
    "name": "Chicken",
    "price": 25.90,
    "available": true
  }
]
```

`coupons.json`:

```json
[
  { "code": "BEMVINDO10", "type": "percent", "value": 10 },
  { "code": "FRETE5",     "type": "fixed",   "value":  5, "minSubtotal": 40 }
]
```

`delivery-areas.json`:

```json
[
  { "neighborhood": "Higienópolis", "fee": 4.99 },
  { "neighborhood": "Tijuca",       "fee": 6.99 }
]
```

### 5.3. Carregamento

`CatalogConfig` é um `@Configuration` que:
1. Lê cada JSON com Jackson.
2. Valida shape (não vazio, campos obrigatórios).
3. Expõe três beans imutáveis: `ProductCatalog`, `CouponCatalog`, `DeliveryAreaCatalog`.
4. Lança e impede o app de subir se algum JSON está malformado/vazio (falha rápida).

API dos catálogos:

```java
ProductCatalog.findById(String id) -> Optional<Product>
ProductCatalog.requireAll(Collection<String> ids) -> void  // lança se algum não existe ou está unavailable

CouponCatalog.find(String code) -> Optional<Coupon>

DeliveryAreaCatalog.findFee(String neighborhood) -> Optional<BigDecimal>
```

### 5.4. `application.yml` — configurações de negócio

```yaml
app:
  store:
    minOrder: 25.00
    averagePrepTime: 25      # minutos
    openingHours:
      sun: { open: "18:00", close: "00:00" }
      mon: null
      tue: { open: "18:00", close: "23:40" }
      wed: { open: "18:00", close: "23:40" }
      thu: { open: "18:00", close: "23:40" }
      fri: { open: "18:00", close: "00:00" }
      sat: { open: "18:00", close: "00:00" }
  admin:
    token: ${ADMIN_TOKEN}    # falha rápida se não vier
  cors:
    allowedOrigins:
      - "http://localhost:3000"
```

### 5.5. Validação completa do `POST /orders`

Nesta ordem, primeiro erro retorna 400:

1. Bean Validation (shape): campos obrigatórios, tamanhos.
2. `StoreStatus.isOpen(clock.now())` → 400 `store-closed`.
3. `ProductCatalog.requireAll(productIds)` → 400 `product-not-found` ou `product-unavailable`.
4. `fulfillmentType=delivery` exige `address`; `address.neighborhood` existe em `DeliveryAreaCatalog` → 400 `delivery-area-not-served`.
5. `OrderPricingCalculator.compute(...)` calcula subtotal/discount/fee/total.
6. `couponCode` (se houver) deve existir e respeitar `minSubtotal` → 400 `coupon-invalid`.
7. `subtotal ≥ app.store.minOrder` → 400 `order-min-not-met`.
8. `payment=cash` + `changeFor != null` ⇒ `changeFor ≥ total` → 400 `change-insufficient`.

### 5.6. Cálculo (servidor, `BigDecimal` em todo lugar)

```
subtotal     = Σ ( ProductCatalog.findById(item.productId).price × item.quantity )
discount     = aplica Coupon (percent: subtotal × value/100; fixed: value), clamp a [0, subtotal]
deliveryFee  = pickup → 0.00
               delivery → DeliveryAreaCatalog.findFee(address.neighborhood)
total        = subtotal − discount + deliveryFee
estimateMin  = averagePrepTime + (deliveryFee → minutes via tabela) − 5
estimateMax  = idem + 5
```

Tabela `fee → minutes` espelha `lib/delivery-time.ts` do front:

| Fee (R$) | Minutos |
|----------|---------|
| 4.99 | 10 |
| 5.99 | 15 |
| 6.99 | 20 |
| 7.99 | 25 |
| 8.99 | 30 |
| 9.99 | 35 |
| 10.99 | 40 |

Resposta da API expõe `{ min: total − 5, max: total + 5 }`.

---

## 6. Schema do banco — Flyway `V1__create_orders.sql`

```sql
CREATE TYPE order_status AS ENUM (
  'received', 'preparing', 'out', 'delivered', 'cancelled'
);
CREATE TYPE fulfillment_type AS ENUM ('delivery', 'pickup');
CREATE TYPE payment_method  AS ENUM ('pix', 'cash', 'credit', 'debit');

CREATE TABLE orders (
  id                 TEXT PRIMARY KEY,              -- "ord_01HXYZ..."
  display_id         VARCHAR(5) NOT NULL UNIQUE,    -- "#3417" com '#'
  status             order_status NOT NULL DEFAULT 'received',

  customer_name      VARCHAR(120) NOT NULL,
  customer_phone     VARCHAR(40)  NOT NULL,

  fulfillment_type   fulfillment_type NOT NULL,
  address_cep        VARCHAR(10),
  address_street     VARCHAR(200),
  address_number     VARCHAR(20),
  address_neighborhood VARCHAR(120),
  address_complement VARCHAR(200),
  address_reference  VARCHAR(200),

  payment            payment_method NOT NULL,
  change_for         NUMERIC(10, 2),

  coupon_code        VARCHAR(40),
  coupon_discount    NUMERIC(10, 2) NOT NULL DEFAULT 0,
  subtotal           NUMERIC(10, 2) NOT NULL,
  delivery_fee       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total              NUMERIC(10, 2) NOT NULL,

  estimated_min      INT NOT NULL,
  estimated_max      INT NOT NULL,

  received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  preparing_at       TIMESTAMPTZ,
  out_at             TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT delivery_has_address CHECK (
    fulfillment_type = 'pickup'
    OR (address_street IS NOT NULL AND address_neighborhood IS NOT NULL)
  )
);

CREATE INDEX idx_orders_display_id ON orders (display_id);
CREATE INDEX idx_orders_status     ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

CREATE TABLE order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  position      INT  NOT NULL,
  product_id    VARCHAR(80)  NOT NULL,
  product_name  VARCHAR(200) NOT NULL,
  unit_price    NUMERIC(10, 2) NOT NULL,
  quantity      INT  NOT NULL CHECK (quantity > 0),
  notes         TEXT,
  UNIQUE (order_id, position)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

CREATE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

**Notas:**
- `display_id` `UNIQUE` ⇒ geração com retry on conflict (até 10 tentativas, depois erro 500).
- `order_items` guarda **snapshot completo** (sem FK pra produtos — produtos vivem em JSON e podem mudar; pedido é histórico imutável).
- 5 timestamps por status como colunas (vs tabela de transições) — simples, fácil de query, escala bem pra 10k+ pedidos sem problema.
- `CHECK delivery_has_address`: defesa em profundidade além da validação no service.

---

## 7. Camadas do código

```
Controller (fino)
  └─ HTTP, request/response, sem lógica
Service (gordo)
  └─ regra de negócio, @Transactional, orquestra Catalog/Repository/Domain
Domain (puro)
  └─ Order, OrderItem, OrderStatusTransition — testáveis sem Spring
Repository (Spring Data)
  └─ JpaRepository<Order, String>; findByDisplayId(String)
Catalog (in-memory)
  └─ imutável, carregado no startup
```

Princípios:
- Pacote por feature (`order/`), não por camada técnica.
- `Clock` injetado via bean (`Clock.systemUTC()`); mockável em teste com `Clock.fixed(...)`.
- `@Transactional` no método de Service que escreve. Leitura em transações somente-leitura.
- `OrderStatusTransition` é estático e puro (`isValid(from, to): boolean`).

---

## 8. Erros — Problem Details (RFC 7807)

Centralizado em `ApiExceptionHandler` (`@RestControllerAdvice`).

**Shape:**

```json
{
  "type": "https://bragas.com/errors/order-min-not-met",
  "title": "Pedido abaixo do mínimo",
  "status": 400,
  "detail": "Subtotal R$ 18,90 está abaixo do mínimo de R$ 25,00.",
  "instance": "/api/v1/orders",
  "errors": [
    { "field": "items[0].quantity", "message": "deve ser maior que 0" }
  ]
}
```

`errors[]` só em violações de Bean Validation. Outros erros omitem.

**Mapeamento:**

| Exception | Status | type slug |
|-----------|--------|-----------|
| `MethodArgumentNotValidException` | 400 | `validation-failed` |
| `DomainValidationException` (loja fechada, mín., bairro, cupom, troco) | 400 | varia |
| `OrderNotFoundException` | 404 | `order-not-found` |
| `InvalidStatusTransitionException` | 409 | `invalid-status-transition` |
| `MissingAdminTokenException` | 401 | `admin-token-missing` |
| `InvalidAdminTokenException` | 401 | `admin-token-invalid` |
| `Exception` (catch-all) | 500 | `internal-error` (`detail` genérico, sem stacktrace) |

Stacktrace nunca vai pro cliente. Vai pro log.

---

## 9. Segurança no MVP

- Spring Security ativo. `/api/v1/admin/**` exige header `X-Admin-Token`; restante liberado.
- `AdminTokenFilter` (`OncePerRequestFilter`):
  - Lê header `X-Admin-Token`.
  - Compara com `app.admin.token` usando `MessageDigest.isEqual(byte[], byte[])` (constant-time).
  - Sem header → `MissingAdminTokenException` → 401.
  - Header errado → `InvalidAdminTokenException` → 401.
- Token vem de env var `ADMIN_TOKEN`. `application.yml` lê com `${ADMIN_TOKEN}` sem default — app não sobe se ausente.
- CORS: origens em `app.cors.allowedOrigins` (lista em `application.yml`); só `http://localhost:3000` em dev.
- HTTPS, rate limit, headers extras (CSP, HSTS) → sub-projeto 6.

---

## 10. Observabilidade

- **Logs**: Logback. Texto colorido em dev (`application-dev.yml`), JSON estruturado em prod (`application-prod.yml`, via `logstash-logback-encoder`).
- **`RequestLogFilter`** (`OncePerRequestFilter`): loga método, rota, status, duração ms.
- **Sem PII**: customer.name, phone, address não entram no log. `orderId` pode (id, não identifica pessoa diretamente).
- **Actuator**:
  - `/actuator/health` exposto (200 quando DB está acessível).
  - `/actuator/info` exposto (versão).
  - Resto bloqueado.
- **Micrometer** no classpath, mas **sem exportador** (Prometheus, etc.) — sub-projeto 6 pluga.

---

## 11. Configuração — perfis

- `application.yml` — comum (porta 8080, JPA, Flyway on).
- `application-dev.yml` — `spring.datasource.url=jdbc:postgresql://localhost:5432/bragas`, logs em texto, `ddl-auto: validate`.
- `application-prod.yml` — datasource via env (`DB_URL`, `DB_USER`, `DB_PASSWORD`), logs JSON, sem Swagger.
- `application-test.yml` — datasource injetada pelo Testcontainers via `@DynamicPropertySource`.

Spring profile ativo em dev local: `dev` (default em `application.yml`).

---

## 12. Docker Compose (`backend/docker-compose.yml`)

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

Comando de uso: `cd backend && docker compose up -d`.

---

## 13. Testes

### 13.1. Unitários (sem Spring)

| Classe | Cobertura |
|--------|-----------|
| `OrderPricingCalculatorTest` | subtotal; cupom percent/fixed/min-subtotal; pickup vs delivery; total |
| `OrderEstimateCalculatorTest` | minutos por faixa de taxa; pickup só preparo |
| `OrderStatusTransitionTest` | matriz 5×5 (todas as transições válidas/inválidas) |
| `OrderTest` | `applyTransition` seta o timestamp da nova etapa; estados finais não aceitam transição |
| `DisplayIdGeneratorTest` | formato `#XXXX`; retry quando colide (mock do repo retorna `exists=true` N vezes); falha após 10 tentativas |
| `StoreStatusTest` | aberta/fechada em todos os 7 dias; virada da meia-noite |
| `ProductCatalogTest` | carrega JSON; recusa vazio/malformado; `requireAll` lança quando product não existe ou unavailable |
| `CouponCatalogTest` | percent vs fixed; minSubtotal; code inexistente |
| `DeliveryAreaCatalogTest` | bairro existente; bairro inexistente |

### 13.2. Integração (`@SpringBootTest` + Testcontainers)

| Classe | Cobertura |
|--------|-----------|
| `BragasApiApplicationIT` | context carrega |
| `FlywayMigrationIT` | migrations aplicam em banco limpo |
| `OrderControllerIT` | POST happy path delivery e pickup; GET por id; GET by-display; **todos os 400** (loja fechada, produto, bairro, cupom, mín., troco); 404; Problem Details no shape correto |
| `OrderAdminControllerIT` | PATCH com token OK transita status; sem token → 401; token errado → 401; transição inválida → 409; pedido inexistente → 404; cada transição válida grava o timestamp certo |

### 13.3. Princípios

- `Clock` `Clock.fixed(...)` injetado nos testes que dependem de "agora".
- Testcontainers sobe Postgres 16 (mesma versão do dev) por suite.
- Cada teste de integração em transação rollback-no-fim (`@Transactional` no test).
- Sem `coverage %` como meta — testar comportamento, não linha. Bug → teste novo.
- Não há "mock do banco" — testes de integração usam o banco real.

---

## 14. Mudanças por arquivo

**Criar (no `backend/`):** todos os arquivos listados em §3.

**Modificar (no front):**
- `.gitignore` (raiz): adicionar `backend/build/`, `backend/.gradle/`, `backend/.env`.

**Sem alteração no front por enquanto:** integração com a API é o sub-projeto 4.

---

## 15. Critérios de sucesso

- `cd backend && docker compose up -d` sobe Postgres saudável.
- `./gradlew bootRun` (com `ADMIN_TOKEN=...`) sobe o app na porta 8080.
- `./gradlew test` roda todos os testes (unitários + integração) — verde.
- `./gradlew build` produz `build/libs/bragas-api-0.1.0.jar`.
- Via Postman/cURL:
  - POST `/api/v1/orders` com pedido válido → 201 com `id` ULID, `displayId` `#XXXX`, totais calculados corretamente, `timestamps.receivedAt` preenchido.
  - POST com produto inexistente → 400 `product-not-found`.
  - POST com bairro não atendido → 400 `delivery-area-not-served`.
  - POST com subtotal < R$ 25 → 400 `order-min-not-met`.
  - POST com loja fechada (mockar hora) → 400 `store-closed`.
  - GET por id → 200 retornando o pedido.
  - GET por displayId → 200 retornando o mesmo pedido.
  - PATCH `/api/v1/admin/orders/:id/status` sem token → 401 `admin-token-missing`.
  - PATCH com token errado → 401 `admin-token-invalid`.
  - PATCH com token OK e transição válida → 200 com timestamp da nova etapa preenchido.
  - PATCH com transição inválida (`delivered → received`) → 409 `invalid-status-transition`.
- Logs em texto durante dev; logs JSON quando `SPRING_PROFILES_ACTIVE=prod`.
- `/actuator/health` retorna 200 quando Postgres está up; 503 quando down.
- Nenhuma PII (nome, telefone, endereço) aparece em logs.

---

## 16. Pendências conhecidas (sub-projetos futuros)

| Item | Sub-projeto |
|------|-------------|
| Front consumir a API (chamar POST/GET, polling) | 4 |
| Login real + sessão (substitui `X-Admin-Token`) | 4 |
| Painel admin com UI pra atualizar status | 5 |
| Cardápio editável (migrar `products.json` pra tabela) | 5 |
| Cupons gerenciáveis | 5 |
| HTTPS, rate limiting, CSP, deploy em VPS | 6 |
| Observabilidade externa (Prometheus, Sentry) | 6 |
| Testes E2E front ↔ back | 6 |
