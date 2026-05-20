# OrderStatusScreen v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the post-submit "Pedido enviado" screen into a 5-block "Acompanhe seu pedido" screen inspired by iFood, using the existing black/white/gray tokens and adding a real-time clock window for the delivery estimate.

**Architecture:** Add a pure helper (`lib/order-time.ts`) that turns a minutes range into a `HH:MM – HH:MM` clock window in pt-BR. Add two pure WhatsApp message builders (`buildContactMessage`, `buildHelpMessage`). Rewrite `components/checkout/OrderStatusScreen.tsx` to consume those helpers and the additional checkout state (method, customer, address). Update `app/checkout/page.tsx` to forward the new props. The status timeline is rendered with only "Recebido" active — the data model is ready for sub-projeto 3 to wire real status.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, Tailwind 4, TypeScript 5, Vitest 4 + Testing Library, Zustand (cart), framer-motion (already in repo, optional here).

**Reference spec:** `docs/superpowers/specs/2026-05-20-order-status-screen-redesign-design.md`

---

## File structure

**Create:**
- `lib/order-time.ts` — `estimateClock(now, { min, max })` returns `{ start: 'HH:MM', end: 'HH:MM' }`.
- `lib/order-time.test.ts` — unit tests for `estimateClock`.

**Modify:**
- `lib/order-message.ts` — add `buildContactMessage`, `buildHelpMessage`.
- `lib/order-message.test.ts` — add tests for the two new builders.
- `components/checkout/OrderStatusScreen.tsx` — full rewrite (5 blocks, new props).
- `components/checkout/OrderStatusScreen.test.tsx` — full rewrite to cover the new layout and 4 buttons.
- `app/checkout/page.tsx` — pass `method`, `customer`, `address` to `<OrderStatusScreen>`.

**Untouched:** `lib/order-cancel-message.ts`, `lib/order-id.ts`, `lib/delivery-time.ts`, `config/store.ts`, `lib/types.ts`.

---

## Task 1 — `lib/order-time.ts` clock helper

**Files:**
- Create: `lib/order-time.ts`
- Test: `lib/order-time.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/order-time.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { estimateClock } from './order-time';

describe('estimateClock', () => {
  it('soma os minutos mínimos e máximos no horário atual', () => {
    const now = new Date('2026-05-20T18:00:00');
    expect(estimateClock(now, { min: 30, max: 50 })).toEqual({
      start: '18:30',
      end: '18:50',
    });
  });

  it('preserva zero à esquerda nos minutos', () => {
    const now = new Date('2026-05-20T18:55:00');
    expect(estimateClock(now, { min: 5, max: 10 })).toEqual({
      start: '19:00',
      end: '19:05',
    });
  });

  it('atravessa a meia-noite', () => {
    const now = new Date('2026-05-20T23:50:00');
    expect(estimateClock(now, { min: 20, max: 40 })).toEqual({
      start: '00:10',
      end: '00:30',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npm test -- lib/order-time.test.ts
```

Expected: FAIL with "Cannot find module './order-time'".

- [ ] **Step 3: Implement `estimateClock`**

Create `lib/order-time.ts`:

```ts
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

function formatHHMM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Janela de hora ("18:30"–"18:50") prevista a partir de `now` e uma faixa de minutos. */
export function estimateClock(
  now: Date,
  minutes: { min: number; max: number },
): { start: string; end: string } {
  return {
    start: formatHHMM(addMinutes(now, minutes.min)),
    end: formatHHMM(addMinutes(now, minutes.max)),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npm test -- lib/order-time.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```
git add lib/order-time.ts lib/order-time.test.ts
git commit -m "feat(order): estimateClock para janela de previsão HH:MM"
```

---

## Task 2 — `buildContactMessage` and `buildHelpMessage`

**Files:**
- Modify: `lib/order-message.ts` (append two exports)
- Modify: `lib/order-message.test.ts` (append two tests)

- [ ] **Step 1: Write the failing tests**

Open `lib/order-message.test.ts` and append (inside the file, after the existing `describe` blocks):

```ts
import { buildContactMessage, buildHelpMessage } from './order-message';

