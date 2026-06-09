# SP5c — Admin CRUD UI: Design Spec

**Date:** 2026-06-07
**Status:** Brainstormed, ready for implementation plan
**Base branch:** master (commit `06856ca`)
**Target branch:** `feat/sp5c-admin-crud-ui`

## 1. Contexto

SP5b (PR #9) entregou autenticação admin por cookie `bb_admin` (JWT 8h). SP5b.1 (PR #10) endureceu o seed admin com `AdminBootstrap`. Backend já tem CRUD completo de catálogo (`AdminProductController`, `AdminCategoryController`, `AdminCouponController`) e atualização de status de pedido (`OrderAdminController.PATCH /:id/status`). Tudo isso é hoje acessível só via `curl` — não há interface web.

SP5c entrega a **UI web admin** que opera essa API. Como a loja ainda recebe pedidos via WhatsApp (`window.open(wa.me)` em paralelo ao POST /orders no checkout — ver [[project-whatsapp-paralelo]]), SP5c também **remove essa duplicação**: pedidos passam a chegar exclusivamente no painel.

## 2. Decisões

| # | Decisão | Alternativas | Por quê |
|---|---|---|---|
| 1 | Escopo: CRUD catálogo + fila de pedidos + remoção do WhatsApp do checkout | Só catálogo; ou catálogo + pedidos + dashboard | Menor incremento que desliga o WhatsApp; dashboard sem valor antes de operação rodar |
| 2 | Admin no mesmo app Next.js, rotas `/admin/*` | App separado (Vite SPA ou monorepo) | Reuso de Tailwind/components/CI; sem nova pipeline |
| 3 | Fila com polling 10s | SSE; refresh manual | Mesmo padrão do `/meus-pedidos` (SP4b); zero infra nova; latência ≤ 10s aceitável |
| 4 | Tabs por status (Recebidos / Preparando / Saiu / Histórico) | Kanban; lista única | UX focada, funciona mobile+desktop, código menor |
| 5 | Imagens só via campo URL | Upload local; S3 presigned | Backend já aceita string; upload exige storage + multipart + IT — escopo SP6 |
| 6 | Tablet/desktop principalmente | Mobile-first; full responsive | Operador opera no balcão; mobile responsivo OK mas não prioritário |
| 7 | Páginas por seção + modais inline pra CRUD | Rota por operação; SPA com tabs | Deep link preservado + fricção baixa no edit |
| 8 | Novo endpoint backend `GET /api/v1/admin/orders` | Reusar `GET /orders` cliente; query no DB direto | Cliente não pode listar pedidos de terceiros; precisa endpoint admin-only |
| 9 | Refetch após mutação (sem otimismo nos CRUDs) | Optimistic updates locais | Dados de catálogo mudam raramente; conferir > velocidade |
| 10 | Notificação sonora opt-in via switch | Sempre on; sempre off | Operador escolhe; respeita política do navegador (precisa interação prévia) |

## 3. Arquitetura

### Rotas (Next App Router)

```
app/
  admin/
    entrar/page.tsx       # Login admin, sem sidebar
    layout.tsx            # Shell autenticado (sidebar + main)
    page.tsx              # redirect → /admin/pedidos
    pedidos/page.tsx      # Fila com tabs
    produtos/page.tsx     # Lista + modais CRUD
    categorias/page.tsx   # Lista + modais CRUD
    cupons/page.tsx       # Lista + modais CRUD
```

### Provider e auth

- `AdminAuthProvider` em `lib/admin-auth.tsx` — analogo ao `AuthProvider` do SP4b, isolado.
  - `useAdminAuth()` → `{ admin, loading, login, logout }`
  - On mount: `GET /api/v1/auth/admin/me` → 200 popula admin; 401 marca `admin=null`
  - `login(email, password)`: `POST /admin/login` + `GET /me`
  - `logout()`: `POST /admin/logout` + state cleanup + redirect
- `AdminAuthGate` em `components/admin/AdminAuthGate.tsx` — usado dentro de `app/admin/layout.tsx`. Espera `useAdminAuth` resolver:
  - `loading` → skeleton de loading
  - `admin === null` → `router.replace('/admin/entrar?next=' + encodeURIComponent(pathname))`
  - autenticado → renderiza children
- Convive paralelamente com `AuthProvider` cliente — cookies `bb_admin` e `bb_session` não conflitam (já validado em `CrossCookieIsolationIT` no SP5b).

### API client

- `lib/admin-api.ts` espelha `lib/api-client.ts`:
  - `me()`, `login(email, password)`, `logout()`
  - `getOrders({ status?, page?, size? })`, `updateOrderStatus(id, to)`
  - `listProducts({ categoryId? })`, `createProduct(req)`, `updateProduct(id, req)`, `deleteProduct(id)`
  - `listCategories()`, `createCategory(req)`, `updateCategory(id, req)`, `deleteCategory(id)`
  - `listCoupons()`, `createCoupon(req)`, `updateCoupon(code, req)`, `deleteCoupon(code)`
- Todos usam `credentials: 'include'` (default herdado), retornam `Promise<T>`, lançam `ApiError` em erro.
- `humanize()` reusado pra traduzir mensagens.

### Backend novo

Endpoint adicionado em `OrderAdminController`:

```
GET /api/v1/admin/orders?status=RECEIVED,PREPARING&page=0&size=50
```

- `status` opcional: CSV de `OrderStatus`. Default: `RECEIVED,PREPARING,OUT`. Aba histórico passa `DELIVERED,CANCELLED`.
- `page` ≥ 0 (default 0); `size` 1–100 (default 20; clamp a 100 server-side).
- Status inválido → 400 `validation-failed` + lista dos enums válidos.
- Resposta: `{ items: OrderResponse[], page, size, total }`.
- Ordenação: `createdAt DESC`.
- Audit log: `admin.action action=GET resource=orders status=... page=... size=... returned=N actor=adm_...`.

Camadas:
- `OrderAdminController.@GetMapping` — parse + validação + call service
- `OrderService.searchByStatus(Set<OrderStatus>, Pageable) → Page<Order>`
- `OrderRepository.findByStatusInOrderByCreatedAtDesc(Set<OrderStatus>, Pageable) → Page<Order>` (Spring Data derived)

Segurança: `SecurityConfig` já protege `/api/v1/admin/**` com `hasRole("ADMIN")` (SP5b). Sem mudança.
Rate limit: `RateLimitFilter` (SP5a) já cobre `/admin/**` com 30/min. Polling 10s = 6/min — folga 5×.

`OrderResponse` precisa expor `customerName` + `customerPhone` (operador precisa pra contato). Auditar; adicionar se faltar.

## 4. Componentes

### Primitivos UI (novos, `components/ui/`)

- `Modal.tsx` — accessível: focus trap, Escape fecha, click overlay opcional fecha, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
- `FormField.tsx` — wrapper label + control + erro. Variants: text, number, textarea, select, switch.
- `ConfirmDialog.tsx` — modal de confirmação (foco inicial em Cancelar pra evitar delete acidental; Enter = Cancelar).
- `Switch.tsx` — `role="switch"`, `aria-checked`, espaço/enter toggle.
- `Select.tsx` — select estilizado.
- `DateInput.tsx` — wrapper `<input type="date">` com format pt-BR.

### Admin (novos, `components/admin/`)

- `AdminSidebar.tsx` — nav fixa esquerda em desktop; drawer em mobile. Highlight ativo via `usePathname()`. Itens: Pedidos / Produtos / Categorias / Cupons / Sair.
- `AdminHeader.tsx` — topo: nome do admin + switch som ON/OFF + botão Sair.
- `AdminAuthGate.tsx` — descrito acima.
- `AdminPageHeader.tsx` — título da página + ação primária ("Novo X").
- `AdminTable.tsx` — tabela responsiva (CSS converte em cards no mobile). Aceita columns config + actions.
- `RowActions.tsx` — Editar/Excluir + variante kebab menu mobile.
- `InlineToggle.tsx` — switch que faz PATCH sozinho (usado em Ativo/Featured sem modal).
- `FormModal.tsx` — wrapper de Modal com header/footer pra forms; banner de erro topo.
- `OrderQueueTabs.tsx` — 4 tabs com contadores.
- `OrderCard.tsx` — card de pedido com header (id+hora+cliente), itens, totals, ações contextuais por status.
- `ProductFormModal.tsx`, `CategoryFormModal.tsx`, `CouponFormModal.tsx`.
- `ProductsTable.tsx`, `CategoriesTable.tsx`, `CouponsTable.tsx`.

### Reusados (intactos)

- `components/ui/Button.tsx` — variants existentes
- `components/ui/OrderToast.tsx` — base para notificação "pedido novo"
- `lib/api-client.ts` — `ApiError` + `humanize()`

### Tema do admin

- Tailwind v4 + tipografia da loja (mesma fonte/scales).
- Paleta mais sóbria: fundo `neutral-50`, cards `white shadow-sm`, sidebar `neutral-900 text-neutral-100`, acentos `red-600` (marca).
- Sem framer-motion no admin (manter leve, sem motion grande).

## 5. Páginas

### `/admin/entrar`

Server component que renderiza `<AdminLoginForm>` (client). Form chama `login(email, password)`; sucesso → `router.replace(next || '/admin/pedidos')`. Erro 401 → "Email ou senha incorretos." (mensagem genérica, sem distinguir).

### `/admin/layout.tsx`

```tsx
<AdminAuthProvider>
  <AdminAuthGate>
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader />
        <main>{children}</main>
      </div>
    </div>
  </AdminAuthGate>
</AdminAuthProvider>
```

### `/admin/pedidos`

Client component. State: aba ativa (URL `?status=active|history`). Default = `active`.

- `<OrderQueueTabs>` mostra 4 tabs: Recebidos (N) / Preparando / Saiu / Histórico.
  - Contadores só nas 3 ativas, somados via `useOrderQueue('active')`.
  - Tab "Histórico" carrega `useOrderQueue('history')` que faz fetch só ao ativar (não polling de histórico).
- `<OrderCard>` por pedido, com botões contextuais (seção 4.3 deste spec).
- Toast `OrderToast` quando count de ativos sobe entre dois polls; bip via `<audio src="/admin/new-order.mp3">` se switch som ON.
- Skeleton de 3 cards enquanto `loading`.
- Estado vazio: "Sem pedidos {ativos | no histórico}."
- Erro: banner vermelho no topo.

### `/admin/produtos`

Client component:
- `<AdminPageHeader title="Produtos" action={<Button>Novo produto</Button>} />`
- Busca por nome (filtro client-side) + select de categoria
- `<ProductsTable>` com colunas: Thumb | Nome | Categoria | Preço | Ativo (InlineToggle) | Featured (InlineToggle) | Ações (Editar/Excluir)
- Click Novo → `<ProductFormModal mode="create">`
- Click Editar → `<ProductFormModal mode="edit" product={p}>`
- Click Excluir → `<ConfirmDialog onConfirm={() => deleteProduct(id)}>`. 409 `product-has-orders` → banner: "Produto tem pedidos vinculados. Desative em vez de excluir."
- Sort: por `categoryId` + `displayOrder` (alinha com loja).

**`ProductFormModal` campos:**
- `id` (slug, kebab-case) — required no create, read-only no edit
- `categoryId` — select populado de `useAdminCategories()`
- `name` — required, max 120
- `description` — textarea opcional
- `price` — required, decimal >= 0, mask `R$ 0,00`
- `priceFrom` — decimal opcional ("a partir de")
- `imageUrl` — input + preview (`<img>` carrega URL ou caminho). Aceita `https://` ou `/images/`. Sem upload.
- `featured` — switch
- `available` — switch (default true)
- `displayOrder` — number, default 100

### `/admin/categorias`

Igual produtos mas mais simples (~7 categorias, sem busca).

- Colunas: Nome | Layout | Ordem | # Produtos (contado client-side) | Ações
- Form: id (slug, RO em edit) | name (max 120) | displayOrder | layout (grid/list, default grid)
- Delete 409 `category-has-products` → "Categoria tem N produtos. Mova-os ou exclua-os primeiro."

### `/admin/cupons`

- Colunas: Código | Tipo | Valor | Min subtotal | Validade | Ativo (InlineToggle) | Ações
- Sort: ativos primeiro, depois `validUntil`
- Form: code (uppercase enforce) | type (percent/fixed) | value (percent: 0<v<=100; fixed: >0) | minSubtotal | validFrom/Until (dates; from < until se ambos preenchidos) | active

## 6. Hooks e data flow

### `useOrderQueue(scope: 'active' | 'history')`

`lib/admin-orders.ts`:
- State: `{ orders, loading, error }`
- On mount + a cada 10s: GET `/admin/orders?status=...`
- `AbortController` cancela request anterior antes do próximo
- Pausa quando `document.hidden`; re-poll imediato no `visibilitychange`
- Detecta novo pedido na aba `active` quando `items.length > lastCount && lastCount > 0` → dispara `notifyNewOrder()`
- 401 → propaga; `AdminAuthGate` intercepta via state do provider

### `useAdminProducts()`, `useAdminCategories()`, `useAdminCoupons()`

`lib/admin-catalog.ts`:
- `{ items, loading, error, refetch, create, update, remove }`
- Mutações chamam refetch após sucesso (sem otimismo)

### `notifyNewOrder(order: AdminOrder)`

- Toast visual com `OrderToast`: "Novo pedido #1234 — João Silva"
- Bip via Audio API se `localStorage['admin-sound-enabled'] !== 'false'`
- Audio context "unlocked" no primeiro clique do admin no painel (pattern: tocar audio mudo na primeira interação)

### Transições de status

`OrderCard` mapeia status → ações:

```typescript
const NEXT: Record<OrderStatus, { label: string; to: OrderStatus; confirm?: boolean }[]> = {
  RECEIVED:  [{ label: 'Aceitar', to: 'PREPARING' }, { label: 'Cancelar', to: 'CANCELLED', confirm: true }],
  PREPARING: [{ label: 'Saiu para entrega', to: 'OUT' }, { label: 'Cancelar', to: 'CANCELLED', confirm: true }],
  OUT:       [{ label: 'Confirmar entrega', to: 'DELIVERED' }, { label: 'Cancelar', to: 'CANCELLED', confirm: true }],
  DELIVERED: [],
  CANCELLED: [],
}
```

Click: optimistic local update (muda status do card pra desabilitar duplo-click) → PATCH `/admin/orders/:id/status` → success deixa polling reconfirmar / error reverte + toast.

## 7. Remoção do WhatsApp do checkout

**Distinção (memo [[project-whatsapp-paralelo]]):**
- Remove: duplicação do envio do pedido (POST /orders + `window.open(wa.me)` em paralelo)
- Mantém: WhatsApp como canal de comunicação (suporte, dúvidas, cancelamento cliente)

### `app/checkout/page.tsx`

No `submit()` (linhas ~187-218 hoje):
- Remove import `buildWhatsAppMessage`
- Remove try/catch de `getMenu()` + `toLegacyMenu()` (existe só pra montar mensagem)
- Remove chamada `buildWhatsAppMessage(...)` + URL `wa.me`
- Remove `window.open(url, '_blank')`

Resultado: `submit()` reduz a POST /orders → set state pra OrderStatusScreen. ~30 linhas a menos.

### `components/checkout/OrderStatusScreen.tsx`

Mantém intacto:
- `openWhatsApp()` helper
- "Falar com a loja" / "Ajuda" / "Ligar" / "Abrir conversa no WhatsApp" / "Cancelar pedido" — canais de comunicação

Muda apenas:
- Texto (linha ~211): `'aguardando confirmação da loja no WhatsApp.'` → `'aguardando confirmação da loja.'`

### `app/checkout/page.test.tsx`

- Remove asserts que verificam `openSpy` chamado com URL `wa.me/...`
- Adiciona regressão guard: `expect(openSpy).not.toHaveBeenCalled()` no submit OK

### `lib/order-message.ts`

- Mantém `buildContactMessage`, `buildHelpMessage`, `buildCancelMessage` (usados em OrderStatusScreen)
- Remove `buildWhatsAppMessage` + seus testes **se único consumidor era checkout**. Confirma na implementação.

## 8. Erros e UX

| Status | Origem | UX |
|---|---|---|
| 400 `validation-failed` | Form inválido | Banner topo do modal com `humanize(err)` |
| 401 `unauthenticated` | Cookie expirou/ausente | Redirect `/admin/entrar?next=<path>` |
| 403 `forbidden` | (não esperado) | Toast "Sem permissão" + log |
| 404 | Race condition delete | Toast "Item não encontrado" + refetch |
| 409 `*-has-orders` / `*-has-products` | Constraint domain | Banner com mensagem específica (seção 5) |
| 429 | Polling agressivo | Banner + pausa polling 30s |
| 500/network | Backend down | Banner persistente + retry com polling continuado |

**Network failure:** `ApiError.type === 'network'` herdado SP4b. Polling segue tentando; UI mantém último snapshot.

**Cookie 401 mid-action:** `AdminAuthProvider` mantém subscriber; 401 muda state → `AdminAuthGate` redireciona. Login bem-sucedido respeita `next` param.

## 9. Acessibilidade

- `Modal`: focus trap (foco primeiro field; Tab cicla); Escape fecha; overlay click fecha; `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- `ConfirmDialog`: foco inicial em Cancelar; Enter no Cancelar = action default (evita delete acidental).
- `Switch`: `role="switch"`, `aria-checked`, suporte espaço/enter.
- `Sidebar`: `<nav aria-label="Admin">`; link ativo com `aria-current="page"`.
- `OrderCard`: ordem visual = ordem do tab.
- Notificação sonora: switch ON/OFF persistido (respeita preferência).
- Tabelas: `<table>` semântico; CSS converte em cards mobile (sem ARIA extra).

## 10. Tests

### Backend ITs novos (1 arquivo, 6 tests)

`OrderAdminControllerListIT`:
- `returns_active_orders_by_default` — 3 pedidos (RECEIVED, PREPARING, DELIVERED), GET sem status → só ativos
- `filters_by_status_csv` — `?status=RECEIVED` → só RECEIVED
- `paginates_with_page_and_size` — 5 pedidos, `?size=2&page=1` → 2 itens + total 5
- `rejects_invalid_status` — `?status=BANANA` → 400 `validation-failed`
- `unauthenticated_returns_401` — sem cookie
- `clamps_size_to_max_100` — `?size=500` → response `size: 100`

### Front tests novos (Vitest)

- `lib/admin-api.test.ts` — wrappers com mock fetch: headers, credentials, parsing erros
- `lib/admin-orders.test.ts` — `useOrderQueue` com `vi.useFakeTimers`: polling 10s, cancela request, `document.hidden`, notify após primeiro count
- `lib/admin-auth.test.tsx` — `AdminAuthProvider`: mount/login/logout/401
- `components/admin/OrderCard.test.tsx` — botões por status; callback; estados terminais
- `components/admin/OrderQueueTabs.test.tsx` — troca de tab atualiza URL e refaz fetch
- `components/admin/ProductFormModal.test.tsx`, `CategoryFormModal.test.tsx`, `CouponFormModal.test.tsx` — required, submit, exibir erro
- `components/admin/AdminAuthGate.test.tsx` — redirect + render condicional
- `app/admin/pedidos/page.test.tsx` — integração com mock adminApi: tab default, switch tab, click Aceitar
- `app/admin/produtos/page.test.tsx`, `categorias/page.test.tsx`, `cupons/page.test.tsx` — analogos
- `app/checkout/page.test.tsx` — regressão: `expect(openSpy).not.toHaveBeenCalled()` no submit OK

**Total esperado:** ~25 testes front + 6 IT backend = ~31 novos. Suite: 216 → ~241 front, 153 → 159 backend.

## 11. Data flow caminho feliz (pedido novo)

```
Cliente faz POST /api/v1/orders no checkout (sem WhatsApp)
  ↓ INSERT no DB (status=RECEIVED)
  ↓ (até 10s)
Admin /admin/pedidos (tab Recebidos)
  ↓ poll → GET /admin/orders?status=RECEIVED,PREPARING,OUT
  ↓ count > prev → notifyNewOrder() (toast + bip)
  ↓ Operador clica "Aceitar"
  ↓ PATCH /admin/orders/:id/status { to: "PREPARING" }
  ↓ optimistic local + polling reconfirma em 10s
  ↓ (continua) → OUT → DELIVERED

Cliente (em paralelo) em /pedidos/<id> (OrderStatusScreen):
  ↓ poll GET /orders/:id a cada 10s (SP4a)
  ↓ timeline atualiza: Recebido → Preparando → A caminho → Entregue
```

## 12. Critérios de sucesso

- 1 turno completo de operação real sem WhatsApp pra recebimento de pedido (smoke não automatizado)
- Latência pedido criado → admin vê: ≤ 10s P50, ≤ 15s P99
- Zero pedido perdido em operação real
- Tempo criar/editar produto: ≤ 30s (operador novato)
- Audit log do backend: 100% das mutações de admin com `actor=adm_...`
- Suite verde (~241 front + ~159 backend)
- Code review automático: 0 issues acima do threshold 80

## 13. Fora de escopo (futuras iterações)

- Upload de imagens (S3 ou local) — SP6
- Web Push notification (Service Worker pra avisar fora do tab) — SP5d ou SP6
- Auditoria visualizável na UI admin (lista de ações em vez de só log)
- Métricas/dashboard de receita, top produtos, ticket médio
- I18n do admin (PT-BR hard-coded)
- Permissões granulares (todo admin = root no SP5b/c)
- Cancelamento de pedido autenticado pelo cliente (segue por WhatsApp)

## Referências cruzadas

- [[project-whatsapp-paralelo]] — racional original do paralelismo WhatsApp + API
- [[sp5b1-hardening-planned]] — aprendizados sobre AdminBootstrap, Spring Security 6+, gradle bootRun + .env
- `docs/superpowers/specs/2026-06-04-sp5b-auth-admin-sessao-design.md` — sessão admin (cookie `bb_admin`)
- `docs/superpowers/specs/2026-06-01-sp5a-catalogo-dinamico-design.md` — controllers admin de catálogo + rate limit
- `docs/superpowers/specs/2026-05-27-sp4b-auth-cliente-design.md` — padrão de AuthProvider, ApiError, humanize
