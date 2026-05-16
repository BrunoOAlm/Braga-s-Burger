# Landing Page Braga's Burger — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a landing page pública da Braga's Burger (sub-projeto 1): hero cinematográfico animado, carrossel de destaques, galeria com lightbox, cardápio com filtro, informações e rodapé.

**Architecture:** App Next.js 16 (App Router) com componentes pequenos de responsabilidade única. Dados do cardápio num arquivo TypeScript fixo, modelado para espelhar a futura API. Lógica pura (formatação, filtro, gate da intro) isolada em `lib/` e coberta por testes. Animações com Framer Motion, sempre respeitando `prefers-reduced-motion`.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion, Vitest + React Testing Library.

**Spec de referência:** `docs/superpowers/specs/2026-05-15-landing-page-design.md`

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `app/layout.tsx` | Layout raiz: fontes, metadata de SEO |
| `app/page.tsx` | Monta as 7 seções na ordem |
| `app/globals.css` | Tailwind + tokens de tema (cores, fontes) |
| `lib/types.ts` | Tipos `Category` e `Product` |
| `lib/format.ts` | `formatPrice` — formata número em "R$ 0,00" |
| `lib/filter.ts` | `filterProducts` — filtra produtos por categoria |
| `lib/intro.ts` | `hasSeenIntro` / `markIntroSeen` — gate da intro via `sessionStorage` |
| `data/menu.ts` | Arrays `categories` e `products` (dados de exemplo) |
| `components/ui/Button.tsx` | Botão/CTA reutilizável |
| `components/ui/Reveal.tsx` | Wrapper de animação "aparecer ao rolar" |
| `components/layout/Navbar.tsx` | Barra de navegação flutuante |
| `components/layout/Footer.tsx` | Rodapé |
| `components/hero/HeroSection.tsx` | Hero: logo, tagline, CTA + orquestra a intro |
| `components/hero/BurgerRain.tsx` | Animação dos hambúrgueres caindo |
| `components/hero/ParticleExplosion.tsx` | Explosão de partículas |
| `components/sections/ProductCard.tsx` | Card de um produto |
| `components/sections/CategoryFilter.tsx` | Abas de categoria |
| `components/sections/MenuSection.tsx` | Cardápio: filtro + grade de cards |
| `components/sections/FeaturedCarousel.tsx` | Carrossel de destaques |
| `components/sections/Gallery.tsx` | Galeria de fotos + lightbox |
| `components/sections/InfoSection.tsx` | Horário, entrega, contato |

**Convenção:** componentes com hooks, estado ou Framer Motion levam `'use client'` na 1ª linha. `page.tsx` e `layout.tsx` ficam como Server Components.

---

## Task 1: Scaffold do projeto Next.js

O projeto só tem `package.json` (com framer-motion), `docs/`, `.claude/`, `.git/` e `.gitignore`. O `create-next-app` não roda numa pasta com `package.json`, então geramos num diretório temporário e movemos.

**Files:**
- Modify: raiz do projeto (recebe `app/`, `public/`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `next-env.d.ts`)

- [ ] **Step 1: Gerar o scaffold num diretório temporário**

Rode a partir da pasta-pai do projeto:
```powershell
cd "C:\Users\guerr\OneDrive\Desktop\Repositorios\Projetos"
npx create-next-app@latest braga-scaffold --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --no-turbopack
```

- [ ] **Step 2: Remover os arquivos npm antigos do projeto**

```powershell
cd "C:\Users\guerr\OneDrive\Desktop\Repositorios\Projetos\Braga's Burger"
Remove-Item -Recurse -Force node_modules, package.json, package-lock.json -ErrorAction SilentlyContinue
```

- [ ] **Step 3: Copiar os arquivos do scaffold (menos `.git` e `.gitignore`)**

```powershell
$src = "C:\Users\guerr\OneDrive\Desktop\Repositorios\Projetos\braga-scaffold"
$dst = "C:\Users\guerr\OneDrive\Desktop\Repositorios\Projetos\Braga's Burger"
Get-ChildItem -Path $src -Force | Where-Object { $_.Name -notin '.git', '.gitignore' } |
  ForEach-Object { Copy-Item $_.FullName -Destination $dst -Recurse -Force }
Remove-Item -Recurse -Force $src
```

- [ ] **Step 4: Instalar dependências + framer-motion**

```powershell
cd "C:\Users\guerr\OneDrive\Desktop\Repositorios\Projetos\Braga's Burger"
npm install
npm install framer-motion
```

- [ ] **Step 5: Verificar que o app sobe**

Run: `npm run dev`
Expected: servidor inicia em `http://localhost:3000` exibindo a página padrão do Next.js. Encerre com `Ctrl+C`.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "chore: scaffold do projeto Next.js com Tailwind e TypeScript"
```

---

## Task 2: Configurar Vitest + React Testing Library

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (script `test`)

- [ ] **Step 1: Instalar as dependências de teste**

```powershell
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 3: Criar `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Adicionar o script de teste ao `package.json`**

No bloco `"scripts"`, adicione:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verificar que o Vitest roda**

Run: `npm test`
Expected: Vitest inicia e reporta "No test files found" (ainda não há testes). Sem erros de configuração.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "chore: configura Vitest e React Testing Library"
```

