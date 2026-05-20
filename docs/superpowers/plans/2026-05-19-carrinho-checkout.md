# Carrinho + Checkout (Sub-projeto 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar carrinho de compras persistente e checkout em etapas que terminam enviando uma mensagem de WhatsApp formatada para a loja, com tela pós-envio que permite cancelar via WhatsApp; mais a página `/bairros` e suporte PWA.

**Architecture:** Lógica pura em `lib/` (testável sem UI), estado do carrinho em **zustand** persistido em `localStorage`, estado do checkout local na página de checkout, e composição em camadas (lib → store → componentes → páginas). Sem backend — o pedido sai como mensagem de WhatsApp via `wa.me/<numero>?text=<msg>`; status pós-envio é uma tela honesta de uma fase só.

**Tech Stack:** Next 16 (App Router), React 19, TypeScript, Tailwind v4, Framer Motion, **zustand** (novo), Vitest + Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-05-18-carrinho-checkout-design.md`

**Notas de contexto:**
- Trabalhamos na branch `feat/carrinho-checkout` (criada a partir da `master` depois do PR #2 mergeado).
- O sub-projeto 1 (landing + cardápio) já existe e está mergeado — só estendemos.
- O componente `FeaturedCarousel` usa Embla; o `ProductCard` é monocromático com `priceFrom` e placeholder; `data/delivery.ts` tem 39 bairros com taxas. **Não vamos alterar a aparência dessas peças** — só adicionar comportamentos.
- AGENTS.md exige ler `node_modules/next/dist/docs/` antes de usar APIs novas do Next 16. Onde isso for relevante (manifest, metadata, dynamic), as tasks lembram.

---

## Estrutura de arquivos

### Criar — `lib/`
- `lib/cart.ts` — funções puras de cálculo do carrinho.
- `lib/store-status.ts` — `isOpen` baseado em `storeConfig.openingHours`.
- `lib/delivery-time.ts` — estimativa de tempo por faixa de taxa.
- `lib/order-id.ts` — gerar `#XXXX` por timestamp.
- `lib/order-message.ts` — formatar mensagem do pedido (Apêndice A do spec).
- `lib/order-cancel-message.ts` — formatar mensagem de cancelamento.
- `lib/cart-store.ts` — store zustand do carrinho.

### Criar — `config/` e `data/`
- `config/store.ts` — configuração da loja (`storeConfig`).
- `data/coupons.ts` — lista de cupons.

### Criar — `components/cart/`
- `AddToCartButton.tsx` — botão "+" no `ProductCard`.
- `CartButton.tsx` — botão flutuante com contador.
- `CartDrawer.tsx` — painel lateral com itens, cupom, totais e CTA.

### Criar — `components/checkout/`
- `IdentificationStep.tsx`, `DeliveryStep.tsx`, `AddressForm.tsx`,
  `DeliveryEstimate.tsx`, `PaymentStep.tsx`, `ReviewStep.tsx`,
  `OrderStatusScreen.tsx`.

### Criar — `components/ui/`
- `OrderToast.tsx` — toast de erro de validação.
- `InstallBanner.tsx` — banner de instalação do PWA.

### Criar — `app/`
- `app/checkout/page.tsx` — wires steps + state machine.
- `app/bairros/page.tsx` — tabela de bairros + busca.
- `app/manifest.ts` — manifesto PWA (Next 16).
- `public/sw.js` — service worker mínimo (registra fetch handler).
- `public/icons/icon-192.png`, `icon-512.png` — ícones do PWA.

### Modificar
- `lib/types.ts` — adiciona `CartItem`, `Coupon`, `Address`, `DeliveryMethod`, `PaymentMethod`, `Customer`.
- `components/sections/ProductCard.tsx` — inclui `<AddToCartButton>`.
- `app/layout.tsx` — inclui `<CartButton>` global e referência ao manifest.

---

## Estágios (mapa rápido)

1. Tipos, config, dados (Tasks 1–4)
2. Lógica pura (Tasks 5–10)
3. Store zustand (Task 11)
4. Componentes de carrinho (Tasks 12–14)
5. Componentes auxiliares (Tasks 15–16)
6. Checkout (Tasks 17–21)
7. Tela pós-envio (Task 22)
8. Página /bairros (Task 23)
9. PWA (Tasks 24–26)
10. Polimento (Task 27)

---

## Task 1: Instalar zustand

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Instalar**

```bash
npm install zustand
```

- [ ] **Step 2: Confirmar versão**

```bash
npm ls zustand
```
Esperado: zustand resolvido em `5.x` (compatível com React 19).

- [ ] **Step 3: Confirmar baseline**

```bash
npm test
```
Esperado: todos os testes existentes passam (zustand ainda não é usado).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: adiciona zustand"
```

---

## Task 2: Estender `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Acrescentar os tipos novos ao fim do arquivo**

Em `lib/types.ts`, acrescentar (mantendo o que já existe):

```ts
export interface CartItem {
  id: string;          // id único do item no carrinho (não confundir com product.id)
  product: Product;
  quantity: number;
  notes: string;       // observação livre ("sem cebola"); '' se nenhuma
  // futuro: options?: SelectedOption[] — customização multi-step
}

export interface Coupon {
  code: string;
  type: 'percent' | 'fixed';
  value: number;           // 10 → 10% (percent) ou R$ 10 (fixed)
  minSubtotal?: number;    // subtotal mínimo (R$) para o cupom valer
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference?: string;
}

export type DeliveryMethod = 'delivery' | 'pickup';
export type PaymentMethod = 'pix' | 'cash' | 'credit' | 'debit';

export interface Customer {
  name: string;
  phone: string;
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): tipos do carrinho, cupom, endereço, pagamento"
```

---

## Task 3: `config/store.ts`

**Files:**
- Create: `config/store.ts`

- [ ] **Step 1: Criar `config/store.ts`**

```ts
// Configuração estática da loja. Substituível por API quando o sub-projeto 3 chegar.
export const storeConfig = {
  whatsappBusinessName: 'Bragas Lanches', // nome usado na mensagem do WhatsApp
  brandName: "Braga's Burger",            // marca visual do site
  whatsappNumber: '5521984019048',
  address: 'Higienópolis, Zona Norte — Rio de Janeiro',
  minOrder: 25,
  averagePrepTime: 25, // minutos médios de preparo na loja
  // null = fechado; senão [abre, fecha] em "HH:MM" (24h). Pode passar da meia-noite.
  openingHours: {
    sun: ['18:00', '00:00'] as [string, string],
    mon: null,
    tue: ['18:00', '23:40'] as [string, string],
    wed: ['18:00', '23:40'] as [string, string],
    thu: ['18:00', '23:40'] as [string, string],
    fri: ['18:00', '00:00'] as [string, string],
    sat: ['18:00', '00:00'] as [string, string],
  },
} as const;

export type OpeningHours = typeof storeConfig.openingHours;
```

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add config/store.ts
git commit -m "feat(config): storeConfig com horários, whatsapp e tempo médio"
```

---

## Task 4: `data/coupons.ts`

**Files:**
- Create: `data/coupons.ts`

- [ ] **Step 1: Criar cupons de exemplo**

```ts
import type { Coupon } from '@/lib/types';

export const coupons: Coupon[] = [
  { code: 'BEMVINDO10', type: 'percent', value: 10 },
  { code: 'FRETE5', type: 'fixed', value: 5, minSubtotal: 40 },
];
```

- [ ] **Step 2: Verificar typecheck**

```bash
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add data/coupons.ts
git commit -m "feat(data): cupons de exemplo (BEMVINDO10, FRETE5)"
```

---

## Task 5: `lib/cart.ts` — cálculos do carrinho

**Files:**
- Create: `lib/cart.ts`, `lib/cart.test.ts`

- [ ] **Step 1: Escrever os testes**

`lib/cart.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calcSubtotal, calcDiscount, findCoupon, groupByCategory } from './cart';
import type { CartItem, Coupon, Product } from './types';
import type { Category } from './types';

const product = (id: string, categoryId: string, price: number): Product => ({
  id, categoryId, name: id, description: '', price,
  priceFrom: false, imageUrl: null, featured: false, available: true,
});

const item = (p: Product, qty: number): CartItem => ({
  id: `cart-${p.id}`, product: p, quantity: qty, notes: '',
});

describe('calcSubtotal', () => {
  it('soma preço × quantidade de todos os itens', () => {
    const items = [
      item(product('a', 'burgers', 10), 2),  // 20
      item(product('b', 'burgers', 7.5), 3), // 22.5
    ];
    expect(calcSubtotal(items)).toBe(42.5);
  });

  it('retorna 0 para carrinho vazio', () => {
    expect(calcSubtotal([])).toBe(0);
  });
});

describe('calcDiscount', () => {
  it('aplica desconto percentual', () => {
    const c: Coupon = { code: 'X', type: 'percent', value: 10 };
    expect(calcDiscount(100, c)).toBe(10);
  });

  it('aplica desconto fixo', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 7 };
    expect(calcDiscount(100, c)).toBe(7);
  });

  it('retorna 0 se subtotal < minSubtotal', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 5, minSubtotal: 40 };
    expect(calcDiscount(30, c)).toBe(0);
  });

  it('aplica desconto se subtotal == minSubtotal', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 5, minSubtotal: 40 };
    expect(calcDiscount(40, c)).toBe(5);
  });

  it('retorna 0 quando cupom é null', () => {
    expect(calcDiscount(100, null)).toBe(0);
  });

  it('não passa do subtotal (desconto fixo maior)', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 200 };
    expect(calcDiscount(50, c)).toBe(50);
  });
});

describe('findCoupon', () => {
  const list: Coupon[] = [
    { code: 'BEMVINDO10', type: 'percent', value: 10 },
    { code: 'FRETE5', type: 'fixed', value: 5 },
  ];

  it('encontra cupom por código (case-insensitive)', () => {
    expect(findCoupon('bemvindo10', list)?.code).toBe('BEMVINDO10');
    expect(findCoupon('FRETE5', list)?.code).toBe('FRETE5');
  });

  it('retorna null pra código inexistente', () => {
    expect(findCoupon('XYZ', list)).toBeNull();
  });
});

describe('groupByCategory', () => {
  const cats: Category[] = [
    { id: 'burgers', name: 'Burgers', order: 1, layout: 'grid' },
    { id: 'porcoes', name: 'Porções', order: 4, layout: 'grid' },
    { id: 'bebidas', name: 'Bebidas', order: 7, layout: 'list' },
  ];

  it('agrupa itens por categoria na ordem das categorias', () => {
    const items = [
      item(product('coca', 'bebidas', 8), 1),
      item(product('duplo', 'burgers', 40), 1),
      item(product('fritas', 'porcoes', 20), 1),
    ];
    const groups = groupByCategory(items, cats);
    expect(groups.map((g) => g.category.id)).toEqual(['burgers', 'porcoes', 'bebidas']);
    expect(groups[0].items.map((i) => i.product.id)).toEqual(['duplo']);
  });

  it('omite categorias sem itens', () => {
    const items = [item(product('duplo', 'burgers', 40), 1)];
    expect(groupByCategory(items, cats).map((g) => g.category.id)).toEqual(['burgers']);
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run lib/cart.test.ts
```
Esperado: FAIL — `cart.ts` ainda não existe.

- [ ] **Step 3: Implementar**

`lib/cart.ts`:

```ts
import type { Category, CartItem, Coupon } from './types';

export function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
}

export function calcDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon) return 0;
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) return 0;
  const raw = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value;
  return Math.min(raw, subtotal);
}

