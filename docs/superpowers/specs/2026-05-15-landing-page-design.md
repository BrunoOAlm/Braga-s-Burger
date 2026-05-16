    # Spec de Design — Landing Page Braga's Burger

**Data:** 2026-05-15
**Sub-projeto:** 1 de 6 — Landing Page / Cardápio
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

A Braga's Burger quer uma plataforma de pedidos online completa (estilo GrandChef), substituindo o site atual em `bragas.grandchef.com.br`. Esse objetivo foi decomposto em 6 sub-projetos independentes, cada um com seu próprio ciclo de spec → plano → implementação → code review:

| # | Sub-projeto | Stack |
|---|------------|-------|
| **1** | **Landing page / Cardápio** | Next.js + Framer Motion |
| 2 | Carrinho + Checkout | Next.js |
| 3 | Backend / API | Java + Spring Boot + PostgreSQL |
| 4 | Integração + Login | Full-stack |
| 5 | Painel Admin | Full-stack |
| 6 | Integrações & Deploy | DevOps |

**Este spec cobre apenas o sub-projeto 1.**

### Escopo

**Dentro do escopo:** página de apresentação pública com hero animado, carrossel de destaques, galeria de fotos com lightbox, cardápio com filtro de categorias, seção de informações e rodapé. Dados do cardápio em arquivo fixo.

**Fora do escopo (sub-projetos futuros):** carrinho, checkout, pagamento, backend/API, autenticação, histórico/rastreamento de pedidos, painel admin, PWA, integrações (WhatsApp API, e-mail, push, Analytics), deploy.

---

## 2. Decisões de design

Validadas com o cliente via mockups:

| Decisão | Escolha | Resumo |
|---------|---------|--------|
| Estrutura da página | **Cinematográfica** | Hero em tela cheia como destaque; destaques, galeria e menu abaixo |
| Comportamento do hero | **Intro 1x por sessão** | Animação completa na 1ª visita (com botão "Pular"); visitas seguintes vão direto ao hero |
| Estilo visual | **Híbrido** | Hero com fundo escuro; corpo da página com fundo claro |

---

## 3. Stack

| Ferramenta | Função | Justificativa |
|-----------|--------|---------------|
| Next.js 14 (App Router) | Framework React | SSG → bom SEO para negócio local |
| TypeScript | Tipagem estática | Erros pegos em tempo de edição |
| Tailwind CSS | Estilização | Iteração rápida |
| Framer Motion | Animações | Já instalado; núcleo do projeto |
| Vitest + React Testing Library | Testes | Padrão do ecossistema |

Bibliotecas de carrinho/API/formulário (Zustand, React Query, React Hook Form, Zod) **não** entram aqui — pertencem aos sub-projetos 2 e 4.

---

## 4. Tokens de design

### Cores
| Token | Hex | Uso |
|-------|-----|-----|
| `laranja-primario` | `#EF6C00` | CTAs, destaques, links |
| `laranja-claro` | `#FF8C00` | Gradientes, hover |
| `marrom` | `#8B4513` | Toques rústicos, detalhes |
| `creme` | `#F5F0E6` | Fundo do corpo da página |
| `escuro` | `#1A1A1A` | Fundo do hero, textos sobre claro |
| `dourado` | `#FFD700` | Badges, partículas, destaques |

### Tipografia
- **Títulos:** Poppins (600 / 700 / 800)
- **Corpo:** Inter (400 / 500)
- Tamanho mínimo de corpo no mobile: 16px

---

## 5. Arquitetura

```
Braga's Burger/
├── app/
│   ├── layout.tsx        Layout raiz: fontes, metadata de SEO
│   ├── page.tsx          Landing page (monta as seções na ordem)
│   └── globals.css       Tailwind + variáveis de tema
├── components/
│   ├── hero/
│   │   ├── HeroSection.tsx
│   │   ├── BurgerRain.tsx
│   │   └── ParticleExplosion.tsx
│   ├── sections/
│   │   ├── FeaturedCarousel.tsx
│   │   ├── Gallery.tsx
│   │   ├── MenuSection.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── ProductCard.tsx
│   │   └── InfoSection.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Reveal.tsx
├── data/
│   └── menu.ts
├── lib/
│   ├── types.ts
│   └── format.ts         Formatação de preço
└── public/images/
```

**Princípios:** um componente = uma responsabilidade. `Reveal.tsx` centraliza a animação "aparecer ao rolar" para evitar repetição (DRY).

---

## 6. Modelo de dados

`lib/types.ts`:
```ts
export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;       // em reais, ex.: 28.90
  imageUrl: string;
  featured: boolean;   // aparece no carrossel de destaques
  available: boolean;  // false → exibe "esgotado"
}
```

`data/menu.ts` exporta `categories: Category[]` e `products: Product[]`.

Os tipos são modelados para espelhar a futura resposta da API (sub-projeto 4). Na migração, só a fonte dos dados muda (`import` → `fetch`); os componentes não mudam.

**Categorias previstas:** Burgers Clássicos, Burgers Gourmet, Combos, Bebidas, Sobremesas. Produtos e preços reais a serem fornecidos pelo cliente; até lá, dados representativos.

---

## 7. Seções da página (ordem de cima para baixo)