---

## Task 3: Tokens de design, fontes e SEO

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Definir os tokens de tema em `app/globals.css`**

Substitua TODO o conteúdo de `app/globals.css` por:
```css
@import "tailwindcss";

@theme {
  --color-brand-orange: #ef6c00;
  --color-brand-orange-light: #ff8c00;
  --color-brand-brown: #8b4513;
  --color-brand-cream: #f5f0e6;
  --color-brand-dark: #1a1a1a;
  --color-brand-gold: #ffd700;

  --font-heading: var(--font-poppins);
  --font-body: var(--font-inter);
}

body {
  background-color: var(--color-brand-cream);
  color: var(--color-brand-dark);
  font-family: var(--font-body), system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: var(--font-heading), system-ui, sans-serif;
}
```

- [ ] **Step 2: Configurar fontes e metadata em `app/layout.tsx`**

Substitua TODO o conteúdo de `app/layout.tsx` por:
```tsx
import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-poppins',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Braga's Burger — Hamburgueria artesanal",
  description:
    'Os melhores hambúrgueres artesanais da Zona Norte. Peça online e receba em casa.',
  openGraph: {
    title: "Braga's Burger",
    description: 'Hambúrgueres artesanais com entrega na Zona Norte.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verificar que o tema aplica**

Run: `npm run dev` e abra `http://localhost:3000`.
Expected: fundo creme, sem erros no terminal. Encerre com `Ctrl+C`.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: tokens de design, fontes Poppins/Inter e metadata de SEO"
```

---

## Task 4: Tipos do cardápio

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Criar `lib/types.ts`**

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
  price: number; // em reais, ex.: 28.90
  imageUrl: string;
  featured: boolean; // true → aparece no carrossel de destaques
  available: boolean; // false → exibe "esgotado"
}
```