describe('buildContactMessage', () => {
  it('monta uma mensagem curta com o número do pedido', () => {
    expect(buildContactMessage('#3417')).toBe('Olá, sobre o pedido #3417.');
  });
});

describe('buildHelpMessage', () => {
  it('monta um pedido de ajuda com o número do pedido', () => {
    expect(buildHelpMessage('#3417')).toBe(
      'Olá, preciso de ajuda com o pedido #3417.',
    );
  });
});
```

If the file already imports from `./order-message` at the top, fold these names into that import instead of adding a duplicate `import` line.

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- lib/order-message.test.ts
```

Expected: FAIL with "buildContactMessage is not a function" and "buildHelpMessage is not a function".

- [ ] **Step 3: Implement the two builders**

Append to the bottom of `lib/order-message.ts` (after `buildWhatsAppMessage`):

```ts
export function buildContactMessage(orderId: string): string {
  return `Olá, sobre o pedido ${orderId}.`;
}

export function buildHelpMessage(orderId: string): string {
  return `Olá, preciso de ajuda com o pedido ${orderId}.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- lib/order-message.test.ts
```

Expected: PASS (all tests, including the new two).

- [ ] **Step 5: Commit**

```
git add lib/order-message.ts lib/order-message.test.ts
git commit -m "feat(order): mensagens de contato e ajuda para a tela de acompanhamento"
```

---

## Task 3 — Rewrite `OrderStatusScreen.test.tsx`

We rewrite the test file BEFORE the component (TDD). The old assertions are replaced — there are no other consumers of `OrderStatusScreen`, so removing them is safe.

**Files:**
- Modify (rewrite): `components/checkout/OrderStatusScreen.test.tsx`

- [ ] **Step 1: Replace the file with the new test suite**

Replace the entire contents of `components/checkout/OrderStatusScreen.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderStatusScreen } from './OrderStatusScreen';
import type { Address, Customer } from '@/lib/types';

let openSpy: ReturnType<typeof vi.spyOn>;

const customer: Customer = { name: 'João Silva', phone: '(21) 99999-0000' };

const address: Address = {
  cep: '20000-000',
  street: 'Rua das Acácias',
  number: '123',
  neighborhood: 'Higienópolis',
  complement: 'apto 302',
};

