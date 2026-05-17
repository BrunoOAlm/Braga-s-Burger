# Spec de Design — Redesign da Landing Page Braga's Burger

**Data:** 2026-05-17
**Sub-projeto:** 1 de 6 — Landing Page / Cardápio (iteração 2 — redesign)
**Spec anterior:** `2026-05-15-landing-page-design.md` (versão original, implementada)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

A landing page do sub-projeto 1 foi implementada na branch `feat/landing-page` com uma identidade
provisória (laranja/dourado/creme) e dados de exemplo. O cliente decidiu, antes de seguir para o
sub-projeto 2 (Carrinho + Checkout), fazer um **redesign** para:

1. Substituir a animação de intro (chuva de emoji 🍔) por um **vídeo real de fundo**.
2. Integrar a **logo oficial** do negócio.
3. Trocar a identidade visual para **preto e branco premium**.
4. Substituir os produtos de exemplo pelo **cardápio real** (~80 itens).

Este spec cobre apenas essas mudanças no sub-projeto 1. Carrinho, checkout, backend, login,
painel admin e deploy continuam fora do escopo (sub-projetos 2 a 6).

### Escopo

**Dentro do escopo:** nova identidade visual monocromática; hero com vídeo de fundo; integração da
logo; cardápio real com 7 categorias; download e integração das fotos reais de produto; atualização
da InfoSection com dados reais (endereço, horário, taxas de entrega, formas de pagamento, contato);
consulta de taxa de entrega por bairro; fechamento das pendências de acessibilidade conhecidas.

**Fora do escopo:** carrinho, seleção de tamanhos/adicionais, checkout, pagamento, backend/API,
login, painel admin, deploy. Aqui o cardápio apenas **exibe** os produtos.

---

## 2. Decisões de design (validadas com o cliente)

| Tema | Decisão |
|------|---------|
| Vídeo | Fundo apenas do Hero (topo da página), em loop, mudo |
| Intro de emoji | Removida; substituída por entrada elegante (fade + subida) do conteúdo do Hero |
| Logo | Cliente forneceu arquivo (`public/images/Logo.png`) |
| Identidade visual | Preto e branco — **premium suave** (preto profundo, branco quente, cinzas) |
| Cores quentes | Removidas por completo — sem laranja, sem dourado |
| Fotos de produto | Sempre coloridas (único ponto de cor do site) |
| Fotos faltantes | Trios reaproveitam a foto do burger; molhos/bebidas usam placeholder |

---

## 3. Tokens de design

Substituem por completo a paleta de `globals.css`. Identidade monocromática "premium suave":
hierarquia construída por **valor** (claro/escuro) e **espaço**, não por cor.

### Cores

| Token | Hex | Uso |
|-------|-----|-----|
| `ink` | `#0B0B0C` | Fundo principal — preto profundo (não puro) |
| `surface` | `#161618` | Cards e superfícies elevadas |
| `surface-hover` | `#212124` | Hover de cards/superfícies |
| `line` | `#2E2E33` | Bordas e divisórias sutis |
| `paper` | `#F5F4F1` | Texto principal — branco quente |
| `muted` | `#9B9BA3` | Texto secundário (cinza) |
| `faint` | `#646469` | Legendas, texto terciário |
| `white` | `#FFFFFF` | Apenas no fundo dos botões de ação (CTA) |

Removidos: `brand-orange`, `brand-orange-light`, `brand-brown`, `brand-cream`, `brand-dark`,
`brand-gold`.

### Tipografia

- **Títulos:** Poppins (600 / 700 / 800) — mantida.
- **Corpo:** Inter (400 / 500) — mantida.
- Rótulos em maiúsculas (ex.: "HAMBURGUERIA ARTESANAL") com `letter-spacing` ampliado.
- Corpo mínimo no mobile: 16px.

### Interação

- Hover **não usa cor** — apenas clareia levemente a superfície/borda e aplica um leve `scale`/lift.
- Sombras suaves e discretas; nada de brilho exagerado.
- Botão primário: fundo branco + texto `ink` (contraste máximo). Botão secundário: transparente
  com borda `line`.

