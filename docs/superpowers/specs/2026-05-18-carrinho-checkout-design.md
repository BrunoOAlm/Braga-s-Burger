# Spec de Design — Carrinho + Checkout (Sub-projeto 2)

**Data:** 2026-05-18
**Sub-projeto:** 2 de 6 — Carrinho + Checkout
**Spec anterior:** `2026-05-17-landing-page-redesign-design.md` (sub-projeto 1, concluído)
**Status:** rascunho para revisão do usuário

---

## 1. Contexto

O sub-projeto 1 (landing page / cardápio) está concluído: o cardápio apenas **exibe**
~80 produtos. Este sub-projeto adiciona **carrinho de compras e checkout**, encerrando o
pedido com o envio de uma **mensagem de WhatsApp** formatada para a loja. Não há backend —
o sub-projeto 3 fará a API.

O cliente forneceu um material de referência do site GrandChef atual (estilo rosa/Material).
As **funcionalidades** desse material são adotadas; a **identidade visual não** — o checkout
segue o tema preto e branco do redesign. Stack do projeto: Next.js 16, React 19, TypeScript,
Tailwind v4, Framer Motion, Poppins + Inter.

### Escopo

**Dentro:** botão "adicionar" nos produtos; carrinho persistente; drawer do carrinho;
checkout em etapas (identificação → entrega/retirada → endereço → pagamento → revisão);
envio do pedido por WhatsApp; Pix estático (QR + copia-e-cola); cupons de desconto (locais);
página `/bairros`; PWA (manifesto + ícones + banner de instalação); validações
(loja fechada, pedido mínimo, bairro atendido).

**Fora do escopo (bloqueio técnico, não preferência):**

- **Login, "Minha conta", "Meus pedidos"** — exigem um backend para guardar usuários e
  pedidos. Não há backend (sub-projeto 3) e login é o sub-projeto 4. Sem backend,
  "meus pedidos" não tem onde existir.
- **Confirmação automática de pagamento Pix** — exige um PSP (Mercado Pago/Asaas) com chave
  secreta no servidor + webhook. Chave secreta não pode ir no código do cliente.
  Depende do backend. No v2, o Pix é **estático** e o "já paguei" é auto-declarado
  (a loja confere o comprovante no WhatsApp).
- **Customização multi-step de produto** (ponto da carne, adicionais pagos) — iteração
  futura, quando o cliente fornecer os dados. O modelo de dados do carrinho (`CartItem`)
  já é desenhado para receber um campo `options` sem refazer carrinho nem checkout.

---

## 2. Stack adicional

| Lib | Função |
|-----|--------|
| `zustand` | Estado do carrinho, com middleware `persist` em `localStorage` |
| `pix-utils` | Geração do BR Code (Pix copia-e-cola) no navegador |
| `qrcode` | Geração do QR Code do Pix |

Sem `shadcn/ui`, sem Roboto, sem Material Icons — mantém-se o design system existente.

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

`config/store.ts` — configuração da loja (valores reais são conteúdo do cliente):

```ts
export const storeConfig = {
  whatsappNumber: '5521984019048',
  name: "Braga's Burger",
  address: 'Higienópolis, Zona Norte — Rio de Janeiro',
  minOrder: 25,
  // null = fechado; senão [abre, fecha] em "HH:MM"
  openingHours: {
    sun: ['18:00', '00:00'], mon: null, tue: ['18:00', '23:40'],
    wed: ['18:00', '23:40'], thu: ['18:00', '23:40'],
    fri: ['18:00', '00:00'], sat: ['18:00', '00:00'],
  },
  pix: { key: '<CHAVE-PIX-DO-CLIENTE>', merchantName: 'BRAGAS BURGER', merchantCity: 'RIO DE JANEIRO' },
};
```

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

- `lib/cart.ts` — `calcSubtotal(items)`, `calcDiscount(subtotal, coupon)`, `findCoupon(code)`.
- `lib/store-status.ts` — `isOpen(date, openingHours)` → loja aberta/fechada agora.
- `lib/order-message.ts` — `buildWhatsAppMessage(order)` → string formatada (Apêndice A).
- `lib/pix.ts` — `gerarPixEstatico(amount, orderId)` → `{ brCode, qrDataUrl }`.
- `lib/format.ts` — reusa `formatPrice`.

A taxa de entrega **não** entra no store: depende do bairro escolhido no checkout.

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
| `components/checkout/PixModal` | QR Code + copia-e-cola; botão "Já paguei — enviar pedido" |
| `components/ui/OrderToast` | Aviso de erro de validação (rodapé) |
| `app/bairros/page.tsx` | Tabela de bairros + taxa + busca |

