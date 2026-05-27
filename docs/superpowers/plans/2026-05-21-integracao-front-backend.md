# Integração Front ↔ Backend (SP4a) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o front Next.js falar com o backend Spring (já mergeado em master via PR #4): criar pedido via `POST /api/v1/orders`, acompanhar status via polling de `GET /api/v1/orders/:id`, traduzir erros Problem Details em pt-BR, sem mexer em auth (fica para SP4b).

**Architecture:** Wrapper enxuto de `fetch` em `lib/api-client.ts` (sem axios, sem TanStack Query, sem MSW). Backend é fonte de verdade para `displayId`, totais e `estimatedMinutes` — o front apenas usa o que vier no response. WhatsApp continua sendo aberto em paralelo (a loja ainda usa esse canal). Polling de 10s no `OrderStatusScreen` substitui o status fixo "Recebido"; falha de tick é silenciosa (próximo tick tenta de novo).

**Tech Stack:** Next.js 16.2 + React 19.2 + TypeScript 5 + Vitest 4 + Testing Library (`@testing-library/react` 16, `@testing-library/user-event` 14). `fetch` nativo do browser. Nenhuma dependência nova.

**Reference spec:** `docs/superpowers/specs/2026-05-21-integracao-front-backend-design.md`

**Branch:** `feat/integration` (já criada e em uso). Commits incrementais; PR único contra `master` ao final.

**Backend rodando local:** `docker compose up -d` em `backend/` (Postgres em 5433, app em 8080). Endpoints disponíveis: `POST /api/v1/orders`, `GET /api/v1/orders/:id`, `PATCH /api/v1/admin/orders/:id/status` (com `X-Admin-Token`), `GET /api/v1/health`.

---

## File structure

**Criar:**

```
.env.local.example                    # documenta NEXT_PUBLIC_API_URL
lib/
├── types-api.ts                      # tipos espelhando JSON do backend
├── api-client.ts                     # wrapper de fetch + ApiError
└── api-client.test.ts                # testes do wrapper
app/
└── checkout/
    └── page.test.tsx                 # testes do submit() integrado
```

**Modificar:**

```
app/checkout/page.tsx                 # submit() async, usa api.createOrder, humanize de ApiError
components/checkout/OrderStatusScreen.tsx       # recebe orderId(ULID), polling 10s, ACTIVE_INDEX deriva de status
components/checkout/OrderStatusScreen.test.tsx  # adiciona testes de polling + CANCELLED
lib/order-id.ts                       # JSDoc @deprecated; função não chamada em runtime
```

**Sem alteração:**

`lib/cart-store.ts`, `lib/cart.ts`, `lib/order-message.ts`, `lib/order-time.ts`, `lib/store-status.ts`, `lib/delivery-time.ts`, `config/store.ts`, `data/*`, `components/checkout/{IdentificationStep,DeliveryStep,PaymentStep,ReviewStep,AddressForm,DeliveryEstimate}.tsx`, `components/cart/*`, `components/ui/OrderToast.tsx`.

---

## Task 1: Tipos da API + `.env.local.example`

Espelha o JSON do backend num lugar só (`lib/types-api.ts`) para reuso em `api-client.ts` e nos componentes. Cria também o `.env.local.example` documentando a env var pública.

**Files:**
- Create: `lib/types-api.ts`
- Create: `.env.local.example`

- [ ] **Step 1.1: Criar `lib/types-api.ts` com os tipos do contrato**

Arquivo `lib/types-api.ts`:

```ts
// Tipos espelhando o JSON do backend Java/Spring (sub-projeto 3).
// Espelha 1:1 os DTOs em backend/src/main/java/com/bragas/api/order/dto/.

export type OrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'OUT'
  | 'DELIVERED'
  | 'CANCELLED';

export type FulfillmentType = 'DELIVERY' | 'PICKUP';

export type PaymentMethodApi = 'PIX' | 'CASH' | 'CREDIT' | 'DEBIT';

export interface ApiAddress {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference?: string;
}

export interface CreateOrderRequest {
  customer: { name: string; phone: string };
  fulfillmentType: FulfillmentType;
  address?: ApiAddress;
  payment: PaymentMethodApi;
  changeFor?: number;
  items: { productId: string; quantity: number; notes?: string }[];
  couponCode?: string;
}

export interface OrderItemResponse {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export interface OrderTimestamps {
  receivedAt: string;
  preparingAt: string | null;
  outAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

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
  timestamps: OrderTimestamps;
}

// Problem Details (RFC 7807) — formato dos erros do backend.
export interface ProblemDetails {
  type?: string;
  title?: string;
  detail?: string;
  status?: number;
  instance?: string;
}
```

- [ ] **Step 1.2: Criar `.env.local.example` na raiz do repo**

Arquivo `.env.local.example`:

```
# URL base do backend de pedidos.
# Em dev local, sobe o backend via `docker compose up -d` em backend/ — porta 8080.
# Em prod (futuro SP6), apontar para o domínio público.
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

- [ ] **Step 1.3: Rodar typecheck para garantir que os tipos compilam**

Run: `npm run build` (apenas pra etapa de typecheck; pode interromper antes do build terminar se ver os tipos válidos).
Expected: nenhum erro de TS em `lib/types-api.ts`.

Alternativa mais rápida: `npx tsc --noEmit`.

- [ ] **Step 1.4: Commit**

```bash
git add lib/types-api.ts .env.local.example
git commit -m "feat(api): tipos do contrato de pedidos + .env.local.example"
```

---

## Task 2: `api-client.ts` (TDD)

Wrapper de `fetch` com `ApiError` (extends `Error`) e duas funções públicas: `createOrder` e `getOrder`. Lê base URL de `NEXT_PUBLIC_API_URL` com fallback. Em falha de rede gera `ApiError(status=0, type='network-error')`. Em resposta não-OK, tenta parsear Problem Details e gera `ApiError` com `type` derivado da última parte do `type` URI.

**Files:**
- Create: `lib/api-client.ts`
- Test: `lib/api-client.test.ts`

- [ ] **Step 2.1: Escrever o primeiro teste — `createOrder` faz POST com headers e body corretos e retorna o response**

Arquivo `lib/api-client.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createOrder, getOrder, ApiError } from './api-client';
import type { CreateOrderRequest, OrderResponse } from './types-api';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sampleRequest: CreateOrderRequest = {
  customer: { name: 'Bruno', phone: '(21) 99999-0000' },
  fulfillmentType: 'PICKUP',
  payment: 'PIX',
  items: [{ productId: 'p1', quantity: 1 }],
};