export function findCoupon(code: string, list: Coupon[]): Coupon | null {
  const upper = code.trim().toUpperCase();
  return list.find((c) => c.code.toUpperCase() === upper) ?? null;
}

export interface CategoryGroup {
  category: Category;
  items: CartItem[];
}

export function groupByCategory(items: CartItem[], categories: Category[]): CategoryGroup[] {
  return categories
    .map((category) => ({
      category,
      items: items.filter((i) => i.product.categoryId === category.id),
    }))
    .filter((g) => g.items.length > 0);
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run lib/cart.test.ts
```
Esperado: PASS (todos os testes verdes).

- [ ] **Step 5: Commit**

```bash
git add lib/cart.ts lib/cart.test.ts
git commit -m "feat(lib): cálculo do carrinho (subtotal, desconto, cupom, grupos)"
```

---

## Task 6: `lib/store-status.ts` — loja aberta

**Files:**
- Create: `lib/store-status.ts`, `lib/store-status.test.ts`

- [ ] **Step 1: Escrever os testes**

`lib/store-status.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isOpen } from './store-status';
import type { OpeningHours } from '@/config/store';

const hours: OpeningHours = {
  sun: ['18:00', '00:00'],
  mon: null,
  tue: ['18:00', '23:40'],
  wed: ['18:00', '23:40'],
  thu: ['18:00', '23:40'],
  fri: ['18:00', '00:00'],
  sat: ['18:00', '00:00'],
};

// helper: cria Date local. Mês é 0-indexed (4 = maio).
const at = (yyyy: number, m1to12: number, d: number, hh: number, mm: number) =>
  new Date(yyyy, m1to12 - 1, d, hh, mm);

