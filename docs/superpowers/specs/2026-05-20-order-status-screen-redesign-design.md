# Spec de Design — OrderStatusScreen v2 (estilo iFood)

**Data:** 2026-05-20
**Sub-projeto:** 2 (Carrinho + Checkout) — refino visual
**Spec base:** `2026-05-18-carrinho-checkout-design.md`
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

A `OrderStatusScreen` atual (`components/checkout/OrderStatusScreen.tsx`) é a tela que
substitui o checkout assim que o cliente clica em **Enviar pedido**. Hoje ela mostra:

- Número do pedido em destaque (`#XXXX`)
- "Pedido enviado pelo WhatsApp" / "Aguardando confirmação"
- Tempo estimado em faixa de minutos (`X–Y min`)
- Botão **Cancelar pedido** + link **Voltar ao cardápio**

O cliente pediu uma tela inspirada na *Acompanhe seu pedido* do iFood
(referência: imagem do tweet `EDW7bsXWkAE66eA`), mas estilizada para o tema
preto/branco/cinza do site. A motivação é tornar a tela pós-envio mais "operacional"
— hoje ela parece um recibo, e o cliente quer que pareça um acompanhamento.

Sem backend (sub-projeto 3 traz a API), o status não pode ser realmente atualizado:
a UI desta versão fica "pronta para receber o status real" mostrando a timeline com
**apenas a primeira etapa acesa**. Quando o backend chegar, basta alimentar o estado
atual via prop ou store.

### Escopo

**Dentro:**

- Reescrever a `OrderStatusScreen` com 5 blocos (header, previsão, status, detalhes, ações).
- Calcular o horário absoluto de previsão de entrega (`HH:MM – HH:MM`) a partir do
  `estimateTotalMinutes` que já existe.
- Adicionar a timeline de 4 etapas (Recebido → Em preparo → Saiu → Entregue), com só
  a primeira acesa por enquanto.
- CTA principal "Abrir conversa no WhatsApp" + ações secundárias (Cancelar, Voltar).
- Link **Ajuda** no header → reabre a conversa do WhatsApp.

**Fora do escopo:**

- Atualização real de status (depende do backend — sub-projeto 3).
- Notificações push / lembrete de pedido (não há service worker rico ainda).
- Mapa de fundo decorativo do iFood — conflita com o tema seco do site.
- Customização de produto (já fora desde o spec base).

---

## 2. Tema e tokens

Reaproveita 100% dos tokens de `globals.css`:

