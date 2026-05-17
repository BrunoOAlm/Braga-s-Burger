# Redesign da Landing Page Braga's Burger — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformular a landing page para identidade preto e branco premium, com vídeo de fundo no hero, logo oficial e o cardápio real (~80 produtos).

**Architecture:** Next.js 16 (App Router) + React 19 + Tailwind v4 + Framer Motion. Migração incremental: troca-se a paleta de tokens, depois cada componente é atualizado. A camada de dados (`data/`, `lib/`) é refeita de uma vez para manter o build válido. Testes com Vitest + React Testing Library.

**Tech Stack:** TypeScript, Tailwind CSS v4 (`@theme`), Framer Motion, `next/image`, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-17-landing-page-redesign-design.md` — consultar Apêndices A (cardápio), B (entrega) e C (URLs das fotos).

**Convenções:**
- Rodar testes: `npx vitest run <arquivo>`. Suíte completa: `npm test`.
- Build: `npm run build`. Lint: `npm run lint`.
- Antes de usar `next/image` ou `<video>`, conferir `node_modules/next/dist/docs/` (ver `AGENTS.md`).
- Branch de trabalho: `feat/landing-page` (continuação).

---

## Task 1: Paleta de cores monocromática

Substitui a paleta laranja/dourado/creme por tokens preto e branco. Tailwind v4 gera as classes
(`bg-ink`, `text-paper`, `border-line` etc.) a partir das variáveis em `@theme`.

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Reescrever `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-ink: #0b0b0c;
  --color-surface: #161618;
  --color-surface-hover: #212124;
  --color-line: #2e2e33;
  --color-paper: #f5f4f1;
  --color-muted: #9b9ba3;
  --color-faint: #646469;

  --font-heading: var(--font-poppins);
  --font-body: var(--font-inter);
}

body {
  background-color: var(--color-ink);
  color: var(--color-paper);
  font-family: var(--font-body), system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: var(--font-heading), system-ui, sans-serif;
}

@keyframes carousel-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  [style*="carousel-scroll"] { animation: none !important; }
}
```

- [ ] **Step 2: Verificar o build**

Run: `npm run build`
Expected: build conclui sem erro. (Classes antigas como `bg-brand-cream` deixam de existir e
viram no-op — visual incorreto até as próximas tarefas; isto é esperado.)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: paleta de cores preto e branco premium"
```

---

## Task 2: Botão monocromático

`Button` ganha variantes preto e branco. Comportamento (renderiza `<a>` ou `<button>`, `onClick`)
não muda — os testes existentes continuam válidos.

**Files:**
- Modify: `components/ui/Button.tsx`
- Test: `components/ui/Button.test.tsx` (existente, sem alteração)

- [ ] **Step 1: Reescrever `components/ui/Button.tsx`**

```tsx
import type { ReactNode } from 'react';

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
};

const styles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-white text-ink hover:bg-paper',
  ghost: 'bg-transparent text-paper border border-line hover:border-paper',
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

- [ ] **Step 2: Rodar o teste do Button**

Run: `npx vitest run components/ui/Button.test.tsx`
Expected: PASS (comportamento inalterado).

- [ ] **Step 3: Commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat: variantes monocromáticas do Button"
```

---

## Task 3: Logo — processar o arquivo e criar o componente

A logo (`public/images/Logo.png`, 1254×1254, sem transparência) é recortada num círculo com fundo
transparente, redimensionada para 512px, e exposta por um componente `Logo`. Também vira favicon.

**Files:**
- Create: `public/images/logo.png` (gerado), `public/images/Logo-original.png` (backup)
- Create: `app/icon.png` (gerado)
- Delete: `app/favicon.ico`
- Create: `components/ui/Logo.tsx`, `components/ui/Logo.test.tsx`

- [ ] **Step 1: Processar a logo (recorte circular + resize)**

Rodar no PowerShell, a partir da raiz do projeto:

```powershell
$dir = Join-Path (Get-Location) 'public\images'
Copy-Item -LiteralPath (Join-Path $dir 'Logo.png') -Destination (Join-Path $dir 'Logo-original.png') -Force
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Join-Path $dir 'Logo.png'))
$size = 512
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse(0, 0, $size, $size)
$g.SetClip($path)
$g.DrawImage($src, 0, 0, $size, $size)
$g.Dispose()
$bmp.Save((Join-Path $dir 'logo.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$icon = New-Object System.Drawing.Bitmap($bmp, 256, 256)
$icon.Save((Join-Path (Get-Location) 'app\icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose(); $bmp.Dispose(); $src.Dispose()
'OK — logo.png e app/icon.png gerados.'
```

Expected: imprime `OK — logo.png e app/icon.png gerados.` e cria `public/images/logo.png`
(círculo com cantos transparentes, ~512×512) e `app/icon.png` (256×256).

- [ ] **Step 2: Remover o favicon antigo**

```bash
git rm app/favicon.ico
```

(O Next usará `app/icon.png` automaticamente como favicon.)

- [ ] **Step 3: Escrever o teste de `Logo`**

Create `components/ui/Logo.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renderiza a imagem da logo com texto alternativo', () => {
    render(<Logo />);
    const img = screen.getByAltText("Braga's Burger");
    expect(img).toBeInTheDocument();
  });

  it('aplica o tamanho informado', () => {
    render(<Logo size={120} />);
    const img = screen.getByAltText("Braga's Burger");
    expect(img).toHaveAttribute('width', '120');
  });
});
```

- [ ] **Step 4: Rodar o teste e ver falhar**

Run: `npx vitest run components/ui/Logo.test.tsx`
Expected: FAIL — `Logo` não existe.

- [ ] **Step 5: Criar `components/ui/Logo.tsx`**

```tsx
import Image from 'next/image';

type LogoProps = {
  size?: number;
  priority?: boolean;
  className?: string;
};

export function Logo({ size = 48, priority = false, className }: LogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt="Braga's Burger"
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
```

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `npx vitest run components/ui/Logo.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/images/logo.png public/images/Logo-original.png app/icon.png components/ui/Logo.tsx components/ui/Logo.test.tsx
git commit -m "feat: logo processada (circular, transparente) e componente Logo"
```

---

## Task 4: Camada de dados — tipos, formatação e cardápio real

Tudo da camada de dados num passo só, para o build permanecer válido (mudar `Product` quebra o
`data/menu.ts` antigo). Transcreve o cardápio real do **Apêndice A** do spec e a entrega do
**Apêndice B**.

**Files:**
- Modify: `lib/types.ts`, `lib/format.ts`, `lib/format.test.ts`, `lib/filter.test.ts`
- Modify: `data/menu.ts`
- Create: `data/delivery.ts`, `data/menu.test.ts`