---

## 4. Hero com vídeo de fundo

- **Vídeo:** `public/videos/hero-bg.mp4` (1920×1080, H.264, 5s) em `<video>` com `autoPlay`,
  `muted`, `loop`, `playsInline`, `object-cover`, ocupando a primeira tela inteira.
- **Camada de leitura:** gradiente preto (~55%) sobre o vídeo para garantir contraste do conteúdo.
- **Fallback:** fundo `ink` sólido atrás do vídeo (sem flash preto enquanto carrega).
- **Conteúdo do Hero:** logo (destaque central) → rótulo "HAMBURGUERIA ARTESANAL" → tagline curta
  → CTA "Ver cardápio". O `<h1>` "Braga's Burger" permanece no DOM como texto acessível
  (`sr-only`) — a logo já comunica o nome visualmente.
- **Entrada elegante:** ao carregar, a logo entra com fade + leve zoom; em seguida tagline e CTA
  sobem suavemente em cascata (~0,7s total).
- **Acessibilidade:** com `prefers-reduced-motion`, o vídeo não toca (Hero estático sobre fundo
  `ink`) e a entrada em cascata é desativada.

### Remoções

- `components/hero/BurgerRain.tsx` — apagado.
- `components/hero/ParticleExplosion.tsx` — apagado.
- `lib/intro.ts` e `lib/intro.test.ts` — apagados (não há mais portão de intro por sessão).
- `app/globals.css` — remover apenas as cores antigas; o `@keyframes carousel-scroll` é mantido
  (ainda usado pelo `FeaturedCarousel`).

---

## 5. Logo

- **Origem:** `public/images/Logo.png` — 1254×1254, monocromática, **sem transparência**
  (fundo escuro embutido), 2,3 MB.
- **Processamento:** recortar o emblema circular com **fundo transparente** e redimensionar para
  ~512px → resultado salvo como `public/images/logo.png` (~80 KB esperado). O arquivo original é
  preservado como `public/images/Logo-original.png`.
- **Componente:** `components/ui/Logo.tsx` — renderiza a logo via `<Image>` do Next num tamanho
  parametrizável. Reutilizado em Navbar, Hero e Footer.
- **Aplicação:**
  - Navbar — logo circular ~44px à esquerda (substitui o texto dourado atual).
  - Hero — logo como destaque central, ~140px.
  - Footer — logo ~56px.
  - Favicon — gerado a partir da logo (`app/favicon.ico` / `app/icon.png`).

---

## 6. Modelo de dados

`lib/types.ts`:

```ts
export interface Category {
  id: string;
  name: string;
  order: number;
  layout: 'grid' | 'list'; // grid = cards com foto; list = lista compacta
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string;     // bebidas/molhos podem não ter descrição
  price: number;            // em reais, ex.: 22.90
  priceFrom: boolean;       // true → exibe "A partir de R$ X"
  imageUrl: string | null;  // null → exibe placeholder
  featured: boolean;        // aparece no carrossel de destaques
  available: boolean;       // false → exibe "Esgotado"
}

export interface DeliveryArea {
  neighborhood: string;
  fee: number;              // taxa de entrega em reais
}
```

- `data/menu.ts` — exporta `categories` e `products` (cardápio real completo — Apêndice A).
- `data/delivery.ts` — exporta `deliveryAreas: DeliveryArea[]` (39 bairros — Apêndice B).
- `lib/format.ts` — ganha `formatProductPrice(product)` → `"A partir de R$ 22,90"` ou `"R$ 3,90"`.

Os tipos espelham a futura resposta da API (sub-projeto 4): na migração, só a fonte muda.

---

## 7. Cardápio real

### Categorias (ordem de exibição)

| # | id | Nome | Layout | Itens |
|---|----|----|--------|-------|
| 1 | `burgers` | Burgers | grid | 14 |
| 2 | `trios` | Trios | grid | 14 |
| 3 | `tabuas` | Tábuas | grid | 14 |
| 4 | `porcoes` | Porções | grid | 10 |
| 5 | `sobremesas` | Sobremesas | grid | 2 |
| 6 | `molhos` | Molhos | list | 3 |
| 7 | `bebidas` | Bebidas | list | 23 |