describe('isOpen', () => {
  it('terça às 19:00 → aberto', () => {
    expect(isOpen(at(2026, 5, 19, 19, 0), hours)).toBe(true); // ter
  });

  it('terça às 17:59 → fechado', () => {
    expect(isOpen(at(2026, 5, 19, 17, 59), hours)).toBe(false);
  });

  it('terça às 23:41 → fechado', () => {
    expect(isOpen(at(2026, 5, 19, 23, 41), hours)).toBe(false);
  });

  it('segunda → fechado o dia todo', () => {
    expect(isOpen(at(2026, 5, 18, 19, 0), hours)).toBe(false);
  });

  it('sexta às 23:30 → aberto (fecha à meia-noite)', () => {
    expect(isOpen(at(2026, 5, 22, 23, 30), hours)).toBe(true);
  });

  it('sábado às 00:00 → ainda parte do sábado (limite superior exclusivo)', () => {
    // "00:00" representa a meia-noite seguinte como fim do intervalo.
    expect(isOpen(at(2026, 5, 23, 0, 0), hours)).toBe(false);
  });

  it('sexta às 23:59 → aberto', () => {
    expect(isOpen(at(2026, 5, 22, 23, 59), hours)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run lib/store-status.test.ts
```
Esperado: FAIL — `store-status.ts` ainda não existe.

- [ ] **Step 3: Implementar**

`lib/store-status.ts`:

```ts
import type { OpeningHours } from '@/config/store';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Retorna true se a loja está aberta naquele momento.
 *
 * Convenção de "00:00" como fim do intervalo:
 *   - `['18:00', '00:00']` significa "abre 18h, fecha à meia-noite (inclusive)".
 *   - A meia-noite em si pertence ao dia seguinte; ou seja, 00:00 do sábado já é "fechado"
 *     pela janela de sexta. A função considera o intervalo [abre, fecha) no mesmo dia,
 *     tratando "00:00" como 24:00 do dia da janela.
 */
export function isOpen(now: Date, hours: OpeningHours): boolean {
  const dayKey = DAYS[now.getDay()];
  const window = hours[dayKey];
  if (!window) return false;
  const [open, close] = window;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const openMin = toMinutes(open);
  const closeMin = close === '00:00' ? 24 * 60 : toMinutes(close);
  return minutes >= openMin && minutes < closeMin;
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run lib/store-status.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/store-status.ts lib/store-status.test.ts
git commit -m "feat(lib): isOpen com janelas de horário e meia-noite"
```

---

## Task 7: `lib/delivery-time.ts` — tempo estimado

**Files:**
- Create: `lib/delivery-time.ts`, `lib/delivery-time.test.ts`

- [ ] **Step 1: Escrever os testes**

`lib/delivery-time.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { estimateDeliveryMinutes, estimateTotalMinutes } from './delivery-time';

describe('estimateDeliveryMinutes', () => {
  it.each([
    [4.99, 10],
    [5.99, 15],
    [6.99, 20],
    [7.99, 25],
    [8.99, 30],
    [9.99, 35],
    [10.99, 40],
  ])('taxa R$ %s → %s min', (fee, expected) => {
    expect(estimateDeliveryMinutes(fee)).toBe(expected);
  });

  it('taxa fora da tabela → arredonda pra faixa mais próxima', () => {
    // 5.50 mais próximo de 5.99 → 15
    expect(estimateDeliveryMinutes(5.5)).toBe(15);
  });
});

describe('estimateTotalMinutes', () => {
  it('retirada: apenas tempo de preparo', () => {
    expect(estimateTotalMinutes('pickup', 25)).toBe(25);
  });

  it('entrega: preparo + faixa de entrega', () => {
    expect(estimateTotalMinutes('delivery', 25, 4.99)).toBe(35); // 25 + 10
    expect(estimateTotalMinutes('delivery', 25, 10.99)).toBe(65); // 25 + 40
  });

  it('entrega sem taxa informada: só preparo (defensivo)', () => {
    expect(estimateTotalMinutes('delivery', 25)).toBe(25);
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run lib/delivery-time.test.ts
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`lib/delivery-time.ts`:

```ts
import type { DeliveryMethod } from './types';

// Mapeamento por faixa de taxa de entrega → minutos médios.
const FEE_TO_MINUTES: Array<{ fee: number; minutes: number }> = [
  { fee: 4.99, minutes: 10 },
  { fee: 5.99, minutes: 15 },
  { fee: 6.99, minutes: 20 },
  { fee: 7.99, minutes: 25 },
  { fee: 8.99, minutes: 30 },
  { fee: 9.99, minutes: 35 },
  { fee: 10.99, minutes: 40 },
];

/** Faixa de tempo de entrega em minutos, ancorada na taxa mais próxima. */
export function estimateDeliveryMinutes(fee: number): number {
  let best = FEE_TO_MINUTES[0];
  let bestDelta = Math.abs(fee - best.fee);
  for (const row of FEE_TO_MINUTES) {
    const delta = Math.abs(fee - row.fee);
    if (delta < bestDelta) {
      best = row;
      bestDelta = delta;
    }
  }
  return best.minutes;
}

/** Tempo total estimado: preparo + entrega (se delivery), ou só preparo (se pickup). */
export function estimateTotalMinutes(
  method: DeliveryMethod,
  prepTime: number,
  fee?: number,
): number {
  if (method === 'pickup') return prepTime;
  if (fee === undefined) return prepTime;
  return prepTime + estimateDeliveryMinutes(fee);
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run lib/delivery-time.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/delivery-time.ts lib/delivery-time.test.ts
git commit -m "feat(lib): tempo estimado por faixa de taxa de entrega"
```

---

## Task 8: `lib/order-id.ts` — geração do `#XXXX`

**Files:**
- Create: `lib/order-id.ts`, `lib/order-id.test.ts`

- [ ] **Step 1: Escrever os testes**

`lib/order-id.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateOrderId } from './order-id';

afterEach(() => {
  vi.useRealTimers();
});

describe('generateOrderId', () => {
  it('retorna formato #XXXX (4 dígitos com padding)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 19, 0, 0, 42)); // millis terminam em 0042
    // Date.now() neste instante termina em ...0042 → últimos 4 dígitos "0042"
    expect(generateOrderId()).toMatch(/^#\d{4}$/);
  });

  it('valor extraído dos últimos 4 dígitos do timestamp', () => {
    vi.useFakeTimers();
    // construímos um timestamp cujos últimos 4 dígitos são 3417
    const ts = 1234567890000 + 3417;
    vi.setSystemTime(new Date(ts));
    expect(generateOrderId()).toBe('#3417');
  });

  it('aplica padding quando os últimos 4 dígitos têm menos que 4 chars', () => {
    vi.useFakeTimers();
    const ts = 1234567890000 + 42; // termina em ...0042
    vi.setSystemTime(new Date(ts));
    expect(generateOrderId()).toBe('#0042');
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run lib/order-id.test.ts
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`lib/order-id.ts`:

```ts
/**
 * Gera um identificador "#XXXX" (4 dígitos) a partir dos últimos 4 dígitos do timestamp atual.
 *
 * Sem backend, não temos numeração sequencial global. Para uma loja de bairro com volume
 * baixo, a chance de duas pessoas gerarem o mesmo ID no mesmo segundo é desprezível.
 * Substituído por sequencial real quando o sub-projeto 3 trouxer o backend.
 */
export function generateOrderId(): string {
  const last4 = Date.now().toString().slice(-4).padStart(4, '0');
  return `#${last4}`;
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run lib/order-id.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/order-id.ts lib/order-id.test.ts
git commit -m "feat(lib): generateOrderId com formato #XXXX a partir do timestamp"
```

---

## Task 9: `lib/order-message.ts` — mensagem do WhatsApp

**Files:**
- Create: `lib/order-message.ts`, `lib/order-message.test.ts`

- [ ] **Step 1: Escrever os testes**

`lib/order-message.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildWhatsAppMessage } from './order-message';
import type { OrderForMessage } from './order-message';
import type { Product, Category } from './types';

const product = (id: string, categoryId: string, name: string, price: number): Product => ({
  id, categoryId, name, description: '', price,
  priceFrom: false, imageUrl: null, featured: false, available: true,
});

const cats: Category[] = [
  { id: 'burgers', name: 'Burgers', order: 1, layout: 'grid' },
  { id: 'porcoes', name: 'Porções', order: 4, layout: 'grid' },
];

const baseOrder = (): OrderForMessage => ({
  orderId: '#3417',
  customer: { name: 'Bruno Almeida', phone: '(21) 99999-9999' },
  items: [
    {
      id: '1',
      product: product('chicken', 'burgers', 'Chicken', 25.9),
      quantity: 1,
      notes: '',
    },
    {
      id: '2',
      product: product('crispy-catupiry', 'burgers', 'Crispy Catupiry', 39.9),
      quantity: 2,
      notes: 'sem cebola',
    },
    {
      id: '3',
      product: product('fritas-grande', 'porcoes', 'Fritas Grande', 29.9),
      quantity: 1,
      notes: '',
    },
  ],
  categories: cats,
  coupon: null,
  subtotal: 135.6,
  discount: 0,
  deliveryFee: 4.99,
  total: 140.59,
  estimatedMinutes: { min: 30, max: 40 },
  method: 'delivery',
  address: {
    cep: '20000-000', street: 'Rua Tenente Abel Cunha', number: '10',
    neighborhood: 'Higienópolis', complement: 'apto 304', reference: 'prédio cinza',
  },
  payment: 'credit',
  storeBusinessName: 'Bragas Lanches',
  storeAddress: 'Higienópolis, Zona Norte — Rio de Janeiro',
});

describe('buildWhatsAppMessage', () => {
  it('cabeçalho com nome da loja e número do pedido', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toMatch(/\*NOVO PEDIDO — Bragas Lanches\*\s+#3417/);
  });

  it('cliente com nome e telefone', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('👤 *Cliente*');
    expect(msg).toContain('Bruno Almeida — (21) 99999-9999');
  });

  it('itens agrupados por categoria em maiúsculas', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('BURGERS');
    expect(msg).toContain('PORÇÕES');
    // burgers vem antes de porções na ordem do menu
    expect(msg.indexOf('BURGERS')).toBeLessThan(msg.indexOf('PORÇÕES'));
  });

  it('linha de item com qtd, nome e subtotal', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('• 1x Chicken — R$ 25,90');
    expect(msg).toContain('• 2x Crispy Catupiry — R$ 79,80');
    expect(msg).toContain('• 1x Fritas Grande — R$ 29,90');
  });

  it('observação aparece em linha separada quando há', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('   ↳ Obs: sem cebola');
  });

  it('resumo com subtotal, taxa e total na modalidade Entrega', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('Subtotal: R$ 135,60');
    expect(msg).toContain('Taxa de entrega: R$ 4,99');
    expect(msg).toContain('*Total: R$ 140,59*');
  });

  it('sem linha de taxa quando é Retirada', () => {
    const o = baseOrder();
    o.method = 'pickup';
    o.deliveryFee = 0;
    o.total = 135.6;
    const msg = buildWhatsAppMessage(o);
    expect(msg).not.toContain('Taxa de entrega:');
  });

  it('linha de desconto só quando há cupom', () => {
    const o = baseOrder();
    o.coupon = { code: 'BEMVINDO10', type: 'percent', value: 10 };
    o.discount = 13.56;
    o.total = 127.03;
    const msg = buildWhatsAppMessage(o);
    expect(msg).toContain('Desconto: -R$ 13,56');
  });

  it('tempo estimado', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('🕗 Tempo estimado: 30–40 min');
  });

  it('bloco de entrega com endereço completo', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('🛵 *Entrega*');
    expect(msg).toContain('Rua Tenente Abel Cunha, 10 — Higienópolis, Rio de Janeiro');
    expect(msg).toContain('Complemento: apto 304');
    expect(msg).toContain('Referência: prédio cinza');
  });

  it('omite complemento e referência se vazios', () => {
    const o = baseOrder();
    o.address = { ...o.address!, complement: undefined, reference: undefined };
    const msg = buildWhatsAppMessage(o);
    expect(msg).not.toContain('Complemento:');
    expect(msg).not.toContain('Referência:');
  });

  it('modalidade Retirada substitui o bloco de Entrega', () => {
    const o = baseOrder();
    o.method = 'pickup';
    o.address = undefined;
    const msg = buildWhatsAppMessage(o);
    expect(msg).toContain('🏪 *Retirada no local*');
    expect(msg).toContain('Higienópolis, Zona Norte — Rio de Janeiro');
    expect(msg).not.toContain('🛵');
  });

  it('cabeçalho de pagamento "na entrega" pra delivery', () => {
    const msg = buildWhatsAppMessage(baseOrder());
    expect(msg).toContain('💳 *Pagamento na entrega*');
  });

  it('cabeçalho de pagamento "no balcão" pra retirada', () => {
    const o = baseOrder();
    o.method = 'pickup';
    o.address = undefined;
    const msg = buildWhatsAppMessage(o);
    expect(msg).toContain('💳 *Pagamento no balcão*');
  });

  it('rotula forma de pagamento por extenso', () => {
    const cases: Array<[OrderForMessage['payment'], string]> = [
      ['pix', 'Pix'],
      ['cash', 'Dinheiro'],
      ['credit', 'Cartão de crédito'],
      ['debit', 'Cartão de débito'],
    ];
    for (const [code, label] of cases) {
      const o = baseOrder();
      o.payment = code;
      expect(buildWhatsAppMessage(o)).toContain(label);
    }
  });

  it('troco aparece só em Dinheiro com changeFor', () => {
    const o = baseOrder();
    o.payment = 'cash';
    o.changeFor = 200;
    expect(buildWhatsAppMessage(o)).toContain('Troco para R$ 200,00');
  });

  it('sem troco em Dinheiro sem changeFor', () => {
    const o = baseOrder();
    o.payment = 'cash';
    o.changeFor = undefined;
    expect(buildWhatsAppMessage(o)).not.toContain('Troco');
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run lib/order-message.test.ts
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`lib/order-message.ts`:

```ts
import { formatPrice } from './format';
import { groupByCategory } from './cart';
import type {
  Address, Category, CartItem, Coupon, Customer, DeliveryMethod, PaymentMethod,
} from './types';

export interface OrderForMessage {
  orderId: string;
  customer: Customer;
  items: CartItem[];
  categories: Category[];
  coupon: Coupon | null;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  estimatedMinutes: { min: number; max: number };
  method: DeliveryMethod;
  address?: Address;
  payment: PaymentMethod;
  changeFor?: number;
  storeBusinessName: string;
  storeAddress: string;
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  credit: 'Cartão de crédito',
  debit: 'Cartão de débito',
};

function itemsBlock(order: OrderForMessage): string {
  const groups = groupByCategory(order.items, order.categories);
  return groups
    .map((g) => {
      const lines = [g.category.name.toUpperCase()];
      for (const item of g.items) {
        const sub = item.product.price * item.quantity;
        lines.push(`• ${item.quantity}x ${item.product.name} — ${formatPrice(sub)}`);
        if (item.notes.trim().length > 0) {
          lines.push(`   ↳ Obs: ${item.notes.trim()}`);
        }
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

function summaryBlock(order: OrderForMessage): string {
  const lines = [`Subtotal: ${formatPrice(order.subtotal)}`];
  if (order.method === 'delivery') {
    lines.push(`Taxa de entrega: ${formatPrice(order.deliveryFee)}`);
  }
  if (order.discount > 0) {
    lines.push(`Desconto: -${formatPrice(order.discount)}`);
  }
  lines.push(`*Total: ${formatPrice(order.total)}*`);
  return lines.join('\n');
}

function deliveryOrPickupBlock(order: OrderForMessage): string {
  if (order.method === 'pickup') {
    return `🏪 *Retirada no local*\n${order.storeAddress}`;
  }
  const a = order.address!;
  const lines = [
    '🛵 *Entrega*',
    `${a.street}, ${a.number} — ${a.neighborhood}, Rio de Janeiro`,
  ];
  if (a.complement?.trim()) lines.push(`Complemento: ${a.complement}`);
  if (a.reference?.trim()) lines.push(`Referência: ${a.reference}`);
  return lines.join('\n');
}

function paymentBlock(order: OrderForMessage): string {
  const header = order.method === 'pickup'
    ? '💳 *Pagamento no balcão*'
    : '💳 *Pagamento na entrega*';
  const lines = [header, PAYMENT_LABEL[order.payment]];
  if (order.payment === 'cash' && order.changeFor !== undefined) {
    lines.push(`Troco para ${formatPrice(order.changeFor)}`);
  }
  return lines.join('\n');
}

export function buildWhatsAppMessage(order: OrderForMessage): string {
  const { min, max } = order.estimatedMinutes;
  return [
    `*NOVO PEDIDO — ${order.storeBusinessName}*  ${order.orderId}`,
    '',
    '👤 *Cliente*',
    `${order.customer.name} — ${order.customer.phone}`,
    '',
    '🍔 *Itens*',
    '',
    itemsBlock(order),
    '',
    '💰 *Resumo*',
    summaryBlock(order),
    '',
    `🕗 Tempo estimado: ${min}–${max} min`,
    '',
    deliveryOrPickupBlock(order),
    '',
    paymentBlock(order),
  ].join('\n');
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run lib/order-message.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/order-message.ts lib/order-message.test.ts
git commit -m "feat(lib): buildWhatsAppMessage com agrupamento e Pagamento na entrega/balcão"
```

---

## Task 10: `lib/order-cancel-message.ts`

**Files:**
- Create: `lib/order-cancel-message.ts`, `lib/order-cancel-message.test.ts`

- [ ] **Step 1: Escrever os testes**

`lib/order-cancel-message.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCancelMessage } from './order-cancel-message';

describe('buildCancelMessage', () => {
  it('monta a mensagem com o número do pedido', () => {
    expect(buildCancelMessage('#3417')).toBe('Olá, gostaria de cancelar o pedido #3417.');
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run lib/order-cancel-message.test.ts
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`lib/order-cancel-message.ts`:

```ts
export function buildCancelMessage(orderId: string): string {
  return `Olá, gostaria de cancelar o pedido ${orderId}.`;
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run lib/order-cancel-message.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/order-cancel-message.ts lib/order-cancel-message.test.ts
git commit -m "feat(lib): buildCancelMessage para cancelamento via WhatsApp"
```

---

## Task 11: `lib/cart-store.ts` — store zustand

**Files:**
- Create: `lib/cart-store.ts`, `lib/cart-store.test.ts`

- [ ] **Step 1: Escrever os testes**

`lib/cart-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart-store';
import type { Product } from './types';

const product = (id: string, price: number): Product => ({
  id, categoryId: 'burgers', name: id, description: '', price,
  priceFrom: false, imageUrl: null, featured: false, available: true,
});

beforeEach(() => {
  useCartStore.getState().clear();
});

describe('cart store', () => {
  it('começa vazio', () => {
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().coupon).toBeNull();
  });

  it('addItem cria entrada nova quando o produto não está no carrinho', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe('chicken');
    expect(items[0].quantity).toBe(1);
  });

  it('addItem incrementa quantidade quando o produto já está no carrinho', () => {
    const p = product('chicken', 25.9);
    useCartStore.getState().addItem(p);
    useCartStore.getState().addItem(p);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it('removeItem remove pelo id do item', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().removeItem(id);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('setQuantity ajusta a quantidade do item', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().setQuantity(id, 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('setQuantity ≤ 0 remove o item', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().setQuantity(id, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('setNotes atualiza a observação', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().setNotes(id, 'sem cebola');
    expect(useCartStore.getState().items[0].notes).toBe('sem cebola');
  });

  it('clear esvazia o carrinho e remove o cupom', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    useCartStore.getState().applyCoupon({ code: 'X', type: 'percent', value: 10 });
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().coupon).toBeNull();
  });

  it('applyCoupon e removeCoupon', () => {
    useCartStore.getState().applyCoupon({ code: 'X', type: 'percent', value: 10 });
    expect(useCartStore.getState().coupon?.code).toBe('X');
    useCartStore.getState().removeCoupon();
    expect(useCartStore.getState().coupon).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run lib/cart-store.test.ts
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`lib/cart-store.ts`:

```ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Coupon, Product } from './types';

interface CartState {
  items: CartItem[];
  coupon: Coupon | null;
  addItem: (product: Product) => void;
  removeItem: (cartItemId: string) => void;
  setQuantity: (cartItemId: string, quantity: number) => void;
  setNotes: (cartItemId: string, notes: string) => void;
  clear: () => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      coupon: null,

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          const newItem: CartItem = {
            id: `${product.id}-${Date.now()}`,
            product,
            quantity: 1,
            notes: '',
          };
          return { items: [...state.items, newItem] };
        }),

      removeItem: (cartItemId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== cartItemId) })),

      setQuantity: (cartItemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== cartItemId) };
          }
          return {
            items: state.items.map((i) =>
              i.id === cartItemId ? { ...i, quantity } : i,
            ),
          };
        }),

      setNotes: (cartItemId, notes) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === cartItemId ? { ...i, notes } : i)),
        })),

      clear: () => set({ items: [], coupon: null }),

      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),
    }),
    { name: 'bragas-cart' },
  ),
);
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run lib/cart-store.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Rodar suíte completa**

```bash
npm test
```
Esperado: todos os testes (incluindo os anteriores) passam.

- [ ] **Step 6: Commit**

```bash
git add lib/cart-store.ts lib/cart-store.test.ts
git commit -m "feat(store): cart-store em zustand com persistência em localStorage"
```

---

## Task 12: `AddToCartButton` + integração no `ProductCard`

**Files:**
- Create: `components/cart/AddToCartButton.tsx`, `components/cart/AddToCartButton.test.tsx`
- Modify: `components/sections/ProductCard.tsx`

- [ ] **Step 1: Escrever o teste**

`components/cart/AddToCartButton.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToCartButton } from './AddToCartButton';
import { useCartStore } from '@/lib/cart-store';
import type { Product } from '@/lib/types';

const product: Product = {
  id: 'chicken', categoryId: 'burgers', name: 'Chicken',
  description: '', price: 25.9, priceFrom: false,
  imageUrl: null, featured: false, available: true,
};

beforeEach(() => useCartStore.getState().clear());

describe('AddToCartButton', () => {
  it('adiciona o produto ao carrinho ao clicar', async () => {
    render(<AddToCartButton product={product} />);
    await userEvent.click(screen.getByRole('button', { name: /adicionar/i }));
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe('chicken');
  });

  it('desabilita quando o produto está indisponível', () => {
    render(<AddToCartButton product={{ ...product, available: false }} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/cart/AddToCartButton.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar o botão**

`components/cart/AddToCartButton.tsx`:

```tsx
'use client';

import { useCartStore } from '@/lib/cart-store';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
}

export function AddToCartButton({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <button
      type="button"
      aria-label={`Adicionar ${product.name} ao carrinho`}
      disabled={!product.available}
      onClick={() => addItem(product)}
      className="cursor-pointer rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      Adicionar
    </button>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run components/cart/AddToCartButton.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Integrar no `ProductCard`**

Abrir `components/sections/ProductCard.tsx`. Localizar o local onde o preço é renderizado (no rodapé do card) e adicionar o `<AddToCartButton>` ao lado do preço. Importar no topo:

```tsx
import { AddToCartButton } from '@/components/cart/AddToCartButton';
```

No JSX, dentro do bloco que mostra preço, envolver preço + botão num flex row:

```tsx
<div className="mt-3 flex items-center justify-between gap-3">
  <span className="font-heading text-lg font-bold text-paper">
    {formatProductPrice(product)}
  </span>
  <AddToCartButton product={product} />
</div>
```

(Ajustar pra estrutura exata do arquivo — substituir o `<span>` do preço existente por esse bloco; manter classes do redesign.)

- [ ] **Step 6: Rodar testes do ProductCard pra checar regressão**

```bash
npx vitest run components/sections/ProductCard.test.tsx
```
Esperado: PASS. Se algum teste falhar por mudança de DOM, atualize o seletor pra usar o novo container; o conteúdo principal (nome, descrição, preço) continua presente.

- [ ] **Step 7: Suíte + lint**

```bash
npm test
npm run lint
```
Esperado: ambos verdes.

- [ ] **Step 8: Commit**

```bash
git add components/cart/AddToCartButton.tsx components/cart/AddToCartButton.test.tsx components/sections/ProductCard.tsx
git commit -m "feat(cart): AddToCartButton e integração no ProductCard"
```

---

## Task 13: `CartButton` flutuante + integração no `app/layout.tsx`

**Files:**
- Create: `components/cart/CartButton.tsx`, `components/cart/CartButton.test.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Escrever o teste**

`components/cart/CartButton.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartButton } from './CartButton';
import { useCartStore } from '@/lib/cart-store';
import type { Product } from '@/lib/types';

const product = (id: string): Product => ({
  id, categoryId: 'burgers', name: id, description: '', price: 10,
  priceFrom: false, imageUrl: null, featured: false, available: true,
});

beforeEach(() => useCartStore.getState().clear());

describe('CartButton', () => {
  it('não aparece quando o carrinho está vazio', () => {
    render(<CartButton onOpen={() => {}} />);
    expect(screen.queryByRole('button', { name: /carrinho/i })).not.toBeInTheDocument();
  });

  it('mostra o total de itens (somando quantidades)', () => {
    useCartStore.getState().addItem(product('a'));
    useCartStore.getState().addItem(product('a')); // qty=2
    useCartStore.getState().addItem(product('b')); // outro produto
    render(<CartButton onOpen={() => {}} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('chama onOpen quando clicado', async () => {
    useCartStore.getState().addItem(product('a'));
    let opened = false;
    render(<CartButton onOpen={() => { opened = true; }} />);
    await userEvent.click(screen.getByRole('button', { name: /carrinho/i }));
    expect(opened).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/cart/CartButton.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`components/cart/CartButton.tsx`:

```tsx
'use client';

import { useCartStore } from '@/lib/cart-store';

interface Props {
  onOpen: () => void;
}

export function CartButton({ onOpen }: Props) {
  const totalItems = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0),
  );

  if (totalItems === 0) return null;

  return (
    <button
      type="button"
      aria-label={`Abrir carrinho com ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-3 rounded-full bg-paper px-5 text-ink shadow-lg transition-colors hover:bg-white"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round"
           strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span className="font-semibold">Carrinho</span>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-2 text-xs font-bold text-paper">
        {totalItems}
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run components/cart/CartButton.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Criar wrapper cliente pra controlar abertura do drawer**

`components/cart/CartLauncher.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { CartButton } from './CartButton';
import { CartDrawer } from './CartDrawer';

export function CartLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CartButton onOpen={() => setOpen(true)} />
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

(O `CartDrawer` será implementado na Task 14 — neste momento o arquivo ainda não existe, o lint pode reclamar. Pula a integração no layout até a Task 14 estar pronta.)

- [ ] **Step 6: Commit parcial (CartButton só)**

```bash
git add components/cart/CartButton.tsx components/cart/CartButton.test.tsx components/cart/CartLauncher.tsx
git commit -m "feat(cart): CartButton flutuante com contador + CartLauncher"
```

A integração no `app/layout.tsx` acontece após o `CartDrawer` (Task 14).

---

## Task 14: `CartDrawer`

**Files:**
- Create: `components/cart/CartDrawer.tsx`, `components/cart/CartDrawer.test.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Escrever o teste**

`components/cart/CartDrawer.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartDrawer } from './CartDrawer';
import { useCartStore } from '@/lib/cart-store';
import type { Product } from '@/lib/types';

const product = (id: string, price: number): Product => ({
  id, categoryId: 'burgers', name: id, description: '', price,
  priceFrom: false, imageUrl: null, featured: false, available: true,
});

beforeEach(() => useCartStore.getState().clear());

describe('CartDrawer', () => {
  it('lista os itens do carrinho', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    expect(screen.getByText('chicken')).toBeInTheDocument();
    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument();
  });

  it('mostra mensagem amigável quando vazio', () => {
    render(<CartDrawer open={true} onClose={() => {}} />);
    expect(screen.getByText(/carrinho vazio/i)).toBeInTheDocument();
  });

  it('botão de incremento aumenta a quantidade', async () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /aumentar/i }));
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('aplicar cupom adiciona ao estado', async () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText(/cupom/i), 'BEMVINDO10');
    await userEvent.click(screen.getByRole('button', { name: /aplicar cupom/i }));
    expect(useCartStore.getState().coupon?.code).toBe('BEMVINDO10');
  });

  it('cupom inválido mostra mensagem de erro', async () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText(/cupom/i), 'XYZ');
    await userEvent.click(screen.getByRole('button', { name: /aplicar cupom/i }));
    expect(screen.getByText(/cupom inválido/i)).toBeInTheDocument();
  });

  it('botão Fechar pedido aparece quando há itens', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    expect(screen.getByRole('link', { name: /fechar pedido/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/cart/CartDrawer.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`components/cart/CartDrawer.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import { calcDiscount, calcSubtotal, findCoupon } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { coupons } from '@/data/coupons';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: Props) {
  const items = useCartStore((s) => s.items);
  const coupon = useCartStore((s) => s.coupon);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const setNotes = useCartStore((s) => s.setNotes);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);

  const subtotal = useMemo(() => calcSubtotal(items), [items]);
  const discount = useMemo(() => calcDiscount(subtotal, coupon), [subtotal, coupon]);
  const total = subtotal - discount;

  const [codeInput, setCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = () => {
    setCouponError(null);
    const found = findCoupon(codeInput, coupons);
    if (!found) {
      setCouponError('Cupom inválido');
      return;
    }
    if (found.minSubtotal && subtotal < found.minSubtotal) {
      setCouponError(`Cupom requer subtotal de pelo menos ${formatPrice(found.minSubtotal)}`);
      return;
    }
    applyCoupon(found);
    setCodeInput('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label="Carrinho"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ink p-6 text-paper shadow-2xl sm:max-w-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-extrabold">Carrinho</h2>
          <button
            type="button"
            aria-label="Fechar carrinho"
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 hover:bg-surface-hover"
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-12 text-center text-muted">Seu carrinho está vazio.</p>
        ) : (
          <>
            <ul className="mt-6 flex-1 space-y-4 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="rounded border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.product.name}</p>
                      <p className="text-sm text-muted">{formatPrice(item.product.price)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover ${item.product.name}`}
                      onClick={() => removeItem(item.id)}
                      className="cursor-pointer text-muted hover:text-paper"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${item.product.name}`}
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      className="cursor-pointer rounded-full border border-line px-2 py-0.5 text-sm hover:border-paper"
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Aumentar quantidade de ${item.product.name}`}
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                      className="cursor-pointer rounded-full border border-line px-2 py-0.5 text-sm hover:border-paper"
                    >
                      +
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Observação (opcional)"
                    aria-label={`Observação para ${item.product.name}`}
                    value={item.notes}
                    onChange={(e) => setNotes(item.id, e.target.value)}
                    className="mt-2 w-full rounded border border-line bg-ink px-2 py-1 text-sm text-paper placeholder:text-faint focus:border-paper focus:outline-none"
                  />
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-line pt-4">
              <label className="block text-sm" htmlFor="coupon-input">
                Cupom
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="coupon-input"
                  type="text"
                  placeholder="Código"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="flex-1 rounded border border-line bg-ink px-2 py-1 text-sm text-paper placeholder:text-faint focus:border-paper focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="cursor-pointer rounded border border-line px-3 py-1 text-sm hover:border-paper"
                >
                  Aplicar cupom
                </button>
              </div>
              {couponError && <p className="mt-1 text-sm text-faint">{couponError}</p>}
              {coupon && (
                <p className="mt-2 flex items-center justify-between text-sm">
                  <span>Cupom: {coupon.code}</span>
                  <button
                    type="button"
                    onClick={() => removeCoupon()}
                    className="cursor-pointer text-muted hover:text-paper"
                  >
                    remover
                  </button>
                </p>
              )}

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>Desconto</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={onClose}
                className="mt-4 block w-full rounded bg-paper px-4 py-3 text-center font-semibold text-ink transition-colors hover:bg-white"
              >
                Fechar pedido
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run components/cart/CartDrawer.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Integrar `CartLauncher` no layout**

Modificar `app/layout.tsx`. Importar no topo:

```tsx
import { CartLauncher } from '@/components/cart/CartLauncher';
```

Adicionar `<CartLauncher />` dentro do `<body>`, **fora** do conteúdo principal mas ainda dentro de `<body>`:

```tsx
<body className={...}>
  {/* ... navbar, children, footer ... */}
  <CartLauncher />
</body>
```

- [ ] **Step 6: Suíte + lint + build**

```bash
npm test
npm run lint
npm run build
```
Esperado: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add components/cart/CartDrawer.tsx components/cart/CartDrawer.test.tsx app/layout.tsx
git commit -m "feat(cart): CartDrawer com itens, cupom e CTA + integração no layout"
```

---

## Task 15: `OrderToast` (UI compartilhada)

**Files:**
- Create: `components/ui/OrderToast.tsx`, `components/ui/OrderToast.test.tsx`

- [ ] **Step 1: Escrever o teste**

`components/ui/OrderToast.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderToast } from './OrderToast';

describe('OrderToast', () => {
  it('não renderiza quando message é null', () => {
    const { container } = render(<OrderToast message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza a mensagem quando fornecida', () => {
    render(<OrderToast message="Loja fechada" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Loja fechada');
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/ui/OrderToast.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`components/ui/OrderToast.tsx`:

```tsx
'use client';

interface Props {
  message: string | null;
}

export function OrderToast({ message }: Props) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded border border-line bg-surface px-4 py-3 text-sm text-paper shadow-lg"
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run components/ui/OrderToast.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/OrderToast.tsx components/ui/OrderToast.test.tsx
git commit -m "feat(ui): OrderToast pra avisos de validação"
```

---

## Task 16: `DeliveryEstimate`

**Files:**
- Create: `components/checkout/DeliveryEstimate.tsx`, `components/checkout/DeliveryEstimate.test.tsx`

- [ ] **Step 1: Escrever o teste**

`components/checkout/DeliveryEstimate.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeliveryEstimate } from './DeliveryEstimate';

describe('DeliveryEstimate', () => {
  it('mostra faixa correta pra entrega no Higienópolis (taxa 4,99)', () => {
    render(<DeliveryEstimate method="delivery" fee={4.99} />);
    // 25 + 10 = 35 → 30–40 min
    expect(screen.getByText(/30–40 min/)).toBeInTheDocument();
  });

  it('mostra disclaimer', () => {
    render(<DeliveryEstimate method="pickup" />);
    expect(screen.getByText(/loja confirma no chat/i)).toBeInTheDocument();
  });

  it('na retirada usa só preparo (25 min)', () => {
    render(<DeliveryEstimate method="pickup" />);
    // 25 → 20–30 min
    expect(screen.getByText(/20–30 min/)).toBeInTheDocument();
  });

  it('na entrega sem taxa informada cai pra só preparo', () => {
    render(<DeliveryEstimate method="delivery" />);
    expect(screen.getByText(/20–30 min/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/checkout/DeliveryEstimate.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`components/checkout/DeliveryEstimate.tsx`:

```tsx
import { estimateTotalMinutes } from '@/lib/delivery-time';
import { storeConfig } from '@/config/store';
import type { DeliveryMethod } from '@/lib/types';

interface Props {
  method: DeliveryMethod;
  fee?: number;
}

export function rangeFor(minutes: number): { min: number; max: number } {
  return { min: minutes - 5, max: minutes + 5 };
}

export function DeliveryEstimate({ method, fee }: Props) {
  const total = estimateTotalMinutes(method, storeConfig.averagePrepTime, fee);
  const { min, max } = rangeFor(total);
  return (
    <div className="rounded border border-line bg-surface p-3 text-sm">
      <p className="text-paper">
        🕗 Tempo estimado: <strong>{min}–{max} min</strong>
      </p>
      <p className="mt-1 text-xs text-faint">A loja confirma no chat.</p>
    </div>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run components/checkout/DeliveryEstimate.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/checkout/DeliveryEstimate.tsx components/checkout/DeliveryEstimate.test.tsx
git commit -m "feat(checkout): DeliveryEstimate com faixa de tempo e disclaimer"
```

---

## Task 17: Estrutura do checkout — `app/checkout/page.tsx` com máquina de estados

**Files:**
- Create: `app/checkout/page.tsx`

Esta task cria o esqueleto do checkout: estados, navegação entre etapas, e placeholders dos componentes de etapa que serão preenchidos nas Tasks 18-22. Os imports apontam pra arquivos que ainda não existem; é OK pelo TS porque a gente cria stubs vazios.

> **Antes de começar:** confira `node_modules/next/dist/docs/01-app/01-getting-started/04-layouts-and-pages.md` pra confirmar a convenção de página em App Router do Next 16 (este arquivo vira a rota `/checkout`).

- [ ] **Step 1: Criar stubs vazios das etapas (placeholder por enquanto)**

```bash
mkdir -p components/checkout
```

Criar os 5 arquivos abaixo com conteúdo vazio mínimo (substituídos nas Tasks 18-22):

`components/checkout/IdentificationStep.tsx`:
```tsx
'use client';
import type { Customer } from '@/lib/types';
interface Props { value: Customer; onChange: (c: Customer) => void; onNext: () => void; }
export function IdentificationStep(_: Props) { return <div>Identificação (em construção)</div>; }
```

`components/checkout/DeliveryStep.tsx`:
```tsx
'use client';
import type { Address, DeliveryMethod } from '@/lib/types';
interface Props {
  method: DeliveryMethod; address: Address | null;
  onMethodChange: (m: DeliveryMethod) => void;
  onAddressChange: (a: Address | null) => void;
  onNext: () => void; onBack: () => void;
}
export function DeliveryStep(_: Props) { return <div>Entrega (em construção)</div>; }
```

`components/checkout/PaymentStep.tsx`:
```tsx
'use client';
import type { PaymentMethod } from '@/lib/types';
interface Props {
  payment: PaymentMethod | null; changeFor: number | undefined;
  onPaymentChange: (p: PaymentMethod) => void;
  onChangeForChange: (v: number | undefined) => void;
  onNext: () => void; onBack: () => void;
}
export function PaymentStep(_: Props) { return <div>Pagamento (em construção)</div>; }
```

`components/checkout/ReviewStep.tsx`:
```tsx
'use client';
interface Props { onSubmit: () => void; onBack: () => void; }
export function ReviewStep(_: Props) { return <div>Revisão (em construção)</div>; }
```

`components/checkout/OrderStatusScreen.tsx`:
```tsx
'use client';
interface Props { orderId: string; estimatedMinutes: { min: number; max: number }; }
export function OrderStatusScreen(_: Props) { return <div>OrderStatusScreen (em construção)</div>; }
```

- [ ] **Step 2: Criar `app/checkout/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { IdentificationStep } from '@/components/checkout/IdentificationStep';
import { DeliveryStep } from '@/components/checkout/DeliveryStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { ReviewStep } from '@/components/checkout/ReviewStep';
import { OrderStatusScreen } from '@/components/checkout/OrderStatusScreen';
import { OrderToast } from '@/components/ui/OrderToast';
import type { Address, Customer, DeliveryMethod, PaymentMethod } from '@/lib/types';

type Step = 'identification' | 'delivery' | 'payment' | 'review' | 'sent';

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);

  const [step, setStep] = useState<Step>('identification');
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '' });
  const [method, setMethod] = useState<DeliveryMethod>('delivery');
  const [address, setAddress] = useState<Address | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [changeFor, setChangeFor] = useState<number | undefined>(undefined);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState<{ min: number; max: number }>({
    min: 20,
    max: 30,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carrinho vazio e checkout não enviado → volta pro home
  if (items.length === 0 && step !== 'sent') {
    router.replace('/');
    return null;
  }

  if (step === 'sent' && orderId) {
    return <OrderStatusScreen orderId={orderId} estimatedMinutes={estimatedMinutes} />;
  }

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
            onSubmit={() => {
              // Implementação completa virá na Task 21 (envio + validações + WhatsApp).
              // Por enquanto, só transição pra mostrar o esqueleto.
              setStep('sent');
            }}
            onBack={() => setStep('payment')}
          />
        )}
      </div>

      <OrderToast message={errorMessage} />
    </main>
  );
}
```

- [ ] **Step 3: Verificar build + lint**

```bash
npm run lint
npm run build
```
Esperado: ambos verdes. As etapas mostram "em construção" — esperado.

- [ ] **Step 4: Commit**

```bash
git add app/checkout/page.tsx components/checkout/IdentificationStep.tsx components/checkout/DeliveryStep.tsx components/checkout/PaymentStep.tsx components/checkout/ReviewStep.tsx components/checkout/OrderStatusScreen.tsx
git commit -m "feat(checkout): estrutura da página de checkout com máquina de estados"
```

---

## Task 18: `IdentificationStep`

**Files:**
- Modify: `components/checkout/IdentificationStep.tsx`
- Create: `components/checkout/IdentificationStep.test.tsx`

- [ ] **Step 1: Escrever o teste**

`components/checkout/IdentificationStep.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdentificationStep } from './IdentificationStep';

describe('IdentificationStep', () => {
  it('chama onChange ao digitar nome e telefone', async () => {
    const onChange = vi.fn();
    render(
      <IdentificationStep
        value={{ name: '', phone: '' }}
        onChange={onChange}
        onNext={() => {}}
      />,
    );
    await userEvent.type(screen.getByLabelText(/nome/i), 'Bruno');
    expect(onChange).toHaveBeenCalled();
  });

  it('botão Próximo desabilitado com campos vazios', () => {
    render(
      <IdentificationStep
        value={{ name: '', phone: '' }}
        onChange={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /próximo/i })).toBeDisabled();
  });

  it('botão Próximo habilitado com nome e telefone preenchidos', () => {
    render(
      <IdentificationStep
        value={{ name: 'Bruno', phone: '21999999999' }}
        onChange={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /próximo/i })).toBeEnabled();
  });

  it('chama onNext ao clicar em Próximo', async () => {
    const onNext = vi.fn();
    render(
      <IdentificationStep
        value={{ name: 'Bruno', phone: '21999999999' }}
        onChange={() => {}}
        onNext={onNext}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    expect(onNext).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar (stub atual não tem inputs)**

```bash
npx vitest run components/checkout/IdentificationStep.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

Substituir todo o conteúdo de `components/checkout/IdentificationStep.tsx`:

```tsx
'use client';

import type { Customer } from '@/lib/types';

interface Props {
  value: Customer;
  onChange: (c: Customer) => void;
  onNext: () => void;
}

export function IdentificationStep({ value, onChange, onNext }: Props) {
  const isValid = value.name.trim().length > 1 && value.phone.trim().length >= 10;
  return (
    <section aria-labelledby="step-identification">
      <h2 id="step-identification" className="font-heading text-xl font-bold">
        Identificação
      </h2>

      <label className="mt-4 block text-sm">
        Nome
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>

      <label className="mt-4 block text-sm">
        Telefone
        <input
          type="tel"
          inputMode="numeric"
          placeholder="(21) 99999-9999"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>

      <button
        type="button"
        disabled={!isValid}
        onClick={onNext}
        className="mt-6 cursor-pointer rounded bg-paper px-6 py-2 font-semibold text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Próximo
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run components/checkout/IdentificationStep.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/checkout/IdentificationStep.tsx components/checkout/IdentificationStep.test.tsx
git commit -m "feat(checkout): IdentificationStep com nome e telefone"
```

---

## Task 19: `AddressForm` (com ViaCEP) + `DeliveryStep`

**Files:**
- Create: `components/checkout/AddressForm.tsx`, `components/checkout/AddressForm.test.tsx`
- Modify: `components/checkout/DeliveryStep.tsx`
- Create: `components/checkout/DeliveryStep.test.tsx`

- [ ] **Step 1: Escrever o teste do `AddressForm`**

`components/checkout/AddressForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressForm } from './AddressForm';

beforeEach(() => {
  global.fetch = vi.fn();
});

describe('AddressForm', () => {
  it('busca o CEP na ViaCEP e preenche rua e bairro', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        logradouro: 'Rua Tenente Abel Cunha',
        bairro: 'Higienópolis',
      }),
    });

    const onChange = vi.fn();
    render(<AddressForm value={null} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText(/CEP/i), '20000000');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://viacep.com.br/ws/20000000/json/'),
      );
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          cep: '20000-000',
          street: 'Rua Tenente Abel Cunha',
          neighborhood: 'Higienópolis',
        }),
      );
    });
  });

  it('mostra aviso quando o bairro não é atendido', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logradouro: 'X', bairro: 'Botafogo' }),
    });

    render(<AddressForm value={null} onChange={() => {}} />);
    await userEvent.type(screen.getByLabelText(/CEP/i), '22000000');

    await waitFor(() => {
      expect(screen.getByText(/bairro não atendido/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/checkout/AddressForm.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar `AddressForm`**

`components/checkout/AddressForm.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { deliveryAreas } from '@/data/delivery';
import type { Address } from '@/lib/types';

interface Props {
  value: Address | null;
  onChange: (a: Address | null) => void;
}

function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function AddressForm({ value, onChange }: Props) {
  const [cep, setCep] = useState(value?.cep ?? '');
  const [street, setStreet] = useState(value?.street ?? '');
  const [number, setNumber] = useState(value?.number ?? '');
  const [neighborhood, setNeighborhood] = useState(value?.neighborhood ?? '');
  const [complement, setComplement] = useState(value?.complement ?? '');
  const [reference, setReference] = useState(value?.reference ?? '');
  const [neighborhoodOutOfArea, setNeighborhoodOutOfArea] = useState(false);

  // Busca na ViaCEP quando o CEP tem 8 dígitos
  useEffect(() => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.logradouro) setStreet(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
      } catch {
        // silencia — o usuário pode digitar manualmente
      }
    })();
    return () => { cancelled = true; };
  }, [cep]);

  // Avisa se o bairro não é atendido
  useEffect(() => {
    if (!neighborhood) {
      setNeighborhoodOutOfArea(false);
      return;
    }
    const match = deliveryAreas.find(
      (a) => a.neighborhood.toLowerCase() === neighborhood.toLowerCase(),
    );
    setNeighborhoodOutOfArea(!match);
  }, [neighborhood]);

  // Propaga para fora sempre que algo muda
  useEffect(() => {
    if (cep && street && number && neighborhood) {
      onChange({
        cep, street, number, neighborhood,
        complement: complement || undefined,
        reference: reference || undefined,
      });
    } else {
      onChange(null);
    }
  }, [cep, street, number, neighborhood, complement, reference, onChange]);

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        CEP
        <input
          type="text"
          inputMode="numeric"
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        Rua
        <input
          type="text"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        Número
        <input
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        Bairro
        <select
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        >
          <option value="">Selecione...</option>
          {deliveryAreas.map((a) => (
            <option key={a.neighborhood} value={a.neighborhood}>
              {a.neighborhood}
            </option>
          ))}
        </select>
      </label>
      {neighborhoodOutOfArea && (
        <p className="text-sm text-faint">
          Bairro não atendido. Veja a lista em <a className="underline" href="/bairros">/bairros</a>.
        </p>
      )}
      <label className="block text-sm">
        Complemento (opcional)
        <input
          type="text"
          value={complement}
          onChange={(e) => setComplement(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        Referência (opcional)
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run components/checkout/AddressForm.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Escrever teste do `DeliveryStep`**

`components/checkout/DeliveryStep.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryStep } from './DeliveryStep';

describe('DeliveryStep', () => {
  it('na Retirada não mostra formulário de endereço e habilita Próximo', () => {
    render(
      <DeliveryStep
        method="pickup"
        address={null}
        onMethodChange={() => {}}
        onAddressChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/CEP/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /próximo/i })).toBeEnabled();
  });

  it('na Entrega exige endereço completo pra liberar Próximo', () => {
    render(
      <DeliveryStep
        method="delivery"
        address={null}
        onMethodChange={() => {}}
        onAddressChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.getByLabelText(/CEP/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /próximo/i })).toBeDisabled();
  });

  it('chama onMethodChange ao trocar pra Retirada', async () => {
    const onMethodChange = vi.fn();
    render(
      <DeliveryStep
        method="delivery"
        address={null}
        onMethodChange={onMethodChange}
        onAddressChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    await userEvent.click(screen.getByLabelText(/Retirada/i));
    expect(onMethodChange).toHaveBeenCalledWith('pickup');
  });
});
```

- [ ] **Step 6: Implementar `DeliveryStep`**

Substituir `components/checkout/DeliveryStep.tsx`:

```tsx
'use client';

import { AddressForm } from './AddressForm';
import { DeliveryEstimate } from './DeliveryEstimate';
import { deliveryAreas } from '@/data/delivery';
import type { Address, DeliveryMethod } from '@/lib/types';

interface Props {
  method: DeliveryMethod;
  address: Address | null;
  onMethodChange: (m: DeliveryMethod) => void;
  onAddressChange: (a: Address | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DeliveryStep({
  method, address, onMethodChange, onAddressChange, onNext, onBack,
}: Props) {
  const isValid = method === 'pickup' || (method === 'delivery' && address !== null);
  const fee = address
    ? deliveryAreas.find(
        (a) => a.neighborhood.toLowerCase() === address.neighborhood.toLowerCase(),
      )?.fee
    : undefined;

  return (
    <section aria-labelledby="step-delivery">
      <h2 id="step-delivery" className="font-heading text-xl font-bold">
        Entrega
      </h2>

      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">Modalidade</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="method"
            value="delivery"
            checked={method === 'delivery'}
            onChange={() => onMethodChange('delivery')}
          />
          Entrega no endereço
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="method"
            value="pickup"
            checked={method === 'pickup'}
            onChange={() => onMethodChange('pickup')}
          />
          Retirada no local
        </label>
      </fieldset>

      {method === 'delivery' && (
        <div className="mt-4">
          <AddressForm value={address} onChange={onAddressChange} />
        </div>
      )}

      <div className="mt-4">
        <DeliveryEstimate method={method} fee={fee} />
      </div>

      <div className="mt-6 flex justify-between">
        <button type="button" onClick={onBack}
          className="cursor-pointer rounded border border-line px-4 py-2 hover:border-paper">
          Voltar
        </button>
        <button type="button" disabled={!isValid} onClick={onNext}
          className="cursor-pointer rounded bg-paper px-6 py-2 font-semibold text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
          Próximo
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Rodar testes**

```bash
npx vitest run components/checkout/DeliveryStep.test.tsx components/checkout/AddressForm.test.tsx
```
Esperado: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/checkout/DeliveryStep.tsx components/checkout/DeliveryStep.test.tsx components/checkout/AddressForm.tsx components/checkout/AddressForm.test.tsx
git commit -m "feat(checkout): DeliveryStep + AddressForm com ViaCEP e detecção de bairro"
```

---

## Task 20: `PaymentStep`

**Files:**
- Modify: `components/checkout/PaymentStep.tsx`
- Create: `components/checkout/PaymentStep.test.tsx`

- [ ] **Step 1: Escrever o teste**

`components/checkout/PaymentStep.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentStep } from './PaymentStep';

describe('PaymentStep', () => {
  it('lista as 4 formas de pagamento', () => {
    render(
      <PaymentStep
        payment={null} changeFor={undefined}
        onPaymentChange={() => {}} onChangeForChange={() => {}}
        onNext={() => {}} onBack={() => {}}
      />,
    );
    expect(screen.getByLabelText(/Pix/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cartão de crédito/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cartão de débito/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dinheiro/i)).toBeInTheDocument();
  });

  it('mostra campo de troco só quando Dinheiro está selecionado', async () => {
    const onPaymentChange = vi.fn();
    const { rerender } = render(
      <PaymentStep
        payment={null} changeFor={undefined}
        onPaymentChange={onPaymentChange} onChangeForChange={() => {}}
        onNext={() => {}} onBack={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/Troco/i)).not.toBeInTheDocument();
    rerender(
      <PaymentStep
        payment="cash" changeFor={undefined}
        onPaymentChange={onPaymentChange} onChangeForChange={() => {}}
        onNext={() => {}} onBack={() => {}}
      />,
    );
    expect(screen.getByLabelText(/Troco para/i)).toBeInTheDocument();
  });

  it('botão Próximo desabilitado sem forma selecionada', () => {
    render(
      <PaymentStep
        payment={null} changeFor={undefined}
        onPaymentChange={() => {}} onChangeForChange={() => {}}
        onNext={() => {}} onBack={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /próximo/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/checkout/PaymentStep.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

Substituir `components/checkout/PaymentStep.tsx`:

```tsx
'use client';

import type { PaymentMethod } from '@/lib/types';

interface Props {
  payment: PaymentMethod | null;
  changeFor: number | undefined;
  onPaymentChange: (p: PaymentMethod) => void;
  onChangeForChange: (v: number | undefined) => void;
  onNext: () => void;
  onBack: () => void;
}

const OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'Pix' },
  { value: 'credit', label: 'Cartão de crédito' },
  { value: 'debit', label: 'Cartão de débito' },
  { value: 'cash', label: 'Dinheiro' },
];

export function PaymentStep({
  payment, changeFor, onPaymentChange, onChangeForChange, onNext, onBack,
}: Props) {
  return (
    <section aria-labelledby="step-payment">
      <h2 id="step-payment" className="font-heading text-xl font-bold">
        Pagamento
      </h2>
      <p className="mt-1 text-sm text-muted">
        O motoboy cobra na entrega (ou pague no balcão ao retirar).
      </p>

      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">Forma de pagamento</legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="payment"
              value={o.value}
              checked={payment === o.value}
              onChange={() => onPaymentChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </fieldset>

      {payment === 'cash' && (
        <label className="mt-4 block text-sm">
          Troco para
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={changeFor ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChangeForChange(v === '' ? undefined : Number(v));
            }}
            className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
          />
        </label>
      )}

      <div className="mt-6 flex justify-between">
        <button type="button" onClick={onBack}
          className="cursor-pointer rounded border border-line px-4 py-2 hover:border-paper">
          Voltar
        </button>
        <button type="button" disabled={!payment} onClick={onNext}
          className="cursor-pointer rounded bg-paper px-6 py-2 font-semibold text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
          Próximo
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run components/checkout/PaymentStep.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/checkout/PaymentStep.tsx components/checkout/PaymentStep.test.tsx
git commit -m "feat(checkout): PaymentStep com 4 formas + troco condicional"
```

---

## Task 21: `ReviewStep` + envio com validações

**Files:**
- Modify: `components/checkout/ReviewStep.tsx`, `app/checkout/page.tsx`
- Create: `components/checkout/ReviewStep.test.tsx`

- [ ] **Step 1: Escrever teste do `ReviewStep`**

`components/checkout/ReviewStep.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewStep } from './ReviewStep';

describe('ReviewStep', () => {
  it('renderiza resumo com os totais passados', () => {
    render(
      <ReviewStep
        subtotal={100} deliveryFee={5} discount={0} total={105}
        method="delivery" onSubmit={() => {}} onBack={() => {}}
        estimatedRange={{ min: 30, max: 40 }}
      />,
    );
    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument();
    expect(screen.getByText(/30–40 min/)).toBeInTheDocument();
  });

  it('chama onSubmit ao clicar Enviar pedido', async () => {
    const onSubmit = vi.fn();
    render(
      <ReviewStep
        subtotal={100} deliveryFee={0} discount={0} total={100}
        method="pickup" onSubmit={onSubmit} onBack={() => {}}
        estimatedRange={{ min: 20, max: 30 }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /enviar pedido/i }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/checkout/ReviewStep.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar `ReviewStep`**

Substituir `components/checkout/ReviewStep.tsx`:

```tsx
'use client';

import { formatPrice } from '@/lib/format';
import type { DeliveryMethod } from '@/lib/types';

interface Props {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  method: DeliveryMethod;
  estimatedRange: { min: number; max: number };
  onSubmit: () => void;
  onBack: () => void;
}

export function ReviewStep({
  subtotal, deliveryFee, discount, total, method, estimatedRange, onSubmit, onBack,
}: Props) {
  return (
    <section aria-labelledby="step-review">
      <h2 id="step-review" className="font-heading text-xl font-bold">
        Revisão
      </h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
        {method === 'delivery' && (
          <div className="flex justify-between">
            <dt>Taxa de entrega</dt><dd>{formatPrice(deliveryFee)}</dd>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-muted">
            <dt>Desconto</dt><dd>-{formatPrice(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <dt>Total</dt><dd>{formatPrice(total)}</dd>
        </div>
      </dl>

      <p className="mt-4 rounded border border-line bg-surface p-3 text-sm">
        🕗 Tempo estimado: <strong>{estimatedRange.min}–{estimatedRange.max} min</strong>
        <span className="ml-2 text-xs text-faint">A loja confirma no chat.</span>
      </p>

      <div className="mt-6 flex justify-between">
        <button type="button" onClick={onBack}
          className="cursor-pointer rounded border border-line px-4 py-2 hover:border-paper">
          Voltar
        </button>
        <button type="button" onClick={onSubmit}
          className="cursor-pointer rounded bg-paper px-6 py-2 font-semibold text-ink transition-colors hover:bg-white">
          Enviar pedido
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Atualizar `app/checkout/page.tsx` com envio completo**

Substituir o `app/checkout/page.tsx` (mantendo a estrutura, adicionando o handle de submit com validações + WhatsApp). Atualizar imports e a parte do submit:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { calcDiscount, calcSubtotal } from '@/lib/cart';
import { isOpen } from '@/lib/store-status';
import { estimateTotalMinutes } from '@/lib/delivery-time';
import { generateOrderId } from '@/lib/order-id';
import { buildWhatsAppMessage } from '@/lib/order-message';
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

  const subtotal = useMemo(() => calcSubtotal(items), [items]);
  const discount = useMemo(() => calcDiscount(subtotal, coupon), [subtotal, coupon]);
  const fee = useMemo(() => {
    if (method !== 'delivery' || !address) return 0;
    return deliveryAreas.find(
      (a) => a.neighborhood.toLowerCase() === address.neighborhood.toLowerCase(),
    )?.fee ?? 0;
  }, [method, address]);
  const total = subtotal - discount + fee;
  const estimateMinutes = estimateTotalMinutes(method, storeConfig.averagePrepTime, fee);
  const estimatedRange = rangeFor(estimateMinutes);

  if (items.length === 0 && step !== 'sent') {
    router.replace('/');
    return null;
  }

  if (step === 'sent' && orderId && sentEstimate) {
    return <OrderStatusScreen orderId={orderId} estimatedMinutes={sentEstimate} />;
  }

  const submit = () => {
    setErrorMessage(null);

    if (!isOpen(new Date(), storeConfig.openingHours)) {
      setErrorMessage('A loja está fechada agora. Confira os horários e tente de novo.');
      return;
    }
    if (subtotal < storeConfig.minOrder) {
      setErrorMessage(`Pedido mínimo: R$ ${storeConfig.minOrder.toFixed(2).replace('.', ',')}`);
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

    const id = generateOrderId();
    const msg = buildWhatsAppMessage({
      orderId: id,
      customer,
      items,
      categories,
      coupon,
      subtotal,
      discount,
      deliveryFee: fee,
      total,
      estimatedMinutes: estimatedRange,
      method,
      address: method === 'delivery' ? address! : undefined,
      payment,
      changeFor: payment === 'cash' ? changeFor : undefined,
      storeBusinessName: storeConfig.whatsappBusinessName,
      storeAddress: storeConfig.address,
    });

    const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    setOrderId(id);
    setSentEstimate(estimatedRange);
    setStep('sent');
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
      <h1 className="font-heading text-3xl font-extrabold">Finalizar pedido</h1>

      <div className="mt-8">
        {step === 'identification' && (
          <IdentificationStep value={customer} onChange={setCustomer} onNext={() => setStep('delivery')} />
        )}
        {step === 'delivery' && (
          <DeliveryStep
            method={method} address={address}
            onMethodChange={setMethod} onAddressChange={setAddress}
            onNext={() => setStep('payment')} onBack={() => setStep('identification')}
          />
        )}
        {step === 'payment' && (
          <PaymentStep
            payment={payment} changeFor={changeFor}
            onPaymentChange={setPayment} onChangeForChange={setChangeFor}
            onNext={() => setStep('review')} onBack={() => setStep('delivery')}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            subtotal={subtotal} deliveryFee={fee} discount={discount} total={total}
            method={method} estimatedRange={estimatedRange}
            onSubmit={submit} onBack={() => setStep('payment')}
          />
        )}
      </div>

      <OrderToast message={errorMessage} />
    </main>
  );
}
```

- [ ] **Step 5: Rodar testes**

```bash
npx vitest run components/checkout/ReviewStep.test.tsx
npm test
```
Esperado: tudo PASS.

- [ ] **Step 6: Lint + build**

```bash
npm run lint
npm run build
```
Esperado: ambos verdes.

- [ ] **Step 7: Commit**

```bash
git add components/checkout/ReviewStep.tsx components/checkout/ReviewStep.test.tsx app/checkout/page.tsx
git commit -m "feat(checkout): ReviewStep + envio com validações e WhatsApp"
```

---

## Task 22: `OrderStatusScreen` (tela pós-envio)

**Files:**
- Modify: `components/checkout/OrderStatusScreen.tsx`
- Create: `components/checkout/OrderStatusScreen.test.tsx`

- [ ] **Step 1: Escrever o teste**

`components/checkout/OrderStatusScreen.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderStatusScreen } from './OrderStatusScreen';

let openSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
});

describe('OrderStatusScreen', () => {
  it('mostra o número do pedido e o tempo estimado', () => {
    render(<OrderStatusScreen orderId="#3417" estimatedMinutes={{ min: 30, max: 40 }} />);
    expect(screen.getByText('#3417')).toBeInTheDocument();
    expect(screen.getByText(/30–40 min/)).toBeInTheDocument();
  });

  it('botão Cancelar pedido abre WhatsApp com mensagem de cancelamento', async () => {
    render(<OrderStatusScreen orderId="#3417" estimatedMinutes={{ min: 30, max: 40 }} />);
    await userEvent.click(screen.getByRole('button', { name: /cancelar pedido/i }));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('text='),
      '_blank',
    );
    const arg = openSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(arg)).toContain('cancelar o pedido #3417');
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/checkout/OrderStatusScreen.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

Substituir `components/checkout/OrderStatusScreen.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import { buildCancelMessage } from '@/lib/order-cancel-message';
import { storeConfig } from '@/config/store';

interface Props {
  orderId: string;
  estimatedMinutes: { min: number; max: number };
}

export function OrderStatusScreen({ orderId, estimatedMinutes }: Props) {
  const clear = useCartStore((s) => s.clear);

  const cancelOrder = () => {
    const msg = buildCancelMessage(orderId);
    const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-paper">
      <div className="rounded border border-line bg-surface p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-faint">Pedido</p>
        <h1 className="font-heading text-4xl font-extrabold">{orderId}</h1>

        <p className="mt-6 text-paper">
          ✅ Pedido enviado pelo WhatsApp.
        </p>
        <p className="mt-2 text-sm text-muted">
          Aguardando confirmação da loja. Você vai receber uma mensagem no chat.
        </p>

        <p className="mt-6 rounded border border-line bg-ink p-3 text-sm">
          🕗 Tempo estimado: <strong>{estimatedMinutes.min}–{estimatedMinutes.max} min</strong>
          <span className="ml-2 text-xs text-faint">A loja confirma no chat.</span>
        </p>

        <button
          type="button"
          onClick={cancelOrder}
          className="mt-6 cursor-pointer rounded border border-line px-6 py-2 text-sm hover:border-paper"
        >
          Cancelar pedido
        </button>

        <div className="mt-6 border-t border-line pt-6">
          <Link
            href="/"
            onClick={() => clear()}
            className="block w-full rounded bg-paper px-4 py-3 font-semibold text-ink transition-colors hover:bg-white"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx vitest run components/checkout/OrderStatusScreen.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Suíte + lint + build**

```bash
npm test
npm run lint
npm run build
```
Esperado: tudo verde.

- [ ] **Step 6: Commit**

```bash
git add components/checkout/OrderStatusScreen.tsx components/checkout/OrderStatusScreen.test.tsx
git commit -m "feat(checkout): OrderStatusScreen com cancelamento via WhatsApp"
```

---

## Task 23: Página `/bairros`

**Files:**
- Create: `app/bairros/page.tsx`, `app/bairros/page.test.tsx` (RTL via mount manual)

A página renderiza no servidor; o filtro de busca é client-side. Vamos isolar a UI de busca num componente client.

- [ ] **Step 1: Criar componente de busca client**

`app/bairros/NeighborhoodsTable.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { deliveryAreas } from '@/data/delivery';
import { formatPrice } from '@/lib/format';

export function NeighborhoodsTable() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deliveryAreas;
    return deliveryAreas.filter((a) => a.neighborhood.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <label className="block">
        <span className="text-sm text-muted">Buscar bairro</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Higienópolis, Tijuca..."
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="mt-6 text-muted">Nenhum bairro encontrado.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line">
          {filtered.map((a) => (
            <li key={a.neighborhood} className="flex justify-between py-3 text-sm">
              <span>{a.neighborhood}</span>
              <span className="font-semibold">{formatPrice(a.fee)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

- [ ] **Step 2: Criar a página `/bairros`**

`app/bairros/page.tsx`:

```tsx
import { NeighborhoodsTable } from './NeighborhoodsTable';

export const metadata = {
  title: 'Bairros atendidos — Braga\'s Burger',
};

export default function BairrosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
      <h1 className="font-heading text-3xl font-extrabold">Bairros atendidos</h1>
      <p className="mt-2 text-muted">
        Taxa de entrega por bairro. Filtre pra encontrar o seu.
      </p>
      <div className="mt-8">
        <NeighborhoodsTable />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Escrever teste**

`app/bairros/NeighborhoodsTable.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NeighborhoodsTable } from './NeighborhoodsTable';

describe('NeighborhoodsTable', () => {
  it('mostra a lista completa por padrão', () => {
    render(<NeighborhoodsTable />);
    expect(screen.getByText('Higienópolis')).toBeInTheDocument();
    expect(screen.getByText('Grajaú')).toBeInTheDocument();
  });

  it('filtra pela busca (case-insensitive)', async () => {
    render(<NeighborhoodsTable />);
    await userEvent.type(screen.getByLabelText(/buscar/i), 'tij');
    expect(screen.getByText('Tijuca')).toBeInTheDocument();
    expect(screen.queryByText('Higienópolis')).not.toBeInTheDocument();
  });

  it('mensagem amigável quando nada bate', async () => {
    render(<NeighborhoodsTable />);
    await userEvent.type(screen.getByLabelText(/buscar/i), 'xyznada');
    expect(screen.getByText(/nenhum bairro encontrado/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Rodar testes + lint + build**

```bash
npx vitest run app/bairros/NeighborhoodsTable.test.tsx
npm test
npm run lint
npm run build
```
Esperado: tudo verde. Build deve gerar a rota `/bairros`.

- [ ] **Step 5: Commit**

```bash
git add app/bairros/page.tsx app/bairros/NeighborhoodsTable.tsx app/bairros/NeighborhoodsTable.test.tsx
git commit -m "feat(bairros): página /bairros com tabela e busca"
```

---

## Task 24: Manifesto PWA + ícones

**Files:**
- Create: `app/manifest.ts`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`

> **Antes de começar:** abra `node_modules/next/dist/docs/01-app/03-api-reference/05-file-conventions/metadata/manifest.md` (ou a página equivalente) pra confirmar o tipo `MetadataRoute.Manifest` no Next 16 — a API pode ter mudado em relação a versões antigas. O exemplo abaixo segue o Next 15+/16.

- [ ] **Step 1: Gerar os dois ícones PNG a partir da logo existente**

A logo atual está em `public/images/logo.png` (já processada no sub-projeto 1). Gerar duas versões redimensionadas:

```bash
# 192x192
npx -y sharp-cli -i public/images/logo.png -o public/icons/icon-192.png resize 192 192
# 512x512
npx -y sharp-cli -i public/images/logo.png -o public/icons/icon-512.png resize 512 512
```

Se `sharp-cli` não estiver disponível, use o navegador / Photoshop / qualquer ferramenta de imagem pra exportar nos dois tamanhos manualmente; o importante é o resultado em `public/icons/`.

Verifique que os arquivos existem:

```bash
ls public/icons/
```
Esperado: `icon-192.png` e `icon-512.png`.

- [ ] **Step 2: Criar `app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Braga's Burger",
    short_name: 'Bragas',
    description: 'Hamburgueria artesanal — peça pelo nosso app.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0B0C',
    theme_color: '#0B0B0C',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

- [ ] **Step 3: Rodar build**

```bash
npm run build
```
Esperado: build conclui. Em `.next/server/app/manifest.webmanifest` (ou equivalente) o manifesto deve estar presente.

- [ ] **Step 4: Verificar manualmente**

```bash
npm run dev
```

Abrir `http://localhost:3000/manifest.webmanifest` e conferir o JSON.

Parar o servidor depois.

- [ ] **Step 5: Commit**

```bash
git add app/manifest.ts public/icons/icon-192.png public/icons/icon-512.png
git commit -m "feat(pwa): manifesto e ícones (192/512)"
```

---

## Task 25: Service worker mínimo + registro

**Files:**
- Create: `public/sw.js`, `components/pwa/RegisterServiceWorker.tsx`
- Modify: `app/layout.tsx`

Service worker é necessário pra Chromium considerar o site "instalável" (e o `beforeinstallprompt` disparar). Um SW com handler de fetch vazio é suficiente — não cacheamos nada.

- [ ] **Step 1: Criar o service worker**

`public/sw.js`:

```js
// Service worker mínimo: apenas habilita a flag de "instalável" pra o Chromium.
// Não cacheia nada (YAGNI). Substitua quando offline real for necessário.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // pass-through: deixa o navegador lidar com a request normalmente
});
```

- [ ] **Step 2: Componente client de registro**

`components/pwa/RegisterServiceWorker.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Só em produção — em dev recarregar muito o SW atrapalha.
    if (process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // silencia — sem SW, o site ainda funciona
    });
  }, []);
  return null;
}
```

- [ ] **Step 3: Incluir no layout**

Em `app/layout.tsx`, importar e adicionar:

```tsx
import { RegisterServiceWorker } from '@/components/pwa/RegisterServiceWorker';
```

E dentro do `<body>`:

```tsx
<RegisterServiceWorker />
```

- [ ] **Step 4: Build + verificação**

```bash
npm run build
```
Esperado: build limpo.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js components/pwa/RegisterServiceWorker.tsx app/layout.tsx
git commit -m "feat(pwa): service worker mínimo + registro em produção"
```

---

## Task 26: Banner de instalação (`InstallBanner`)

**Files:**
- Create: `components/ui/InstallBanner.tsx`, `components/ui/InstallBanner.test.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Escrever o teste**

`components/ui/InstallBanner.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallBanner } from './InstallBanner';

describe('InstallBanner', () => {
  it('aparece quando o evento beforeinstallprompt dispara', () => {
    render(<InstallBanner />);
    expect(screen.queryByText(/instale/i)).not.toBeInTheDocument();
    const evt = new Event('beforeinstallprompt') as Event & { prompt?: () => void };
    evt.preventDefault = () => {};
    evt.prompt = () => {};
    fireEvent(window, evt);
    expect(screen.getByText(/instale/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx vitest run components/ui/InstallBanner.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Implementar**

`components/ui/InstallBanner.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    setDeferred(null);
  };

  return (
    <div
      role="region"
      aria-label="Instalar aplicativo"
      className="fixed bottom-6 left-6 z-40 max-w-xs rounded border border-line bg-surface p-4 text-sm text-paper shadow-lg"
    >
      <p>Instale nosso app de delivery pra pedir mais rápido.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={install}
          className="cursor-pointer rounded bg-paper px-3 py-1 font-semibold text-ink hover:bg-white"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="cursor-pointer rounded border border-line px-3 py-1 hover:border-paper"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Incluir no layout**

Em `app/layout.tsx`:

```tsx
import { InstallBanner } from '@/components/ui/InstallBanner';
```

E dentro do `<body>`:

```tsx
<InstallBanner />
```

- [ ] **Step 5: Rodar — deve passar**

```bash
npx vitest run components/ui/InstallBanner.test.tsx
npm test
npm run lint
npm run build
```
Esperado: tudo verde.

- [ ] **Step 6: Commit**

```bash
git add components/ui/InstallBanner.tsx components/ui/InstallBanner.test.tsx app/layout.tsx
git commit -m "feat(pwa): InstallBanner ouvindo beforeinstallprompt"
```

---

## Task 27: Polimento final + verificação manual

**Files:** nenhum. Esta task é só verificação ponta-a-ponta antes de fechar o branch.

- [ ] **Step 1: Suíte completa**

```bash
npm test
```
Esperado: todos os testes passam.

- [ ] **Step 2: Lint**

```bash
npm run lint
```
Esperado: limpo.

- [ ] **Step 3: Build**

```bash
npm run build
```
Esperado: limpo. Rotas geradas devem incluir `/`, `/_not-found`, `/icon.png`, `/politica-de-privacidade`, `/termos`, **`/checkout`**, **`/bairros`**, **`/manifest.webmanifest`**.

- [ ] **Step 4: Dev server e teste manual**

```bash
npm run dev
```

Abrir `http://localhost:3000`. Checklist manual:

- [ ] Card de qualquer produto: clicar "Adicionar" — `CartButton` aparece com contador 1.
- [ ] Clicar no `CartButton` — drawer abre com o item.
- [ ] Aumentar quantidade — contador no botão flutuante reflete.
- [ ] Aplicar `BEMVINDO10` — desconto de 10% aparece.
- [ ] Aplicar `FRETE5` com subtotal < R$ 40 — mostra mensagem de requisito.
- [ ] Clicar "Fechar pedido" — vai pra `/checkout`.
- [ ] Etapa Identificação: nome + telefone → Próximo.
- [ ] Etapa Entrega — Entrega: digitar CEP de Higienópolis (ex.: 20270-070), ViaCEP preenche rua+bairro; tempo estimado mostra "30–40 min".
- [ ] Tentar bairro fora da área — mostra aviso, Próximo desabilitado.
- [ ] Retirada: campo de endereço some, Próximo habilita.
- [ ] Etapa Pagamento: Dinheiro mostra campo de troco; outras formas não.
- [ ] Revisão: valores corretos com taxa, desconto e total.
- [ ] Enviar pedido (carrinho > R$ 25, loja aberta, bairro atendido) — WhatsApp abre com mensagem formatada.
- [ ] Tela pós-envio: número `#XXXX` visível, tempo estimado, botão "Cancelar pedido" abre WhatsApp com mensagem "Olá, gostaria de cancelar o pedido #XXXX".
- [ ] Recarregar o carrinho com a página — itens persistem (zustand + localStorage).
- [ ] Página `/bairros`: lista 39 bairros; busca filtra; mensagem amigável quando nada bate.
- [ ] Em produção (depois do build), `/manifest.webmanifest` retorna JSON; SW registra em `/sw.js`.

- [ ] **Step 5: Encerrar dev server**

Ctrl+C no terminal do `npm run dev`.

- [ ] **Step 6: Sem commit** (esta task é só verificação)

---

## Critérios de sucesso (checklist final)

- [ ] Carrinho funcional: add / remove / quantidade / observação / persistência.
- [ ] Cupom: `BEMVINDO10` (10%), `FRETE5` (R$ 5, requer subtotal ≥ R$ 40).
- [ ] Checkout em 4 etapas + revisão.
- [ ] CEP via ViaCEP, bairro detectado e validado contra `deliveryAreas`.
- [ ] Tempo estimado por faixa de taxa, exibido na entrega e na pós-envio.
- [ ] Validações: loja fechada, pedido mínimo, bairro atendido.
- [ ] Mensagem do WhatsApp formatada conforme Apêndice A do spec.
- [ ] Número do pedido `#XXXX` no topo da mensagem e na pós-envio.
- [ ] Pós-envio com botão de cancelar abrindo WhatsApp.
- [ ] `/bairros` com busca funcional.
- [ ] PWA instalável (manifesto + ícones + SW).
- [ ] `npm test`, `npm run lint` e `npm run build` passando.
