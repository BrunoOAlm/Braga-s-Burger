# Carrossel de Destaques Infinito — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a seção "Destaques da casa" num carrossel de loop infinito perfeito com avanço automático, usando a biblioteca Embla Carousel.

**Architecture:** Reescrita do componente `FeaturedCarousel` em torno do hook `useEmblaCarousel` (`loop: true`) e do plugin `embla-carousel-autoplay`. As setas chamam a API do Embla; o arrasto é nativo do Embla; o autoplay é desligado quando `prefers-reduced-motion` está ativo. Mudança contida em um único componente, mais a remoção de uma sobra de CSS e um stub de teste.

**Tech Stack:** Next 16, React 19, TypeScript, framer-motion (`useReducedMotion`), `embla-carousel-react` + `embla-carousel-autoplay`, Vitest + Testing Library + jsdom, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-05-19-carrossel-destaques-infinito-design.md`

**Notas de contexto:**
- O `FeaturedCarousel.tsx` está com uma alteração **não commitada** no working tree (uma versão de scroll-snap manual). A Task 3 substitui essa versão — é o comportamento que queremos trocar.
- Nenhuma API específica do Next é usada nesta tarefa (sem `<Image>`, sem rotas, sem metadata). O componente já é `'use client'`. Não é preciso consultar `node_modules/next/dist/docs/` aqui.
- A Task 2 (stub de `ResizeObserver`) não está no spec — é uma necessidade técnica descoberta no planejamento: o Embla usa `ResizeObserver` e o jsdom não o implementa.

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|------------------|
| `package.json` / `package-lock.json` | Modificar | Declarar `embla-carousel-react` e `embla-carousel-autoplay` |
| `vitest.setup.ts` | Modificar | Stub de `ResizeObserver` para o Embla rodar no jsdom |
| `components/sections/FeaturedCarousel.tsx` | Modificar | Carrossel com loop infinito + autoplay (Embla) |
| `components/sections/FeaturedCarousel.test.tsx` | Modificar | Rede de regressão: destaques renderizam, controles existem |
| `app/globals.css` | Modificar | Remover o `@keyframes carousel-scroll` órfão do marquee antigo |

---

## Task 1: Instalar as dependências do Embla

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Instalar as duas bibliotecas**

Run:
```bash
npm install embla-carousel-react embla-carousel-autoplay
```

- [ ] **Step 2: Confirmar as versões instaladas**

Run:
```bash
npm ls embla-carousel-react embla-carousel-autoplay
```
Esperado: ambas resolvidas para a **mesma versão major `8.x`** (ex.: `8.5.x`). Se as majors divergirem, alinhe instalando a mesma: `npm install embla-carousel-react@8 embla-carousel-autoplay@8`.

- [ ] **Step 3: Rodar a suíte de testes para confirmar que nada quebrou**

Run:
```bash
npm test
```
Esperado: PASS — todos os testes existentes continuam verdes (as dependências novas ainda não são usadas).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: adiciona Embla Carousel (react + autoplay)"
```

---

## Task 2: Stub de `ResizeObserver` no setup de testes

O Embla usa `ResizeObserver` para reagir a mudanças de tamanho. O jsdom não implementa essa API, então sem o stub o teste do componente lançaria `ReferenceError: ResizeObserver is not defined`. O `vitest.setup.ts` já faz o mesmo padrão para `IntersectionObserver`.

**Files:**
- Modify: `vitest.setup.ts`

- [ ] **Step 1: Adicionar o stub de `ResizeObserver`**

Em `vitest.setup.ts`, adicionar ao final do arquivo (logo depois do bloco do `IntersectionObserver`):

```ts
// jsdom não implementa ResizeObserver — necessário para o Embla Carousel
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);
```

- [ ] **Step 2: Rodar a suíte de testes**

Run:
```bash
npm test
```
Esperado: PASS — o stub é inofensivo; nada o usa ainda, nenhum teste muda de resultado.

- [ ] **Step 3: Commit**

```bash
git add vitest.setup.ts
git commit -m "test: stub de ResizeObserver para o Embla no jsdom"
```

---

## Task 3: Reescrever o `FeaturedCarousel` com Embla

Este é um *refactor de troca de implementação*: o contrato observável (os 6 destaques renderizam, os dois botões de seta existem) não muda. O teste é uma **rede de segurança de regressão** — deve passar contra o componente antes e depois. Por isso o teste e o componente são atualizados e commitados juntos: commitar o teste sozinho deixaria o `HEAD` inconsistente (o componente do `HEAD` é o marquee antigo, sem setas).

**Files:**
- Modify: `components/sections/FeaturedCarousel.test.tsx`
- Modify: `components/sections/FeaturedCarousel.tsx` (substitui a alteração não commitada)

- [ ] **Step 1: Atualizar o arquivo de teste**

Substituir o conteúdo inteiro de `components/sections/FeaturedCarousel.test.tsx` por:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeaturedCarousel } from './FeaturedCarousel';

