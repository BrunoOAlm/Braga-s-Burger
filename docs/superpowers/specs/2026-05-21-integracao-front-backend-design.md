# Spec de Design — Integração Front ↔ Backend (Sub-projeto 4a)

**Data:** 2026-05-21
**Sub-projeto:** 4a de 6 — Integração (parte de "Integração + Login" do roadmap original)
**Spec anterior:** `2026-05-20-backend-api-design.md` (sub-projeto 3, mergeado em master via PR #4)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

Sub-projetos 1, 2 e 3 estão concluídos e mergeados em master:

- **SP1+SP2** — front Next.js com carrinho, checkout e `OrderStatusScreen.v2`. Hoje o botão **Enviar pedido** abre `wa.me` com a mensagem formatada; o status fica fixo em "Recebido".
- **SP3** — backend Java/Spring que recebe, persiste e expõe pedidos. Tem 4 endpoints REST funcionando. Front e backend não se conhecem ainda.

O sub-projeto 4 original do roadmap ("Integração + Login") está sendo **decomposto em SP4a e SP4b**:

- **SP4a (este spec):** front Next.js passa a falar com o backend. Sem auth.
- **SP4b (próximo):** signup/login do cliente, "Meus pedidos", `users.id` em `orders`.

Decompor reduz o tamanho do PR e permite validar a integração isoladamente antes de complicar com auth.

### Escopo

**Dentro:**
- Cliente HTTP no front (`lib/api-client.ts`) com baseUrl via env var.
- `app/checkout/page.tsx` chama `POST /api/v1/orders` antes de abrir o WhatsApp; usa `displayId`, `estimatedMinutes` e totais vindos do servidor.
- `OrderStatusScreen.v2` recebe `orderId` (ULID) e faz polling de `GET /orders/:id` a cada 10s para atualizar a timeline com o status real.
- Tratamento de erros traduzido para mensagens curtas no `OrderToast` (Problem Details → texto pt-BR).
- `.env.local.example` na raiz do front documentando `NEXT_PUBLIC_API_URL`.
- Testes Vitest + RTL para `api-client`, `submit()` do checkout e polling do `OrderStatusScreen`.

**Fora do escopo:**
- **Autenticação** (signup, login, JWT, tela "Meus pedidos") — SP4b.
- **Cardápio servido pela API** — mantém em `data/menu.ts` no front até SP5 migrar para tabela.
- **Cupons editáveis** — idem, sub-projeto 5.
- **SSE/WebSocket** — polling 10s basta para o MVP. Real-time futuro fora do escopo.
- **Retry exponencial** — falha de rede num tick de polling apenas pula esse tick; nada de backoff.
- **Painel admin** — SP5.
- **Deploy / HTTPS / produção** — SP6.

### Decisões travadas no brainstorming (2026-05-21)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Decomposição | 4a (integração) + 4b (login). Este spec cobre só 4a. |
| 2 | Envio do pedido | API + WhatsApp em paralelo. API é fonte de verdade; WhatsApp continua porque a loja ainda usa essa via até o admin panel chegar. |
| 3 | Atualização de status | Polling a cada 10s. SSE/WebSocket fora do escopo. |
| 4 | Quem dita `displayId` e tempo | Backend. Front usa o que vier da resposta. |
| 5 | Backend offline / erro | Bloqueia, mostra erro no `OrderToast`, mantém checkout aberto. Sem fallback WhatsApp-só. |

---

## 2. Stack adicional

Nenhuma nova dependência. Usa o que o front já tem:

- `fetch` nativo do browser.
- `Vitest` + `@testing-library/react` + `userEvent` (já no projeto).
- Sem TanStack Query, sem axios, sem MSW. Wrapper enxuto suficiente.

---

## 3. Mudanças por arquivo

### Criar

- **`lib/api-client.ts`** — wrapper de `fetch`. Exporta:
  - `class ApiError extends Error { status: number; type: string; title: string; detail: string }`
  - `async function createOrder(payload: CreateOrderRequest): Promise<OrderResponse>`
  - `async function getOrder(id: string): Promise<OrderResponse>`
  - Base URL lida de `process.env.NEXT_PUBLIC_API_URL` com default `http://localhost:8080/api/v1`.
- **`lib/types-api.ts`** — `interface CreateOrderRequest`, `interface OrderResponse`, `type OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT' | 'DELIVERED' | 'CANCELLED'`, etc. Espelham o JSON do backend.
- **`lib/api-client.test.ts`** — testes do wrapper.
- **`.env.local.example`** (raiz do repo) — documenta `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`.

### Modificar

- **`app/checkout/page.tsx`**
  - `submit()` passa a ser `async`. Chama `api.createOrder(buildPayload())`. Em sucesso, usa `response.displayId`, `response.estimatedMinutes`, `response.id` para montar a mensagem de WhatsApp e abrir `wa.me`. Em `ApiError`, traduz `type` para mensagem e seta `errorMessage` no estado (já existente).
  - O estado `orderId` passa a guardar **o ULID** (`ord_...`), não mais o `#XXXX`. O front continua exibindo `displayId` separado quando precisa.
- **`components/checkout/OrderStatusScreen.tsx`**
  - Props ganham `orderId: string` (ULID) e perdem a dependência de `estimatedMinutes` fixo (passa a vir do polling).
  - `useEffect` faz primeira chamada imediata + `setInterval(10_000)`. Cleanup limpa o interval.
  - `ACTIVE_INDEX` deriva de `order.status` via switch (RECEIVED=0, PREPARING=1, OUT=2, DELIVERED=3). Caso `CANCELLED`, esconde a timeline e mostra "Pedido cancelado pela loja".
  - Timestamps por etapa (`receivedAt`, `preparingAt`, etc) podem ser exibidos como subtítulo da etapa ativa ("desde 19:14"). Pendência aceitável de polimento.
- **`components/checkout/OrderStatusScreen.test.tsx`** — adiciona testes de polling com `vi.useFakeTimers()` e `fetch` stubbed.
- **`lib/order-id.ts`** — adiciona JSDoc "@deprecated since 2026-05-21, displayId is now generated by the backend". Função fica no repo enquanto a rota de smoke não usa, mas não é chamada em runtime.
- **`lib/order-message.ts`** — sem mudança de assinatura. Continua recebendo `orderId` (agora `displayId` do backend) e o resto dos dados.

### Sem alteração

- `lib/cart-store.ts`, `lib/cart.ts`, `data/menu.ts`, `data/coupons.ts`, `data/delivery.ts`, `lib/delivery-time.ts`, `lib/store-status.ts`, `config/store.ts`, `components/cart/*`, `components/checkout/IdentificationStep.tsx` / `DeliveryStep.tsx` / `PaymentStep.tsx` / `ReviewStep.tsx` etc.

---

## 4. `api-client.ts` — interface pública

```ts
// lib/api-client.ts

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly type: string,
    readonly title: string,
    readonly detail: string,
  ) {
    super(detail);
  }
}

export interface CreateOrderRequest {
  customer: { name: string; phone: string };
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  address?: {
    cep: string; street: string; number: string;
    neighborhood: string; complement?: string; reference?: string;
  };
  payment: 'PIX' | 'CASH' | 'CREDIT' | 'DEBIT';
  changeFor?: number;
  items: { productId: string; quantity: number; notes?: string }[];
  couponCode?: string;
}

export interface OrderResponse {
  id: string;
  displayId: string;
  status: 'RECEIVED' | 'PREPARING' | 'OUT' | 'DELIVERED' | 'CANCELLED';
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  customer: { name: string; phone: string };
  address?: { /* mesmos campos */ };
  payment: 'PIX' | 'CASH' | 'CREDIT' | 'DEBIT';
  changeFor?: number | null;
  items: { productId: string; productName: string; unitPrice: number; quantity: number; notes?: string }[];
  couponCode?: string | null;
  totals: { subtotal: number; discount: number; deliveryFee: number; total: number };
  estimatedMinutes: { min: number; max: number };
  createdAt: string;
  timestamps: {
    receivedAt: string;
    preparingAt: string | null;
    outAt: string | null;
    deliveredAt: string | null;
    cancelledAt: string | null;
  };
}

export async function createOrder(body: CreateOrderRequest): Promise<OrderResponse> {
  return request('POST', '/orders', body);
}

export async function getOrder(id: string): Promise<OrderResponse> {
  return request('GET', `/orders/${id}`);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network-error', 'Sem conexão',
      'Não consegui falar com o servidor.');
  }

  if (res.ok) return (await res.json()) as T;

  // Problem Details
  let problem: { type?: string; title?: string; detail?: string } = {};
  try { problem = await res.json(); } catch { /* ignore */ }
  throw new ApiError(
    res.status,
    problem.type?.split('/').pop() ?? 'unknown',
    problem.title ?? 'Erro',
    problem.detail ?? `HTTP ${res.status}`,
  );
}
```

---

## 5. Mapeamento de erros → mensagens pt-BR

Em `app/checkout/page.tsx`:

```ts
function humanize(err: ApiError): string {
  switch (err.type) {
    case 'store-closed':              return 'A loja está fechada agora. Confira os horários.';
    case 'product-not-found':
    case 'product-unavailable':       return 'Um produto do seu carrinho saiu do cardápio. Atualize e tente de novo.';
    case 'delivery-area-not-served':  return 'Não entregamos no bairro selecionado.';
    case 'order-min-not-met':         return 'Pedido abaixo do mínimo de R$ 25,00.';
    case 'change-insufficient':       return 'O troco precisa cobrir o total.';
    case 'coupon-invalid':
    case 'coupon-min-not-met':        return 'Cupom inválido ou não aplicável.';
    case 'validation-failed':         return 'Preencha todos os campos obrigatórios.';
    case 'network-error':             return 'Sem conexão com o servidor. Tente de novo em alguns instantes.';
    default:                          return err.detail || 'Erro ao enviar pedido.';
  }
}
```

A `humanize` fica próxima de onde é usada (no `submit()` do checkout). Não vira utility global a menos que múltiplas telas precisem dela.

---

## 6. Fluxo do `submit()` revisado

```ts
const submit = async () => {
  setErrorMessage(null);

  // pré-validações client-side (mantidas, dão feedback rápido sem ida ao server)
  if (!isOpen(new Date(), storeConfig.openingHours)) { setErrorMessage('A loja está fechada agora.'); return; }
  if (subtotal < storeConfig.minOrder) { setErrorMessage('Pedido abaixo do mínimo.'); return; }
  if (method === 'delivery' && (!address || fee === 0)) { setErrorMessage('Selecione um bairro atendido.'); return; }
  if (!payment) { setErrorMessage('Selecione uma forma de pagamento.'); return; }

  try {
    const order = await api.createOrder({
      customer, fulfillmentType: method.toUpperCase() as 'DELIVERY' | 'PICKUP',
      address: method === 'delivery' && address ? address : undefined,
      payment: payment.toUpperCase() as 'PIX' | 'CASH' | 'CREDIT' | 'DEBIT',
      changeFor, items: items.map(i => ({ productId: i.product.id, quantity: i.quantity, notes: i.notes })),
      couponCode: coupon?.code,
    });

    // monta mensagem do WhatsApp com o que o servidor disse
    const msg = buildWhatsAppMessage({
      orderId: order.displayId, customer, items, categories, coupon,
      subtotal: order.totals.subtotal,
      discount: order.totals.discount,
      deliveryFee: order.totals.deliveryFee,
      total: order.totals.total,
      estimatedMinutes: order.estimatedMinutes,
      method, address: method === 'delivery' ? address! : undefined,
      payment, changeFor: payment === 'cash' ? changeFor : undefined,
      storeBusinessName: storeConfig.whatsappBusinessName,
      storeAddress: storeConfig.address,
    });
    window.open(`https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');

    setOrderId(order.id);           // ULID, não displayId
    setStep('sent');
  } catch (e) {
    if (e instanceof ApiError) setErrorMessage(humanize(e));
    else setErrorMessage('Erro ao enviar pedido.');
  }
};
```

Pré-validações client-side mantidas (dão feedback rápido sem RTT). Backend continua sendo a fonte autoritativa — se uma pré-validação client deixar passar algo que o backend recusa, o `catch` mostra a mensagem do servidor.

---

## 7. `OrderStatusScreen` — polling

```ts
// dentro do componente
const [order, setOrder] = useState<OrderResponse | null>(null);