const sampleResponse: OrderResponse = {
  id: 'ord_01H...',
  displayId: '#3417',
  status: 'RECEIVED',
  fulfillmentType: 'PICKUP',
  customer: { name: 'Bruno', phone: '(21) 99999-0000' },
  payment: 'PIX',
  items: [
    { productId: 'p1', productName: 'Burger', unitPrice: 25, quantity: 1 },
  ],
  totals: { subtotal: 25, discount: 0, deliveryFee: 0, total: 25 },
  estimatedMinutes: { min: 20, max: 30 },
  createdAt: '2026-05-21T19:00:00Z',
  timestamps: {
    receivedAt: '2026-05-21T19:00:00Z',
    preparingAt: null,
    outAt: null,
    deliveredAt: null,
    cancelledAt: null,
  },
};

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createOrder', () => {
  it('faz POST para /orders com Content-Type e body JSON e retorna OrderResponse', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(201, sampleResponse));

    const result = await createOrder(sampleRequest);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/orders$/);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init?.body as string)).toEqual(sampleRequest);
    expect(result).toEqual(sampleResponse);
  });
});
```

- [ ] **Step 2.2: Rodar o teste e ver falhar**

Run: `npm test -- lib/api-client.test.ts`
Expected: FAIL — `Cannot find module './api-client'` (arquivo ainda não existe).

- [ ] **Step 2.3: Implementar o mínimo de `lib/api-client.ts` para passar esse teste**

Arquivo `lib/api-client.ts`:

```ts
import type {
  CreateOrderRequest,
  OrderResponse,
  ProblemDetails,
} from './types-api';

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
    this.name = 'ApiError';
  }
}

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
    });
  } catch {
    throw new ApiError(
      0,
      'network-error',
      'Sem conexão',
      'Não consegui falar com o servidor.',
    );
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

export async function createOrder(
  body: CreateOrderRequest,
): Promise<OrderResponse> {
  return request<OrderResponse>('POST', '/orders', body);
}

export async function getOrder(id: string): Promise<OrderResponse> {
  return request<OrderResponse>('GET', `/orders/${id}`);
}
```

- [ ] **Step 2.4: Rodar o teste e ver passar**

Run: `npm test -- lib/api-client.test.ts`
Expected: PASS (1 teste).

- [ ] **Step 2.5: Adicionar testes para o caminho de erro Problem Details**

Anexar ao `lib/api-client.test.ts` (antes do `describe('getOrder')` que ainda não existe):

```ts
describe('createOrder — erros', () => {
  it('em 400 com Problem Details lança ApiError com status, type, title, detail', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(400, {
        type: 'https://bragas/errors/store-closed',
        title: 'Loja fechada',
        detail: 'A loja não aceita pedidos agora.',
        status: 400,
      }),
    );

    await expect(createOrder(sampleRequest)).rejects.toMatchObject({
      status: 400,
      type: 'store-closed',
      title: 'Loja fechada',
      detail: 'A loja não aceita pedidos agora.',
    });
  });

  it('em erro sem corpo JSON usa defaults (type=unknown, detail=HTTP N)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );

    await expect(createOrder(sampleRequest)).rejects.toMatchObject({
      status: 500,
      type: 'unknown',
      title: 'Erro',
      detail: 'HTTP 500',
    });
  });

  it('em falha de rede lança ApiError com status=0 e type=network-error', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(createOrder(sampleRequest)).rejects.toMatchObject({
      status: 0,
      type: 'network-error',
    });
  });
});

describe('getOrder', () => {
  it('faz GET para /orders/:id e retorna OrderResponse', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, sampleResponse));

    const result = await getOrder('ord_01HZ');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/orders\/ord_01HZ$/);
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
    expect(result).toEqual(sampleResponse);
  });
});
```

- [ ] **Step 2.6: Rodar todos os testes do api-client e ver passar**

Run: `npm test -- lib/api-client.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 2.7: Verificar que o instanceof ApiError funciona (consumidor vai usar `e instanceof ApiError`)**

Adicionar teste ao final do bloco `describe('createOrder — erros')`:

```ts
it('o erro lançado é uma instância de ApiError', async () => {
  fetchSpy.mockResolvedValueOnce(jsonResponse(400, { type: 'x' }));
  try {
    await createOrder(sampleRequest);
    expect.fail('deveria ter lançado');
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
  }
});
```