Transições (drawer, modal) com Framer Motion, respeitando `prefers-reduced-motion`.

---

## 8. Fluxo do pedido

1. Usuário adiciona produtos → `CartButton` mostra o contador.
2. Abre o `CartDrawer` → revê itens, ajusta quantidade, aplica cupom → "Fechar pedido".
3. `/checkout`, em etapas:
   a. **Identificação** — nome + telefone.
   b. **Entrega** — Entrega ou Retirada no local. Se Entrega → `AddressForm`
      (o bairro define a taxa via `deliveryAreas`).
   c. **Pagamento** — Pix / Dinheiro (com troco) / Crédito / Débito na entrega.
   d. **Revisão** — resumo completo + botão "Enviar pedido".
4. Ao enviar, **validar nesta ordem**: loja aberta → pedido mínimo (subtotal ≥ R$ 25) →
   bairro atendido. Falha → `OrderToast` com a mensagem.
5. Se pagamento = Pix → `PixModal` (QR + copia-e-cola); "Já paguei" prossegue.
6. `buildWhatsAppMessage` → `window.open('https://wa.me/<numero>?text=<msg>')`.
7. O carrinho é limpo.

---

## 9. PWA

`app/manifest.ts` (API de manifesto do Next): nome, ícones gerados da logo,
`theme_color` = `ink`, `display: standalone`. Banner discreto "Instale nosso app de
delivery" usando o evento `beforeinstallprompt`. Service worker mínimo (cache básico do
shell) — sem funcionalidade offline complexa.

---

## 10. Testes (Vitest + RTL)

- **Lógica:** `calcSubtotal`; `calcDiscount` (percent, fixed, `minSubtotal`); `findCoupon`;
  `isOpen` (vários horários e dias, incluindo virada da meia-noite); `buildWhatsAppMessage`
  (entrega vs retirada, com/sem cupom, com/sem troco); `gerarPixEstatico`.
- **Store:** add / remove / quantidade / limpar / cupom.
- **Componentes:** `AddToCartButton`, `CartDrawer`, etapas do checkout, `AddressForm`,
  `PixModal`.

Princípio mantido: testar comportamento e lógica, não aparência.

---

## 11. Mudanças por arquivo (resumo)

**Criar:** `lib/cart-store.ts`, `lib/cart.ts`, `lib/store-status.ts`, `lib/order-message.ts`,
`lib/pix.ts`, `config/store.ts`, `data/coupons.ts`, `components/cart/*`,
`components/checkout/*`, `components/ui/OrderToast.tsx`, `app/checkout/page.tsx`,
`app/bairros/page.tsx`, `app/manifest.ts`, ícones do PWA.

**Modificar:** `lib/types.ts`, `components/sections/ProductCard.tsx` (botão adicionar),
`app/layout.tsx` (`CartButton` global + manifesto).

---

## 12. Critérios de sucesso

- Adicionar/remover/alterar quantidade no carrinho; o carrinho sobrevive a um reload.
- Cupom aplica o desconto correto e respeita `minSubtotal`.
- Checkout completo: identificação → entrega/retirada → endereço → pagamento → revisão.
- "Enviar pedido" abre o WhatsApp com a mensagem formatada e correta.
- Pix gera QR Code + copia-e-cola válidos (BR Code reconhecido por apps de banco).
- Validações barram loja fechada, pedido < R$ 25 e bairro não atendido.
- `/bairros` lista os 39 bairros com busca funcional.
- PWA instalável (manifesto + ícones).
- Tudo no tema preto e branco; `npm run lint`, `npm run build` e `npm test` limpos.

---

## Apêndice A — Formato da mensagem de WhatsApp

```
*NOVO PEDIDO — Braga's Burger*

👤 Cliente: {nome}
📞 Telefone: {telefone}

🍔 *Itens*
• {qtd}x {NOME DO PRODUTO} — R$ {subtotal do item}
   ↳ Obs: {observação}      (linha só aparece se houver observação)

💰 *Resumo*
Subtotal: R$ {subtotal}
Taxa de entrega: R$ {taxa}     (só na modalidade Entrega)
Desconto: -R$ {desconto}       (só se houver cupom)
*Total: R$ {total}*

🛵 *Entrega*                   (bloco Entrega)
{rua}, {número} — {bairro}, Rio de Janeiro
Complemento: {complemento}     (se houver)
Referência: {referência}       (se houver)

🏪 *Retirada no local*         (substitui o bloco Entrega na modalidade Retirada)
{endereço da loja}

💳 *Pagamento*
{forma de pagamento}
Troco para R$ {valor}          (só em Dinheiro com troco)
Pix — copia-e-cola enviado; comprovante por aqui.   (só em Pix)
```