### Fotos

- **39 fotos reais** baixadas das URLs do GrandChef (Apêndice C) → `public/images/products/`,
  nomeadas pelo `id` do produto (ex.: `braguinha.webp`). Baixadas localmente — sem hotlink.
- **Trios** reaproveitam o `imageUrl` do burger correspondente (mapa no Apêndice A).
- **Molhos, Bebidas e Tábua Vegano** → `imageUrl: null`.
- Fotos exibidas **coloridas**, via `<Image>` do Next (otimização + lazy-load).

### Layouts do cardápio (`MenuSection`)

- **Filtro de categorias** (`CategoryFilter`): 8 pílulas (Todos + 7 categorias).
- **Categoria com `layout: 'grid'`** → grade de `ProductCard` (1/2/3 colunas).
- **Categoria com `layout: 'list'`** → `ProductList`: lista compacta de linhas
  "nome … preço" em 2 colunas (padrão usado por iFood/Rappi para bebidas).
- **"Todos" selecionado** → renderiza cada categoria como um bloco rotulado (subtítulo da
  categoria + seu layout próprio), formando um cardápio completo agrupado.
- Preço exibido via `formatProductPrice` (prefixo "A partir de" quando `priceFrom`).

### ProductCard

- Card de fundo `surface`, cantos arredondados, borda `line` sutil.
- Foto colorida no topo (proporção 4:3) via `<Image>`.
- Quando `imageUrl` é `null` → **placeholder**: superfície `ink` texturizada com ícone
  monocromático da categoria + nome.
- Badge "Esgotado" quando `available: false`.
- Hover: leve `scale` + clareamento da borda (sem cor).

---

## 8. InfoSection — dados reais

Endereço: **Higienópolis, Zona Norte — Rio de Janeiro**.

Quatro blocos:

1. **Horário**
   - Terça a Quinta: 18h – 23h40
   - Sexta a Domingo: 18h – 00h
   - Segunda: fechado

2. **Entrega**
   - Opções: **Entrega** ou **Retirada**
   - Pedido mínimo: **R$ 25,00**
   - Taxa de entrega: **R$ 4,99 a R$ 10,99** conforme o bairro
   - **Consulta de taxa por bairro** (`DeliveryLookup`): o cliente seleciona o bairro e o
     componente exibe a taxa correspondente. 39 bairros atendidos (Apêndice B).

3. **Formas de pagamento**
   - Dinheiro, Crédito, Débito, Pix (QR Code)
   - Vale-refeição: Ticket, Sodexo, Alelo, Gren Card