- [ ] **Step 1: Reescrever `lib/types.ts`**

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

- [ ] **Step 2: Escrever os testes de `formatProductPrice`**

Substituir `lib/format.test.ts` por:

```ts
import { describe, it, expect } from 'vitest';
import { formatPrice, formatProductPrice } from './format';

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

describe('formatProductPrice', () => {
  it('prefixa "A partir de" quando priceFrom é true', () => {
    expect(formatProductPrice({ price: 22.9, priceFrom: true })).toBe('A partir de R$ 22,90');
  });

  it('mostra só o preço quando priceFrom é false', () => {
    expect(formatProductPrice({ price: 3.9, priceFrom: false })).toBe('R$ 3,90');
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npx vitest run lib/format.test.ts`
Expected: FAIL — `formatProductPrice` não existe.

- [ ] **Step 4: Atualizar `lib/format.ts`**

```ts
export function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function formatProductPrice(product: { price: number; priceFrom: boolean }): string {
  const formatted = formatPrice(product.price);
  return product.priceFrom ? `A partir de ${formatted}` : formatted;
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npx vitest run lib/format.test.ts`
Expected: PASS.

- [ ] **Step 6: Corrigir o fixture de `lib/filter.test.ts`**

O `base` precisa do novo campo obrigatório `priceFrom`. Substituir o objeto `base`:

```ts
const base: Omit<Product, 'id' | 'categoryId'> = {
  name: 'X',
  description: 'desc',
  price: 10,
  priceFrom: false,
  imageUrl: '/x.jpg',
  featured: false,
  available: true,
};
```

(O resto do arquivo não muda — `filterProducts` não muda.)

- [ ] **Step 7: Reescrever `data/menu.ts` com o cardápio real**

Transcrever o **Apêndice A do spec**. As 7 categorias:

```ts
import type { Category, Product } from '@/lib/types';

export const categories: Category[] = [
  { id: 'burgers', name: 'Burgers', order: 1, layout: 'grid' },
  { id: 'trios', name: 'Trios', order: 2, layout: 'grid' },
  { id: 'tabuas', name: 'Tábuas', order: 3, layout: 'grid' },
  { id: 'porcoes', name: 'Porções', order: 4, layout: 'grid' },
  { id: 'sobremesas', name: 'Sobremesas', order: 5, layout: 'grid' },
  { id: 'molhos', name: 'Molhos', order: 6, layout: 'list' },
  { id: 'bebidas', name: 'Bebidas', order: 7, layout: 'list' },
];
```

Os 80 produtos seguem este formato exato (exemplos de cada tipo):

```ts
export const products: Product[] = [
  // --- Burgers (categoryId: 'burgers', priceFrom: true, featured conforme Apêndice A) ---
  {
    id: 'braguinha',
    categoryId: 'burgers',
    name: 'Braguinha',
    description: 'Pão de brioche, 100g blend bovino, queijo, ovo, alface, tomate e molho de bacon.',
    price: 22.9,
    priceFrom: true,
    imageUrl: '/images/products/braguinha.webp',
    featured: false,
    available: true,
  },
  {
    id: 'duplo',
    categoryId: 'burgers',
    name: 'Duplo',
    description: 'Pão brioche, 2 blends bovinos (150g cada), mix de queijos, bacon americano, molho de alho e onion rings.',
    price: 39.9,
    priceFrom: true,
    imageUrl: '/images/products/duplo.webp',
    featured: true,
    available: true,
  },
  // --- Trio: imageUrl = foto do burger correspondente (Apêndice A) ---
  {
    id: 'trio-braguinha',
    categoryId: 'trios',
    name: 'Trio Braguinha',
    description: 'Braguinha + fritas + bebida.',
    price: 32.8,
    priceFrom: true,
    imageUrl: '/images/products/braguinha.webp',
    featured: false,
    available: true,
  },
  // --- Tábua Vegano: sem foto ---
  {
    id: 'tabua-vegano',
    categoryId: 'tabuas',
    name: 'Tábua Vegano',
    description: '2 sanduíches veganos + fritas + anéis de cebola + molho + refrigerante.',
    price: 92.9,
    priceFrom: true,
    imageUrl: null,
    featured: false,
    available: true,
  },
  // --- Molho: layout list, sem descrição, sem foto, preço fixo ---
  {
    id: 'molho-barbecue',
    categoryId: 'molhos',
    name: 'Molho Barbecue',
    price: 3.9,
    priceFrom: false,
    imageUrl: null,
    featured: false,
    available: true,
  },
  // --- Bebida: layout list, sem descrição, sem foto, preço fixo ---
  {
    id: 'coca-cola-lata',
    categoryId: 'bebidas',
    name: 'Coca-Cola Lata',
    price: 7.9,
    priceFrom: false,
    imageUrl: null,
    featured: false,
    available: true,
  },
];
```

**Regras de transcrição (Apêndice A do spec):**
- **Burgers (14):** `priceFrom: true`, `imageUrl: '/images/products/<id>.webp'`. `featured: true`
  apenas em: `duplo`, `majestoso`, `crispy-catupiry`, `explosao-cheddar`, `epico`, `triplo-smash`.
- **Trios (14):** `priceFrom: true`, `imageUrl` = foto do burger correspondente (coluna "Foto de"
  do Apêndice A), `featured: false`.
- **Tábuas (14):** `priceFrom: true`, `imageUrl: '/images/products/<id>.webp'` — exceto
  `tabua-vegano` com `imageUrl: null`. `featured: false`.
- **Porções (10):** `imageUrl: '/images/products/<id>.webp'`. `priceFrom` conforme o Apêndice A
  (`fritas-*` = true; demais = false). `featured: false`.
- **Sobremesas (2):** `priceFrom: false`, `imageUrl: '/images/products/<id>.webp'`, `featured: false`.
- **Molhos (3):** `priceFrom: false`, `imageUrl: null`, sem `description`, `featured: false`.
- **Bebidas (23):** `priceFrom: false`, `imageUrl: null`, sem `description`, `featured: false`.
  IDs em kebab-case (ex.: `agua-com-gas`, `coca-cola-2l`, `guarana-antartica-lata`).
- Todos os produtos: `available: true`.
- Total: **80 produtos**.

- [ ] **Step 8: Criar `data/delivery.ts`** (Apêndice B do spec)