beforeEach(() => {
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-20T18:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderDelivery() {
  return render(
    <OrderStatusScreen
      orderId="#3417"
      estimatedMinutes={{ min: 30, max: 50 }}
      method="delivery"
      customer={customer}
      address={address}
    />,
  );
}

function renderPickup() {
  return render(
    <OrderStatusScreen
      orderId="#3417"
      estimatedMinutes={{ min: 25, max: 25 }}
      method="pickup"
      customer={customer}
    />,
  );
}

describe('OrderStatusScreen — layout', () => {
  it('mostra o título "Acompanhe seu pedido" e o número do pedido', () => {
    renderDelivery();
    expect(screen.getByText(/acompanhe seu pedido/i)).toBeInTheDocument();
    expect(screen.getByText('#3417')).toBeInTheDocument();
  });

  it('mostra a janela de previsão de entrega em HH:MM', () => {
    renderDelivery();
    expect(screen.getByText('18:30 – 18:50')).toBeInTheDocument();
  });

  it('mostra as 4 etapas da timeline com apenas "Recebido" ativa', () => {
    renderDelivery();
    const timeline = screen.getByRole('list');
    const items = within(timeline).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText('Recebido')).toBeInTheDocument();
    expect(within(items[1]).getByText('Em preparo')).toBeInTheDocument();
    expect(within(items[2]).getByText('Saiu')).toBeInTheDocument();
    expect(within(items[3]).getByText('Entregue')).toBeInTheDocument();
    expect(items[0]).toHaveAttribute('aria-current', 'step');
    expect(items[1]).not.toHaveAttribute('aria-current');
  });

  it('mostra dados do cliente', () => {
    renderDelivery();
    expect(screen.getByText(/joão silva/i)).toBeInTheDocument();
    expect(screen.getByText(/\(21\) 99999-0000/)).toBeInTheDocument();
  });

  it('em delivery, mostra "Entrega em" com rua, número e bairro', () => {
    renderDelivery();
    expect(screen.getByText(/entrega em/i)).toBeInTheDocument();
    expect(screen.getByText(/rua das acácias, 123/i)).toBeInTheDocument();
    expect(screen.getByText(/higienópolis/i)).toBeInTheDocument();
    expect(screen.getByText(/apto 302/i)).toBeInTheDocument();
  });

  it('em pickup, mostra "Retirada no balcão" sem endereço do cliente', () => {
    renderPickup();
    expect(screen.getByText(/retirada no balcão/i)).toBeInTheDocument();
    expect(screen.queryByText(/entrega em/i)).not.toBeInTheDocument();
  });
});

describe('OrderStatusScreen — ações', () => {
  it('CTA "Abrir conversa no WhatsApp" abre o WhatsApp com a mensagem de contato', async () => {
    renderDelivery();
    await userEvent.click(
      screen.getByRole('button', { name: /abrir conversa no whatsapp/i }),
    );
    expect(openSpy).toHaveBeenCalled();
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain('wa.me/');
    expect(decodeURIComponent(url)).toContain('Olá, sobre o pedido #3417');
  });

  it('botão "Cancelar pedido" abre o WhatsApp com a mensagem de cancelamento', async () => {
    renderDelivery();
    await userEvent.click(screen.getByRole('button', { name: /cancelar pedido/i }));
    const url = openSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain('cancelar o pedido #3417');
  });

  it('link "Ajuda" abre o WhatsApp com a mensagem de ajuda', async () => {
    renderDelivery();
    await userEvent.click(screen.getByRole('button', { name: /ajuda/i }));
    const url = openSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain('preciso de ajuda com o pedido #3417');
  });

  it('link "Voltar ao cardápio" leva para a home', () => {
    renderDelivery();
    const back = screen.getByRole('link', { name: /voltar ao cardápio/i });
    expect(back).toHaveAttribute('href', '/');
  });
});
```

- [ ] **Step 2: Run tests to verify they all fail**

```
npm test -- components/checkout/OrderStatusScreen.test.tsx
```

Expected: many FAILs (missing layout, props don't exist yet). This is correct — the implementation comes in Task 4.

- [ ] **Step 3: Commit the failing tests**

```
git add components/checkout/OrderStatusScreen.test.tsx
git commit -m "test(checkout): especifica nova OrderStatusScreen com 5 blocos"
```

---

## Task 4 — Rewrite `OrderStatusScreen.tsx`

**Files:**
- Modify (rewrite): `components/checkout/OrderStatusScreen.tsx`

- [ ] **Step 1: Replace the file with the new component**

Replace the entire contents of `components/checkout/OrderStatusScreen.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { buildCancelMessage } from '@/lib/order-cancel-message';
import {
  buildContactMessage,
  buildHelpMessage,
} from '@/lib/order-message';
import { estimateClock } from '@/lib/order-time';
import { storeConfig } from '@/config/store';
import type { Address, Customer, DeliveryMethod } from '@/lib/types';

interface Props {
  orderId: string;
  estimatedMinutes: { min: number; max: number };
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

const ACTIVE_INDEX = 0; // v1: somente "Recebido" — sub-projeto 3 plugará o status real.

function openWhatsApp(text: string) {
  const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function OrderStatusScreen({
  orderId,
  estimatedMinutes,
  method,
  customer,
  address,
}: Props) {
  const clear = useCartStore((s) => s.clear);
  const clock = useMemo(() => estimateClock(new Date(), estimatedMinutes), [estimatedMinutes]);
  const progressPct = ((ACTIVE_INDEX + 1) / STEPS.length) * 100;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
      {/* Bloco 1 — Header */}
      <header className="flex items-center justify-between border-b border-line pb-4">
        <Link
          href="/"
          aria-label="Voltar ao cardápio"
          className="text-paper hover:text-white"
        >
          ←
        </Link>
        <h1 className="text-xs uppercase tracking-widest text-faint">
          Acompanhe seu pedido
        </h1>
        <button
          type="button"
          onClick={() => openWhatsApp(buildHelpMessage(orderId))}
          className="cursor-pointer text-sm text-paper underline-offset-4 hover:underline"
        >
          Ajuda
        </button>
      </header>

      {/* Bloco 2 — Previsão de entrega */}
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
          <p className="text-xs text-faint">Pedido {orderId}</p>
        </div>
        <p className="mt-1 font-heading text-4xl font-extrabold text-paper">
          {clock.start} – {clock.end}
        </p>
        <span className="sr-only">
          Pedido recebido. Previsão de entrega entre {clock.start} e {clock.end}.
        </span>

        {/* Trilho */}
        <div className="mt-6 h-1 rounded bg-line">
          <div
            className="h-full rounded bg-paper transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Ticks */}
        <ol className="mt-3 grid grid-cols-4 gap-2 text-center">
          {STEPS.map((step, i) => {
            const active = i === ACTIVE_INDEX;
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

      {/* Bloco 3 — Status atual */}
      <section className="mt-6 flex gap-3">
        <span
          aria-hidden="true"
          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-paper"
        />
        <p className="text-sm text-paper">
          Pedido recebido —{' '}
          <span className="text-muted">
            aguardando confirmação da loja no WhatsApp.
          </span>
        </p>
      </section>

      {/* Bloco 4 — Detalhes do pedido */}
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
            <p className="text-xs text-faint">N° do pedido {orderId}</p>
          </div>
          <button
            type="button"
            onClick={() => openWhatsApp(buildContactMessage(orderId))}
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

      {/* Bloco 5 — Ações */}
      <section className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => openWhatsApp(buildContactMessage(orderId))}
          className="w-full cursor-pointer rounded bg-paper px-4 py-3 font-semibold text-ink transition-colors hover:bg-white"
        >
          Abrir conversa no WhatsApp
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openWhatsApp(buildCancelMessage(orderId))}
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

- [ ] **Step 2: Run the component tests**

```
npm test -- components/checkout/OrderStatusScreen.test.tsx
```

Expected: PASS (all 10 tests).

- [ ] **Step 3: Run the full test suite to catch regressions**

```
npm test
```

Expected: PASS. If any tests outside `OrderStatusScreen` fail, the most likely cause is `app/checkout/page.tsx` no longer compiling — Task 5 fixes that. If only the type-check at build time would fail, the test runner will still pass. Continue.

- [ ] **Step 4: Commit**

```
git add components/checkout/OrderStatusScreen.tsx
git commit -m "feat(checkout): OrderStatusScreen v2 com timeline e previsão em HH:MM"
```

---

## Task 5 — Wire new props in `app/checkout/page.tsx`

The new component requires `method`, `customer`, and `address`. The page already has these as local state — just forward them.

**Files:**
- Modify: `app/checkout/page.tsx`

- [ ] **Step 1: Update the `OrderStatusScreen` render call**

In `app/checkout/page.tsx`, find this exact block:

```tsx
  if (step === 'sent' && orderId && sentEstimate) {
    return <OrderStatusScreen orderId={orderId} estimatedMinutes={sentEstimate} />;
  }
```

Replace it with:

```tsx
  if (step === 'sent' && orderId && sentEstimate) {
    return (
      <OrderStatusScreen
        orderId={orderId}
        estimatedMinutes={sentEstimate}
        method={method}
        customer={customer}
        address={method === 'delivery' && address ? address : undefined}
      />
    );
  }
```

No other changes to the file.

- [ ] **Step 2: Run `npm run lint`**

```
npm run lint
```

Expected: no errors. If ESLint complains about unused imports in `OrderStatusScreen.tsx`, recheck the rewrite from Task 4 — every import there should be used.

- [ ] **Step 3: Run `npm run build`**

```
npm run build
```

Expected: build succeeds. This catches TypeScript errors that Vitest doesn't, especially the new `Props` shape on `OrderStatusScreen`.

- [ ] **Step 4: Run the full test suite**

```
npm test
```

Expected: PASS (all suites, including the existing checkout/cart tests).

- [ ] **Step 5: Commit**

```
git add app/checkout/page.tsx
git commit -m "feat(checkout): repassa method/customer/address para OrderStatusScreen"
```

---

## Task 6 — Manual smoke test in the browser

The UI is now real but no automated test exercises the full flow. Verify it end-to-end before claiming done.

**Files:** none (manual).

- [ ] **Step 1: Start the dev server**

```
npm run dev
```

Wait until the terminal prints `Ready` and the URL.

- [ ] **Step 2: Walk the happy path — delivery**

1. Open the URL in the browser.
2. Add 1–2 products to the cart (total ≥ R$ 25).
3. Open the cart drawer and click **Fechar pedido**.
4. Fill in: name "Teste", phone "(21) 90000-0000".
5. Choose Entrega, pick any served neighborhood (use `/bairros` if needed), fill the address fields.
6. Choose a payment method (e.g., Crédito).
7. On the Revisão step, click **Enviar pedido**.
8. The WhatsApp tab will open (close it). The page should switch to the new `OrderStatusScreen`.

Confirm visually, in this order:
- Header shows `← / ACOMPANHE SEU PEDIDO / Ajuda`.
- "Previsão de entrega" with a `HH:MM – HH:MM` window using actual current time.
- "Pedido #XXXX" small on the right of the time block.
- Timeline with 4 labels; only "Recebido" looks brighter.
- Status line: "Pedido recebido — aguardando confirmação da loja no WhatsApp."
- Detalhes card with `BB` avatar, brand name, order ID, "Ligar" link, address block, customer block.
- Big white CTA "Abrir conversa no WhatsApp".
- Two smaller secondary buttons side by side.

- [ ] **Step 3: Walk the happy path — pickup**

Repeat with method = Retirada. Confirm the detalhes card now shows "Retirada no balcão" + the store address (from `storeConfig.address`) and the address block from the customer is gone.

- [ ] **Step 4: Click each action button**

For each button, confirm a new WhatsApp tab opens with the right pre-filled message:
- **Abrir conversa no WhatsApp** → "Olá, sobre o pedido #XXXX."
- **Ajuda** → "Olá, preciso de ajuda com o pedido #XXXX."
- **Cancelar pedido** → "Olá, gostaria de cancelar o pedido #XXXX."
- **Voltar ao cardápio** → returns to `/`, cart is cleared (cart drawer empty).

- [ ] **Step 5: Check keyboard accessibility**

Tab through the page. Each interactive element should show the global `:focus-visible` outline. The order should make sense (header → buttons → CTAs).

- [ ] **Step 6: Stop the dev server**

`Ctrl+C` in the terminal.

If anything is off, fix it, re-run `npm test` and `npm run build`, then re-do the smoke test before moving on.

---

## Task 7 — Final verification and notes

- [ ] **Step 1: Confirm clean tree and full green run**

```
git status
npm run lint
npm run build
npm test
```

Expected: clean working tree (everything committed), lint clean, build green, all tests pass.

- [ ] **Step 2: Note the v1 limitation in the screen**

This is documented in the spec (section 7), but is worth keeping in mind: the timeline is intentionally stuck on "Recebido". Sub-projeto 3 will add a `status` prop and the active index will derive from it. Don't add a timer to advance the steps — that was deliberately rejected during brainstorming.

- [ ] **Step 3: Ready for review**

The plan is done when:
- Spec's section 8 ("Critérios de sucesso") is fully met.
- All tests green.
- Manual smoke test passed for both delivery and pickup.
- All commits are on the feature branch.

---

## Spec coverage check

| Spec section | Covered by |
|--------------|------------|
| 3.1 Header (`←`, título, Ajuda) | Task 4 |
| 3.2 Previsão de entrega (HH:MM, número pequeno, barra, ticks) | Tasks 1, 4 |
| 3.3 Status atual (bolinha + texto) | Task 4 |
| 3.4 Detalhes do pedido (avatar, loja, Ligar, endereço, cliente) | Task 4 |
| 3.5 Ações (CTA WhatsApp, Cancelar, Voltar) | Tasks 2, 4 |
| 4 Mudanças por arquivo | All tasks |
| 5 Testes — `estimateClock` | Task 1 |
| 5 Testes — `buildContactMessage`, `buildHelpMessage` | Task 2 |
| 5 Testes — `OrderStatusScreen` (layout, 4 botões, delivery/pickup) | Task 3 |
| 6 Acessibilidade (`aria-current`, `role="status"`, `sr-only`) | Task 4 |
| 7 Comportamento (timeline fixa, carrinho persiste até Voltar) | Task 4 |
| 8 Critérios de sucesso | Tasks 4, 5, 6, 7 |