Run: `npm test -- lib/api-client.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 2.8: Commit**

```bash
git add lib/api-client.ts lib/api-client.test.ts
git commit -m "feat(api-client): wrapper fetch + ApiError para POST/GET de pedidos"
```

---

## Task 3: `app/checkout/page.tsx` — `submit()` integrado

Refatorar `submit()` para async: chamar `api.createOrder`, usar `displayId`/`estimatedMinutes`/`totals` do response na mensagem do WhatsApp, e em erro humanizar via `ApiError.type`. Pré-validações client-side ficam (dão feedback rápido sem RTT). O estado `orderId` passa a guardar o ULID (`ord_...`) — `displayId` vira variável separada.

**Files:**
- Modify: `app/checkout/page.tsx`

- [ ] **Step 3.1: Substituir o conteúdo de `app/checkout/page.tsx`**

Arquivo `app/checkout/page.tsx` (substituir integralmente):

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { calcDiscount, calcSubtotal } from '@/lib/cart';
import { isOpen } from '@/lib/store-status';
import { estimateTotalMinutes } from '@/lib/delivery-time';
import { buildWhatsAppMessage } from '@/lib/order-message';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { storeConfig } from '@/config/store';
import { categories } from '@/data/menu';
import { deliveryAreas } from '@/data/delivery';
import { IdentificationStep } from '@/components/checkout/IdentificationStep';
import { DeliveryStep } from '@/components/checkout/DeliveryStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { ReviewStep } from '@/components/checkout/ReviewStep';
import { OrderStatusScreen } from '@/components/checkout/OrderStatusScreen';
import { OrderToast } from '@/components/ui/OrderToast';
import type { Address, Customer, DeliveryMethod, PaymentMethod } from '@/lib/types';

type Step = 'identification' | 'delivery' | 'payment' | 'review' | 'sent';

const rangeFor = (m: number) => ({ min: m - 5, max: m + 5 });

function humanize(err: ApiError): string {
  switch (err.type) {
    case 'store-closed':
      return 'A loja está fechada agora. Confira os horários.';
    case 'product-not-found':
    case 'product-unavailable':
      return 'Um produto do seu carrinho saiu do cardápio. Atualize e tente de novo.';
    case 'delivery-area-not-served':
      return 'Não entregamos no bairro selecionado.';
    case 'order-min-not-met':
      return 'Pedido abaixo do mínimo de R$ 25,00.';
    case 'change-insufficient':
      return 'O troco precisa cobrir o total.';
    case 'coupon-invalid':
    case 'coupon-min-not-met':
      return 'Cupom inválido ou não aplicável.';
    case 'validation-failed':
      return 'Preencha todos os campos obrigatórios.';
    case 'network-error':
      return 'Sem conexão com o servidor. Tente de novo em alguns instantes.';
    default:
      return err.detail || 'Erro ao enviar pedido.';
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const coupon = useCartStore((s) => s.coupon);

  const [step, setStep] = useState<Step>('identification');
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '' });
  const [method, setMethod] = useState<DeliveryMethod>('delivery');
  const [address, setAddress] = useState<Address | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [changeFor, setChangeFor] = useState<number | undefined>(undefined);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sentEstimate, setSentEstimate] = useState<{ min: number; max: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(() => calcSubtotal(items), [items]);
  const discount = useMemo(() => calcDiscount(subtotal, coupon), [subtotal, coupon]);
  const fee = useMemo(() => {
    if (method !== 'delivery' || !address) return 0;
    return (
      deliveryAreas.find(
        (a) => a.neighborhood.toLowerCase() === address.neighborhood.toLowerCase(),
      )?.fee ?? 0
    );
  }, [method, address]);
  const total = subtotal - discount + fee;
  const estimateMinutes = estimateTotalMinutes(method, storeConfig.averagePrepTime, fee);
  const estimatedRange = rangeFor(estimateMinutes);

  if (items.length === 0 && step !== 'sent') {
    router.replace('/');
    return null;
  }

  if (step === 'sent' && orderId && sentEstimate) {
    return (
      <OrderStatusScreen
        orderId={orderId}
        initialEstimatedMinutes={sentEstimate}
        method={method}
        customer={customer}
        address={method === 'delivery' && address ? address : undefined}
      />
    );
  }

  const submit = async () => {
    if (submitting) return;
    setErrorMessage(null);

    if (!isOpen(new Date(), storeConfig.openingHours)) {
      setErrorMessage('A loja está fechada agora. Confira os horários e tente de novo.');
      return;
    }
    if (subtotal < storeConfig.minOrder) {
      setErrorMessage(
        `Pedido mínimo: R$ ${storeConfig.minOrder.toFixed(2).replace('.', ',')}`,
      );
      return;
    }
    if (method === 'delivery' && (!address || fee === 0)) {
      setErrorMessage('Selecione um bairro atendido.');
      return;
    }
    if (!payment) {
      setErrorMessage('Selecione uma forma de pagamento.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await api.createOrder({
        customer,
        fulfillmentType: method === 'delivery' ? 'DELIVERY' : 'PICKUP',
        address: method === 'delivery' && address ? address : undefined,
        payment: payment.toUpperCase() as 'PIX' | 'CASH' | 'CREDIT' | 'DEBIT',
        changeFor: payment === 'cash' ? changeFor : undefined,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          notes: i.notes.trim() ? i.notes.trim() : undefined,
        })),
        couponCode: coupon?.code,
      });

      const msg = buildWhatsAppMessage({
        orderId: order.displayId,
        customer,
        items,
        categories,
        coupon,
        subtotal: order.totals.subtotal,
        discount: order.totals.discount,
        deliveryFee: order.totals.deliveryFee,
        total: order.totals.total,
        estimatedMinutes: order.estimatedMinutes,
        method,
        address: method === 'delivery' ? address! : undefined,
        payment,
        changeFor: payment === 'cash' ? changeFor : undefined,
        storeBusinessName: storeConfig.whatsappBusinessName,
        storeAddress: storeConfig.address,
      });

      const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');

      setOrderId(order.id);
      setSentEstimate(order.estimatedMinutes);
      setStep('sent');
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorMessage(humanize(e));
      } else {
        setErrorMessage('Erro ao enviar pedido.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
      <h1 className="font-heading text-3xl font-extrabold">Finalizar pedido</h1>

      <div className="mt-8">
        {step === 'identification' && (
          <IdentificationStep
            value={customer}
            onChange={setCustomer}
            onNext={() => setStep('delivery')}
          />
        )}
        {step === 'delivery' && (
          <DeliveryStep
            method={method}
            address={address}
            onMethodChange={setMethod}
            onAddressChange={setAddress}
            onNext={() => setStep('payment')}
            onBack={() => setStep('identification')}
          />
        )}
        {step === 'payment' && (
          <PaymentStep
            payment={payment}
            changeFor={changeFor}
            onPaymentChange={setPayment}
            onChangeForChange={setChangeFor}
            onNext={() => setStep('review')}
            onBack={() => setStep('delivery')}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            subtotal={subtotal}
            deliveryFee={fee}
            discount={discount}
            total={total}
            method={method}
            estimatedRange={estimatedRange}
            onSubmit={submit}
            onBack={() => setStep('payment')}
          />
        )}
      </div>

      <OrderToast message={errorMessage} />
    </main>
  );
}
```