```ts
import type { DeliveryArea } from '@/lib/types';

export const deliveryAreas: DeliveryArea[] = [
  { neighborhood: 'Abolição', fee: 9.99 },
  { neighborhood: 'Adeus', fee: 6.99 },
  { neighborhood: 'Amorim', fee: 6.99 },
  { neighborhood: 'Arará', fee: 5.99 },
  { neighborhood: 'Benfica', fee: 6.99 },
  { neighborhood: 'Bonsucesso', fee: 6.99 },
  { neighborhood: 'Cachambi', fee: 6.99 },
  { neighborhood: 'CAH', fee: 4.99 },
  { neighborhood: 'Complexo do Alemão', fee: 7.99 },
  { neighborhood: 'Del Castilho', fee: 5.99 },
  { neighborhood: 'Engenho da Rainha', fee: 8.99 },
  { neighborhood: 'Engenho de Dentro', fee: 8.99 },
  { neighborhood: 'Engenho Novo', fee: 7.99 },
  { neighborhood: 'Grajaú', fee: 10.99 },
  { neighborhood: 'Higienópolis', fee: 4.99 },
  { neighborhood: 'Inhaúma', fee: 6.99 },
  { neighborhood: 'Jacaré', fee: 5.99 },
  { neighborhood: 'Jacarezinho', fee: 5.99 },
  { neighborhood: 'Mandela', fee: 5.99 },
  { neighborhood: 'Mangueira', fee: 7.99 },
  { neighborhood: 'Manguinhos', fee: 5.99 },
  { neighborhood: 'Maracanã', fee: 9.99 },
  { neighborhood: 'Maria da Graça', fee: 5.99 },
  { neighborhood: 'Méier', fee: 9.99 },
  { neighborhood: 'Olaria', fee: 7.99 },
  { neighborhood: 'Penha', fee: 9.99 },
  { neighborhood: 'Penha Circular', fee: 10.99 },
  { neighborhood: 'Pilares', fee: 8.99 },
  { neighborhood: 'Ramos', fee: 6.99 },
  { neighborhood: 'Riachuelo', fee: 6.99 },
  { neighborhood: 'Rocha', fee: 7.99 },
  { neighborhood: 'Sampaio', fee: 7.99 },
  { neighborhood: 'São Cristóvão', fee: 8.99 },
  { neighborhood: 'São Francisco Xavier', fee: 7.99 },
  { neighborhood: 'Tijuca', fee: 9.99 },
  { neighborhood: 'Todos os Santos', fee: 7.99 },
  { neighborhood: 'Triagem', fee: 5.99 },
  { neighborhood: 'Varginha', fee: 5.99 },
  { neighborhood: 'Vila Isabel', fee: 9.99 },
];
```

- [ ] **Step 9: Criar `data/menu.test.ts`** (sanidade da transcrição)

```ts
import { describe, it, expect } from 'vitest';
import { categories, products } from './menu';
import { deliveryAreas } from './delivery';

describe('dados do cardápio', () => {
  it('tem 7 categorias e 80 produtos', () => {
    expect(categories).toHaveLength(7);
    expect(products).toHaveLength(80);
  });

  it('todo produto pertence a uma categoria existente', () => {
    const ids = new Set(categories.map((c) => c.id));
    expect(products.every((p) => ids.has(p.categoryId))).toBe(true);
  });

  it('tem exatamente 6 destaques', () => {
    const featured = products.filter((p) => p.featured).map((p) => p.id).sort();
    expect(featured).toEqual(
      ['crispy-catupiry', 'duplo', 'epico', 'explosao-cheddar', 'majestoso', 'triplo-smash'].sort(),
    );
  });

  it('produtos das categorias list (molhos/bebidas) não têm foto', () => {
    const listCats = new Set(categories.filter((c) => c.layout === 'list').map((c) => c.id));
    const listProducts = products.filter((p) => listCats.has(p.categoryId));
    expect(listProducts.every((p) => p.imageUrl === null)).toBe(true);
  });
});

describe('dados de entrega', () => {
  it('tem 39 bairros', () => {
    expect(deliveryAreas).toHaveLength(39);
  });
});
```

- [ ] **Step 10: Rodar a suíte de dados e o build**

Run: `npx vitest run lib/format.test.ts lib/filter.test.ts data/menu.test.ts`
Expected: PASS em todos.
Run: `npm run build`
Expected: build conclui sem erro de tipo.

- [ ] **Step 11: Commit**

```bash
git add lib/types.ts lib/format.ts lib/format.test.ts lib/filter.test.ts data/menu.ts data/delivery.ts data/menu.test.ts
git commit -m "feat: camada de dados com cardápio real e taxas de entrega"
```

---

## Task 5: Baixar as fotos dos produtos

Baixa as 39 fotos do GrandChef (Apêndice C do spec) para `public/images/products/`.

**Files:**
- Create: `public/images/products/*.webp` (39 arquivos)

- [ ] **Step 1: Baixar as fotos**

Rodar no PowerShell, a partir da raiz do projeto:

```powershell
$dest = Join-Path (Get-Location) 'public\images\products'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$base = 'https://pro-assets.grandchef.com.br/gc10447/images/products/'
$map = @{
  'braguinha'='6688050f42fb6'; 'chicken'='66883e5271851'; 'crispy-catupiry'='66553973931cb';
  'dogao-linguica'='69d507977a90f'; 'dogao-salsicha'='69dec3a14366a'; 'duplo'='668834ea92ba0';
  'duplo-smash'='668852158e63a'; 'epico'='66d738b08781e'; 'explosao-cheddar'='668831e3d56d5';
  'gourmet'='66880997a47e8'; 'kids-alice'='66883a0e68876'; 'majestoso'='6688565bc928c';
  'triplo-smash'='6688540d6937a'; 'vegano'='66884314280fc';
  'tabua-braga-chicken'='69fb8d5d04502'; 'tabua-braguinha'='69fbb8647a630';
  'tabua-crispy-catupiry'='69fb8e28d1a51'; 'tabua-dogao-linguica'='69fb8cf5e2c44';
  'tabua-dogao-salsicha'='69fb8e64cb4d0'; 'tabua-duplo'='69fb8d2ea9bb6';
  'tabua-duplo-smash'='69fb8e4035de3'; 'tabua-epico'='69fbb8b5854ed';
  'tabua-explosao-cheddar'='69fb8d0926e67'; 'tabua-familia'='69fbb89a19fef';
  'tabua-gourmet'='69fb8d45c38a5'; 'tabua-majestoso'='69fb8e57cdc65';
  'tabua-triplo-smash'='69fb8dc882292';
  'frango-empanado-grande'='67eb6d4df0f40'; 'frango-empanado-media'='67eb6d41bad3c';
  'fritas-grande'='67dc3c6feb18c'; 'fritas-media'='67dc3c58b6bf8'; 'fritas-pequena'='67dc3c650faee';
  'aneis-cebola'='679157bf12ffa'; 'coxinhas'='679157773df7b'; 'nugget-supreme'='67915754bb564';
  'frango-passarinho'='679157d5a172b'; 'roda-gigante'='67eb6d2764606';
  'brownie-sorvete'='69fbb8d25bb5e'; 'matilda-cake'='69fbb8c4c4fcf';
}
foreach ($id in $map.Keys) {
  Invoke-WebRequest -Uri ($base + $map[$id] + '.webp') -OutFile (Join-Path $dest "$id.webp")
}
'Baixadas ' + (Get-ChildItem $dest -Filter *.webp).Count + ' fotos.'
```