4. **Contato**
   - WhatsApp: (21) 98401-9048 → link `https://wa.me/5521984019048`
   - Instagram: [@bragas_burger](https://www.instagram.com/bragas_burger/)

Removida a lista de bairros de São Paulo (Santana, Tucuruvi etc.) — estava geograficamente errada.

---

## 9. Galeria

A `Gallery` atual aponta para 6 fotos inexistentes (`/images/galeria-*.jpg`). **Decisão:**
reaproveitar a seção como **vitrine curada** das melhores fotos de produto (grade clicável com
lightbox). Mantém o lightbox e a navegação por teclado, agora com **focus-trap** (pendência
de acessibilidade — ver §11).

---

## 10. Footer

- Fundo `ink`, logo ~56px, identidade monocromática.
- Links-âncora (Cardápio, Galeria, Contato) + redes sociais.
- **Links de Políticas e Termos** (pendência conhecida): adicionar links de "Política de
  Privacidade" e "Termos de Uso". Como ainda não há páginas de conteúdo, apontam para rotas
  placeholder (`/politica-de-privacidade`, `/termos`) a serem preenchidas depois, **ou** o cliente
  decide ocultá-los até existir conteúdo — confirmar na revisão do spec.

---

## 11. Acessibilidade

Mantém os critérios do spec original e **fecha as pendências conhecidas**:

- **Focus-trap no lightbox da Galeria** — foco do teclado preso dentro do modal enquanto aberto;
  retorna ao gatilho ao fechar.
- **`radiogroup` no `CategoryFilter`** — `role="radiogroup"` no container e `role="radio"` +
  `aria-checked` nas pílulas; navegação por setas.
- Contraste ≥ 4.5:1 (verificar branco quente sobre `ink` e cinzas).
- `prefers-reduced-motion` respeitado (vídeo do Hero, entrada em cascata, scroll, hover).
- `alt` descritivo nas fotos; `aria-label` em botões de ícone.
- Vídeo do Hero é decorativo: mudo e sem controles obrigatórios.

---

## 12. Performance

- **Logo:** otimizada nesta entrega (recorte + resize → ~80 KB).
- **Fotos de produto:** já vêm em `.webp` otimizado (~12–18 KB cada); 39 arquivos ≈ 600 KB.
- **Vídeo do Hero:** 11,8 MB com bitrate ~19,7 Mbps — **pesado**. Compressão para ~2–4 MB fica
  como **tarefa final** (requer `ffmpeg`, não instalado na máquina do cliente). Até lá, desenvolve-se
  com o arquivo atual. Ao comprimir, extrair também um quadro de `poster` para o `<video>`.
- `<Image>` do Next para fotos de produto e logo (lazy-load, dimensionamento correto).
- Antes de usar `<video>`/`<Image>`, **ler os docs do Next** em `node_modules/next/dist/docs/`
  (conforme `AGENTS.md` — esta versão do Next pode divergir do conhecido).

---

## 13. Mudanças por arquivo

### Criar
- `components/ui/Logo.tsx` — wrapper da logo.
- `components/sections/ProductList.tsx` — lista compacta (molhos/bebidas).
- `components/sections/DeliveryLookup.tsx` — consulta de taxa por bairro.
- `data/delivery.ts` — 39 bairros + taxas.
- `public/images/products/*.webp` — 39 fotos baixadas.
- `public/images/logo.png` — logo processada (transparente).

### Modificar
- `app/globals.css` — nova paleta.
- `app/layout.tsx` — metadata; favicon a partir da logo.
- `components/hero/HeroSection.tsx` — vídeo de fundo, entrada elegante, sem intro.
- `components/layout/Navbar.tsx` — logo, tema monocromático.
- `components/layout/Footer.tsx` — logo, tema, links de políticas.
- `components/sections/ProductCard.tsx` — tema, placeholder, `priceFrom`, `<Image>`.
- `components/sections/CategoryFilter.tsx` — 7 categorias, `radiogroup`, tema.
- `components/sections/MenuSection.tsx` — roteamento grid/list, view "Todos" agrupada.
- `components/sections/FeaturedCarousel.tsx` — tema, destaques reais.
- `components/sections/Gallery.tsx` — fotos de produto, focus-trap, tema.
- `components/sections/InfoSection.tsx` — dados reais, `DeliveryLookup`.
- `components/ui/Button.tsx` — variantes monocromáticas.
- `data/menu.ts` — cardápio real.
- `lib/types.ts` — `priceFrom`, `imageUrl` opcional, `layout`, `DeliveryArea`.
- `lib/format.ts` — `formatProductPrice`.
- Testes afetados (`*.test.tsx` / `*.test.ts`) — atualizados.

### Remover
- `components/hero/BurgerRain.tsx`
- `components/hero/ParticleExplosion.tsx`
- `lib/intro.ts`, `lib/intro.test.ts`

---

## 14. Testes

Princípio mantido: testar lógica e comportamento, não aparência.

| Alvo | Abordagem |
|------|-----------|
| `formatProductPrice` (com/sem `priceFrom`) | TDD — Vitest |
| `filterProducts` com as 7 categorias reais | Atualizar testes — Vitest |
| Consulta de taxa por bairro (`DeliveryLookup`) | TDD — Vitest + RTL |
| `ProductCard` com foto e com placeholder | Render — RTL |
| `CategoryFilter` — `radiogroup` e seleção | Render + interação — RTL |
| `ProductList` — render das linhas | Render — RTL |
| Focus-trap do lightbox | Comportamento (foco preso/retornado) — RTL |
| `HeroSection` — sem intro, conteúdo presente | Render — RTL |

---

## 15. Ordem de construção

1. **Tema** — nova paleta em `globals.css`; `Button` monocromático.
2. **Logo** — processar o arquivo; criar `Logo.tsx`; favicon.
3. **Hero** — vídeo de fundo + entrada elegante; remover `BurgerRain`/`ParticleExplosion`/`intro`.
4. **Dados** — `types.ts`, `menu.ts` (cardápio real), `delivery.ts`, `format.ts`.
5. **Fotos** — baixar as 39 fotos para `public/images/products/`.
6. **Cardápio** — `ProductCard` (+ placeholder), `ProductList`, `CategoryFilter` (radiogroup),
   `MenuSection` (grid/list + "Todos").
7. **Destaques e Galeria** — `FeaturedCarousel` no tema; `Gallery` repaginada + focus-trap.
8. **Informações** — `InfoSection` com dados reais + `DeliveryLookup`; `Navbar` e `Footer`.
9. **Polimento** — responsividade (375/768/1024/1440), revisão de acessibilidade, compressão do
   vídeo + `poster`, Lighthouse.

Cada passo encerra com code review explicado (o cliente é desenvolvedor júnior e acompanha
para aprender).

---

## 16. Critérios de sucesso

- Site inteiro em preto e branco — nenhuma cor quente remanescente.
- Hero exibe o vídeo em loop com a logo e a entrada elegante; respeita `prefers-reduced-motion`.
- Logo integrada na Navbar, Hero, Footer e favicon, sem o quadrado de fundo.
- Cardápio exibe os ~80 produtos reais nas 7 categorias, com fotos coloridas e placeholders
  onde não há foto.
- Filtro de categorias funciona e tem semântica `radiogroup`.
- `DeliveryLookup` mostra a taxa correta para cada um dos 39 bairros.
- InfoSection exibe horário, formas de pagamento e contato reais.
- Lightbox da Galeria com focus-trap funcional.
- Layout sem quebras em 375 / 768 / 1024 / 1440px.
- `npm run lint`, `npm run build` e `npm test` passando.

---

## Apêndice A — Cardápio real

`A partir de` → `priceFrom: true`. Todos os itens com `available: true`.
Destaques (`featured: true`): Duplo, Majestoso, Crispy Catupiry, Explosão de Cheddar, Épico,
Triplo Smash.

### Burgers (`burgers`, grid)

| id | Nome | Preço | priceFrom |
|----|------|-------|-----------|
| `braguinha` | Braguinha — Pão de brioche, 100g blend bovino, queijo, ovo, alface, tomate e molho de bacon | 22,90 | sim |
| `chicken` | Chicken — Pão brioche, tiras de frango, queijo, alface, tomate e molho de bacon | 25,90 | sim |
| `crispy-catupiry` | Crispy Catupiry — Pão brioche, 150g blend bovino, Catupiry empanado, 2 fatias de cheddar, rúcula e tomate | 39,90 | sim |
| `dogao-linguica` | Dogão Linguiça — Baguete parmesão, linguiça suína, queijo no maçarico, bacon em cubo, batata palha e molho de alho | 22,90 | sim |
| `dogao-salsicha` | Dogão Salsicha — Baguete parmesão, salsicha, queijo no maçarico, bacon em cubo, batata palha e molho de alho | 22,90 | sim |
| `duplo` | Duplo — Pão brioche, 2 blends bovinos (150g cada), mix de queijos, bacon americano, molho de alho e onion rings | 39,90 | sim |
| `duplo-smash` | Duplo Smash — Pão brioche, 2 blends bovinos 100g cada, cheddar, bacon americano e barbecue | 34,90 | sim |
| `epico` | Épico — Pão australiano, 150g blend bovino, molho cheddar, queijo cheddar, cebola caramelizada e bacon em cubos | 36,90 | sim |
| `explosao-cheddar` | Explosão de Cheddar — Pão brioche, 2 blends bovinos 100g cada, molho cheddar e bacon em cubos | 38,90 | sim |
| `gourmet` | Gourmet — Pão australiano, 150g blend bovino, cheddar, anéis de cebola e molho de bacon | 29,90 | sim |
| `kids-alice` | Kids Alice — Pão brioche, 100g blend bovino, queijo e ketchup | 18,90 | sim |
| `majestoso` | Majestoso — Pão de brioche, 2 carnes 100g blend bovino, catupiry, cheddar, cebola crispy e bacon em cubos | 37,90 | sim |
| `triplo-smash` | Triplo Smash — Pão brioche, 3 blends bovinos 100g cada, cheddar, bacon americano e barbecue | 38,90 | sim |
| `vegano` | Vegano — Pão australiano, hambúrguer vegano, alface, rúcula, tomate, cebola roxa e maionese vegana | 34,90 | sim |

### Trios (`trios`, grid) — reaproveitam a foto do burger

Cada trio acompanha fritas + bebida. `imageUrl` = foto do burger indicado.

| id | Nome | Preço | Foto de |
|----|------|-------|---------|
| `trio-alice` | Trio Alice (acompanha fritas Smile ou Nugget) | 28,80 | `kids-alice` |
| `trio-braguinha` | Trio Braguinha | 32,80 | `braguinha` |
| `trio-chicken` | Trio Chicken | 35,80 | `chicken` |
| `trio-crispy-catupiry` | Trio Crispy Catupiry | 49,80 | `crispy-catupiry` |
| `trio-dogao-linguica` | Trio Dogão Linguiça | 32,80 | `dogao-linguica` |
| `trio-dogao-salsicha` | Trio Dogão Salsicha | 32,80 | `dogao-salsicha` |
| `trio-duplo` | Trio Duplo | 49,80 | `duplo` |
| `trio-duplo-smash` | Trio Duplo Smash | 44,80 | `duplo-smash` |
| `trio-epico` | Trio Épico | 46,80 | `epico` |
| `trio-explosao` | Trio Explosão | 48,80 | `explosao-cheddar` |
| `trio-gourmet` | Trio Gourmet | 39,80 | `gourmet` |
| `trio-majestoso` | Trio Majestoso | 47,80 | `majestoso` |
| `trio-triplo-smash` | Trio Triplo Smash | 48,80 | `triplo-smash` |
| `trio-vegano` | Trio Vegano | 44,80 | `vegano` |

Todos os trios: `priceFrom: true`.

### Tábuas (`tabuas`, grid)

Todas: `priceFrom: true`. Tábua Vegano sem foto (`imageUrl: null`).

| id | Nome | Preço |
|----|------|-------|
| `tabua-braga-chicken` | Tábua Braga Chicken — 2 sanduíches + fritas + anéis de cebola + molho + refrigerante | 74,90 |
| `tabua-braguinha` | Tábua Braguinha — 2 braguinhas + fritas + calabresa fatiada + molho + refrigerante | 70,90 |
| `tabua-crispy-catupiry` | Tábua Crispy Catupiry — 2 sanduíches + fritas + anéis de cebola + molho + refrigerante | 96,90 |
| `tabua-dogao-linguica` | Tábua Dogão Linguiça — 2 dogões + fritas + calabresa fatiada + molho + refrigerante | 70,90 |
| `tabua-dogao-salsicha` | Tábua Dogão Salsicha — 2 dogões + fritas + calabresa fatiada + molho + refrigerante | 70,90 |
| `tabua-duplo` | Tábua Duplo — 2 sanduíches duplos + fritas + anéis de cebola + molho + refrigerante | 96,90 |
| `tabua-duplo-smash` | Tábua Duplo Smash — Duplo Smash + fritas + calabresa fatiada + molho + refrigerante | 90,90 |
| `tabua-epico` | Tábua Épico — 2 Épicos + fritas + anéis de cebola + molho + refrigerante | 91,90 |
| `tabua-explosao-cheddar` | Tábua Explosão de Cheddar — 2 sanduíches + fritas + calabresa fatiada + molho + refrigerante | 92,90 |
| `tabua-familia` | Tábua Família — 4 braguinhas + fritas + molho + refrigerante 2L | 104,90 |
| `tabua-gourmet` | Tábua Gourmet — 2 sanduíches gourmet + fritas + anéis de cebola + molho + refrigerante | 83,90 |
| `tabua-majestoso` | Tábua Majestoso — 2 majestosos + fritas + anéis de cebola + molho + refrigerante | 97,90 |
| `tabua-triplo-smash` | Tábua Triplo Smash — 2 Triplo Smash + fritas + calabresa fatiada + molho + refrigerante | 94,90 |
| `tabua-vegano` | Tábua Vegano — 2 sanduíches veganos + fritas + anéis de cebola + molho + refrigerante | 92,90 |

### Porções (`porcoes`, grid)

| id | Nome | Preço | priceFrom |
|----|------|-------|-----------|
| `frango-empanado-grande` | Frango Empanado Frito (Grande) — 12 tiras + fritas + molho da casa | 63,90 | não |
| `frango-empanado-media` | Frango Empanado Frito (Média) — 6 tiras + fritas + molho da casa | 45,90 | não |
| `fritas-grande` | Fritas Grande | 29,90 | sim |
| `fritas-media` | Fritas Média | 19,90 | sim |
| `fritas-pequena` | Fritas Pequena | 9,90 | sim |
| `aneis-cebola` | Porção de Anéis de Cebola — 12 unidades + molho barbecue | 28,90 | não |
| `coxinhas` | Porção de Coxinhas — 10 unidades + molho ketchup | 21,90 | não |
| `nugget-supreme` | Porção de Nugget Supreme — 10 unidades + molho ketchup | 21,90 | não |
| `frango-passarinho` | Porção Frango a Passarinho — + molho barbecue à parte | 35,90 | não |
| `roda-gigante` | Roda Gigante de Petiscos — anéis de cebola, frango a passarinho, fritas, linguiça + molho | 64,90 | não |

### Sobremesas (`sobremesas`, grid)

| id | Nome | Preço | priceFrom |
|----|------|-------|-----------|
| `brownie-sorvete` | Brownie com Sorvete — brownie + sorvete de creme + morango + Nutella | 28,90 | não |
| `matilda-cake` | Matilda Cake — bolo de chocolate meio amargo, recheio de brigadeiro e ganache | 24,90 | não |

### Molhos (`molhos`, list) — sem foto

| id | Nome | Preço |
|----|------|-------|
| `molho-barbecue` | Molho Barbecue | 3,90 |
| `molho-alho` | Molho de Alho | 3,90 |
| `molho-bacon` | Molho de Bacon | 3,90 |

### Bebidas (`bebidas`, list) — sem foto, `priceFrom: false`

Água com gás 4,90 · Água Tônica Lata 7,90 · Coca-Cola 2L 13,90 · Coca-Cola 600ml 8,90 ·
Coca-Cola Lata 7,90 · Coca-Cola Zero 2L 13,90 · Coca-Cola Zero 600ml 8,90 · Coca-Cola Zero Lata 7,90 ·
Corona 330ml 9,90 · Red Bull 250ml 12,90 · Fanta Laranja Lata 7,90 · Guaraná Antártica 600ml 8,90 ·
Guaraná Antártica 2L 13,90 · Guaraná Antártica Lata 7,90 · Guaraná Antártica Zero Lata 7,90 ·
Guaravita 300ml 3,90 · H2O Limão 8,90 · H2O Limoneto 8,90 · Heineken 330ml 9,90 ·
Heineken 330ml Zero 9,90 · Ice Tea Pêssego 300ml 7,90 · Matte 300ml 7,90 · Sprite Lata 7,90.

---

## Apêndice B — Áreas de entrega (39 bairros, Rio de Janeiro)

| Bairro | Taxa | Bairro | Taxa | Bairro | Taxa |
|--------|------|--------|------|--------|------|
| Abolição | 9,99 | Engenho Novo | 7,99 | Penha | 9,99 |
| Adeus | 6,99 | Grajaú | 10,99 | Penha Circular | 10,99 |
| Amorim | 6,99 | Higienópolis | 4,99 | Pilares | 8,99 |
| Arará | 5,99 | Inhaúma | 6,99 | Ramos | 6,99 |
| Benfica | 6,99 | Jacaré | 5,99 | Riachuelo | 6,99 |
| Bonsucesso | 6,99 | Jacarezinho | 5,99 | Rocha | 7,99 |
| Cachambi | 6,99 | Mandela | 5,99 | Sampaio | 7,99 |
| CAH | 4,99 | Mangueira | 7,99 | São Cristóvão | 8,99 |
| Complexo do Alemão | 7,99 | Manguinhos | 5,99 | São Francisco Xavier | 7,99 |
| Del Castilho | 5,99 | Maracanã | 9,99 | Tijuca | 9,99 |
| Engenho da Rainha | 8,99 | Maria da Graça | 5,99 | Todos os Santos | 7,99 |
| Engenho de Dentro | 8,99 | Méier | 9,99 | Triagem | 5,99 |
| | | Olaria | 7,99 | Varginha | 5,99 |
| | | | | Vila Isabel | 9,99 |

---

## Apêndice C — URLs das fotos de produto

Base: `https://pro-assets.grandchef.com.br/gc10447/images/products/`
Baixar e salvar como `public/images/products/<id>.webp`.

| id do produto | arquivo na origem |
|---------------|-------------------|
| `braguinha` | `6688050f42fb6.webp` |
| `chicken` | `66883e5271851.webp` |
| `crispy-catupiry` | `66553973931cb.webp` |
| `dogao-linguica` | `69d507977a90f.webp` |
| `dogao-salsicha` | `69dec3a14366a.webp` |
| `duplo` | `668834ea92ba0.webp` |
| `duplo-smash` | `668852158e63a.webp` |
| `epico` | `66d738b08781e.webp` |
| `explosao-cheddar` | `668831e3d56d5.webp` |
| `gourmet` | `66880997a47e8.webp` |
| `kids-alice` | `66883a0e68876.webp` |
| `majestoso` | `6688565bc928c.webp` |
| `triplo-smash` | `6688540d6937a.webp` |
| `vegano` | `66884314280fc.webp` |
| `tabua-braga-chicken` | `69fb8d5d04502.webp` |
| `tabua-braguinha` | `69fbb8647a630.webp` |
| `tabua-crispy-catupiry` | `69fb8e28d1a51.webp` |
| `tabua-dogao-linguica` | `69fb8cf5e2c44.webp` |
| `tabua-dogao-salsicha` | `69fb8e64cb4d0.webp` |
| `tabua-duplo` | `69fb8d2ea9bb6.webp` |
| `tabua-duplo-smash` | `69fb8e4035de3.webp` |
| `tabua-epico` | `69fbb8b5854ed.webp` |
| `tabua-explosao-cheddar` | `69fb8d0926e67.webp` |
| `tabua-familia` | `69fbb89a19fef.webp` |
| `tabua-gourmet` | `69fb8d45c38a5.webp` |
| `tabua-majestoso` | `69fb8e57cdc65.webp` |
| `tabua-triplo-smash` | `69fb8dc882292.webp` |
| `frango-empanado-grande` | `67eb6d4df0f40.webp` |
| `frango-empanado-media` | `67eb6d41bad3c.webp` |
| `fritas-grande` | `67dc3c6feb18c.webp` |
| `fritas-media` | `67dc3c58b6bf8.webp` |
| `fritas-pequena` | `67dc3c650faee.webp` |
| `aneis-cebola` | `679157bf12ffa.webp` |
| `coxinhas` | `679157773df7b.webp` |
| `nugget-supreme` | `67915754bb564.webp` |
| `frango-passarinho` | `679157d5a172b.webp` |
| `roda-gigante` | `67eb6d2764606.webp` |
| `brownie-sorvete` | `69fbb8d25bb5e.webp` |
| `matilda-cake` | `69fbb8c4c4fcf.webp` |

39 arquivos. Trios não têm arquivo próprio — usam a foto do burger correspondente (Apêndice A).
