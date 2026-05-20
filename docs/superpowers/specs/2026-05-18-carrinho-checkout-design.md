# Spec de Design — Carrinho + Checkout (Sub-projeto 2)

**Data inicial:** 2026-05-18
**Revisado em:** 2026-05-19
**Sub-projeto:** 2 de 6 — Carrinho + Checkout
**Spec anterior:** `2026-05-17-landing-page-redesign-design.md` (sub-projeto 1, concluído)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

O sub-projeto 1 (landing page / cardápio) está concluído e mergeado em master (PR #2):
o cardápio apenas **exibe** ~80 produtos. Este sub-projeto adiciona **carrinho de compras
e checkout**, encerrando o pedido com o envio de uma **mensagem de WhatsApp** formatada
para a loja. Não há backend — o sub-projeto 3 fará a API.

Na revisão deste spec (2026-05-19), o cliente compartilhou material real da operação atual
(transcrição de WhatsApp do GrandChef). As decisões abaixo refletem essa realidade.

### Decisões da revisão de 2026-05-19

| # | Tema | Decisão |
|---|------|---------|
| 1 | **Pix** | Removido por completo do front. Pagamento na entrega via motoboy (Pix/Crédito/Débito/Dinheiro na maquininha) ou no balcão para retirada. Sem QR Code, sem chave Pix, sem `PixModal`. |
| 2 | **Tela pós-envio** | Após o envio, exibir `OrderStatusScreen` com "Pedido #XXXX enviado. Aguardando confirmação da loja no WhatsApp" e botão **Cancelar pedido** que reabre o WhatsApp com mensagem pré-preenchida. |
| 3 | **Nome da loja na mensagem** | Mensagem usa **"Bragas Lanches"** (nome do contato no WhatsApp Business). A marca visual do site continua "Braga's Burger". |
| 4 | **Número do pedido** | `#XXXX` (4 dígitos) gerado por `Date.now().toString().slice(-4).padStart(4, '0')`. Ponte até o sub-projeto 3 trazer numeração sequencial real. |
| 5 | **Formato da mensagem** | Reescrito: número no topo, itens agrupados por categoria em maiúsculas, "Pagamento na entrega" / "no balcão" explícito. Apêndice A atualizado. |
| 6 | **Tempo estimado** | Heurística: `averagePrepTime` (25 min) + faixa de taxa de entrega → minutos. Exibido na etapa Entrega do checkout e na `OrderStatusScreen`, com disclaimer "a loja confirma no chat". |

### Escopo

**Dentro:** botão "adicionar" nos produtos; carrinho persistente; drawer do carrinho;
checkout em etapas (identificação → entrega/retirada → endereço → pagamento → revisão);
**tela pós-envio com botão cancelar**; envio do pedido por WhatsApp; **tempo estimado
por bairro**; cupons de desconto (locais); página `/bairros`; PWA (manifesto + ícones +
banner de instalação); validações (loja fechada, pedido mínimo, bairro atendido).

**Fora do escopo (bloqueio técnico, não preferência):**

- **Login, "Minha conta", "Meus pedidos"** — exigem um backend para guardar usuários e
  pedidos. Não há backend (sub-projeto 3) e login é o sub-projeto 4. Sem backend,
  "meus pedidos" não tem onde existir.
- **Pix dinâmico / pagamento online** — não há mais Pix no front (Ajuste #1). Quando
  houver backend (sub-projeto 3), a discussão pode ser retomada se a operação mudar.
- **Status real do pedido pós-envio** — sem backend, a loja não tem como atualizar o
  status pra nós. A `OrderStatusScreen` mostra um único estado honesto ("aguardando
  confirmação") até o sub-projeto 3.
- **Cancelamento automático** — o botão **Cancelar pedido** apenas reabre o WhatsApp com
  uma mensagem de cancelamento pré-preenchida; quem efetivamente cancela é a loja, no
  chat, como já faz hoje.
- **Customização multi-step de produto** (ponto da carne, adicionais pagos) — iteração
  futura, quando o cliente fornecer os dados. O modelo `CartItem` já é desenhado para
  receber um campo `options` sem refazer carrinho nem checkout.

---

## 2. Stack adicional

| Lib | Função |
|-----|--------|
| `zustand` | Estado do carrinho, com middleware `persist` em `localStorage` |

Sem `shadcn/ui`, sem Roboto, sem Material Icons — mantém-se o design system existente.
Removidas as bibliotecas `pix-utils` e `qrcode` que constavam na versão anterior deste
spec (Ajuste #1).

---

## 3. Tema

Reaproveita os tokens de `globals.css` (`ink`, `surface`, `surface-hover`, `line`,
`paper`, `muted`, `faint`). Sem rosa, sem verde. CTA primária = componente `Button`
existente (fundo branco, texto `ink`). Toasts de erro usam `surface` com borda `line` —
sem amarelo. Ícones: SVG inline no padrão do site.

---

## 4. Modelo de dados

`lib/types.ts` ganha:

```ts
export interface CartItem {
  id: string;          // id único do item no carrinho
  product: Product;
  quantity: number;
  notes: string;       // observação livre ("sem cebola")
  // futuro: options?: SelectedOption[] — customização multi-step
}

export interface Coupon {
  code: string;
  type: 'percent' | 'fixed';
  value: number;            // 10 → 10% (percent) ou R$ 10 (fixed)
  minSubtotal?: number;     // subtotal mínimo para o cupom valer
}

export interface Address {
  cep: string; street: string; number: string;
  neighborhood: string; complement?: string; reference?: string;
}

export type DeliveryMethod = 'delivery' | 'pickup';
export type PaymentMethod = 'pix' | 'cash' | 'credit' | 'debit';

export interface Customer { name: string; phone: string; }
```

`PaymentMethod` é **declarativo**: indica o que o cliente vai usar quando o motoboy
chegar (ou ao retirar). Não há cobrança online (Ajuste #1).

`config/store.ts`:

```ts
export const storeConfig = {
  whatsappBusinessName: 'Bragas Lanches', // usado nas mensagens (Ajuste #3)
  brandName: "Braga's Burger",            // usado visualmente no site
  whatsappNumber: '5521984019048',
  address: 'Higienópolis, Zona Norte — Rio de Janeiro',
  minOrder: 25,
  averagePrepTime: 25, // minutos médios de preparo na loja (Ajuste #6)
  // null = fechado; senão [abre, fecha] em "HH:MM"
  openingHours: {
    sun: ['18:00', '00:00'], mon: null, tue: ['18:00', '23:40'],
    wed: ['18:00', '23:40'], thu: ['18:00', '23:40'],
    fri: ['18:00', '00:00'], sat: ['18:00', '00:00'],
  },
};
```

Removido o objeto `pix` (Ajuste #1). Acrescentados `whatsappBusinessName`, `brandName` e
`averagePrepTime`.

`data/coupons.ts` — lista de `Coupon`. `data/delivery.ts` (já existe) — taxas por bairro.

---

## 5. Estado — store do carrinho (Zustand)

`lib/cart-store.ts`:

- **Estado:** `items: CartItem[]`, `coupon: Coupon | null`.
- **Ações:** `addItem(product)`, `removeItem(id)`, `setQuantity(id, n)`, `setNotes(id, text)`,
  `clear()`, `applyCoupon(code)`, `removeCoupon()`.
- **Persistência:** middleware `persist` → `localStorage` (chave `bragas-cart`).

O estado do checkout (cliente, endereço, método, pagamento) é **local da página de
checkout** — não persiste.

---

## 6. Lógica pura — `lib/` (testável sem UI)

- `lib/cart.ts` — `calcSubtotal(items)`, `calcDiscount(subtotal, coupon)`, `findCoupon(code)`,
  `groupByCategory(items)` (usado na renderização da mensagem).
- `lib/store-status.ts` — `isOpen(date, openingHours)` → loja aberta/fechada agora.
- `lib/delivery-time.ts` — `estimateDeliveryMinutes(fee)` (faixa de taxa → minutos) e
  `estimateTotalMinutes(method, prepTime, fee?)` (preparo + entrega ou só preparo).
- `lib/order-id.ts` — `generateOrderId()` → `string` no formato `#XXXX`, gerado por
  `Date.now().toString().slice(-4).padStart(4, '0')`.
- `lib/order-message.ts` — `buildWhatsAppMessage(order)` → string formatada (Apêndice A).
- `lib/order-cancel-message.ts` — `buildCancelMessage(orderId)` → string curta de
  cancelamento (Apêndice A).
- `lib/format.ts` — reusa `formatPrice` (já existe).

A taxa de entrega **não** entra no store: depende do bairro escolhido no checkout.

### Mapeamento de tempo de entrega (Ajuste #6)

`estimateDeliveryMinutes(fee)` retorna minutos por faixa de taxa:

| Faixa de taxa (R$) | Minutos |
|--------------------|---------|
| 4,99               | 10      |
| 5,99               | 15      |
| 6,99               | 20      |
| 7,99               | 25      |
| 8,99               | 30      |
| 9,99               | 35      |
| 10,99              | 40      |

`estimateTotalMinutes(method, prepTime, fee?)`:
- `method === 'pickup'` → retorna `prepTime`.
- `method === 'delivery'` → retorna `prepTime + estimateDeliveryMinutes(fee)`.

Exibido na UI como faixa: o componente formata como `"{min-5}–{min+5} min"` (ex.: 35 → "30–40 min")
pra refletir variabilidade real sem fingir precisão.

---

## 7. Componentes

| Componente | Papel |
|-----------|-------|
| `components/cart/AddToCartButton` | Botão no `ProductCard`; adiciona ao carrinho |
| `components/cart/CartButton` | Botão flutuante com contador de itens |
| `components/cart/CartDrawer` | Painel lateral: itens, quantidade, remover, cupom, totais, CTA "Fechar pedido" |
| `app/checkout/page.tsx` | Checkout em etapas (estado interno) |
| `components/checkout/*` | Um componente por etapa: identificação, entrega, endereço, pagamento, revisão |
| `components/checkout/AddressForm` | CEP (ViaCEP via `fetch` no cliente), rua, número, bairro (select de `deliveryAreas`), complemento, referência |
| `components/checkout/DeliveryEstimate` | Mostra "Tempo estimado: X–Y min" abaixo do bairro selecionado / na revisão, com disclaimer "a loja confirma no chat" |
| `components/checkout/OrderStatusScreen` | Tela pós-envio: número do pedido, "Aguardando confirmação da loja no WhatsApp", tempo estimado e botão **Cancelar pedido** (reabre WhatsApp com `buildCancelMessage(orderId)`) |
| `components/ui/OrderToast` | Aviso de erro de validação (rodapé) |
| `app/bairros/page.tsx` | Tabela de bairros + taxa + busca |

Removido o `PixModal` (Ajuste #1).

Transições (drawer, modal) com Framer Motion, respeitando `prefers-reduced-motion`.

---

## 8. Fluxo do pedido

1. Usuário adiciona produtos → `CartButton` mostra o contador.
2. Abre o `CartDrawer` → revê itens, ajusta quantidade, aplica cupom → "Fechar pedido".
3. `/checkout`, em etapas:
   a. **Identificação** — nome + telefone.
   b. **Entrega** — Entrega ou Retirada no local. Se Entrega → `AddressForm`
      (o bairro define a taxa via `deliveryAreas`; `DeliveryEstimate` mostra o tempo).
   c. **Pagamento** — Pix / Dinheiro (com troco) / Crédito / Débito. **Declarativo** —
      motoboy cobra na entrega ou cliente paga no balcão ao retirar.
   d. **Revisão** — resumo completo + tempo estimado + botão "Enviar pedido".
4. Ao enviar, **validar nesta ordem**: loja aberta → pedido mínimo (subtotal ≥ R$ 25) →
   bairro atendido. Falha → `OrderToast` com a mensagem.
5. `generateOrderId()` produz o `#XXXX`. `buildWhatsAppMessage` produz o texto.
   `window.open('https://wa.me/<numero>?text=<msg>')` abre o WhatsApp do cliente.
6. O componente `OrderStatusScreen` substitui a UI do checkout, mostrando: número do
   pedido, "Aguardando confirmação da loja no WhatsApp", tempo estimado (mesmo que vai
   na mensagem) e botão **Cancelar pedido** que chama
   `window.open('https://wa.me/<numero>?text=<buildCancelMessage(orderId)>')`.
7. O carrinho **é limpo só quando o cliente sai voluntariamente** da `OrderStatusScreen`
   (clicando em "Voltar ao cardápio") — pra que o número do pedido continue à mão se ele
   recarregar a aba acidentalmente.

---

## 9. PWA

`app/manifest.ts` (API de manifesto do Next): nome, ícones gerados da logo,
`theme_color` = `ink`, `display: standalone`. Banner discreto "Instale nosso app de
delivery" usando o evento `beforeinstallprompt`. Service worker mínimo (cache básico do
shell) — sem funcionalidade offline complexa.

---

## 10. Testes (Vitest + RTL)

- **Lógica:** `calcSubtotal`; `calcDiscount` (percent, fixed, `minSubtotal`); `findCoupon`;
  `groupByCategory`; `isOpen` (vários horários e dias, incluindo virada da meia-noite);
  `generateOrderId` (formato `#XXXX`, 4 dígitos com `padStart`); `estimateDeliveryMinutes`
  (cada faixa de taxa); `estimateTotalMinutes` (entrega vs retirada);
  `buildWhatsAppMessage` (entrega vs retirada, com/sem cupom, com/sem troco, com/sem
  observação, agrupando categorias na ordem do cardápio); `buildCancelMessage`.
- **Store:** add / remove / quantidade / limpar / cupom.
- **Componentes:** `AddToCartButton`, `CartDrawer`, etapas do checkout, `AddressForm`,
  `DeliveryEstimate`, `OrderStatusScreen` (render + botão cancelar abrindo
  `wa.me/<numero>?text=<mensagem>`).

Removidos os testes de `pix.ts` e `PixModal` (Ajuste #1).

Princípio mantido: testar comportamento e lógica, não aparência.

---

## 11. Mudanças por arquivo (resumo)

**Criar:**
- `lib/cart-store.ts`, `lib/cart.ts`, `lib/store-status.ts`, `lib/delivery-time.ts`,
  `lib/order-id.ts`, `lib/order-message.ts`, `lib/order-cancel-message.ts`
- `config/store.ts`, `data/coupons.ts`
- `components/cart/AddToCartButton.tsx`, `CartButton.tsx`, `CartDrawer.tsx`
- `components/checkout/IdentificationStep.tsx`, `DeliveryStep.tsx`, `AddressForm.tsx`,
  `DeliveryEstimate.tsx`, `PaymentStep.tsx`, `ReviewStep.tsx`, `OrderStatusScreen.tsx`
- `components/ui/OrderToast.tsx`
- `app/checkout/page.tsx`, `app/bairros/page.tsx`, `app/manifest.ts`
- Ícones do PWA

**Modificar:**
- `lib/types.ts` (adições: `CartItem`, `Coupon`, `Address`, `DeliveryMethod`,
  `PaymentMethod`, `Customer`)
- `components/sections/ProductCard.tsx` (botão adicionar ao carrinho)
- `app/layout.tsx` (`CartButton` global + manifesto)

**Removidos do spec anterior** (não vão ser criados):
- `lib/pix.ts`, `components/checkout/PixModal.tsx`
- Dependências `pix-utils` e `qrcode`

---

## 12. Critérios de sucesso

- Adicionar / remover / alterar quantidade no carrinho; o carrinho sobrevive a um reload.
- Cupom aplica o desconto correto e respeita `minSubtotal`.
- Checkout completo: identificação → entrega/retirada → endereço → pagamento → revisão.
- O número do pedido (`#XXXX`) aparece no topo da mensagem do WhatsApp e na
  `OrderStatusScreen`.
- Tempo estimado correto por bairro: 25 min preparo + 10–40 min por faixa de taxa;
  na retirada, só preparo. Mostrado como faixa "X–Y min".
- "Enviar pedido" abre o WhatsApp com a mensagem formatada (Apêndice A), com:
  - número no cabeçalho,
  - itens agrupados por categoria,
  - "Pagamento na entrega" (Entrega) ou "Pagamento no balcão" (Retirada) explícito,
  - nome "Bragas Lanches" no cabeçalho.
- Após o envio, a `OrderStatusScreen` aparece com o número do pedido, mensagem de espera,
  tempo estimado e botão **Cancelar pedido** visível e funcional.
- O botão cancelar reabre o WhatsApp com "Olá, gostaria de cancelar o pedido #XXXX."
- Validações barram loja fechada, pedido < R$ 25 e bairro não atendido.
- `/bairros` lista os 39 bairros com busca funcional.
- PWA instalável (manifesto + ícones).
- Tudo no tema preto e branco; `npm run lint`, `npm run build` e `npm test` limpos.

---

## Apêndice A — Formato das mensagens de WhatsApp

### Mensagem do pedido (cliente → loja)

```
*NOVO PEDIDO — Bragas Lanches*  #{XXXX}

👤 *Cliente*
{nome} — {telefone}

🍔 *Itens*

{CATEGORIA EM MAIÚSCULAS}
• {qtd}x {Nome do Produto} — R$ {subtotal do item}
   ↳ Obs: {observação}       (linha só aparece se houver observação)

(repete o bloco por categoria, na ordem do cardápio: Burgers, Trios, Tábuas,
Porções, Sobremesas, Molhos, Bebidas)

💰 *Resumo*
Subtotal: R$ {subtotal}
Taxa de entrega: R$ {taxa}      (só na modalidade Entrega)
Desconto: -R$ {desconto}        (só se houver cupom)
*Total: R$ {total}*

🕗 Tempo estimado: {X}–{Y} min  (faixa calculada por `estimateTotalMinutes`)

🛵 *Entrega*                    (bloco da modalidade Entrega)
{rua}, {número} — {bairro}, Rio de Janeiro
Complemento: {complemento}      (se houver)
Referência: {referência}        (se houver)

🏪 *Retirada no local*          (substitui o bloco de Entrega na modalidade Retirada)
{endereço da loja}

💳 *Pagamento na entrega*       (Entrega — cabeçalho)
💳 *Pagamento no balcão*        (Retirada — cabeçalho)
{forma de pagamento}
Troco para R$ {valor}           (só em Dinheiro com troco)
```

**Notas:**
- "**Pagamento na entrega**" / "**no balcão**" deixa explícito que a forma é declarativa
  — o motoboy cobra na maquininha (Entrega) ou o cliente paga no caixa (Retirada).
- "BURGERS", "TRIOS", "TÁBUAS" etc. aparecem em maiúsculas como no GrandChef.
- A linha de Pix copia-e-cola saiu (Ajuste #1).

### Mensagem de cancelamento (cliente → loja, via botão na `OrderStatusScreen`)

```
Olá, gostaria de cancelar o pedido #{XXXX}.
```

Enviada via `wa.me/<numero>?text=<msg>` quando o cliente clica em **Cancelar pedido**.
A loja, ao receber, cancela manualmente no chat (mesmo fluxo que existe hoje).