**Notas de design:**
- `submitting` evita double-click no botão de envio enquanto o request está em voo.
- `generateOrderId` removido do import (será deprecado na Task 5).
- `orderId` passa a ser o ULID; `displayId` é apenas usado para a mensagem do WhatsApp. `OrderStatusScreen` receberá `orderId` (ULID) para fazer polling.
- Prop renomeada: `estimatedMinutes` → `initialEstimatedMinutes` no `OrderStatusScreen` (Task 4 muda a assinatura).

- [ ] **Step 3.2: Rodar lint para garantir ausência de unused imports**

Run: `npm run lint`
Expected: sem erros.

Se reclamar de `generateOrderId` (deveria já ter sido removido do import) ou de outros imports não usados, corrija e rode de novo.

- [ ] **Step 3.3: Rodar build (typecheck) — vai falhar até a Task 4, é esperado**

Run: `npx tsc --noEmit`
Expected: erro em `OrderStatusScreen` porque ainda recebe `estimatedMinutes` e este arquivo passa `initialEstimatedMinutes`. Esse erro **será resolvido na Task 4**.

Não commita ainda — vamos esperar a Task 4 para fechar checkout + status numa transação coerente.

---

## Task 4: `OrderStatusScreen` com polling (TDD)

Componente passa a receber `orderId` (ULID) e `initialEstimatedMinutes`. Faz primeira chamada imediata + `setInterval(10_000)` em `useEffect`. Cleanup limpa o interval e marca `mounted=false` para descartar responses tardios. `ACTIVE_INDEX` deriva de `order.status` via mapa. `CANCELLED` esconde a timeline e mostra "Pedido cancelado pela loja". Falha de tick é silenciosa.

**Files:**
- Modify: `components/checkout/OrderStatusScreen.tsx`
- Modify: `components/checkout/OrderStatusScreen.test.tsx`

- [ ] **Step 4.1: Adicionar primeiro teste de polling — mount faz 1 chamada imediata; após 10s faz outra**

Substituir as primeiras linhas de `components/checkout/OrderStatusScreen.test.tsx` (de `import` até `beforeEach`) por:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderStatusScreen } from './OrderStatusScreen';
import * as api from '@/lib/api-client';
import type { OrderResponse } from '@/lib/types-api';
import type { Address, Customer } from '@/lib/types';

let openSpy: ReturnType<typeof vi.spyOn>;
let getOrderSpy: ReturnType<typeof vi.spyOn>;

const customer: Customer = { name: 'João Silva', phone: '(21) 99999-0000' };

const address: Address = {
  cep: '20000-000',
  street: 'Rua das Acácias',
  number: '123',
  neighborhood: 'Higienópolis',
  complement: 'apto 302',
};

function makeOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: 'ord_01HZ',
    displayId: '#3417',
    status: 'RECEIVED',
    fulfillmentType: 'DELIVERY',
    customer,
    address,
    payment: 'PIX',
    items: [],
    totals: { subtotal: 30, discount: 0, deliveryFee: 5, total: 35 },
    estimatedMinutes: { min: 30, max: 50 },
    createdAt: '2026-05-21T18:00:00Z',
    timestamps: {
      receivedAt: '2026-05-21T18:00:00Z',
      preparingAt: null,
      outAt: null,
      deliveredAt: null,
      cancelledAt: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  openSpy.mockClear();
  getOrderSpy = vi
    .spyOn(api, 'getOrder')
    .mockResolvedValue(makeOrder());
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderDelivery() {
  return render(
    <OrderStatusScreen
      orderId="ord_01HZ"
      initialEstimatedMinutes={{ min: 30, max: 50 }}
      method="delivery"
      customer={customer}
      address={address}
    />,
  );
}

function renderPickup() {
  return render(
    <OrderStatusScreen
      orderId="ord_01HZ"
      initialEstimatedMinutes={{ min: 25, max: 25 }}
      method="pickup"
      customer={customer}
    />,
  );
}
```

Manter os blocos `describe('OrderStatusScreen — layout', ...)` e `describe('OrderStatusScreen — ações', ...)` existentes, mas substituir as referências a `#3417` por `displayId` quando vier do polling. Ajustes específicos:

No teste `mostra o título "Acompanhe seu pedido" e o número do pedido`, esperar o `displayId` depois do polling:

```ts
it('mostra o título "Acompanhe seu pedido" e o número do pedido', async () => {
  renderDelivery();
  expect(screen.getByText(/acompanhe seu pedido/i)).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getAllByText(/#3417/).length).toBeGreaterThan(0),
  );
});
```

Aplicar o mesmo padrão `await waitFor(...)` nos outros testes do bloco "ações" que esperam `#3417` na URL do WhatsApp.

- [ ] **Step 4.2: Adicionar bloco novo `describe('OrderStatusScreen — polling')` ao final do arquivo**

Anexar ao final de `components/checkout/OrderStatusScreen.test.tsx`:

```ts
describe('OrderStatusScreen — polling', () => {
  it('faz uma chamada imediata a api.getOrder no mount', async () => {
    renderDelivery();
    await waitFor(() => expect(getOrderSpy).toHaveBeenCalledTimes(1));
    expect(getOrderSpy).toHaveBeenCalledWith('ord_01HZ');
  });

  it('faz nova chamada a cada 10s', async () => {
    vi.useFakeTimers();
    renderDelivery();
    await vi.waitFor(() => expect(getOrderSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(getOrderSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(getOrderSpy).toHaveBeenCalledTimes(3);
  });

  it('quando status="PREPARING", item 1 da timeline tem aria-current="step" e item 0 não', async () => {
    getOrderSpy.mockResolvedValue(makeOrder({ status: 'PREPARING' }));
    renderDelivery();

    await waitFor(() => {
      const items = within(screen.getByRole('list')).getAllByRole('listitem');
      expect(items[1]).toHaveAttribute('aria-current', 'step');
      expect(items[0]).not.toHaveAttribute('aria-current');
    });
  });

  it('quando status="CANCELLED", esconde a timeline e mostra "Pedido cancelado pela loja"', async () => {
    getOrderSpy.mockResolvedValue(makeOrder({ status: 'CANCELLED' }));
    renderDelivery();

    await waitFor(() => {
      expect(screen.getByText(/pedido cancelado pela loja/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('falha de tick é silenciosa — não rompe a UI, próximo tick tenta de novo', async () => {
    vi.useFakeTimers();
    getOrderSpy
      .mockResolvedValueOnce(makeOrder({ status: 'RECEIVED' }))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(makeOrder({ status: 'PREPARING' }));

    renderDelivery();
    await vi.waitFor(() => expect(getOrderSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(getOrderSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await vi.waitFor(() => {
      const items = within(screen.getByRole('list')).getAllByRole('listitem');
      expect(items[1]).toHaveAttribute('aria-current', 'step');
    });
  });

  it('unmount limpa o interval (não chama mais getOrder após desmontar)', async () => {
    vi.useFakeTimers();
    const { unmount } = renderDelivery();
    await vi.waitFor(() => expect(getOrderSpy).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(getOrderSpy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 4.3: Rodar testes e ver os novos falharem (componente ainda não tem polling)**

Run: `npm test -- components/checkout/OrderStatusScreen.test.tsx`
Expected: FAILs no bloco `polling` (getOrder nunca é chamado) + provavelmente FAILs no bloco `layout` por mudanças de prop. Esses falhos guiam a implementação.

- [ ] **Step 4.4: Reescrever `components/checkout/OrderStatusScreen.tsx`**

Arquivo `components/checkout/OrderStatusScreen.tsx` (substituir integralmente):

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { buildCancelMessage } from '@/lib/order-cancel-message';
import {
  buildContactMessage,
  buildHelpMessage,
} from '@/lib/order-message';
import { estimateClock } from '@/lib/order-time';
import * as api from '@/lib/api-client';
import { storeConfig } from '@/config/store';
import type { OrderResponse, OrderStatus } from '@/lib/types-api';
import type { Address, Customer, DeliveryMethod } from '@/lib/types';

interface Props {
  orderId: string; // ULID (`ord_...`) — usado para polling no backend.
  initialEstimatedMinutes: { min: number; max: number };
  method: DeliveryMethod;
  customer: Customer;
  address?: Address;
}

const STEPS = [
  { key: 'received', label: 'Recebido' },
  { key: 'preparing', label: 'Em preparo' },
  { key: 'out', label: 'Saiu' },
  { key: 'delivered', label: 'Entregue' },
] as const;

const STATUS_TO_INDEX: Record<Exclude<OrderStatus, 'CANCELLED'>, number> = {
  RECEIVED: 0,
  PREPARING: 1,
  OUT: 2,
  DELIVERED: 3,
};

const POLL_MS = 10_000;

function openWhatsApp(text: string) {
  const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function OrderStatusScreen({
  orderId,
  initialEstimatedMinutes,
  method,
  customer,
  address,
}: Props) {
  const clear = useCartStore((s) => s.clear);
  const [order, setOrder] = useState<OrderResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const updated = await api.getOrder(orderId);
        if (mounted) setOrder(updated);
      } catch {
        // tick silencioso: próximo tick tenta de novo.
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [orderId]);

  const displayId = order?.displayId ?? orderId;
  const status: OrderStatus = order?.status ?? 'RECEIVED';
  const estimatedMinutes = order?.estimatedMinutes ?? initialEstimatedMinutes;
  const clock = useMemo(
    () => estimateClock(new Date(), estimatedMinutes),
    [estimatedMinutes],
  );

  if (status === 'CANCELLED') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
        <header className="flex items-center justify-between border-b border-line pb-4">
          <Link
            href="/"
            aria-label="Início"
            className="text-paper hover:text-white"
          >
            ←
          </Link>
          <h1 className="text-xs uppercase tracking-widest text-faint">
            Acompanhe seu pedido
          </h1>
          <span aria-hidden="true" className="w-4" />
        </header>

        <section className="mt-10 rounded border border-line bg-surface p-8 text-center">
          <p className="font-heading text-2xl font-extrabold text-paper">
            Pedido cancelado pela loja
          </p>
          <p className="mt-2 text-sm text-faint">
            Entre em contato com a loja se precisar de mais informações.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => openWhatsApp(buildContactMessage(displayId))}
              className="cursor-pointer rounded bg-paper px-4 py-3 font-semibold text-ink hover:bg-white"
            >
              Falar com a loja
            </button>
            <Link
              href="/"
              onClick={() => clear()}
              className="cursor-pointer rounded border border-line px-4 py-3 text-center text-sm hover:border-paper"
            >
              Voltar ao cardápio
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const activeIndex = STATUS_TO_INDEX[status];
  const progressPct = ((activeIndex + 1) / STEPS.length) * 100;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
      <header className="flex items-center justify-between border-b border-line pb-4">
        <Link
          href="/"
          aria-label="Início"
          className="text-paper hover:text-white"
        >
          ←
        </Link>
        <h1 className="text-xs uppercase tracking-widest text-faint">
          Acompanhe seu pedido
        </h1>
        <button
          type="button"
          onClick={() => openWhatsApp(buildHelpMessage(displayId))}
          className="cursor-pointer text-sm text-paper underline-offset-4 hover:underline"
        >
          Ajuda
        </button>
      </header>

      <section
        role="status"
        aria-live="polite"
        aria-label="Previsão de entrega"
        className="mt-6"
      >
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-widest text-faint">
            Previsão de entrega
          </p>
          <p className="text-xs text-faint">Pedido {displayId}</p>
        </div>
        <p className="mt-1 font-heading text-4xl font-extrabold text-paper">
          {clock.start} – {clock.end}
        </p>
        <span className="sr-only">
          Status atual: {STEPS[activeIndex].label}. Previsão de entrega entre {clock.start} e {clock.end}.
        </span>

        <div className="mt-6 h-1 rounded bg-line">
          <div
            className="h-full rounded bg-paper transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <ol className="mt-3 grid grid-cols-4 gap-2 text-center">
          {STEPS.map((step, i) => {
            const active = i === activeIndex;
            return (
              <li
                key={step.key}
                aria-current={active ? 'step' : undefined}
                className="flex flex-col items-center gap-1"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${active ? 'bg-paper' : 'bg-line'}`}
                />
                <span
                  className={`text-[10px] ${active ? 'text-paper' : 'text-faint'}`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-6 flex gap-3">
        <span
          aria-hidden="true"
          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-paper"
        />
        <p className="text-sm text-paper">
          {STEPS[activeIndex].label} —{' '}
          <span className="text-muted">
            {status === 'RECEIVED'
              ? 'aguardando confirmação da loja no WhatsApp.'
              : status === 'PREPARING'
                ? 'sua comida já está sendo preparada.'
                : status === 'OUT'
                  ? method === 'delivery'
                    ? 'o entregador está a caminho.'
                    : 'seu pedido está pronto para retirada.'
                  : 'pedido entregue. Obrigado!'}
          </span>
        </p>
      </section>

      <section className="mt-6 rounded border border-line bg-surface p-6">
        <h2 className="text-xs uppercase tracking-widest text-faint">
          Detalhes do pedido
        </h2>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paper text-sm font-bold text-ink">
            BB
          </div>
          <div className="flex-1">
            <p className="font-semibold text-paper">{storeConfig.brandName}</p>
            <p className="text-xs text-faint">N° do pedido {displayId}</p>
          </div>
          <button
            type="button"
            onClick={() => openWhatsApp(buildContactMessage(displayId))}
            className="cursor-pointer text-sm text-paper underline-offset-4 hover:underline"
          >
            Ligar
          </button>
        </div>

        <hr className="my-4 border-line" />

        {method === 'delivery' && address ? (
          <div>
            <p className="text-xs uppercase tracking-widest text-faint">Entrega em</p>
            <p className="mt-1 text-sm text-paper">
              {address.street}, {address.number} — {address.neighborhood}
            </p>
            {address.complement && (
              <p className="text-xs text-muted">Complemento: {address.complement}</p>
            )}
            {address.reference && (
              <p className="text-xs text-muted">Referência: {address.reference}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-widest text-faint">
              Retirada no balcão
            </p>
            <p className="mt-1 text-sm text-paper">{storeConfig.address}</p>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs uppercase tracking-widest text-faint">Cliente</p>
          <p className="mt-1 text-sm text-paper">
            {customer.name} — {customer.phone}
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => openWhatsApp(buildContactMessage(displayId))}
          className="w-full cursor-pointer rounded bg-paper px-4 py-3 font-semibold text-ink transition-colors hover:bg-white"
        >
          Abrir conversa no WhatsApp
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openWhatsApp(buildCancelMessage(displayId))}
            className="cursor-pointer rounded border border-line px-4 py-2 text-sm hover:border-paper"
          >
            Cancelar pedido
          </button>
          <Link
            href="/"
            onClick={() => clear()}
            className="cursor-pointer rounded border border-line px-4 py-2 text-center text-sm hover:border-paper"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </section>
    </main>
  );
}
```

**Notas de design:**
- `STATUS_TO_INDEX` é o mapa imutável; `CANCELLED` é caso especial (early return).
- `displayId` mostrado na UI vem do polling; antes do primeiro response chega o ULID — em prática, polling completa em <100ms numa rede saudável.
- Tick silencioso é proposital: se a rede vai/volta o usuário não vê toast pulsando.
- `STEPS[activeIndex].label` permite a frase contextual no bloco abaixo da timeline.

- [ ] **Step 4.5: Rodar os testes do OrderStatusScreen e ver tudo passar**

Run: `npm test -- components/checkout/OrderStatusScreen.test.tsx`
Expected: PASS (todos os layout + ações + 6 testes novos de polling).

Se algum teste de layout estiver quebrado por causa do `displayId` vir do polling em vez de ser estático, ajuste o teste para `await waitFor(...)` (já indicado na Step 4.1).

- [ ] **Step 4.6: Rodar typecheck completo**

Run: `npx tsc --noEmit`
Expected: zero erros. O contrato `OrderStatusScreen` agora bate com `app/checkout/page.tsx`.

- [ ] **Step 4.7: Rodar a suíte inteira e ver todos os testes verdes**

Run: `npm test`
Expected: tudo verde. Alvo: >180 testes (referência atual + ~6 polling + ~6 api-client).

- [ ] **Step 4.8: Commit (envolve as Tasks 3 e 4 juntas — checkout + status formam uma transação coerente)**

```bash
git add app/checkout/page.tsx components/checkout/OrderStatusScreen.tsx components/checkout/OrderStatusScreen.test.tsx
git commit -m "feat(checkout): integra POST /orders e polling de status

submit() async chama api.createOrder; ApiError traduzido em pt-BR via
humanize(). OrderStatusScreen recebe ULID, faz polling a cada 10s e
deriva o ACTIVE_INDEX do status real; CANCELLED tem tela própria."
```

---

## Task 5: Testes de integração do `checkout/page.tsx`

Cobre o `submit()` ponta-a-ponta com `api.createOrder` mockado. Foco no caminho feliz, em uma `ApiError` traduzida, em erro de rede e em erro de loja fechada (que **nem chega a chamar a API** porque a pré-validação pega antes).

**Files:**
- Create: `app/checkout/page.test.tsx`

- [ ] **Step 5.1: Criar `app/checkout/page.test.tsx` com mock da API e helper de navegação**

Arquivo `app/checkout/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckoutPage from './page';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import type { OrderResponse } from '@/lib/types-api';
import { useCartStore } from '@/lib/cart-store';
import { products } from '@/data/menu';

// Hora dentro do horário de funcionamento (qua, 19:00 BRT).
const OPEN_TIME = new Date('2026-05-20T22:00:00Z'); // 19h em BRT

const sampleOrder: OrderResponse = {
  id: 'ord_01HZ',
  displayId: '#3417',
  status: 'RECEIVED',
  fulfillmentType: 'PICKUP',
  customer: { name: 'Bruno', phone: '(21) 99999-0000' },
  payment: 'PIX',
  items: [
    { productId: products[0].id, productName: products[0].name, unitPrice: products[0].price, quantity: 1 },
  ],
  totals: { subtotal: products[0].price, discount: 0, deliveryFee: 0, total: products[0].price },
  estimatedMinutes: { min: 20, max: 30 },
  createdAt: '2026-05-20T22:00:00Z',
  timestamps: {
    receivedAt: '2026-05-20T22:00:00Z',
    preparingAt: null,
    outAt: null,
    deliveredAt: null,
    cancelledAt: null,
  },
};

let openSpy: ReturnType<typeof vi.spyOn>;
let createOrderSpy: ReturnType<typeof vi.spyOn>;
let getOrderSpy: ReturnType<typeof vi.spyOn>;

// next/navigation: replace é chamado quando o carrinho está vazio.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(OPEN_TIME);

  // Preenche o carrinho — checkout redireciona se vazio.
  useCartStore.setState({
    items: [
      {
        id: 'ci1',
        product: products[0],
        quantity: 1,
        notes: '',
      },
    ],
    coupon: null,
  });

  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  createOrderSpy = vi.spyOn(api, 'createOrder').mockResolvedValue(sampleOrder);
  getOrderSpy = vi.spyOn(api, 'getOrder').mockResolvedValue(sampleOrder);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  useCartStore.setState({ items: [], coupon: null });
});