Expected: imprime `Baixadas 39 fotos.`

- [ ] **Step 2: Conferir os arquivos**

Run: `npx vitest run data/menu.test.ts`
Expected: PASS (sanidade dos dados — fotos não afetam, mas confirma o estado).

- [ ] **Step 3: Commit**

```bash
git add public/images/products
git commit -m "feat: fotos reais dos produtos"
```

---

## Task 6: ProductCard monocromático com placeholder

Card escuro, foto colorida via `next/image`, placeholder quando `imageUrl` é `null`, preço via
`formatProductPrice`.

**Files:**
- Modify: `components/sections/ProductCard.tsx`
- Test: `components/sections/ProductCard.test.tsx`

- [ ] **Step 1: Reescrever o teste `components/sections/ProductCard.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/types';

const base: Product = {
  id: 'p1',
  categoryId: 'burgers',
  name: 'Duplo',
  description: 'Dois blends.',
  price: 39.9,
  priceFrom: true,
  imageUrl: '/images/products/duplo.webp',
  featured: true,
  available: true,
};

describe('ProductCard', () => {
  it('mostra nome, descrição e preço com "A partir de"', () => {
    render(<ProductCard product={base} />);
    expect(screen.getByText('Duplo')).toBeInTheDocument();
    expect(screen.getByText('Dois blends.')).toBeInTheDocument();
    expect(screen.getByText('A partir de R$ 39,90')).toBeInTheDocument();
  });

  it('mostra a foto quando há imageUrl', () => {
    render(<ProductCard product={base} />);
    expect(screen.getByAltText('Duplo')).toBeInTheDocument();
  });

  it('mostra placeholder quando imageUrl é null', () => {
    render(<ProductCard product={{ ...base, imageUrl: null }} />);
    expect(screen.queryByAltText('Duplo')).not.toBeInTheDocument();
    expect(screen.getByTestId('product-placeholder')).toBeInTheDocument();
  });

  it('mostra "Esgotado" quando indisponível', () => {
    render(<ProductCard product={{ ...base, available: false }} />);
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/ProductCard.test.tsx`
Expected: FAIL (preço sem "A partir de"; sem `product-placeholder`).

- [ ] **Step 3: Reescrever `components/sections/ProductCard.tsx`**

```tsx
'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { formatProductPrice } from '@/lib/format';

const categoryIcon: Record<string, string> = {
  tabuas: '🍽️',
  molhos: '🥫',
  bebidas: '🥤',
};

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <div className="relative aspect-[4/3] bg-ink">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div
            data-testid="product-placeholder"
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-faint"
          >
            <span className="text-4xl" aria-hidden="true">
              {categoryIcon[product.categoryId] ?? '🍔'}
            </span>
            <span className="px-4 text-center text-xs uppercase tracking-widest">
              {product.name}
            </span>
          </div>
        )}
        {!product.available && (
          <span className="absolute right-3 top-3 rounded-full bg-ink/90 px-3 py-1 text-xs font-semibold text-paper">
            Esgotado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-heading text-lg font-bold text-paper">{product.name}</h3>
        {product.description && (
          <p className="mt-1 flex-1 text-sm text-muted">{product.description}</p>
        )}
        <p className="mt-3 font-heading text-lg font-bold text-paper">
          {formatProductPrice(product)}
        </p>
      </div>
    </motion.article>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/ProductCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/ProductCard.tsx components/sections/ProductCard.test.tsx
git commit -m "feat: ProductCard monocromático com placeholder e preço 'a partir de'"
```

---

## Task 7: ProductList — lista compacta para molhos e bebidas

Lista de "nome … preço" em duas colunas, para categorias com `layout: 'list'`.

**Files:**
- Create: `components/sections/ProductList.tsx`, `components/sections/ProductList.test.tsx`

- [ ] **Step 1: Escrever o teste `components/sections/ProductList.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductList } from './ProductList';
import type { Product } from '@/lib/types';

const products: Product[] = [
  { id: 'b1', categoryId: 'bebidas', name: 'Coca-Cola Lata', price: 7.9, priceFrom: false, imageUrl: null, featured: false, available: true },
  { id: 'b2', categoryId: 'bebidas', name: 'Água com gás', price: 4.9, priceFrom: false, imageUrl: null, featured: false, available: true },
];

describe('ProductList', () => {
  it('renderiza uma linha por produto com nome e preço', () => {
    render(<ProductList products={products} />);
    expect(screen.getByText('Coca-Cola Lata')).toBeInTheDocument();
    expect(screen.getByText('R$ 7,90')).toBeInTheDocument();
    expect(screen.getByText('Água com gás')).toBeInTheDocument();
    expect(screen.getByText('R$ 4,90')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/ProductList.test.tsx`
Expected: FAIL — `ProductList` não existe.

- [ ] **Step 3: Criar `components/sections/ProductList.tsx`**

```tsx
import type { Product } from '@/lib/types';
import { formatProductPrice } from '@/lib/format';

type ProductListProps = {
  products: Product[];
};

export function ProductList({ products }: ProductListProps) {
  return (
    <ul className="grid gap-x-10 sm:grid-cols-2">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex items-baseline gap-3 border-b border-line py-3"
        >
          <span className="font-medium text-paper">{product.name}</span>
          <span className="h-px flex-1 self-end bg-line" aria-hidden="true" />
          <span className="font-heading font-semibold text-paper">
            {formatProductPrice(product)}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/ProductList.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/ProductList.tsx components/sections/ProductList.test.tsx
git commit -m "feat: ProductList — lista compacta de molhos e bebidas"
```

---

## Task 8: CategoryFilter com semântica `radiogroup`

Pílulas viram um `radiogroup` acessível; pílula ativa fica branca.

**Files:**
- Modify: `components/sections/CategoryFilter.tsx`
- Test: `components/sections/CategoryFilter.test.tsx`