describe('FeaturedCarousel', () => {
  it('exibe os produtos marcados como destaque', () => {
    render(<FeaturedCarousel />);
    // O loop do Embla reposiciona os slides por transform — não há nós duplicados no DOM.
    expect(screen.getByText('Duplo')).toBeInTheDocument();
    expect(screen.getByText('Majestoso')).toBeInTheDocument();
  });

  it('não exibe produtos fora dos destaques', () => {
    render(<FeaturedCarousel />);
    expect(screen.queryByText('Braguinha')).not.toBeInTheDocument();
  });

  it('renderiza os botões de navegação do carrossel', () => {
    render(<FeaturedCarousel />);
    expect(
      screen.getByRole('button', { name: 'Ver destaques anteriores' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver mais destaques' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Reescrever o componente**

Substituir o conteúdo inteiro de `components/sections/FeaturedCarousel.tsx` por:

```tsx
'use client';

import { useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { products } from '@/data/menu';
import { ProductCard } from './ProductCard';

export function FeaturedCarousel() {
  const featured = products.filter((product) => product.featured);
  const reduceMotion = useReducedMotion();

  // Memoiza o plugin: criar Autoplay() a cada render reinicializaria o carrossel.
  const autoplay = useRef(
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  // Com prefers-reduced-motion, o array de plugins fica vazio → sem autoplay.
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    reduceMotion ? [] : [autoplay.current],
  );

  const arrowClass =
    'hidden h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-paper transition-colors hover:border-paper sm:flex';

  return (
    <section id="destaques" className="bg-ink px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-paper md:text-4xl">
          Destaques da casa
        </h2>
        <p className="mt-2 text-center text-muted">Os campeões de pedido.</p>

        <div className="mt-10 flex items-center gap-3">
          <button
            type="button"
            aria-label="Ver destaques anteriores"
            onClick={() => emblaApi?.scrollPrev()}
            className={arrowClass}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {featured.map((product) => (
                <div key={product.id} className="w-72 shrink-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-label="Ver mais destaques"
            onClick={() => emblaApi?.scrollNext()}
            className={arrowClass}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
```

Notas sobre a reescrita:
- O `ref={emblaRef}` vai no *viewport* (`overflow-hidden`); dentro dele o *container* (`flex gap-6`); dentro dele os *slides* (`w-72 shrink-0`).
- Saíram da versão anterior: `trackRef`, `syncArrows`, os estados `atStart`/`atEnd`, `scrollPage`, o handler `onScroll` e as classes de snap nativo. Com loop infinito as setas nunca ficam `disabled`.
- `align: 'start'` mantém o alinhamento à esquerda que o `snap-start` dava antes.

- [ ] **Step 3: Rodar o teste focado do componente**

Run:
```bash
npx vitest run components/sections/FeaturedCarousel.test.tsx
```
Esperado: PASS — os 3 testes verdes.

Se o Embla lançar erro de API não implementada pelo jsdom (algum *observer*), adicione o stub correspondente em `vitest.setup.ts` seguindo o padrão do `IntersectionObserver`/`ResizeObserver` e rode de novo.

- [ ] **Step 4: Rodar a suíte completa**

Run:
```bash
npm test
```
Esperado: PASS — nenhuma regressão em outros componentes.

- [ ] **Step 5: Rodar o lint**

Run:
```bash
npm run lint
```
Esperado: sem erros nem warnings novos.

- [ ] **Step 6: Rodar o build**

Run:
```bash
npm run build
```
Esperado: build conclui com sucesso.

- [ ] **Step 7: Commit**

```bash
git add components/sections/FeaturedCarousel.tsx components/sections/FeaturedCarousel.test.tsx
git commit -m "feat: carrossel de destaques com loop infinito e autoplay"
```

---

## Task 4: Remover a sobra de CSS do marquee antigo

O `@keyframes carousel-scroll` em `app/globals.css` era usado pela primeira versão do carrossel (marquee). Nenhum componente o usa mais — o seletor `[style*="carousel-scroll"]` não casa com nada.

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Remover o bloco órfão**

Em `app/globals.css`, apagar exatamente estas linhas (atualmente ~33–40):

```css
@keyframes carousel-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  [style*="carousel-scroll"] { animation: none !important; }
}
```

A regra `:focus-visible` logo acima e o restante do arquivo permanecem intactos.

- [ ] **Step 2: Confirmar que não há mais referências**

Run:
```bash
git grep -n "carousel-scroll"
```
Esperado: nenhum resultado.

- [ ] **Step 3: Rodar build e testes**

Run:
```bash
npm run build
npm test
```
Esperado: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "chore: remove keyframe carousel-scroll órfão"
```

---

## Task 5: Verificação manual no navegador

O loop e o autoplay dependem de layout real — o jsdom não tem layout, então isso não dá para cobrir em teste automatizado. Esta task é uma checagem manual; não há commit.

**Files:** nenhum.

- [ ] **Step 1: Subir o servidor de desenvolvimento**

Run:
```bash
npm run dev
```
Abrir a página e rolar até a seção "Destaques da casa".

- [ ] **Step 2: Conferir o checklist de comportamento**

- [ ] O carrossel avança sozinho a cada ~4,5 s.
- [ ] Ao passar do último card, o loop continua sem "rebobinada" visível.
- [ ] Passar o mouse por cima pausa o avanço; tirar o mouse retoma.
- [ ] As setas (visíveis no desktop) navegam para os dois lados e nunca ficam desabilitadas.
- [ ] Depois de clicar numa seta, o autoplay volta a rodar.
- [ ] Arrastar com o mouse/toque move o carrossel.
- [ ] Com `prefers-reduced-motion` ativo no SO/navegador, **não** há avanço automático; setas e arrasto continuam funcionando.

- [ ] **Step 3: Encerrar o servidor**

Parar o processo do `npm run dev` (Ctrl+C).

---

## Critérios de sucesso

- O carrossel de destaques avança sozinho a cada 4,5 s e dá voltas infinitas, sem "rebobinada" visível.
- Hover pausa o avanço; sair do hover retoma.
- As setas navegam para os dois lados e nunca ficam desabilitadas; o autoplay retoma após o clique.
- Arrasto por toque/mouse funciona.
- Com `prefers-reduced-motion`, não há avanço automático; setas e arrasto seguem funcionando.
- Nenhuma sobra do marquee antigo em `globals.css`.
- `npm test`, `npm run lint` e `npm run build` passando.