async function fillUntilReview(user: ReturnType<typeof userEvent.setup>) {
  // identification
  await user.type(screen.getByLabelText(/nome/i), 'Bruno Almeida');
  await user.type(screen.getByLabelText(/celular/i), '(21) 99999-0000');
  await user.click(screen.getByRole('button', { name: /continuar/i }));

  // delivery — escolhe "Retirar no balcão" pra simplificar (sem endereço)
  await user.click(screen.getByRole('radio', { name: /retirar/i }));
  await user.click(screen.getByRole('button', { name: /continuar/i }));

  // payment — Pix
  await user.click(screen.getByRole('radio', { name: /^pix$/i }));
  await user.click(screen.getByRole('button', { name: /continuar/i }));
}

describe('CheckoutPage — submit integrado', () => {
  it('chama api.createOrder com o payload montado e avança para a tela de status', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() => expect(createOrderSpy).toHaveBeenCalledTimes(1));
    const payload = createOrderSpy.mock.calls[0][0];
    expect(payload.fulfillmentType).toBe('PICKUP');
    expect(payload.payment).toBe('PIX');
    expect(payload.items).toEqual([
      { productId: products[0].id, quantity: 1 },
    ]);
    expect(payload.address).toBeUndefined();
  });

  it('em sucesso, abre WhatsApp com o displayId do response (não gerado client-side)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    const url = openSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain('#3417');
  });

  it('em ApiError(store-closed) mostra mensagem humanizada e fica na tela review', async () => {
    createOrderSpy.mockRejectedValueOnce(
      new ApiError(409, 'store-closed', 'Loja fechada', 'A loja não aceita pedidos agora.'),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() =>
      expect(screen.getByText(/loja está fechada agora/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /enviar pedido/i })).toBeInTheDocument();
  });

  it('em ApiError(network-error) mostra mensagem genérica de conexão', async () => {
    createOrderSpy.mockRejectedValueOnce(
      new ApiError(0, 'network-error', 'Sem conexão', 'Não consegui falar com o servidor.'),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() =>
      expect(screen.getByText(/sem conexão com o servidor/i)).toBeInTheDocument(),
    );
  });

  it('em ApiError(delivery-area-not-served) mostra "Não entregamos no bairro"', async () => {
    createOrderSpy.mockRejectedValueOnce(
      new ApiError(400, 'delivery-area-not-served', 'Bairro fora', 'Bairro não atendido.'),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() =>
      expect(screen.getByText(/não entregamos no bairro selecionado/i)).toBeInTheDocument(),
    );
  });
});
```

**Nota:** se `data/menu.ts` não exportar `products` (e exportar só `categories` com items aninhados), ajuste o import para extrair o primeiro produto disponível conforme o módulo:

```ts
import { categories } from '@/data/menu';
const products = categories.flatMap((c) => c.products ?? []); // adaptar conforme o shape real
```

Antes de rodar, **abra `data/menu.ts`** para confirmar o shape e ajuste o teste se necessário.

- [ ] **Step 5.2: Confirmar shape de `data/menu.ts` antes de rodar**

Run: `head -30 data/menu.ts` (ou `Read` da primeira parte do arquivo).
Ajuste o `import` / construção de `products` no teste para casar com a realidade. Se o `IdentificationStep` usa rótulos diferentes (`Nome completo` em vez de `Nome`, p.ex.), ajustar o `getByLabelText` no helper.

- [ ] **Step 5.3: Rodar os testes do checkout e ver passar**

Run: `npm test -- app/checkout/page.test.tsx`
Expected: PASS (5 testes).

Se algum teste falhar por causa de seletor de RTL (rótulo errado, role errado), ler o erro do testing-library — ele costuma sugerir qual `getBy` usar.

- [ ] **Step 5.4: Rodar a suíte inteira de novo**

Run: `npm test`
Expected: tudo verde.

- [ ] **Step 5.5: Commit**

```bash
git add app/checkout/page.test.tsx
git commit -m "test(checkout): integração do submit com api.createOrder e ApiError"
```

---

## Task 6: Deprecar `generateOrderId`

A função `generateOrderId` em `lib/order-id.ts` não é mais chamada em runtime — `displayId` vem do backend. Mantém o arquivo (e o teste) no repo, mas anota `@deprecated` no JSDoc para sinalizar pra qualquer dev futuro.

**Files:**
- Modify: `lib/order-id.ts`

- [ ] **Step 6.1: Atualizar JSDoc com `@deprecated`**

Arquivo `lib/order-id.ts`:

```ts
/**
 * Gera um identificador "#XXXX" (4 dígitos) a partir dos últimos 4 dígitos do timestamp atual.
 *
 * @deprecated since 2026-05-21 (SP4a). O backend agora dita o `displayId` e o front
 * apenas usa o que vier no response de `POST /orders`. A função fica no repositório
 * por compatibilidade com testes existentes, mas não deve ser chamada em runtime.
 */
