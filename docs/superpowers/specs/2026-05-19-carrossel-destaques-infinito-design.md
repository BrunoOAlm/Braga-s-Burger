# Spec de Design — Carrossel de Destaques Infinito

**Data:** 2026-05-19
**Sub-projeto:** 1 de 6 — Landing Page / Cardápio (ajuste pós-redesign)
**Spec relacionado:** `2026-05-17-landing-page-redesign-design.md`
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

O `FeaturedCarousel` (seção "Destaques da casa") já passou por duas versões:

1. Um *marquee* com animação CSS (`@keyframes carousel-scroll`), que duplicava a lista
   (`[...featured, ...featured]`) e pausava no hover — commit `da51764`.
2. Uma alteração **não commitada** no working tree que troca o marquee por um scroll-snap
   manual com setas que **desabilitam** no início e no fim da lista.

O cliente quer que o carrossel seja **infinito de verdade**: um loop perfeito (sem "rebobinar"
visível) com avanço automático. A versão Embla descrita aqui substitui a alteração não
commitada — que é exatamente a parte que se quer trocar.

### Escopo

**Dentro do escopo:** reescrever `components/sections/FeaturedCarousel.tsx` com loop infinito
contínuo + autoplay; ajustar o teste do componente; remover a sobra órfã de CSS do marquee
antigo.

**Fora do escopo:** qualquer outra seção; o carrinho/checkout (sub-projeto 2); mudanças no
`ProductCard` ou nos dados de `featured`.

---

## 2. Decisões de design (validadas com o cliente)

| Tema | Decisão |
|------|---------|
| Tipo de loop | Loop **perfeito** — os cards se repetem continuamente, sem "rebobinada" visível |
| Movimento | Autoplay (avanço automático) **+** navegação manual por setas e arrasto |
| Intervalo do autoplay | **4,5 s** entre avanços |
| Pausa | Pausa no hover do mouse e quando algo dentro recebe foco de teclado; retoma depois |
| Abordagem técnica | Biblioteca **Embla Carousel** (`loop: true` nativo + plugin de autoplay) |
| Movimento reduzido | Com `prefers-reduced-motion`, o autoplay **não** roda; setas/arrasto seguem |

---

## 3. Dependências

Instalar duas bibliotecas (mesma versão major — 8.x):

- `embla-carousel-react` — hook `useEmblaCarousel` para React.
- `embla-carousel-autoplay` — plugin oficial de autoplay.

Juntas pesam ~6 KB (gzip). São agnósticas de framework — não dependem de detalhes do Next.
Compatíveis com React 19 (verificar na instalação que a versão resolvida é a 8.x).

---

## 4. Componente `FeaturedCarousel`

### Estrutura DOM exigida pelo Embla

```
<div className="overflow-hidden" ref={emblaRef}>   {/* viewport */}
  <div className="flex gap-6">                      {/* container */}
    {featured.map(p => (
      <div className="w-72 shrink-0" key={p.id}>     {/* slide */}
        <ProductCard product={p} />
      </div>
    ))}
  </div>
</div>
```

- O `ref` do Embla vai no **viewport** (`overflow-hidden`).
- O loop do Embla **não duplica nós no DOM** — ele reposiciona os slides via `transform`.
  Logo, continuam existindo exatamente 6 slides no DOM (um por produto `featured`).
- Largura de slide e `gap` ficam iguais aos de hoje: `w-72` (288px) e `gap-6`.

### Inicialização

```ts
const [emblaRef, emblaApi] = useEmblaCarousel(
  { loop: true, align: 'start' },
  reduceMotion ? [] : [autoplayPlugin],
);
```

- `loop: true` — entrega o loop perfeito.
- `align: 'start'` — alinha o slide à esquerda do viewport (igual ao snap atual).
- A instância do plugin de autoplay **deve ser memoizada** (criada uma vez, ex.: via `useRef`).
  Criar `Autoplay({...})` solto no corpo do componente gera uma instância nova a cada render,
  o que faz o Embla reinicializar e zerar o autoplay sem parar.

### Setas

- Mantêm o visual atual: botões circulares, `border-line`, `bg-surface`, só visíveis no
  desktop (`hidden sm:flex`), cada um com seu `aria-label`.