- [ ] **Step 1: Reescrever o teste `components/sections/CategoryFilter.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilter } from './CategoryFilter';
import type { Category } from '@/lib/types';

const categories: Category[] = [
  { id: 'burgers', name: 'Burgers', order: 1, layout: 'grid' },
  { id: 'bebidas', name: 'Bebidas', order: 2, layout: 'list' },
];

describe('CategoryFilter', () => {
  it('é um radiogroup com "Todos" mais cada categoria', () => {
    render(<CategoryFilter categories={categories} active={null} onChange={() => {}} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Burgers' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bebidas' })).toBeInTheDocument();
  });

  it('marca aria-checked na opção ativa', () => {
    render(<CategoryFilter categories={categories} active="burgers" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Burgers' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Todos' })).toHaveAttribute('aria-checked', 'false');
  });

  it('chama onChange com o id da categoria clicada', async () => {
    const onChange = vi.fn();
    render(<CategoryFilter categories={categories} active={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Bebidas' }));
    expect(onChange).toHaveBeenCalledWith('bebidas');
  });

  it('chama onChange com null ao clicar em "Todos"', async () => {
    const onChange = vi.fn();
    render(<CategoryFilter categories={categories} active="burgers" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Todos' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/CategoryFilter.test.tsx`
Expected: FAIL — não há `radiogroup`/`radio`.