export function generateOrderId(): string {
  const last4 = Date.now().toString().slice(-4).padStart(4, '0');
  return `#${last4}`;
}
```

- [ ] **Step 6.2: Verificar que ninguém mais importa essa função em runtime (busca global)**

Run: `Grep` por `generateOrderId` em `app/`, `components/`, `lib/` (excluindo `lib/order-id.ts` e `lib/order-id.test.ts`).
Expected: zero matches em código runtime; matches só nos próprios `order-id.ts` e `order-id.test.ts`.

- [ ] **Step 6.3: Rodar lint e testes**

Run: `npm run lint && npm test`
Expected: tudo verde.

- [ ] **Step 6.4: Commit**

```bash
git add lib/order-id.ts
git commit -m "chore(order-id): @deprecated — displayId agora vem do backend"
```

---

## Task 7: Smoke E2E manual (com backend rodando)

Verifica ponta-a-ponta o fluxo completo num ambiente real: criar pedido pelo front, ver o registro no Postgres, mover o status via admin API, ver a UI atualizar em <10s.

**Pré-requisito:** Java 21 instalado, Docker rodando.

- [ ] **Step 7.1: Subir o backend**

Run (Bash, no diretório raiz do repo):

```bash
cd backend
docker compose up -d
./gradlew bootRun  # ou via IDE
```

Espera o log `Started BragasApiApplication`. Verifica saúde:

```bash
curl http://localhost:8080/api/v1/health
# Expected: 200 OK com {"status":"UP"} ou similar
```

- [ ] **Step 7.2: Subir o front em dev**

Em outro terminal, na raiz do repo:

```bash
cp .env.local.example .env.local   # se ainda não existir
npm run dev
```

Abra `http://localhost:3000`.