1. **Navbar** — flutuante (espaçada das bordas), logo, links-âncora (Cardápio, Destaques, Galeria, Contato), CTA "Peça agora".
2. **Hero** — tela cheia, fundo escuro. Na 1ª visita da sessão: overlay com a animação de chuva de hambúrguer. Conteúdo: logo "BRAGA'S", tagline, CTA principal "Ver cardápio".
3. **Carrossel de destaques** — produtos com `featured: true`; rolagem automática que pausa no hover.
4. **Galeria** — grid de fotos dos pratos; clique abre lightbox.
5. **Menu** — `CategoryFilter` (abas de categoria) + grade de `ProductCard`. Filtro em tempo real.
6. **Informações** — horário de funcionamento, áreas de entrega (20+ bairros da Zona Norte), contato/WhatsApp, redes sociais (Instagram como principal).
7. **Footer** — links úteis, políticas e termos, redes sociais.

---

## 8. Animações (Framer Motion)

### Hero — chuva de hambúrguer
Controlada por fases num estado React:

| Fase | Descrição |
|------|-----------|
| 0 — Checagem | Lê `sessionStorage`. Já visto na sessão, ou `prefers-reduced-motion` ativo → pula para a fase 3 |
| 1 — Chuva | Overlay escuro em tela cheia; hambúrgueres caem com rotação e velocidade aleatórias (variância ±20%) |
| 2 — Explosão | Ao tocar a base, cada hambúrguer vira partículas nas cores da marca |
| 3 — Revela | Overlay faz fade-out; hero exibido; grava flag em `sessionStorage` |

- Botão "Pular" sempre visível → vai direto à fase 3.
- `AnimatePresence` controla a saída do overlay.
- Duração total alvo: ~5s.

### Demais seções
| Onde | Animação | Recurso |
|------|----------|---------|
| Seções ao rolar | Fade + translateY 30px→0 | `whileInView` + `viewport={{ once: true }}` |
| Cards do menu | Entrada em cascata | `staggerChildren` |
| Carrossel | Rolagem automática, pausa no hover | `animate` + estado de hover |
| Filtro de categoria | Reorganização suave dos produtos | `layout` + `AnimatePresence` |
| Hover nos cards | `scale` + sombra (sem deslocar vizinhos) | `whileHover` |

**Acessibilidade:** o hook `useReducedMotion()` desliga o hero animado **e** as animações de scroll para quem ativou "reduzir movimento". Hover usa apenas `transform` (GPU), nunca `width`/`height`.

---

## 9. Responsividade

- Abordagem mobile-first; ajustes via breakpoints `md:` (~768px) e `lg:` (~1024px) do Tailwind.
- Grade do menu: 1 coluna (mobile) → 2 (tablet) → 3 (desktop).
- Pontos de verificação: 375px / 768px / 1024px / 1440px.
- Sem rolagem horizontal em nenhum tamanho.

---

## 10. Acessibilidade

- Contraste de texto ≥ 4.5:1.
- `prefers-reduced-motion` respeitado (hero e scroll).
- Navegação por teclado com foco visível e ordem lógica; lightbox fecha com `Esc`.
- `alt` descritivo em todas as imagens; `aria-label` em botões de ícone.
- HTML semântico: `<nav>`, `<main>`, `<section>`, `<footer>`.

---

## 11. Testes

Princípio: testar lógica, não aparência.

| Alvo | Abordagem | Ferramenta |
|------|-----------|-----------|
| Filtrar produtos por categoria | TDD (teste primeiro) | Vitest |
| Formatar preço (`28.9` → `R$ 28,90`) | TDD | Vitest |
| Lógica "intro já vista" (`sessionStorage`) | TDD | Vitest |
| Render de `ProductCard`, `CategoryFilter` | Teste de render | React Testing Library |
| Animações | Testar comportamento (overlay sai, flag grava), não frames | RTL |

---

## 12. Ordem de construção

1. **Setup** — Next.js + Tailwind + TS; tema (cores, fontes); `globals.css`. Inicializar repositório Git.
2. **Dados e base** — `types.ts`, `menu.ts`, `format.ts`, componentes `Button` e `Reveal`.
3. **Layout** — `Navbar`, `Footer`, `page.tsx` montando as seções.
4. **Hero estático** — `HeroSection` sem animação.
5. **Seções de conteúdo** — `MenuSection` + `CategoryFilter` + `ProductCard`, `FeaturedCarousel`, `Gallery`, `InfoSection`.
6. **Animações de scroll/hover** — `Reveal`, `whileInView`, stagger, `whileHover`.
7. **Animação do hero** — `BurgerRain` + `ParticleExplosion` + fases + `sessionStorage`.
8. **Polimento** — responsividade nos 4 tamanhos + revisão de acessibilidade.

Esqueleto estático primeiro; animação por último. Cada passo encerra com code review explicado (o cliente é desenvolvedor júnior e acompanha para aprender).

---

## 13. Critérios de sucesso

- A landing page renderiza todas as 7 seções com dados representativos.
- A intro do hero roda uma vez por sessão, é pulável e respeita `prefers-reduced-motion`.
- O filtro de categorias funciona em tempo real.
- A galeria abre/fecha o lightbox (mouse e teclado).
- Layout sem quebras em 375 / 768 / 1024 / 1440px.
- Testes de lógica (filtro, formatação de preço, gate da intro) passando.
