# Spec de Design — Catálogo dinâmico (Sub-projeto 5a)

**Data:** 2026-06-01
**Sub-projeto:** 5a de 6 — Catálogo dinâmico (parte 1 do "Painel Admin" do roadmap original)
**Spec anterior:** `2026-05-27-sp4b-auth-cliente-design.md` (SP4b, mergeado em master via PR #7)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

Sub-projetos 1 a 4b estão concluídos e mergeados em master:

- **SP1+SP2** — front Next.js com cardápio, carrinho, checkout, `OrderStatusScreen.v2`.
- **SP3** — backend Java/Spring com endpoints REST de pedidos no Postgres.
- **SP4a** — front consome a API; pedido criado é gravado e a tela de status faz polling.
- **SP4b** — autenticação opcional do cliente final (signup/login/perfil/meus-pedidos).

Hoje o **catálogo** (produtos, categorias, cupons) é estático em dois lugares:

- Front: `data/menu.ts`, `data/coupons.ts` (TypeScript em build).
- Back: `backend/src/main/resources/data/products.json`, `coupons.json` (JSON embedded no jar; usado por `ProductCatalog` para validar pedidos).

Para mudar qualquer preço ou cupom o desenvolvedor precisa editar o repositório e fazer redeploy. **O cliente (Braga's Burger) depende do dev para qualquer ajuste de cardápio.**

Este sub-projeto (5a) **migra catálogo e cupons para o Postgres** e expõe endpoints REST de edição protegidos pelo `X-Admin-Token` atual. Backend ainda recalcula preços (continuidade do SP3) — o snapshot em `order_items` segue protegendo pedidos antigos de mudanças no DB.

Auth admin por sessão e a UI do painel ficam para os próximos sub-projetos (5b e 5c). O WhatsApp paralelo no checkout permanece até a UI admin estar pronta (SP5c).

### Escopo

**Dentro:**

- Backend: pacote `catalog/` em Spring com `Category`, `Product`, `Coupon` JPA entities.
- Backend: Flyway V4 cria tabelas + seeda dados atuais (7 categorias, 84 produtos, 2 cupons).
- Backend público: `GET /api/v1/menu` (agregado categorias+produtos), `POST /api/v1/coupons/validate`.
- Backend admin (X-Admin-Token): CRUD em `/admin/categories`, `/admin/products`, `/admin/coupons`.
- Backend: `OrderService` passa a resolver `productId → preço/nome` via `ProductRepository` em vez do `ProductCatalog` que lia JSON. `ProductCatalog` e os JSONs são removidos.
- Backend: rate limit estendido para `/admin/**` e `/coupons/validate` no `RateLimitFilter` existente.
- Backend: `AdminTokenFilter` passa a usar `MessageDigest.isEqual` (constant-time).
- Backend: validações de input rígidas (regex em slugs, only HTTPS em image URL, value≤100 em percent, datas consistentes em cupom).
- Backend: CHECK constraints no DB para `coupons.value` (percent ≤ 100) e janela temporal (`valid_from < valid_until`).
- Backend: audit log INFO em mutações admin (sem PII, sem token).
- Front: `lib/menu-api.ts` (`getMenu()`, `validateCoupon()`).
- Front: `app/page.tsx` (home) vira async Server Component com `revalidate: 300`.
- Front: validação de cupom passa a chamar `POST /coupons/validate` (cálculo client-side em `lib/cart.calcDiscount` some).
- Front: tipos `Category`/`Product`/`Coupon` migram para `lib/types-api.ts`.
- Front: `data/menu.ts`, `data/menu.test.ts`, `data/coupons.ts` removidos com seus imports.
- Testes: integração de cada novo endpoint + adaptações nos testes existentes.

**Fora do escopo:**

- UI admin (telas web de gestão) — **SP5c**.
- Auth admin por sessão (substituir `X-Admin-Token` por login com cookie) — **SP5b**.
- Remover o `window.open(wa.me/...)` no checkout — **SP5c**.
- Upload de imagens (multipart, storage local/S3) — `image_url` é string livre HTTPS, admin cola URL externa.
- `delivery-areas.json` no DB — bairros ficam estáticos por enquanto.
- Configurações da loja (horários, taxa mínima) no DB — continuam em `application.yml`.
- `coupon_uses` tracking (uso único por user, contagem de uso) — modelo simples, cupons são reutilizáveis.
- Métricas/dashboard/relatórios — escopo de UI, **SP5c**.
- Revalidate on-demand (`revalidatePath()` chamado pelo endpoint admin) — fica para SP5c com webhook.
- HTTPS/TLS, secrets em vault, IP allowlist em `/admin/**`, WAF — **SP6** (deploy).

### Decisões travadas no brainstorming (2026-06-01)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Fonte de verdade pós-SP5a | **DB**; JSON vira seed inicial (lido só na migration) |
| 2 | Edição durante vida do SP5a | Endpoints admin REST (`curl`/Postman), `X-Admin-Token` mantido |
| 3 | Categorias | **Dinâmicas** — tabela com `name`, `display_order`, `layout` |
| 4 | Modelo de cupons | `code/type/value/min_subtotal/valid_from/valid_until/active` |
| 5 | Consumo no front | **RSC** com `fetch + revalidate: 300` (ISR 5min) |
| 6 | WhatsApp paralelo | **Fica** até SP5c |
| 7 | Imagens de produto | **URL externa** HTTPS (string editável) |
| 8 | Forma do endpoint público | **`GET /menu`** agregado (1 query com join) |
| 9 | Auth admin no SP5a | `X-Admin-Token` mantido; SP5b troca por sessão |

---

## 2. Schema do DB (Flyway V4)

```sql
CREATE TABLE categories (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    display_order INT  NOT NULL DEFAULT 100,
    layout        TEXT NOT NULL DEFAULT 'grid' CHECK (layout IN ('grid','list')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id            TEXT PRIMARY KEY,
    category_id   TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    description   TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
    price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    price_from    BOOLEAN NOT NULL DEFAULT false,
    image_url     TEXT CHECK (image_url IS NULL OR image_url ~ '^https://'),
    featured      BOOLEAN NOT NULL DEFAULT false,
    available     BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 100,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id, display_order);

CREATE TABLE coupons (
    code         TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9_-]{2,40}$'),
    type         TEXT NOT NULL CHECK (type IN ('percent','fixed')),
    value        NUMERIC(10,2) NOT NULL CHECK (value >= 0),
    min_subtotal NUMERIC(10,2),
    valid_from   TIMESTAMPTZ,
    valid_until  TIMESTAMPTZ,
    active       BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT coupons_percent_value CHECK (type <> 'percent' OR value <= 100),
    CONSTRAINT coupons_date_window   CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until)
);
```

**Notas:**

- **IDs como TEXT/slug** preservam a continuidade do histórico: `order_items.product_id` (já string) referencia esses IDs.
- **`ON DELETE RESTRICT`** em `products.category_id` evita órfãos (DELETE de categoria com produtos falha com 409 no handler).
- **Cupom case-insensitive**: normalizamos para uppercase na entrada (`@Pattern("^[A-Z0-9_-]+$")` + `code = code.toUpperCase()` no service). Evita `LOWER()` em queries.
- **`image_url`** é validado em três camadas: DTO (`@Pattern("^https://")`), `regex` na CHECK constraint, e renderização React (escape automático). Bloqueia `javascript:` / `data:` / `http://` plain.
- **`updated_at`** pretende ser atualizado via trigger ou no service. Optamos por atualizar no service (`entity.setUpdatedAt(Instant.now())`) por simplicidade — sem triggers.

### Seed (parte da V4)

`V4` termina com `INSERT` das 7 categorias + 84 produtos + 2 cupons atuais. Os valores são gerados em build-time por um pequeno script Node (lê `data/menu.ts`/`data/coupons.ts`, emite SQL) — o output entra na migration manualmente. Resultado: produção iniciada após SP5a tem todo o catálogo presente.

---

## 3. Endpoints

### Público (sem auth)

#### `GET /api/v1/menu`

```json
200 OK
{
  "categories": [
    {
      "id": "burgers",
      "name": "Burgers",
      "displayOrder": 1,
      "layout": "grid",
      "products": [
        {
          "id": "braguinha",
          "name": "Braguinha",
          "description": "Pão de brioche...",
          "price": 22.90,
          "priceFrom": true,
          "imageUrl": "https://.../braguinha.webp",
          "featured": false,
          "available": true,
          "displayOrder": 10
        }
      ]
    }
  ]
}
```

- Ordenado por `display_order` em ambos os níveis.
- Produtos com `available = false` **omitidos da resposta**.
- Cacheable: `Cache-Control: public, max-age=60` (header opcional; o ISR do Next é a defesa principal).

#### `POST /api/v1/coupons/validate`

```json
// req
{ "code": "BEMVINDO10", "subtotal": 50.00 }

// 200 sempre (válido ou não)
{ "valid": true,  "type": "percent", "value": 10, "discount": 5.00 }
{ "valid": false }
```

- Server checa `active`, janela `valid_from..valid_until` com `now()`, `min_subtotal`.
- **Sempre 200** — opacidade análoga ao `/auth/forgot` do SP4b. Não distingue "código inexistente" vs "abaixo do mínimo".
- Rate-limited (ver Segurança).

### Admin (`X-Admin-Token` header)

Todos os endpoints abaixo retornam Problem Details (RFC 7807) em erros. Slugs validados por `^[a-z0-9-]{1,40}$`.

**Categorias** — `/api/v1/admin/categories`

| Método | Path | Body | Resposta |
|---|---|---|---|
| GET | `/admin/categories` | — | `200 [Category]` |
| POST | `/admin/categories` | `{id, name, displayOrder?, layout?}` | `201 Category` · `409 category-already-exists` |
| PATCH | `/admin/categories/{id}` | partial | `200 Category` · `404 category-not-found` |
| DELETE | `/admin/categories/{id}` | — | `204` · `409 category-has-products` |

**Produtos** — `/api/v1/admin/products`

| Método | Path | Body | Resposta |
|---|---|---|---|
| GET | `/admin/products?categoryId={id}` | — (query opcional) | `200 [Product]` |
| POST | `/admin/products` | full Product (id, categoryId, name, price, …) | `201 Product` · `404 category-not-found` se `categoryId` não corresponde a categoria existente · `409 product-already-exists` |
| PATCH | `/admin/products/{id}` | partial | `200 Product` · `404 product-not-found` |
| DELETE | `/admin/products/{id}` | — | `204` · `409 product-has-orders` se referenciado por algum `order_items` |

**Cupons** — `/api/v1/admin/coupons`

| Método | Path | Body | Resposta |
|---|---|---|---|
| GET | `/admin/coupons` | — | `200 [Coupon]` (com `active`, datas) |
| POST | `/admin/coupons` | `{code, type, value, minSubtotal?, validFrom?, validUntil?, active?}` | `201 Coupon` · `409 coupon-already-exists` · `400 coupon-percent-over-100` · `400 coupon-invalid-window` |
| PATCH | `/admin/coupons/{code}` | partial | `200 Coupon` |
| DELETE | `/admin/coupons/{code}` | — | `204` |

---

## 4. Migração e mudanças no código

### Backend

**Novos arquivos** (`backend/src/main/java/com/bragas/api/catalog/`):

```
catalog/
├── domain/
│   ├── Category.java          (JPA @Entity, mapeada para tabela `categories`)
│   ├── Product.java           (JPA @Entity, @ManyToOne Category)
│   └── Coupon.java            (JPA @Entity — substitui Coupon antigo do package catalog)
├── CategoryRepository.java    (extends JpaRepository)
├── ProductRepository.java
├── CouponRepository.java
├── MenuService.java           (carrega snapshot agregado para GET /menu)
├── CouponService.java         (validate logic: active + janela + min_subtotal)
├── MenuController.java        (GET /menu)
├── CouponController.java      (POST /coupons/validate)
├── exception/                 (CategoryNotFoundException, ProductNotFoundException, etc.)
└── admin/
    ├── AdminCategoryController.java
    ├── AdminProductController.java
    ├── AdminCouponController.java
    └── dto/
        ├── CategoryRequest.java / Response.java
        ├── ProductRequest.java  / Response.java
        ├── CouponRequest.java   / Response.java
        └── MenuResponse.java
```

**Arquivos modificados:**

- `OrderService.java`: substituir uso do `ProductCatalog` por `ProductRepository.findById()`. Snapshot em `order_items.unitPrice/productName` continua igual.
- `ApiExceptionHandler.java`: novos `@ExceptionHandler` para `CategoryNotFoundException`, `ProductNotFoundException`, `CategoryHasProductsException`, `CouponAlreadyExistsException`, etc.
- `RateLimitFilter.java`: adicionar regras (ver Segurança).
- `AdminTokenFilter.java`: `MessageDigest.isEqual` no lugar de `String.equals`.
- `SecurityConfig.java`: nenhum mudança em rotas (já tem `permitAll` em `/auth/**` e `requestMatchers("/admin/**").hasRole("ADMIN")` ou equivalente — adaptar se necessário para reconhecer todos os `/admin/*`).

**Arquivos removidos:**

- `backend/src/main/java/com/bragas/api/catalog/ProductCatalog.java`
- `backend/src/main/resources/data/products.json`
- `backend/src/main/resources/data/coupons.json`
- `backend/src/main/java/com/bragas/api/catalog/domain/Coupon.java` (antigo) — substituído pelo novo.

### Frontend

**Novos arquivos:**

- `lib/menu-api.ts` — `getMenu()` e `validateCoupon({code, subtotal})`; reusa `api-client` infra (`credentials:'include'`, `ApiError`).
- Tipos adicionados em `lib/types-api.ts`: `Category`, `Product`, `Menu`, `CouponValidationResponse`.

**Arquivos modificados:**

- `app/page.tsx` — async Server Component com `export const revalidate = 300`; `await getMenu()` e passa `categories` como prop.
- `components/cardapio/*` (qualquer componente que importa `data/menu.ts`) — recebe categorias via prop.
- `app/checkout/page.tsx` — validação de cupom passa a chamar `validateCoupon()` no input (com debounce ~400ms). O response inclui `discount` server-calculated.
- `lib/cart.ts` — `calcDiscount(subtotal, coupon)` removida ou aceita o `discount` já calculado.
- Testes que mockavam `data/menu.ts` migram para mockar `lib/menu-api.ts`.

**Arquivos removidos:**

- `data/menu.ts`, `data/menu.test.ts`
- `data/coupons.ts`

---

## 5. Testes e smoke

### Backend (alvo ~125, atual 99)

- `CategoryRepositoryTest`, `ProductRepositoryTest`, `CouponRepositoryTest` — smoke das queries customizadas.
- `CouponServiceTest` (unit) — janela temporal, `min_subtotal`, `active` flag em isolation.
- `MenuControllerIT` — `GET /menu` retorna estrutura agregada; produtos `available=false` somem; ordering correto.
- `AdminCategoryControllerIT` — CRUD completo; 401 sem token; 409 ao deletar com produtos; 400 em `layout` inválido.
- `AdminProductControllerIT` — CRUD; 404 em `categoryId` inexistente; 409 ao deletar com `order_items`; 400 em `imageUrl` não-HTTPS.
- `AdminCouponControllerIT` — CRUD; PATCH ativa/desativa; 400 em `value > 100` para percent; 400 em `valid_from > valid_until`.
- `CouponValidateIT` — válido / inativo / expirado / antes de `valid_from` / abaixo de `min_subtotal` → todos `200` com só o caminho válido `{valid:true}`.
- `OrderServiceIT` adaptado — Flyway seed substitui mock do `ProductCatalog`.
- `FlywayCatalogIT` — após V4, 7 categorias / 84 produtos / 2 cupons no DB.
- `AdminTokenFilterTest` — constant-time comparison não vaza tempo (smoke).
- `RateLimitFilterTest` — novas regras de `/admin/**` e `/coupons/validate` disparam 429.

### Frontend (alvo ~245, atual 226)

- `lib/menu-api.test.ts` — mock fetch para `/menu` e `/coupons/validate`, valida shape.
- `app/page.test.tsx` — render do RSC com fixture; produtos não-`available` somem (já que back filtra, mas testa robustez).
- `app/checkout` — atualizar mocks; novo teste de debounce no input de cupom.
- Adaptar testes que importavam `data/menu.ts` ou `data/coupons.ts`.

### Smoke manual (final do PR, antes do merge)

1. `cd backend && docker compose up -d && JWT_SECRET=... ADMIN_TOKEN=dev ./gradlew bootRun`
2. `npm run dev`
3. `curl http://localhost:8080/api/v1/menu | jq` — 7 categorias × N produtos.
4. `curl -X POST http://localhost:8080/api/v1/coupons/validate -H 'Content-Type: application/json' -d '{"code":"BEMVINDO10","subtotal":50}'` → `{valid:true, discount:5}`.
5. `curl -X POST http://localhost:8080/api/v1/admin/products -H 'X-Admin-Token: dev' -H 'Content-Type: application/json' -d '{"id":"teste","categoryId":"burgers","name":"Teste","price":15.5}'` → 201. `GET /menu` mostra o novo produto.
6. `curl -X PATCH http://localhost:8080/api/v1/admin/categories/burgers -H 'X-Admin-Token: dev' -d '{"name":"Burgers Mudado"}'` → 200; home reflete após revalidate de 5min (ou imediato em `npm run dev`).
7. Cupom expirado via admin → `validate` retorna `{valid:false}`.
8. Checkout no browser: pedido sem cupom, com cupom válido, com cupom inválido — UX humanizada.
9. `docker exec bragas-postgres psql -U bragas -d bragas -c "SELECT count(*) FROM products"` ≥ 84.
10. Rate limit: 31 POSTs em `/admin/products` em <1min → 31º retorna 429.
11. `curl -X POST /admin/products` (sem header) → 401.

---

## 6. Segurança

### Defesas dentro do SP5a

| # | Defesa | Onde |
|---|---|---|
| 1 | Validação rígida de input (slugs, HTTPS-only imageUrl, percent ≤ 100, janela de datas consistente) | DTOs com `jakarta.validation` |
| 2 | CHECK constraints no DB (defense in depth: regex em slug, percent ≤ 100, janela temporal, image HTTPS) | Migration V4 |
| 3 | `X-Admin-Token` comparado com `MessageDigest.isEqual` (constant-time) | `AdminTokenFilter` |
| 4 | Rate limit estendido: `POST /admin/**` 30/min/IP, `POST /coupons/validate` 60/min/IP | `RateLimitFilter` (regras novas no array `RULES`) |
| 5 | `RequestLogFilter` (já existente, `api.request` logger) registra apenas `method`/`URI`/`status`/`ms` — confirmar no spec que headers nunca são adicionados ao log dessa categoria; setar nota proibindo `logging.level.org.springframework.web=DEBUG` em prod | `RequestLogFilter` (já existe) + `application.yml` |
| 6 | Audit log INFO em mutações admin: `admin.action action=PATCH resource=product id=braguinha actor_fp=<sha256(token):8>` | Cada admin controller emite `log.info(...)` antes de responder |
| 7 | CORS de `/admin/**` restrito a origens da lista `app.cors.allowedOrigins` (não wildcard) | `SecurityConfig` — confirmar (já é restrito hoje) |

### Defesas fora do SP5a (SP6 — deploy)

- HTTPS / TLS termination via reverse proxy.
- Postgres não exposto publicamente.
- Secrets em vault (não env vars planas).
- WAF (mod_security, Cloudflare).
- IP allowlist em `/admin/**`.
- Backup do DB.

### Decisões conscientes (registradas para auditoria futura)

- **Enumeração via timing em `/coupons/validate`**: aceito. Resposta opaca (sempre 200) + rate limit é a defesa. Constant-time real exigiria resposta dummy idêntica em forma; custo alto para benefício baixo.
- **`coupon_uses` tracking não existe**: cupons são reutilizáveis. Se atacante criar 100 pedidos com `BEMVINDO10` (10%), a perda total é limitada e backend recalcula tudo.
- **Audit log em stdout, não em tabela queryable**: para 1 admin com `X-Admin-Token` shared, log estruturado basta. SP5b com sessão (`admin_users`) reabre essa decisão.

### Riscos residuais

- **`X-Admin-Token` é shared secret**. Se vazar, atacante tem CRUD completo até rotação. SP5b mitiga via sessão por user identificável.
- **Imagens externas**: hosts podem cair → link rot. Aceitável; admin substitui URL quando notar.

---

## 7. Riscos abertos e itens de atenção

1. **Revalidate 5min é magic number**. Cliente edita produto e vê cache antigo por até 5min. Aceito como trade-off de simplicidade. SP5c pode adicionar `revalidatePath()` on-demand via webhook do endpoint admin.
2. **Geração do seed da V4**: 84 produtos × campos = ~250 linhas de `INSERT`. Script Node gera 1x manualmente; resultado entra na migration. Se errar, repetir `INSERT INTO ... ON CONFLICT DO NOTHING` por idempotência. Migration NÃO pode ser idempotente em produção (Flyway re-aplica falha), então o script tem que gerar SQL correto na primeira tentativa — revisar o output antes de commitar.
3. **Adapter no `OrderService`**: hoje `ProductCatalog` é chamado em vários pontos (validação, snapshot). Risco de esquecer um. Mitigação: rodar **todos** os ITs de pedidos (`OrderControllerIT`, `OrderUserLinkIT`, etc.) após o swap; também verificar manualmente no smoke (pedido com cupom funciona).
4. **`order_items.product_id` sem FK explícita**: produtos podem ser deletados via admin enquanto pedidos antigos referenciam o ID por string. **Mitigação**: o endpoint `DELETE /admin/products/{id}` consulta `order_items` antes e responde 409 `product-has-orders`. Alternativa (não escolhida): adicionar FK em migration separada — invasivo, exige verificar todos os IDs históricos.