| Token | Uso na tela |
|-------|-------------|
| `ink` (#0b0b0c) | Fundo da página |
| `surface` (#161618) | Fundo dos cards |
| `surface-hover` | Hover de botões secundários |
| `line` (#2e2e33) | Bordas dos cards e trilho da timeline |
| `paper` (#f5f4f1) | Texto principal, CTA primário, etapa atual da timeline |
| `muted` (#9b9ba3) | Texto secundário |
| `faint` (#8a8a90) | Labels e meta-texto |

Sem cores novas. Sem vermelho do iFood, sem verde de progresso.

---

## 3. Layout — 5 blocos verticais

Largura: `max-w-2xl` (mesma do checkout). Padding: `px-6 py-12`. Espaçamento entre
blocos: `space-y-6`.

### 3.1. Header

```
┌─────────────────────────────────────────────────────┐
│  ←     ACOMPANHE SEU PEDIDO              Ajuda     │
└─────────────────────────────────────────────────────┘
```

- `←` à esquerda, `aria-label="Voltar ao cardápio"`, leva para `/` sem limpar
  carrinho (link normal `next/link`).
- Título centralizado: `text-xs uppercase tracking-widest text-faint`.
- "Ajuda" à direita, sublinhado, `text-sm text-paper`. Ao clicar:
  `window.open('https://wa.me/<numero>?text=' + encodeURIComponent(buildHelpMessage(orderId)))`.

### 3.2. Previsão de entrega

```
Previsão de entrega                         Pedido #1234
19:25 – 19:45

█████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
●———————○———————○———————○
Recebido   Em preparo   Saiu     Entregue
```

- `Previsão de entrega` label em `text-xs text-faint uppercase tracking-widest`.
- `Pedido #1234` no canto direito, `text-xs text-faint`.
- Horário grande: `font-heading text-4xl font-extrabold text-paper`. Formato `HH:MM – HH:MM`.
- Calculado a partir de `now + estimateTotalMinutes(...)`, usando a nova lib
  `lib/order-time.ts` (`estimateClock`).
- Trilho horizontal: `h-1 bg-line` com segmento preenchido em `bg-paper`, largura
  proporcional ao número de etapas concluídas. Na v1 (sem backend), preenchimento
  fica em **25% (1 de 4)**.
- 4 ticks circulares (`h-2 w-2 rounded-full`) sobre o trilho. Tick 1: `bg-paper`.
  Ticks 2–4: `bg-line`.
- Labels embaixo dos ticks: `text-[10px] text-faint`. Tick ativo: `text-paper`.

**Acessibilidade:** o bloco inteiro é `role="status" aria-live="polite"` e tem um
`<span className="sr-only">` resumindo o estado: `"Pedido recebido. Previsão de
entrega entre 19:25 e 19:45."`.

### 3.3. Status atual

```
●  Pedido recebido — aguardando confirmação da loja no WhatsApp.
```

- Bolinha `h-2 w-2 rounded-full bg-paper` alinhada ao topo.
- Texto `text-sm text-paper`, segunda linha `text-muted` quando há detalhe extra.
- Hoje é uma linha fixa. Quando o backend vier, vira componente que mapeia
  `status → { dot, title, subtitle }`.

### 3.4. Detalhes do pedido (card)

```
┌─────────────────────────────────────────────────────┐
│  DETALHES DO PEDIDO                                 │
│                                                     │
│  ┌──┐                                               │
│  │BB│  Braga's Burger                Ligar  ☎      │
│  └──┘  N° do pedido #1234                           │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Entrega em                                         │
│  Rua X, 123 — Higienópolis                          │
│  Complemento: apto 302                              │
│                                                     │
│  Cliente                                            │
│  João Silva — (21) 99999-0000                       │
└─────────────────────────────────────────────────────┘
```

- Card: `rounded border border-line bg-surface p-6`.
- Título "DETALHES DO PEDIDO": `text-xs uppercase tracking-widest text-faint`.
- Avatar 40x40 circular com fundo `paper` e iniciais "BB" em `text-ink font-bold`.
- "Ligar" (canto direito): reabre o WhatsApp da loja com
  `buildContactMessage(orderId)` — "Olá, sobre o pedido #XXXX".
- **Endereço (delivery):** "Entrega em" + linha do endereço + complemento/referência.
- **Retirada:** substitui o bloco endereço por "Retirada no balcão" + endereço da loja
  (`storeConfig.address`).
- "Cliente": nome + telefone.

### 3.5. Ações

```
┌─────────────────────────────────────────────────────┐
│           Abrir conversa no WhatsApp                │  ← CTA primário
└─────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ Cancelar pedido  │  │ Voltar ao cardápio │
└──────────────────┘  └──────────────────┘
```

- CTA primário: `w-full rounded bg-paper px-4 py-3 font-semibold text-ink hover:bg-white`.
  Abre `wa.me/<numero>?text=buildContactMessage(orderId)`.
- Secundários lado a lado em grid 2 colunas (`grid grid-cols-2 gap-3`):
  - **Cancelar pedido** — mantém o comportamento atual (`buildCancelMessage`).
  - **Voltar ao cardápio** — `Link` para `/`, chama `clear()` do carrinho ao clicar
    (preserva o comportamento de hoje).

Ambos com `rounded border border-line px-4 py-2 text-sm hover:border-paper`.

---

## 4. Mudanças por arquivo

### Criar

- `lib/order-time.ts` — `estimateClock(now: Date, minutes: { min: number; max: number }): { start: string; end: string }`.
  Retorna `"HH:MM"` localizado pt-BR. Pure, sem dependência de `Intl` complexa.

### Modificar

- `lib/order-message.ts` — adicionar:
  - `buildContactMessage(orderId)` → `"Olá, sobre o pedido #XXXX"`
  - `buildHelpMessage(orderId)` → `"Olá, preciso de ajuda com o pedido #XXXX"`
- `components/checkout/OrderStatusScreen.tsx` — reescrever conforme seção 3.
  Nova assinatura de props:
  ```ts
  interface Props {
    orderId: string;
    estimatedMinutes: { min: number; max: number };
    method: DeliveryMethod;
    customer: Customer;
    address?: Address; // obrigatório quando method === 'delivery'
  }
  ```
- `app/checkout/page.tsx` — passar `method`, `customer`, `address` ao
  `<OrderStatusScreen>`; congelar esses valores no momento do envio (já são
  state da página, sem trabalho extra).

### Sem alteração de assinatura, só conteúdo

- `components/checkout/OrderStatusScreen.test.tsx` — substituir a cobertura para
  refletir os 5 blocos e os 4 botões. Os helpers de mock do RTL já existem.

---

## 5. Testes (Vitest + RTL)

### Unitários — `lib/order-time.ts`

- `estimateClock(new Date('2026-05-20T18:00:00'), { min: 30, max: 50 })`
  → `{ start: '18:30', end: '18:50' }`.
- Cobre virada de hora: `19:50` + 30 min → `20:20`.
- Cobre virada de dia: `23:50` + 30 min → `00:20`.

### Unitários — `lib/order-message.ts`

- `buildContactMessage('#1234')` → exatamente `"Olá, sobre o pedido #1234."`.
- `buildHelpMessage('#1234')` → exatamente `"Olá, preciso de ajuda com o pedido #1234."`.

### Componente — `OrderStatusScreen.test.tsx`

- Renderiza nº do pedido (`#XXXX`) e horário formatado (`HH:MM – HH:MM`).
- Renderiza os 4 labels da timeline (Recebido / Em preparo / Saiu / Entregue), com
  apenas "Recebido" marcado como ativo (verifica por `aria-current="step"`).
- Botão **Abrir conversa no WhatsApp** chama `window.open` com URL contendo
  `wa.me/<numero>?text=` + `encodeURIComponent(buildContactMessage)`.
- Botão **Cancelar pedido** chama `window.open` com `buildCancelMessage`.
- Botão **Ajuda** chama `window.open` com `buildHelpMessage`.
- Botão **Voltar ao cardápio** chama `clear()` do `useCartStore`.
- Em `method === 'delivery'`, mostra "Entrega em" + endereço.
- Em `method === 'pickup'`, mostra "Retirada no balcão" + endereço da loja.

`window.open` é mockado com `vi.stubGlobal('open', ...)` (já é o padrão dos outros
testes do projeto — verificar antes de implementar).

---

## 6. Acessibilidade

- Header: `←` tem `aria-label="Voltar ao cardápio"`. Título do bloco usa `<h1>`.
- Bloco de previsão é `role="status" aria-live="polite"` com `sr-only` resumindo o
  estado para leitores de tela.
- Cada tick da timeline: `aria-current="step"` quando ativo, `aria-label` com o nome
  da etapa.
- Todos os botões mantêm `:focus-visible` global (já configurado em `globals.css`).
- Contrastes: `paper` sobre `ink` e `surface` está acima de 12:1 — ok.

---

## 7. Comportamento e estado

- Estado atual da timeline é **fixo em "Recebido"** na v1. Sem timer, sem cron, sem
  websocket. A escolha foi do cliente, justamente para não fingir progresso que não
  existe.
- O sub-projeto 3 introduzirá o status real (vindo do backend). Na refatoração desse
  ponto:
  - `OrderStatusScreen` ganhará uma prop `status: 'received' | 'preparing' | 'out' | 'delivered'`.
  - A largura da barra preenchida, o tick ativo e o texto do bloco 3.3 (Status atual)
    passam a derivar dessa prop.
  - Esta estrutura já foi pensada pra isso — mudança será aditiva, não destrutiva.

- O carrinho continua sendo limpo apenas quando o cliente clica em **Voltar ao
  cardápio**. Mantido para que o cliente possa recarregar a aba sem perder o nº do
  pedido (decisão herdada do spec base).

---

## 8. Critérios de sucesso

- Tela pós-envio mostra 5 blocos: header, previsão, status, detalhes, ações.
- Horário de previsão é calculado em pt-BR `HH:MM – HH:MM` baseado em `now +
  estimateTotalMinutes`.
- Timeline com 4 etapas visíveis, apenas "Recebido" acesa.
- CTA primário "Abrir conversa no WhatsApp" reabre o WhatsApp com a mensagem
  `buildContactMessage`.
- Link "Ajuda" reabre o WhatsApp com `buildHelpMessage`.
- Card de detalhes mostra logo, nome da loja, nº do pedido, endereço (Entrega) ou
  endereço da loja (Retirada), e dados do cliente.
- Tema continua preto/branco/cinza, sem cor nova introduzida.
- `npm run lint`, `npm run build` e `npm test` passam limpos.
- Testes novos cobrem `estimateClock`, `buildContactMessage`, `buildHelpMessage` e o
  componente.

---

## 9. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Cliente acha que o status avança sozinho | O texto do bloco 3.3 deixa claro "aguardando confirmação da loja no WhatsApp". |
| Horário absoluto fica desatualizado se a aba ficar aberta muito tempo | Aceitável na v1 — sem backend, o "agora" é o momento do envio. Sub-projeto 3 corrige. |
| Cancelar pedido + Voltar ao cardápio gera dúvida | Botões secundários, com pesos visuais iguais e rótulos claros. CTA principal é WhatsApp. |
| Quebrar testes existentes do `OrderStatusScreen` | Os testes serão reescritos junto com o componente — não há outras telas dependentes. |