- [ ] **Step 2: Verificar a compilação de tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: tipos Category e Product"
```

---

## Task 5: Utilitário de formatação de preço (TDD)

**Files:**
- Create: `lib/format.ts`
- Test: `lib/format.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('formata um valor com centavos', () => {
    expect(formatPrice(28.9)).toBe('R$ 28,90');
  });

  it('formata um valor inteiro com ,00', () => {
    expect(formatPrice(15)).toBe('R$ 15,00');
  });

  it('formata zero', () => {
    expect(formatPrice(0)).toBe('R$ 0,00');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run lib/format.test.ts`
Expected: FAIL — "Failed to resolve import './format'".

- [ ] **Step 3: Implementar `lib/format.ts`**

```ts
export function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run lib/format.test.ts`
Expected: PASS — 3 testes verdes.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: formatPrice com testes"
```

---

## Task 6: Filtro de produtos por categoria (TDD)

**Files:**
- Create: `lib/filter.ts`
- Test: `lib/filter.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `lib/filter.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { filterProducts } from './filter';
import type { Product } from './types';

const base: Omit<Product, 'id' | 'categoryId'> = {
  name: 'X',
  description: 'desc',
  price: 10,
  imageUrl: '/x.jpg',
  featured: false,
  available: true,
};

const products: Product[] = [
  { ...base, id: '1', categoryId: 'classicos' },
  { ...base, id: '2', categoryId: 'classicos' },
  { ...base, id: '3', categoryId: 'combos' },
];

describe('filterProducts', () => {
  it('retorna todos os produtos quando a categoria é null', () => {
    expect(filterProducts(products, null)).toHaveLength(3);
  });

  it('retorna só os produtos da categoria pedida', () => {
    const result = filterProducts(products, 'classicos');
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.categoryId === 'classicos')).toBe(true);
  });

  it('retorna lista vazia quando nenhuma categoria bate', () => {
    expect(filterProducts(products, 'inexistente')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run lib/filter.test.ts`
Expected: FAIL — "Failed to resolve import './filter'".

- [ ] **Step 3: Implementar `lib/filter.ts`**

```ts
import type { Product } from './types';

export function filterProducts(
  products: Product[],
  categoryId: string | null,
): Product[] {
  if (categoryId === null) return products;
  return products.filter((product) => product.categoryId === categoryId);
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run lib/filter.test.ts`
Expected: PASS — 3 testes verdes.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: filterProducts com testes"
```

---

## Task 7: Dados de exemplo do cardápio

**Files:**
- Create: `data/menu.ts`

- [ ] **Step 1: Criar `data/menu.ts`**

Imagens são placeholders em `public/images/` (a serem substituídas por fotos reais).
```ts
import type { Category, Product } from '@/lib/types';

export const categories: Category[] = [
  { id: 'classicos', name: 'Burgers Clássicos', order: 1 },
  { id: 'gourmet', name: 'Burgers Gourmet', order: 2 },
  { id: 'combos', name: 'Combos', order: 3 },
  { id: 'bebidas', name: 'Bebidas', order: 4 },
  { id: 'sobremesas', name: 'Sobremesas', order: 5 },
];

export const products: Product[] = [
  {
    id: 'cheese-salada',
    categoryId: 'classicos',
    name: 'Cheese Salada',
    description: 'Pão, hambúrguer 150g, queijo, alface, tomate e maionese da casa.',
    price: 24.9,
    imageUrl: '/images/cheese-salada.jpg',
    featured: true,
    available: true,
  },
  {
    id: 'x-bacon',
    categoryId: 'classicos',
    name: 'X-Bacon',
    description: 'Pão, hambúrguer 150g, queijo, bacon crocante e maionese da casa.',
    price: 27.9,
    imageUrl: '/images/x-bacon.jpg',
    featured: false,
    available: true,
  },
  {
    id: 'braga-supremo',
    categoryId: 'gourmet',
    name: "Braga's Supremo",
    description: 'Pão brioche, dois hambúrgueres 150g, cheddar, cebola caramelizada e barbecue.',
    price: 38.9,
    imageUrl: '/images/braga-supremo.jpg',
    featured: true,
    available: true,
  },
  {
    id: 'cogumelos',
    categoryId: 'gourmet',
    name: 'Trufado de Cogumelos',
    description: 'Pão australiano, hambúrguer 180g, mix de cogumelos e maionese trufada.',
    price: 42.9,
    imageUrl: '/images/cogumelos.jpg',
    featured: true,
    available: false,
  },
  {
    id: 'combo-classico',
    categoryId: 'combos',
    name: 'Combo Clássico',
    description: 'X-Bacon + batata frita média + refrigerante lata.',
    price: 39.9,
    imageUrl: '/images/combo-classico.jpg',
    featured: false,
    available: true,
  },
  {
    id: 'refrigerante',
    categoryId: 'bebidas',
    name: 'Refrigerante Lata',
    description: 'Coca-Cola, Guaraná ou Fanta — 350ml.',
    price: 6.5,
    imageUrl: '/images/refrigerante.jpg',
    featured: false,
    available: true,
  },
  {
    id: 'milkshake',
    categoryId: 'sobremesas',
    name: 'Milkshake de Ovomaltine',
    description: 'Milkshake cremoso 400ml com Ovomaltine.',
    price: 18.9,
    imageUrl: '/images/milkshake.jpg',
    featured: true,
    available: true,
  },
];
```

- [ ] **Step 2: Criar a pasta de imagens com um placeholder**

```powershell
New-Item -ItemType Directory -Force "public\images" | Out-Null
```
As fotos reais entram aqui depois; até lá os componentes usam `next/image` com `onError` ou um fundo de cor (ver Task 13).

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: dados de exemplo do cardápio"
```

---

## Task 8: Componente Button

**Files:**
- Create: `components/ui/Button.tsx`
- Test: `components/ui/Button.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/ui/Button.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza o texto como botão por padrão', () => {
    render(<Button>Peça agora</Button>);
    expect(screen.getByRole('button', { name: 'Peça agora' })).toBeInTheDocument();
  });

  it('renderiza como link quando recebe href', () => {
    render(<Button href="#cardapio">Ver cardápio</Button>);
    const link = screen.getByRole('link', { name: 'Ver cardápio' });
    expect(link).toHaveAttribute('href', '#cardapio');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/ui/Button.test.tsx`
Expected: FAIL — "Failed to resolve import './Button'".

- [ ] **Step 3: Implementar `components/ui/Button.tsx`**

```tsx
import type { ReactNode } from 'react';

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
};

const styles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-orange text-white hover:bg-brand-orange-light',
  ghost: 'bg-transparent text-brand-dark border border-brand-dark/20 hover:border-brand-orange',
};

export function Button({ children, href, onClick, variant = 'primary' }: ButtonProps) {
  const className = `inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer ${styles[variant]}`;

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/ui/Button.test.tsx`
Expected: PASS — 2 testes verdes.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: componente Button"
```

---

## Task 9: Componente Reveal (animação ao rolar)

**Files:**
- Create: `components/ui/Reveal.tsx`
- Test: `components/ui/Reveal.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/ui/Reveal.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Reveal } from './Reveal';

describe('Reveal', () => {
  it('renderiza os filhos', () => {
    render(
      <Reveal>
        <p>Conteúdo visível</p>
      </Reveal>,
    );
    expect(screen.getByText('Conteúdo visível')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/ui/Reveal.test.tsx`
Expected: FAIL — "Failed to resolve import './Reveal'".

- [ ] **Step 3: Implementar `components/ui/Reveal.tsx`**

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  delay?: number;
};

export function Reveal({ children, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/ui/Reveal.test.tsx`
Expected: PASS — 1 teste verde.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: componente Reveal de animação ao rolar"
```

---

## Task 10: Navbar

**Files:**
- Create: `components/layout/Navbar.tsx`
- Test: `components/layout/Navbar.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/layout/Navbar.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

describe('Navbar', () => {
  it('exibe a marca e os links de navegação', () => {
    render(<Navbar />);
    expect(screen.getByText("Braga's Burger")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cardápio' })).toHaveAttribute('href', '#cardapio');
    expect(screen.getByRole('link', { name: 'Peça agora' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/layout/Navbar.test.tsx`
Expected: FAIL — "Failed to resolve import './Navbar'".

- [ ] **Step 3: Implementar `components/layout/Navbar.tsx`**

```tsx
import { Button } from '@/components/ui/Button';

const links = [
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Destaques', href: '#destaques' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contato', href: '#contato' },
];

export function Navbar() {
  return (
    <nav className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-full bg-brand-dark/90 px-6 py-3 backdrop-blur">
      <span className="font-heading text-lg font-extrabold text-brand-gold">
        Braga&apos;s Burger
      </span>
      <ul className="hidden gap-6 md:flex">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-sm font-medium text-white/80 transition-colors hover:text-brand-gold"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <Button href="#cardapio">Peça agora</Button>
    </nav>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/layout/Navbar.test.tsx`
Expected: PASS — 1 teste verde.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: Navbar flutuante"
```

---

## Task 11: Footer

**Files:**
- Create: `components/layout/Footer.tsx`
- Test: `components/layout/Footer.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/layout/Footer.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('exibe a marca e o ano atual', () => {
    render(<Footer />);
    expect(screen.getByText(/Braga's Burger/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/layout/Footer.test.tsx`
Expected: FAIL — "Failed to resolve import './Footer'".

- [ ] **Step 3: Implementar `components/layout/Footer.tsx`**

```tsx
const footerLinks = [
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contato', href: '#contato' },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-brand-dark px-6 py-10 text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-heading text-lg font-extrabold text-brand-gold">
            Braga&apos;s Burger
          </p>
          <p className="mt-1 text-sm">Hamburgueria artesanal — Zona Norte</p>
        </div>
        <ul className="flex gap-6">
          {footerLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm transition-colors hover:text-brand-gold">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-xs text-white/40">
        © {year} Braga&apos;s Burger. Todos os direitos reservados.
      </p>
    </footer>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/layout/Footer.test.tsx`
Expected: PASS — 1 teste verde.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: Footer"
```

---

## Task 12: HeroSection (versão estática)

Nesta task o hero é estático (sem a chuva de hambúrguer). A animação entra na Task 19.

**Files:**
- Create: `components/hero/HeroSection.tsx`
- Test: `components/hero/HeroSection.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/hero/HeroSection.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('exibe a marca, a tagline e o CTA', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { name: /Braga's Burger/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver cardápio' })).toHaveAttribute('href', '#cardapio');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/hero/HeroSection.test.tsx`
Expected: FAIL — "Failed to resolve import './HeroSection'".

- [ ] **Step 3: Implementar `components/hero/HeroSection.tsx`**

```tsx
import { Button } from '@/components/ui/Button';

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-dark px-6 text-center">
      <p className="mb-4 font-body text-sm uppercase tracking-[0.3em] text-brand-gold">
        Hamburgueria artesanal
      </p>
      <h1 className="font-heading text-5xl font-extrabold text-white md:text-7xl">
        Braga&apos;s Burger
      </h1>
      <p className="mt-4 max-w-md text-base text-white/70">
        Os melhores hambúrgueres da Zona Norte, feitos na hora e entregues quentinhos.
      </p>
      <div className="mt-8">
        <Button href="#cardapio">Ver cardápio</Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/hero/HeroSection.test.tsx`
Expected: PASS — 1 teste verde.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: HeroSection estático"
```

---

## Task 13: ProductCard

**Files:**
- Create: `components/sections/ProductCard.tsx`
- Test: `components/sections/ProductCard.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/sections/ProductCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/types';

const product: Product = {
  id: 'x-bacon',
  categoryId: 'classicos',
  name: 'X-Bacon',
  description: 'Bacon crocante e queijo.',
  price: 27.9,
  imageUrl: '/images/x-bacon.jpg',
  featured: false,
  available: true,
};

describe('ProductCard', () => {
  it('exibe nome, descrição e preço formatado', () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText('X-Bacon')).toBeInTheDocument();
    expect(screen.getByText('Bacon crocante e queijo.')).toBeInTheDocument();
    expect(screen.getByText('R$ 27,90')).toBeInTheDocument();
  });

  it('exibe "Esgotado" quando o produto está indisponível', () => {
    render(<ProductCard product={{ ...product, available: false }} />);
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/ProductCard.test.tsx`
Expected: FAIL — "Failed to resolve import './ProductCard'".

- [ ] **Step 3: Implementar `components/sections/ProductCard.tsx`**

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/format';

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { scale: 1.03 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      <div className="relative aspect-[4/3] bg-brand-brown/20">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${product.imageUrl})` }}
          role="img"
          aria-label={product.name}
        />
        {!product.available && (
          <span className="absolute right-3 top-3 rounded-full bg-brand-dark/90 px-3 py-1 text-xs font-semibold text-white">
            Esgotado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-heading text-lg font-bold text-brand-dark">{product.name}</h3>
        <p className="mt-1 flex-1 text-sm text-brand-dark/60">{product.description}</p>
        <p className="mt-3 font-heading text-lg font-bold text-brand-orange">
          {formatPrice(product.price)}
        </p>
      </div>
    </motion.article>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/ProductCard.test.tsx`
Expected: PASS — 2 testes verdes.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: ProductCard"
```

---

## Task 14: CategoryFilter

**Files:**
- Create: `components/sections/CategoryFilter.tsx`
- Test: `components/sections/CategoryFilter.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/sections/CategoryFilter.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilter } from './CategoryFilter';
import type { Category } from '@/lib/types';

const categories: Category[] = [
  { id: 'classicos', name: 'Clássicos', order: 1 },
  { id: 'combos', name: 'Combos', order: 2 },
];

describe('CategoryFilter', () => {
  it('renderiza "Todos" mais cada categoria', () => {
    render(<CategoryFilter categories={categories} active={null} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clássicos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Combos' })).toBeInTheDocument();
  });

  it('chama onChange com o id da categoria clicada', async () => {
    const onChange = vi.fn();
    render(<CategoryFilter categories={categories} active={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Combos' }));
    expect(onChange).toHaveBeenCalledWith('combos');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/CategoryFilter.test.tsx`
Expected: FAIL — "Failed to resolve import './CategoryFilter'".

- [ ] **Step 3: Implementar `components/sections/CategoryFilter.tsx`**

```tsx
'use client';

import type { Category } from '@/lib/types';

type CategoryFilterProps = {
  categories: Category[];
  active: string | null;
  onChange: (categoryId: string | null) => void;
};

export function CategoryFilter({ categories, active, onChange }: CategoryFilterProps) {
  const sorted = [...categories].sort((a, b) => a.order - b.order);

  const tabClass = (isActive: boolean) =>
    `cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
      isActive
        ? 'bg-brand-orange text-white'
        : 'bg-white text-brand-dark/70 hover:text-brand-orange'
    }`;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <button type="button" className={tabClass(active === null)} onClick={() => onChange(null)}>
        Todos
      </button>
      {sorted.map((category) => (
        <button
          key={category.id}
          type="button"
          className={tabClass(active === category.id)}
          onClick={() => onChange(category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/CategoryFilter.test.tsx`
Expected: PASS — 2 testes verdes.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: CategoryFilter"
```

---

## Task 15: MenuSection

**Files:**
- Create: `components/sections/MenuSection.tsx`
- Test: `components/sections/MenuSection.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/sections/MenuSection.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuSection } from './MenuSection';

describe('MenuSection', () => {
  it('mostra todos os produtos por padrão', () => {
    render(<MenuSection />);
    expect(screen.getByText('Cheese Salada')).toBeInTheDocument();
    expect(screen.getByText('Milkshake de Ovomaltine')).toBeInTheDocument();
  });

  it('filtra os produtos ao clicar numa categoria', async () => {
    render(<MenuSection />);
    await userEvent.click(screen.getByRole('button', { name: 'Bebidas' }));
    expect(screen.getByText('Refrigerante Lata')).toBeInTheDocument();
    expect(screen.queryByText('Cheese Salada')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/MenuSection.test.tsx`
Expected: FAIL — "Failed to resolve import './MenuSection'".

- [ ] **Step 3: Implementar `components/sections/MenuSection.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { categories, products } from '@/data/menu';
import { filterProducts } from '@/lib/filter';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';

export function MenuSection() {
  const [active, setActive] = useState<string | null>(null);
  const visible = filterProducts(products, active);

  return (
    <section id="cardapio" className="bg-brand-cream px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-brand-dark md:text-4xl">
          Nosso cardápio
        </h2>
        <p className="mt-2 text-center text-brand-dark/60">
          Escolha uma categoria e monte seu pedido.
        </p>

        <div className="mt-8">
          <CategoryFilter categories={categories} active={active} onChange={setActive} />
        </div>

        <motion.div
          layout
          className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {visible.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/MenuSection.test.tsx`
Expected: PASS — 2 testes verdes.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: MenuSection com filtro de categorias"
```

---

## Task 16: FeaturedCarousel

**Files:**
- Create: `components/sections/FeaturedCarousel.tsx`
- Test: `components/sections/FeaturedCarousel.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/sections/FeaturedCarousel.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeaturedCarousel } from './FeaturedCarousel';

describe('FeaturedCarousel', () => {
  it('exibe apenas produtos marcados como destaque', () => {
    render(<FeaturedCarousel />);
    // "Braga's Supremo" é featured: true
    expect(screen.getByText("Braga's Supremo")).toBeInTheDocument();
    // "X-Bacon" é featured: false → não aparece
    expect(screen.queryByText('X-Bacon')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/FeaturedCarousel.test.tsx`
Expected: FAIL — "Failed to resolve import './FeaturedCarousel'".

- [ ] **Step 3: Implementar `components/sections/FeaturedCarousel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { products } from '@/data/menu';
import { ProductCard } from './ProductCard';

export function FeaturedCarousel() {
  const featured = products.filter((product) => product.featured);
  const [paused, setPaused] = useState(false);

  return (
    <section id="destaques" className="bg-brand-dark px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-white md:text-4xl">
          Destaques da casa
        </h2>
        <p className="mt-2 text-center text-white/60">
          Os campeões de pedido — passe o mouse para pausar.
        </p>

        <div
          className="mt-10 overflow-x-auto"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex gap-6 pb-4"
            style={{
              animation: 'carousel-scroll 24s linear infinite',
              animationPlayState: paused ? 'paused' : 'running',
            }}
          >
            {[...featured, ...featured].map((product, index) => (
              <div key={`${product.id}-${index}`} className="w-72 shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Adicionar a animação do carrossel ao `app/globals.css`**

Acrescente ao final de `app/globals.css`:
```css
@keyframes carousel-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  [style*="carousel-scroll"] { animation: none !important; }
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/FeaturedCarousel.test.tsx`
Expected: PASS — 1 teste verde.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: FeaturedCarousel com rolagem automática"
```

---

## Task 17: Gallery com lightbox

**Files:**
- Create: `components/sections/Gallery.tsx`
- Test: `components/sections/Gallery.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/sections/Gallery.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Gallery } from './Gallery';

describe('Gallery', () => {
  it('não mostra o lightbox antes do clique', () => {
    render(<Gallery />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre o lightbox ao clicar numa foto e fecha no botão', async () => {
    render(<Gallery />);
    await userEvent.click(screen.getAllByRole('button', { name: /Ampliar foto/ })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/Gallery.test.tsx`
Expected: FAIL — "Failed to resolve import './Gallery'".

- [ ] **Step 3: Implementar `components/sections/Gallery.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const photos = [
  '/images/galeria-1.jpg',
  '/images/galeria-2.jpg',
  '/images/galeria-3.jpg',
  '/images/galeria-4.jpg',
  '/images/galeria-5.jpg',
  '/images/galeria-6.jpg',
];

export function Gallery() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenIndex(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex]);

  return (
    <section id="galeria" className="bg-brand-cream px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-brand-dark md:text-4xl">
          Galeria
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              aria-label={`Ampliar foto ${index + 1}`}
              onClick={() => setOpenIndex(index)}
              className="aspect-square cursor-pointer overflow-hidden rounded-xl bg-brand-brown/20 bg-cover bg-center transition-transform duration-200 hover:scale-[1.03]"
              style={{ backgroundImage: `url(${photo})` }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Foto ampliada"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/90 p-6"
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setOpenIndex(null)}
              className="absolute right-6 top-6 cursor-pointer rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Fechar
            </button>
            <div
              className="aspect-square w-full max-w-xl rounded-2xl bg-brand-brown/40 bg-cover bg-center"
              style={{ backgroundImage: `url(${photos[openIndex]})` }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/Gallery.test.tsx`
Expected: PASS — 2 testes verdes.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: Gallery com lightbox"
```

---

## Task 18: InfoSection

**Files:**
- Create: `components/sections/InfoSection.tsx`
- Test: `components/sections/InfoSection.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/sections/InfoSection.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoSection } from './InfoSection';

describe('InfoSection', () => {
  it('exibe horário, contato e link do Instagram', () => {
    render(<InfoSection />);
    expect(screen.getByText(/Horário/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me'),
    );
    expect(screen.getByRole('link', { name: /Instagram/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/InfoSection.test.tsx`
Expected: FAIL — "Failed to resolve import './InfoSection'".

- [ ] **Step 3: Implementar `components/sections/InfoSection.tsx`**

Telefone e bairros são exemplos — substituir pelos dados reais da Braga's.
```tsx
const neighborhoods = [
  'Santana', 'Tucuruvi', 'Mandaqui', 'Casa Verde', 'Vila Maria',
  'Jaçanã', 'Tremembé', 'Vila Guilherme', 'Lauzane Paulista', 'Imirim',
];

export function InfoSection() {
  return (
    <section id="contato" className="bg-brand-dark px-6 py-20 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <h3 className="font-heading text-xl font-bold text-brand-gold">Horário</h3>
          <p className="mt-3 text-sm text-white/70">Terça a domingo</p>
          <p className="text-sm text-white/70">18h às 23h30</p>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-brand-gold">Áreas de entrega</h3>
          <p className="mt-3 text-sm text-white/70">
            Atendemos mais de 20 bairros da Zona Norte, entre eles:{' '}
            {neighborhoods.join(', ')} e região.
          </p>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-brand-gold">Contato</h3>
          <a
            href="https://wa.me/5511999999999"
            className="mt-3 block text-sm text-white/70 transition-colors hover:text-brand-gold"
          >
            WhatsApp: (11) 99999-9999
          </a>
          <a
            href="https://instagram.com/bragas_burger"
            className="mt-1 block text-sm text-white/70 transition-colors hover:text-brand-gold"
          >
            Instagram: @bragas_burger
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/InfoSection.test.tsx`
Expected: PASS — 1 teste verde.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: InfoSection com horário, entrega e contato"
```

---

## Task 19: Montagem da página

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Substituir `app/page.tsx`**

```tsx
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/hero/HeroSection';
import { FeaturedCarousel } from '@/components/sections/FeaturedCarousel';
import { Gallery } from '@/components/sections/Gallery';
import { MenuSection } from '@/components/sections/MenuSection';
import { InfoSection } from '@/components/sections/InfoSection';
import { Reveal } from '@/components/ui/Reveal';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <Reveal>
          <FeaturedCarousel />
        </Reveal>
        <Reveal>
          <Gallery />
        </Reveal>
        <Reveal>
          <MenuSection />
        </Reveal>
        <Reveal>
          <InfoSection />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Verificar a página inteira no navegador**

Run: `npm run dev` e abra `http://localhost:3000`.
Expected: hero estático, carrossel rolando, galeria com lightbox funcionando, cardápio filtrando, seção de informações e rodapé. Sem erros no console. Encerre com `Ctrl+C`.

- [ ] **Step 3: Rodar a suíte de testes completa**

Run: `npm test`
Expected: todos os testes das Tasks 5–18 passando.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: monta a landing page completa (versão estática)"
```

---

## Task 20: Gate da intro do hero (TDD)

**Files:**
- Create: `lib/intro.ts`
- Test: `lib/intro.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `lib/intro.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { hasSeenIntro, markIntroSeen } from './intro';

describe('intro gate', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('hasSeenIntro é false numa sessão nova', () => {
    expect(hasSeenIntro()).toBe(false);
  });

  it('hasSeenIntro vira true depois de markIntroSeen', () => {
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run lib/intro.test.ts`
Expected: FAIL — "Failed to resolve import './intro'".

- [ ] **Step 3: Implementar `lib/intro.ts`**

```ts
const INTRO_KEY = 'bragas_intro_seen';

export function hasSeenIntro(): boolean {
  if (typeof window === 'undefined') return true;
  return window.sessionStorage.getItem(INTRO_KEY) === 'true';
}

export function markIntroSeen(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(INTRO_KEY, 'true');
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run lib/intro.test.ts`
Expected: PASS — 2 testes verdes.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: gate da intro via sessionStorage com testes"
```

---

## Task 21: ParticleExplosion

**Files:**
- Create: `components/hero/ParticleExplosion.tsx`

- [ ] **Step 1: Implementar `components/hero/ParticleExplosion.tsx`**

```tsx
'use client';

import { motion } from 'framer-motion';

const COLORS = ['#ef6c00', '#ff8c00', '#ffd700', '#8b4513', '#ffffff'];

type ParticleExplosionProps = {
  x: number; // posição horizontal em % (0-100)
};

export function ParticleExplosion({ x }: ParticleExplosionProps) {
  const particles = Array.from({ length: 12 });

  return (
    <div className="absolute bottom-24" style={{ left: `${x}%` }}>
      {particles.map((_, index) => {
        const angle = (index / particles.length) * Math.PI * 2;
        const distance = 60 + Math.random() * 40;
        return (
          <motion.span
            key={index}
            className="absolute h-2 w-2 rounded-full"
            style={{ backgroundColor: COLORS[index % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: ParticleExplosion"
```

---

## Task 22: BurgerRain

**Files:**
- Create: `components/hero/BurgerRain.tsx`

- [ ] **Step 1: Implementar `components/hero/BurgerRain.tsx`**

`onComplete` é chamado quando a última animação termina, sinalizando o fim da chuva.
```tsx
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ParticleExplosion } from './ParticleExplosion';

type BurgerRainProps = {
  onComplete: () => void;
};

const BURGER_COUNT = 14;

export function BurgerRain({ onComplete }: BurgerRainProps) {
  // valores aleatórios fixados uma vez (variância de posição/rotação/velocidade)
  const burgers = useMemo(
    () =>
      Array.from({ length: BURGER_COUNT }).map((_, index) => ({
        id: index,
        x: Math.random() * 100,
        rotateTo: Math.random() * 720 - 360,
        duration: 1.6 + Math.random() * 0.8, // ~±20%
        delay: Math.random() * 1.5,
      })),
    [],
  );

  const lastIndex = burgers.reduce(
    (slowest, b) => (b.delay + b.duration > slowest.delay + slowest.duration ? b : slowest),
    burgers[0],
  ).id;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {burgers.map((burger) => (
        <motion.div
          key={burger.id}
          className="absolute text-4xl"
          style={{ left: `${burger.x}%`, top: '-10%' }}
          initial={{ y: 0, rotate: 0 }}
          animate={{ y: '100vh', rotate: burger.rotateTo }}
          transition={{ duration: burger.duration, delay: burger.delay, ease: 'easeIn' }}
          onAnimationComplete={() => {
            if (burger.id === lastIndex) onComplete();
          }}
        >
          🍔
        </motion.div>
      ))}
      {burgers.map((burger) => (
        <motion.div
          key={`boom-${burger.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.6, delay: burger.delay + burger.duration }}
        >
          <ParticleExplosion x={burger.x} />
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: BurgerRain com explosão de partículas"
```

---

## Task 23: Integrar a intro no HeroSection

**Files:**
- Modify: `components/hero/HeroSection.tsx`
- Test: `components/hero/HeroSection.test.tsx`

- [ ] **Step 1: Atualizar o teste**

Substitua TODO o conteúdo de `components/hero/HeroSection.test.tsx` por:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('exibe a marca e o CTA', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { name: /Braga's Burger/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver cardápio' })).toHaveAttribute('href', '#cardapio');
  });

  it('mostra o botão Pular quando a intro está rodando', () => {
    render(<HeroSection />);
    expect(screen.getByRole('button', { name: 'Pular' })).toBeInTheDocument();
  });

  it('não mostra o botão Pular se a intro já foi vista nesta sessão', () => {
    window.sessionStorage.setItem('bragas_intro_seen', 'true');
    render(<HeroSection />);
    expect(screen.queryByRole('button', { name: 'Pular' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/hero/HeroSection.test.tsx`
Expected: FAIL — não existe botão "Pular".

- [ ] **Step 3: Substituir `components/hero/HeroSection.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { BurgerRain } from './BurgerRain';
import { hasSeenIntro, markIntroSeen } from '@/lib/intro';

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  // começa como false no servidor; o efeito decide no cliente
  const [introRunning, setIntroRunning] = useState(false);

  useEffect(() => {
    if (!hasSeenIntro() && !reduceMotion) {
      setIntroRunning(true);
    }
  }, [reduceMotion]);

  const finishIntro = () => {
    markIntroSeen();
    setIntroRunning(false);
  };

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-dark px-6 text-center">
      <AnimatePresence>
        {introRunning && (
          <motion.div
            key="intro"
            className="absolute inset-0 z-20 bg-brand-dark"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <BurgerRain onComplete={finishIntro} />
            <button
              type="button"
              onClick={finishIntro}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Pular
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mb-4 font-body text-sm uppercase tracking-[0.3em] text-brand-gold">
        Hamburgueria artesanal
      </p>
      <h1 className="font-heading text-5xl font-extrabold text-white md:text-7xl">
        Braga&apos;s Burger
      </h1>
      <p className="mt-4 max-w-md text-base text-white/70">
        Os melhores hambúrgueres da Zona Norte, feitos na hora e entregues quentinhos.
      </p>
      <div className="mt-8">
        <Button href="#cardapio">Ver cardápio</Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/hero/HeroSection.test.tsx`
Expected: PASS — 3 testes verdes.

- [ ] **Step 5: Verificar a intro no navegador**

Run: `npm run dev`, abra `http://localhost:3000` numa aba anônima.
Expected: a chuva de hambúrguer roda uma vez, com botão "Pular"; ao recarregar a mesma aba, vai direto ao hero. Encerre com `Ctrl+C`.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: integra a intro animada no HeroSection"
```

---

## Task 24: Polimento — responsividade e acessibilidade

**Files:**
- Modify: arquivos de componente conforme necessário (ajustes pontuais de classe Tailwind)

- [ ] **Step 1: Testar nos 4 tamanhos**

Run: `npm run dev` e, no DevTools (modo dispositivo), verifique 375px / 768px / 1024px / 1440px.
Expected checklist:
- Sem rolagem horizontal em nenhum tamanho.
- Grade do menu: 1 coluna (375px) → 2 (768px) → 3 (1024px+).
- Navbar não cobre conteúdo; links legíveis.
- Corrija com classes responsivas (`sm:` / `md:` / `lg:`) o que estiver quebrado.

- [ ] **Step 2: Revisar acessibilidade**

Verifique manualmente:
- Navegação por `Tab` chega a todos os links e botões, com foco visível.
- Lightbox da galeria fecha com `Esc` (já implementado na Task 17).
- Ative "reduzir movimento" no SO e confirme: hero sem chuva, carrossel parado, seções sem fade.
- Rode o Lighthouse (aba do DevTools) e mire score de Acessibilidade ≥ 90.

- [ ] **Step 3: Rodar a suíte completa e o build de produção**

Run: `npm test`
Expected: todos os testes passando.

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "polish: ajustes de responsividade e acessibilidade"
```

---

## Self-Review (preenchido pelo autor do plano)

**Cobertura do spec:**
- Stack (spec §3) → Tasks 1, 2 ✓
- Tokens de design (spec §4) → Task 3 ✓
- Arquitetura/arquivos (spec §5) → todas as tasks de criação ✓
- Modelo de dados (spec §6) → Tasks 4, 7 ✓
- 7 seções da página (spec §7) → Navbar T10, Hero T12/T23, Carrossel T16, Galeria T17, Menu T15, Info T18, Footer T11 ✓
- Animação do hero por fases (spec §8) → Tasks 20–23 ✓
- Animações das demais seções (spec §8) → Reveal T9, stagger/layout T15, carrossel T16, hover T13 ✓
- Responsividade (spec §9) → Task 24 ✓
- Acessibilidade (spec §10) → `useReducedMotion` em T9/T13/T23, `Esc` em T17, revisão em T24 ✓
- Testes (spec §11) → format T5, filter T6, intro T20, render tests T8–T18 ✓
- Ordem de construção (spec §12) → ordem das tasks segue o spec (setup → base → layout → hero estático → seções → animações) ✓
- Critérios de sucesso (spec §13) → verificados nas Tasks 19 e 24 ✓

**Placeholders:** nenhum — todo passo tem código ou comando concreto. Dados de exemplo (cardápio, telefone, bairros) estão marcados explicitamente como substituíveis, o que é uma decisão do spec, não um placeholder de plano.

**Consistência de tipos:** `Category`/`Product` (T4) usados de forma idêntica em T6, T7, T13, T14. `formatPrice` (T5) usado em T13. `filterProducts` (T6) usado em T15. `hasSeenIntro`/`markIntroSeen` (T20) usados em T23. `BurgerRain` expõe `onComplete` (T22) e é consumido assim em T23. `ParticleExplosion` expõe `x` (T21) e é consumido assim em T22. Sem divergências.