- [ ] **Step 7.3: Criar um pedido pelo fluxo de checkout**

Adicione 1 item ao carrinho → checkout → preencha identificação → escolha "Retirar no balcão" → escolha Pix → revisar → "Enviar pedido".

Verifica:
- WhatsApp abre numa nova aba com a mensagem montada.
- A página avança para `OrderStatusScreen` com `displayId` (ex.: `#0042`) e timeline em "Recebido" (item 0 com `aria-current`).
- Não há toast de erro.

- [ ] **Step 7.4: Confirmar que o pedido caiu no Postgres**

Run:

```bash
docker exec -it $(docker ps --filter "name=postgres" -q) \
  psql -U bragas -d bragas \
  -c "SELECT id, display_id, status, total FROM orders ORDER BY created_at DESC LIMIT 1"
```

Expected: 1 linha com o pedido recém-criado, status `RECEIVED`.

- [ ] **Step 7.5: Avançar o status via admin API e ver a UI atualizar**

Pegue o ULID do pedido (coluna `id` do query anterior). Em outro terminal:

```bash
ORDER_ID="ord_01HZ..."   # cole o id
ADMIN_TOKEN="dev-token"  # ou o valor em backend/.env

curl -X PATCH "http://localhost:8080/api/v1/admin/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -d '{"to":"PREPARING"}'
```

> Body do PATCH usa `{"to":"..."}`, **não** `{"status":"..."}`. Descoberto no smoke E2E de 2026-05-21.

Volte para a aba do `OrderStatusScreen` aberto e espere até 10s. Verifica:
- A timeline avança: agora "Em preparo" tem `aria-current` e o item 0 não.
- O texto contextual sob a timeline muda para "sua comida já está sendo preparada".

Repita com `OUT` e `DELIVERED` para validar a sequência. Depois teste `CANCELLED` num pedido novo: a tela deve trocar para "Pedido cancelado pela loja".

- [ ] **Step 7.6: Testar backend offline → toast "Sem conexão"**

Mate o backend (Ctrl+C no terminal do `bootRun` ou `docker compose down`). Volte ao front, adicione item, vá até review, clique "Enviar pedido".

Expected: toast "Sem conexão com o servidor. Tente de novo em alguns instantes." aparece e o usuário continua na tela de review (não avança).

- [ ] **Step 7.7: Testar loja fechada → toast "Loja fechada"**

Edite `config/store.ts` temporariamente para forçar horário fechado, ou ajuste o relógio do sistema, ou modifique a primeira pré-validação em `submit()` para `if (true)`. Recarregue, tente enviar.

Expected: toast "A loja está fechada agora. Confira os horários." (pré-validação client-side; nem chega ao backend).

Reverter a alteração após o teste.

- [ ] **Step 7.8: Testar bairro inválido → toast "Não entregamos no bairro"**

Suba o backend de novo. Faça checkout em modo entrega, insira um bairro que NÃO está em `data/delivery.ts` (`Selecione um bairro atendido` aparece como pré-validação client) — para validar a versão server, comente temporariamente a pré-validação client de bairro e mande um bairro inválido.

Expected: toast "Não entregamos no bairro selecionado." Reverter a alteração após o teste.

- [ ] **Step 7.9: Rodar verificação final completa**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Expected: tudo verde. Critério de sucesso do spec atingido.

- [ ] **Step 7.10: Commit de fechamento (se algum ajuste fino foi feito durante o smoke)**

Caso nenhum arquivo tenha sido tocado, pular esse step. Caso contrário:

```bash
git add <arquivos-ajustados>
git commit -m "chore(integration): ajustes finais após smoke E2E"
```

---

## Pendências explicitamente fora deste plano

| Item | Sub-projeto |
|------|-------------|
| Signup/login do cliente | 4b |
| Tela "Meus pedidos" do cliente logado | 4b |
| Substituir `X-Admin-Token` por sessão admin | 5 |
| Migrar cardápio (`data/menu.ts`) para o banco | 5 |
| Cupons editáveis pelo admin | 5 |
| Deploy, HTTPS, rate limit, secrets management | 6 |
| Real-time via SSE (substitui polling) | 6 (opcional) |