useEffect(() => {
  let mounted = true;
  const tick = async () => {
    try {
      const updated = await api.getOrder(orderId);
      if (mounted) setOrder(updated);
    } catch { /* silencioso — próximo tick tenta de novo */ }
  };
  tick();
  const id = setInterval(tick, 10_000);
  return () => { mounted = false; clearInterval(id); };
}, [orderId]);

const status = order?.status ?? 'RECEIVED';
const activeIndex = STATUS_TO_INDEX[status]; // mapa imutável

if (status === 'CANCELLED') {
  // bloco especial "Pedido cancelado pela loja" no lugar da timeline
}
```

`STATUS_TO_INDEX`: `{ RECEIVED: 0, PREPARING: 1, OUT: 2, DELIVERED: 3 }`. CANCELLED é caso à parte.

Bloco "previsão de entrega" continua usando `order.estimatedMinutes` ou os mins iniciais até o primeiro response chegar.

---

## 8. Testes

### `lib/api-client.test.ts` (novo)

- `createOrder` envia POST para o path certo, com Content-Type e body JSON, retorna response como OrderResponse.
- `createOrder` em 400 com Problem Details lança `ApiError` com `status=400`, `type=slug`, `title`, `detail`.
- `createOrder` em network error lança `ApiError` com `status=0`, `type='network-error'`.
- `getOrder('ord_x')` chama GET com path certo.

`fetch` mockado com `vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(...)))`.

### `app/checkout/page.test.tsx` (novo ou estende existente)

- `submit()` chama `api.createOrder` com payload correto extraído do estado.
- Em sucesso: abre WhatsApp com `displayId` do response (não o gerado client-side); `setStep('sent')`.
- Em `ApiError('store-closed')`: `setErrorMessage` com texto humanizado; `step` continua `'review'`.
- Em network error: mostra mensagem genérica.

`api-client` é mockado via `vi.mock('@/lib/api-client', ...)`.

### `components/checkout/OrderStatusScreen.test.tsx` (estende)

- Mount faz 1 chamada imediata; após `vi.advanceTimersByTime(10_000)` faz outra.
- Quando response retorna `status='PREPARING'`, item 1 da timeline tem `aria-current="step"`; item 0 fica inativo.
- `CANCELLED` esconde a timeline e mostra texto "Pedido cancelado".
- Unmount limpa o interval.

`api.getOrder` mockado via `vi.mock`. Fake timers ativos só nos testes de polling — testes de layout (já existentes) continuam com timers reais.

---

## 9. Critérios de sucesso

- Com `docker compose up -d` (backend) e `npm run dev` (front), checkout completo grava pedido no Postgres E abre WhatsApp.
- `psql -h localhost -p 5433 -U bragas -d bragas -c "SELECT id, display_id, status, total FROM orders ORDER BY created_at DESC LIMIT 1"` retorna o pedido recém-criado.
- `OrderStatusScreen` exibe `displayId`, previsão e timeline em "Recebido".
- `curl -X PATCH .../admin/orders/<id>/status` com token muda status; em até 10s a UI reflete (timeline avança).
- Backend desligado → toast "Sem conexão com o servidor"; checkout aberto pra retry.
- Loja fechada → toast "A loja está fechada agora".
- Bairro inválido → toast "Não entregamos no bairro selecionado".
- `npm run lint`, `npm run build`, `npm test` continuam verdes (alvo: >180 testes verdes).

---

## 10. Pendências para sub-projetos seguintes

| Item | Sub-projeto |
|------|-------------|
| Signup/login do cliente | 4b |
| "Meus pedidos" (lista de pedidos do cliente logado) | 4b |
| Substituir `X-Admin-Token` por sessão admin | 5 |
| Cardápio migrado pro banco | 5 |
| Cupons editáveis | 5 |
| Deploy, HTTPS, rate limit, secrets management | 6 |
| Real-time via SSE (substitui polling) | 6 (opcional) |