- [ ] **Step 3: Reescrever `components/sections/CategoryFilter.tsx`**

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
  const options: { id: string | null; name: string }[] = [
    { id: null, name: 'Todos' },
    ...sorted.map((c) => ({ id: c.id, name: c.name })),
  ];

  const tabClass = (isActive: boolean) =>
    `cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
      isActive
        ? 'border-paper bg-paper text-ink'
        : 'border-line bg-surface text-muted hover:text-paper'
    }`;

  return (
    <div
      role="radiogroup"
      aria-label="Categorias do cardápio"
      className="flex flex-wrap justify-center gap-3"
    >
      {options.map((option) => {
        const isActive = active === option.id;
        return (
          <button
            key={option.id ?? 'todos'}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={tabClass(isActive)}
            onClick={() => onChange(option.id)}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/CategoryFilter.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/CategoryFilter.tsx components/sections/CategoryFilter.test.tsx
git commit -m "feat: CategoryFilter com semântica radiogroup e tema monocromático"
```

---

## Task 9: MenuSection — roteamento grid/list e visão "Todos" agrupada

Cada categoria renderiza no seu layout (`grid` de cards ou `list`); "Todos" mostra todas como
blocos rotulados.

**Files:**
- Modify: `components/sections/MenuSection.tsx`
- Test: `components/sections/MenuSection.test.tsx`

- [ ] **Step 1: Reescrever o teste `components/sections/MenuSection.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuSection } from './MenuSection';

describe('MenuSection', () => {
  it('mostra o título do cardápio', () => {
    render(<MenuSection />);
    expect(screen.getByRole('heading', { name: 'Nosso cardápio' })).toBeInTheDocument();
  });

  it('em "Todos" mostra os blocos de categoria com cabeçalho', () => {
    render(<MenuSection />);
    expect(screen.getByRole('heading', { name: 'Burgers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bebidas' })).toBeInTheDocument();
  });

  it('ao escolher uma categoria mostra só ela', async () => {
    render(<MenuSection />);
    await userEvent.click(screen.getByRole('radio', { name: 'Bebidas' }));
    expect(screen.queryByRole('heading', { name: 'Burgers' })).not.toBeInTheDocument();
    expect(screen.getByText('Coca-Cola Lata')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/MenuSection.test.tsx`
Expected: FAIL (componente ainda no formato antigo).

- [ ] **Step 3: Reescrever `components/sections/MenuSection.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { categories, products } from '@/data/menu';
import { filterProducts } from '@/lib/filter';
import type { Category } from '@/lib/types';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { ProductList } from './ProductList';

function CategoryBlock({ category, showHeading }: { category: Category; showHeading: boolean }) {
  const items = filterProducts(products, category.id);
  if (items.length === 0) return null;

  return (
    <div className="mt-12">
      {showHeading && (
        <h3 className="mb-6 font-heading text-2xl font-bold text-paper">{category.name}</h3>
      )}
      {category.layout === 'list' ? (
        <ProductList products={items} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuSection() {
  const [active, setActive] = useState<string | null>(null);
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  const visible = active === null ? sorted : sorted.filter((c) => c.id === active);

  return (
    <section id="cardapio" className="bg-ink px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-paper md:text-4xl">
          Nosso cardápio
        </h2>
        <p className="mt-2 text-center text-muted">
          Escolha uma categoria e monte seu pedido.
        </p>

        <div className="mt-8">
          <CategoryFilter categories={categories} active={active} onChange={setActive} />
        </div>

        {visible.map((category) => (
          <CategoryBlock key={category.id} category={category} showHeading={active === null} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/MenuSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/MenuSection.tsx components/sections/MenuSection.test.tsx
git commit -m "feat: MenuSection com layout grid/list e visão Todos agrupada"
```

---

## Task 10: FeaturedCarousel no tema monocromático

Apenas atualização de cores; a lógica de rolagem automática não muda.

**Files:**
- Modify: `components/sections/FeaturedCarousel.tsx`
- Test: `components/sections/FeaturedCarousel.test.tsx` (existente)

- [ ] **Step 1: Reescrever `components/sections/FeaturedCarousel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { products } from '@/data/menu';
import { ProductCard } from './ProductCard';

export function FeaturedCarousel() {
  const featured = products.filter((product) => product.featured);
  const [paused, setPaused] = useState(false);

  return (
    <section id="destaques" className="bg-ink px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-paper md:text-4xl">
          Destaques da casa
        </h2>
        <p className="mt-2 text-center text-muted">
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

- [ ] **Step 2: Rodar o teste**

Run: `npx vitest run components/sections/FeaturedCarousel.test.tsx`
Expected: PASS. Se algum texto testado mudou (ex.: cor), ajustar o teste para verificar apenas
o comportamento — presença do título "Destaques da casa" e dos cards.

- [ ] **Step 3: Commit**

```bash
git add components/sections/FeaturedCarousel.tsx components/sections/FeaturedCarousel.test.tsx
git commit -m "feat: FeaturedCarousel no tema monocromático"
```

---

## Task 11: Gallery — vitrine de fotos com focus-trap

A galeria mostra uma seleção curada de fotos de produto; o lightbox prende o foco do teclado
enquanto aberto e devolve o foco ao gatilho ao fechar.

**Files:**
- Modify: `components/sections/Gallery.tsx`
- Test: `components/sections/Gallery.test.tsx`

- [ ] **Step 1: Reescrever o teste `components/sections/Gallery.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('move o foco para o botão Fechar ao abrir o lightbox', async () => {
    render(<Gallery />);
    await userEvent.click(screen.getAllByRole('button', { name: /Ampliar foto/ })[0]);
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  });

  it('fecha com a tecla Escape', async () => {
    render(<Gallery />);
    await userEvent.click(screen.getAllByRole('button', { name: /Ampliar foto/ })[0]);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/Gallery.test.tsx`
Expected: FAIL (foco não vai para "Fechar").

- [ ] **Step 3: Reescrever `components/sections/Gallery.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const photos = [
  '/images/products/duplo.webp',
  '/images/products/majestoso.webp',
  '/images/products/crispy-catupiry.webp',
  '/images/products/explosao-cheddar.webp',
  '/images/products/epico.webp',
  '/images/products/triplo-smash.webp',
];

export function Gallery() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const open = (index: number) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setOpenIndex(index);
  };

  const close = () => {
    setOpenIndex(null);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (openIndex === null) return;
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      } else if (event.key === 'Tab') {
        // Único elemento focável no diálogo: o botão Fechar → trava o foco.
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex]);

  return (
    <section id="galeria" className="bg-ink px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-paper md:text-4xl">
          Galeria
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              aria-label={`Ampliar foto ${index + 1}`}
              onClick={() => open(index)}
              className="aspect-square cursor-pointer overflow-hidden rounded-xl border border-line bg-cover bg-center transition-transform duration-200 hover:scale-[1.03]"
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
            onClick={close}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-6"
          >
            <button
              ref={closeRef}
              type="button"
              aria-label="Fechar"
              onClick={close}
              className="absolute right-6 top-6 cursor-pointer rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-paper hover:border-paper"
            >
              Fechar
            </button>
            <div
              className="aspect-square w-full max-w-xl rounded-2xl bg-surface bg-cover bg-center"
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
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/Gallery.tsx components/sections/Gallery.test.tsx
git commit -m "feat: Gallery com fotos de produto e focus-trap no lightbox"
```

---

## Task 12: HeroSection com vídeo de fundo

Remove a intro de emoji e o portão de sessão; adiciona vídeo de fundo e entrada elegante.

**Files:**
- Modify: `components/hero/HeroSection.tsx`
- Test: `components/hero/HeroSection.test.tsx`
- Delete: `components/hero/BurgerRain.tsx`, `components/hero/ParticleExplosion.tsx`,
  `lib/intro.ts`, `lib/intro.test.ts`

- [ ] **Step 1: Apagar os arquivos da intro antiga**

```bash
git rm components/hero/BurgerRain.tsx components/hero/ParticleExplosion.tsx lib/intro.ts lib/intro.test.ts
```

- [ ] **Step 2: Reescrever o teste `components/hero/HeroSection.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('tem o título acessível "Braga\\'s Burger"', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { name: "Braga's Burger" })).toBeInTheDocument();
  });

  it('mostra o CTA para o cardápio', () => {
    render(<HeroSection />);
    const cta = screen.getByRole('link', { name: 'Ver cardápio' });
    expect(cta).toHaveAttribute('href', '#cardapio');
  });

  it('mostra a logo', () => {
    render(<HeroSection />);
    expect(screen.getByAltText("Braga's Burger")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npx vitest run components/hero/HeroSection.test.tsx`
Expected: FAIL (HeroSection ainda importa `BurgerRain`/`intro`, que não existem mais).

- [ ] **Step 4: Reescrever `components/hero/HeroSection.tsx`**

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const entrance = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.5, delay, ease: 'easeOut' as const },
  });

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center">
      {!reduceMotion && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
      )}
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/85"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center">
        <h1 className="sr-only">Braga&apos;s Burger</h1>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
        >
          <Logo size={140} priority />
        </motion.div>

        <motion.p
          className="mt-6 text-xs uppercase tracking-[0.3em] text-muted"
          {...entrance(0.25)}
        >
          Hamburgueria artesanal
        </motion.p>

        <motion.p className="mt-3 max-w-md text-base text-paper/80" {...entrance(0.4)}>
          Os melhores hambúrgueres da Zona Norte, feitos na hora.
        </motion.p>

        <motion.div className="mt-8" {...entrance(0.55)}>
          <Button href="#cardapio">Ver cardápio</Button>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npx vitest run components/hero/HeroSection.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/hero/HeroSection.tsx components/hero/HeroSection.test.tsx components/hero/BurgerRain.tsx components/hero/ParticleExplosion.tsx lib/intro.ts lib/intro.test.ts
git commit -m "feat: HeroSection com vídeo de fundo; remove intro de emoji"
```

---

## Task 13: DeliveryLookup — consulta de taxa por bairro

`<select>` dos 39 bairros que exibe a taxa de entrega da opção escolhida.

**Files:**
- Create: `components/sections/DeliveryLookup.tsx`, `components/sections/DeliveryLookup.test.tsx`

- [ ] **Step 1: Escrever o teste `components/sections/DeliveryLookup.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryLookup } from './DeliveryLookup';

describe('DeliveryLookup', () => {
  it('não mostra taxa antes de escolher um bairro', () => {
    render(<DeliveryLookup />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra a taxa correta do bairro escolhido', async () => {
    render(<DeliveryLookup />);
    await userEvent.selectOptions(screen.getByLabelText(/bairro/i), 'Higienópolis');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Higienópolis');
    expect(status).toHaveTextContent('R$ 4,99');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/DeliveryLookup.test.tsx`
Expected: FAIL — `DeliveryLookup` não existe.

- [ ] **Step 3: Criar `components/sections/DeliveryLookup.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { deliveryAreas } from '@/data/delivery';
import { formatPrice } from '@/lib/format';

export function DeliveryLookup() {
  const [selected, setSelected] = useState('');

  const sorted = useMemo(
    () =>
      [...deliveryAreas].sort((a, b) =>
        a.neighborhood.localeCompare(b.neighborhood, 'pt-BR'),
      ),
    [],
  );
  const area = deliveryAreas.find((a) => a.neighborhood === selected);

  return (
    <div>
      <label htmlFor="bairro-entrega" className="block text-sm text-muted">
        Consulte a taxa do seu bairro
      </label>
      <select
        id="bairro-entrega"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-paper"
      >
        <option value="">Selecione um bairro…</option>
        {sorted.map((a) => (
          <option key={a.neighborhood} value={a.neighborhood}>
            {a.neighborhood}
          </option>
        ))}
      </select>
      {area && (
        <p className="mt-3 text-sm text-paper" role="status">
          Taxa para <strong>{area.neighborhood}</strong>:{' '}
          <strong>{formatPrice(area.fee)}</strong>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/sections/DeliveryLookup.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/DeliveryLookup.tsx components/sections/DeliveryLookup.test.tsx
git commit -m "feat: DeliveryLookup — consulta de taxa de entrega por bairro"
```

---

## Task 14: InfoSection com dados reais

Horário, entrega (+ `DeliveryLookup`), formas de pagamento e contato reais.

**Files:**
- Modify: `components/sections/InfoSection.tsx`
- Test: `components/sections/InfoSection.test.tsx`

- [ ] **Step 1: Reescrever o teste `components/sections/InfoSection.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoSection } from './InfoSection';

describe('InfoSection', () => {
  it('mostra os blocos de informação', () => {
    render(<InfoSection />);
    expect(screen.getByRole('heading', { name: 'Horário' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrega' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Formas de pagamento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contato' })).toBeInTheDocument();
  });

  it('linka o WhatsApp real', () => {
    render(<InfoSection />);
    const wpp = screen.getByRole('link', { name: /WhatsApp/ });
    expect(wpp).toHaveAttribute('href', 'https://wa.me/5521984019048');
  });

  it('inclui a consulta de taxa por bairro', () => {
    render(<InfoSection />);
    expect(screen.getByLabelText(/bairro/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/sections/InfoSection.test.tsx`
Expected: FAIL (conteúdo antigo).

- [ ] **Step 3: Reescrever `components/sections/InfoSection.tsx`**

```tsx
import { DeliveryLookup } from './DeliveryLookup';

const payments = [
  'Dinheiro',
  'Crédito',
  'Débito',
  'Pix (QR Code)',
  'Vale-refeição: Ticket, Sodexo, Alelo, Gren Card',
];

export function InfoSection() {
  return (
    <section id="contato" className="bg-ink px-6 py-20 text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-heading text-xl font-bold text-paper">Horário</h3>
          <p className="mt-3 text-sm text-muted">Terça a Quinta: 18h – 23h40</p>
          <p className="text-sm text-muted">Sexta a Domingo: 18h – 00h</p>
          <p className="text-sm text-faint">Segunda: fechado</p>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-paper">Entrega</h3>
          <p className="mt-3 text-sm text-muted">Entrega ou retirada no local.</p>
          <p className="text-sm text-muted">Pedido mínimo: R$ 25,00</p>
          <div className="mt-4">
            <DeliveryLookup />
          </div>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-paper">Formas de pagamento</h3>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {payments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-paper">Contato</h3>
          <p className="mt-3 text-sm text-muted">Higienópolis — Zona Norte, Rio de Janeiro</p>
          <a
            href="https://wa.me/5521984019048"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-sm text-muted transition-colors hover:text-paper"
          >
            WhatsApp: (21) 98401-9048
          </a>
          <a
            href="https://www.instagram.com/bragas_burger/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-sm text-muted transition-colors hover:text-paper"
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
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/InfoSection.tsx components/sections/InfoSection.test.tsx
git commit -m "feat: InfoSection com dados reais e consulta de entrega"
```

---

## Task 15: Navbar com logo e tema monocromático

**Files:**
- Modify: `components/layout/Navbar.tsx`
- Test: `components/layout/Navbar.test.tsx`

- [ ] **Step 1: Reescrever `components/layout/Navbar.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

const links = [
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Destaques', href: '#destaques' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contato', href: '#contato' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="fixed inset-x-4 top-4 z-50 mx-auto max-w-6xl">
      <div className="flex items-center justify-between rounded-full border border-line bg-ink/85 px-6 py-3 backdrop-blur">
        <a href="#" aria-label="Braga's Burger — início" className="flex items-center">
          <Logo size={40} priority />
        </a>

        <ul className="hidden gap-6 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-muted transition-colors hover:text-paper"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <Button href="#cardapio">Peça agora</Button>
        </div>

        <button
          type="button"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer text-paper md:hidden"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-2xl border border-line bg-ink/95 p-4 backdrop-blur md:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={close}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-paper"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#cardapio"
            onClick={close}
            className="mt-3 block rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            Peça agora
          </a>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Rodar o teste**

Run: `npx vitest run components/layout/Navbar.test.tsx`
Expected: PASS. Se o teste verificava o texto "Braga's Burger" como `<span>`, ajustar para
`screen.getByLabelText("Braga's Burger — início")` ou para a presença dos links. Manter os
testes de comportamento do menu mobile (abre/fecha).

- [ ] **Step 3: Commit**

```bash
git add components/layout/Navbar.tsx components/layout/Navbar.test.tsx
git commit -m "feat: Navbar com logo e tema monocromático"
```

---

## Task 16: Footer com logo, tema e links legais

**Files:**
- Modify: `components/layout/Footer.tsx`
- Test: `components/layout/Footer.test.tsx`

- [ ] **Step 1: Reescrever o teste `components/layout/Footer.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('mostra a logo', () => {
    render(<Footer />);
    expect(screen.getByAltText("Braga's Burger")).toBeInTheDocument();
  });

  it('linka Termos de Uso e Política de Privacidade', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute(
      'href',
      '/politica-de-privacidade',
    );
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run components/layout/Footer.test.tsx`
Expected: FAIL (sem logo / sem links legais).

- [ ] **Step 3: Reescrever `components/layout/Footer.tsx`**

```tsx
import { Logo } from '@/components/ui/Logo';

const navLinks = [
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contato', href: '#contato' },
];

const legalLinks = [
  { label: 'Termos de Uso', href: '/termos' },
  { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-ink px-6 py-10 text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={56} />
          <p className="text-sm">Hamburgueria artesanal — Higienópolis, RJ</p>
        </div>
        <ul className="flex flex-wrap gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm transition-colors hover:text-paper">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-2 text-xs text-faint md:flex-row md:items-center md:justify-between">
        <p>© {year} Braga&apos;s Burger. Todos os direitos reservados.</p>
        <ul className="flex gap-4">
          {legalLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-paper">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run components/layout/Footer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/layout/Footer.tsx components/layout/Footer.test.tsx
git commit -m "feat: Footer com logo, tema e links legais"
```

---

## Task 17: Páginas provisórias de Termos e Política de Privacidade

Duas páginas com texto provisório e aviso visível de que não têm validade jurídica.

**Files:**
- Create: `app/termos/page.tsx`, `app/politica-de-privacidade/page.tsx`
- Create: `components/layout/LegalPage.tsx` (layout compartilhado das duas páginas)

- [ ] **Step 1: Criar `components/layout/LegalPage.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <h1 className="font-heading text-3xl font-extrabold text-paper md:text-4xl">{title}</h1>

        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          <strong className="text-paper">Aviso:</strong> este é um texto provisório, sem validade
          jurídica. A versão oficial deve ser redigida por um advogado antes de o site entrar em
          operação recebendo pedidos.
        </p>

        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">{children}</div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Criar `app/termos/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: "Termos de Uso — Braga's Burger",
};

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Estes Termos de Uso descrevem as regras para utilização do site do Braga&apos;s Burger e
        do serviço de pedidos de alimentos. Ao usar o site, o cliente concorda com estas regras.
      </p>
      <p>
        Os pedidos estão sujeitos à disponibilidade dos itens, ao horário de funcionamento e às
        áreas de entrega divulgadas. Preços e taxas de entrega podem ser atualizados sem aviso
        prévio.
      </p>
      <p>
        A entrega é feita nos bairros atendidos, mediante a taxa correspondente; também é possível
        retirar o pedido no local. O pedido mínimo é de R$ 25,00.
      </p>
      <p>
        Dúvidas ou problemas com um pedido devem ser comunicados pelos canais de contato
        divulgados no site.
      </p>
    </LegalPage>
  );
}
```

- [ ] **Step 3: Criar `app/politica-de-privacidade/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: "Política de Privacidade — Braga's Burger",
};

export default function PoliticaPage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta Política de Privacidade explica como o Braga&apos;s Burger trata os dados pessoais
        fornecidos pelos clientes ao usar o site e fazer pedidos.
      </p>
      <p>
        Podem ser coletados dados como nome, telefone, endereço de entrega e forma de pagamento,
        utilizados exclusivamente para processar e entregar os pedidos e para contato sobre eles.
      </p>
      <p>
        Os dados não são vendidos a terceiros. O cliente pode solicitar informações sobre seus
        dados pelos canais de contato divulgados no site, conforme a Lei Geral de Proteção de
        Dados (LGPD).
      </p>
    </LegalPage>
  );
}
```

- [ ] **Step 4: Verificar o build e o lint**

Run: `npm run build`
Expected: as rotas `/termos` e `/politica-de-privacidade` aparecem na saída do build.
Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add components/layout/LegalPage.tsx app/termos/page.tsx app/politica-de-privacidade/page.tsx
git commit -m "feat: páginas provisórias de Termos e Política de Privacidade"
```

---

## Task 18: Polimento final — verificação completa

**Files:**
- Modify (se necessário): qualquer arquivo com ajuste de responsividade/acessibilidade

- [ ] **Step 1: Rodar a suíte completa**

Run: `npm test`
Expected: todos os testes passam. Corrigir qualquer teste que ainda referencie cores/textos
antigos — verificando comportamento, não aparência.

- [ ] **Step 2: Lint e build**

Run: `npm run lint`
Expected: sem erros nem avisos.
Run: `npm run build`
Expected: build conclui; todas as rotas (`/`, `/termos`, `/politica-de-privacidade`) listadas.

- [ ] **Step 3: Conferência visual no navegador**

Run: `npm run dev` e abrir `http://localhost:3000`. Verificar manualmente:
- Vídeo do hero toca em loop; logo e textos entram suavemente.
- Site inteiro preto e branco — nenhuma cor laranja/dourada/creme remanescente.
- Cardápio: grade de cards (Burgers/Trios/Tábuas/Porções/Sobremesas) e lista (Molhos/Bebidas);
  filtro alterna corretamente; placeholder aparece na Tábua Vegano.
- `DeliveryLookup` mostra a taxa correta ao escolher um bairro.
- Lightbox da galeria abre, prende o foco e fecha (mouse, Esc e teclado).
- Links `/termos` e `/politica-de-privacidade` abrem com o aviso visível.
- Sem rolagem horizontal em 375 / 768 / 1024 / 1440px.
- Com "reduzir movimento" ativo no SO: o vídeo não toca e as entradas são instantâneas.

- [ ] **Step 4: Commit de quaisquer ajustes**

```bash
git add -A
git commit -m "polish: ajustes finais de responsividade e acessibilidade"
```

- [ ] **Step 5: Compressão do vídeo (requer ffmpeg — pode ficar para depois)**

O `hero-bg.mp4` tem 11,8 MB. Se o `ffmpeg` estiver disponível, comprimir e gerar um poster:

```bash
ffmpeg -i public/videos/hero-bg.mp4 -vcodec libx264 -crf 28 -preset slow -an -movflags +faststart public/videos/hero-bg-compressed.mp4
ffmpeg -i public/videos/hero-bg.mp4 -vf "select=eq(n\,0)" -frames:v 1 public/videos/hero-poster.jpg
```

Se comprimido: substituir `hero-bg.mp4` pelo arquivo comprimido e adicionar
`poster="/videos/hero-poster.jpg"` ao `<video>` em `HeroSection.tsx`. Caso o `ffmpeg` não esteja
instalado, registrar como pendência e seguir — não bloqueia a entrega.

```bash
git add -A
git commit -m "perf: comprime o vídeo de fundo do hero"
```

---

## Self-Review (preenchido pelo autor do plano)

**Cobertura do spec:**
- §3 Tokens → Task 1. §4 Hero/vídeo → Task 12. §5 Logo → Task 3. §6 Modelo de dados → Task 4.
- §7 Cardápio (dados, fotos, layouts, ProductCard) → Tasks 4, 5, 6, 7, 8, 9. §7 Destaques → Task 10.
- §8 InfoSection → Tasks 13, 14. §9 Galeria → Task 11. §10 Footer/legais → Tasks 16, 17.
- §11 Acessibilidade (focus-trap, radiogroup) → Tasks 11, 8; verificação → Task 18.
- §12 Performance (compressão do vídeo) → Task 18 Step 5. §13 arquivos → cobertos.
- Navbar → Task 15. Button → Task 2.

**Sem placeholders:** todo passo de código traz o conteúdo completo. O `data/menu.ts` referencia o
Apêndice A do spec (fonte completa e versionada) com o formato exato e um exemplo de cada tipo de
item — transcrição mecânica, sem decisão em aberto.

**Consistência de tipos:** `Product` (com `priceFrom`, `imageUrl: string | null`, `description?`),
`Category` (com `layout`) e `DeliveryArea` definidos na Task 4 e usados de forma idêntica nas Tasks
6–16. `formatProductPrice`, `filterProducts`, `Logo`, `ProductList`, `DeliveryLookup` têm assinatura
única em todo o plano.