- **Sai** o estado de desabilitar (`atStart` / `atEnd`): com loop infinito não há início nem
  fim. Os botões nunca ficam `disabled`.
- `onClick` chama `emblaApi?.scrollPrev()` e `emblaApi?.scrollNext()`.

### Arrasto

- Habilitado por padrão pelo Embla — funciona com toque (mobile) e mouse (desktop).
  Substitui o scroll nativo da versão anterior.

### Código que sai

`trackRef`, `syncArrows`, os estados `atStart`/`atEnd`, `scrollPage`, o handler `onScroll`
e as classes de snap nativo (`snap-x`, `snap-mandatory`, `snap-start`, ocultar scrollbar).

---

## 5. Autoplay e acessibilidade

Configuração do plugin:

```ts
Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true })
```

- `delay: 4500` — avança a cada 4,5 s.
- `stopOnMouseEnter: true` — pausa enquanto o mouse está sobre o carrossel e **retoma** ao sair.
- `stopOnInteraction: false` — depois de clicar numa seta (ou arrastar), o autoplay **volta** a
  rodar, em vez de parar de vez.
- `stopOnFocusIn` (padrão `true`) — pausa quando um elemento interno recebe foco de teclado,
  cobrindo quem navega sem mouse (WCAG 2.2.2 "Pause, Stop, Hide").

**Movimento reduzido:** o componente lê `useReducedMotion()` (framer-motion, já em uso). Quando
verdadeiro, o array de plugins passado ao `useEmblaCarousel` fica vazio — sem autoplay nenhum.
As setas e o arrasto continuam funcionando normalmente. (`useReducedMotion()` pode retornar
`null` antes de resolver; tratar `null` como "sem movimento reduzido".)

---

## 6. Limpeza

Em `app/globals.css`, remover a sobra órfã do marquee antigo (linhas ~33–40):

```css
@keyframes carousel-scroll { ... }

@media (prefers-reduced-motion: reduce) {
  [style*="carousel-scroll"] { animation: none !important; }
}
```

Nenhum componente usa mais essa keyframe desde que o marquee saiu — o seletor
`[style*="carousel-scroll"]` não casa com nada hoje.

---

## 7. Mudanças por arquivo

### Modificar
- `components/sections/FeaturedCarousel.tsx` — reescrito com Embla (loop + autoplay).
- `components/sections/FeaturedCarousel.test.tsx` — corrigir o comentário desatualizado
  ("duplica os itens") e adicionar checagem dos botões de seta.
- `app/globals.css` — remover `@keyframes carousel-scroll` e o `@media` que o usava.
- `package.json` / `package-lock.json` — novas dependências.

### Criar / Remover
- Nada.

---

## 8. Testes

A suíte usa Vitest + Testing Library + jsdom. O jsdom **não calcula layout real**, então o
loop e o autoplay em si não podem ser testados de forma confiável — o Embla apenas não
movimenta os slides nesse ambiente, sem quebrar a renderização.

`FeaturedCarousel.test.tsx` cobre o que é determinístico:

| Alvo | Abordagem |
|------|-----------|
| Os 6 produtos `featured` aparecem | Render — RTL |
| Um produto não-destaque (ex.: "Braguinha") **não** aparece | Render — RTL |
| Os dois botões de seta existem, com seus `aria-label` | Render — RTL |

O comportamento de loop/autoplay é verificado manualmente no `npm run dev`.

Ao final, rodar `npm test`, `npm run lint` e `npm run build` — todos devem passar.

---

## 9. Critérios de sucesso

- O carrossel de destaques avança sozinho a cada 4,5 s e dá voltas infinitas, sem "rebobinada"
  visível.
- Passar o mouse por cima pausa o avanço; tirar o mouse retoma.
- As setas (desktop) navegam para os lados e nunca ficam desabilitadas; o autoplay retoma
  após o clique.
- Arrasto por toque funciona no mobile.
- Com `prefers-reduced-motion`, não há avanço automático; setas e arrasto seguem funcionando.
- Nenhuma sobra do marquee antigo em `globals.css`.
- `npm test`, `npm run lint` e `npm run build` passando.
