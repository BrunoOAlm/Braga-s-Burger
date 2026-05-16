# Braga's Burger — Landing Page

Landing page da **Braga's Burger**, uma hamburgueria artesanal da Zona Norte.
Este é o **sub-projeto 1** de uma plataforma maior que incluirá cardápio online, pedidos e painel administrativo.

## Stack

| Tecnologia | Versão |
|---|---|
| Next.js | 16 |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | v4 |
| Framer Motion | — |

## Comandos

```bash
# Servidor de desenvolvimento (http://localhost:3000)
npm run dev

# Testes automatizados (Jest + React Testing Library)
npm test

# Build de produção
npm run build

# Lint (ESLint com regras React 19)
npm run lint
```

## Estrutura de pastas

```
app/              → Rotas e layout raiz do Next.js (App Router)
components/
  ui/             → Componentes genéricos reutilizáveis (Button, etc.)
  layout/         → Header, Footer e estrutura de página
  hero/           → Seção hero: animação de intro (BurgerRain, ParticleExplosion, HeroSection)
  sections/       → Demais seções da landing (cardápio, sobre, contato…)
lib/              → Utilitários e helpers (ex.: controle de intro por sessão)
data/             → Dados estáticos do cardápio e conteúdo da página
public/           → Assets estáticos (imagens)
```

## Observações para quem está aprendendo

- O projeto usa **App Router** do Next.js — as páginas ficam em `app/`, não em `pages/`.
- Componentes marcados com `'use client'` rodam no navegador; os demais são **Server Components** por padrão.
- A animação de intro (`BurgerRain`) só aparece **uma vez por sessão** (controlado via `sessionStorage` em `lib/intro.ts`).
- Os testes ficam junto aos componentes, no padrão `*.test.tsx`.
