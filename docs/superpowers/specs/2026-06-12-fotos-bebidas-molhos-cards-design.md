# Fotos de bebidas/molhos + cards com botão Adicionar — Design

**Data:** 2026-06-12
**Status:** Aprovado

## Objetivo

Exibir as fotos novas de bebidas e molhos no cardápio e fazer esses itens
renderizarem como cards (foto + preço + botão Adicionar), iguais aos burgers.
Hoje as categorias `bebidas` e `molhos` usam `layout = 'list'` (nome + preço,
sem foto e sem botão).

## Decisões

- **Layout:** bebidas e molhos passam a `layout = 'grid'` — reutiliza o
  `ProductCard` existente. Zero código novo no frontend de exibição.
- **Fonte das imagens:** `image_url` no banco, atualizado por migração nova
  (V7). A V4 já rodou em produção e não pode ser editada (checksum Flyway).
- **Otimização:** as fotos chegaram com ~2MB cada; serão redimensionadas para
  ~800px de largura e recomprimidas em webp (alvo: dezenas de KB). Molhos em
  `.png` viram `.webp`.

## Escopo

1. **Imagens** (`public/images/products/`)
   - Otimizar 21 webp de bebidas + converter 3 png de molhos para webp.
   - `agua-tonica-lata`: só existe uma pasta de página web salva
     (`agua-tonica-lata_files/`); inspecionar os PNGs internos — se um for a
     foto da tônica, otimizar e usar; deletar a pasta em qualquer caso.
   - `coca-cola-zero-600ml`: sem foto. Fica `image_url = NULL` (o card mostra
     placeholder com ícone); foto pode ser adicionada depois via painel admin.

2. **Backend** — `V7__bebidas_molhos_grid_e_fotos.sql`
   - `UPDATE categories SET layout = 'grid' WHERE id IN ('bebidas','molhos');`
   - Um `UPDATE products SET image_url = ...` por item com foto
     (22 bebidas + 3 molhos, exceto os sem imagem).
   - O CHECK de `image_url` já aceita caminhos `/images/...`.

3. **Frontend**
   - Nenhuma mudança em componentes (o `MenuSection` já decide grid/list pelo
     campo `layout` vindo da API).
   - Atualizar fixtures/testes que assumirem bebidas/molhos como `list`,
     se houver.

## Fora de escopo

- Produtos faltantes do site original (outras bebidas/sobremesas) — fica para
  depois, junto com as correções pendentes do sub-projeto 1.
- Ajuste de enquadramento das fotos no card 4:3: verificar visualmente após
  otimizar; só mexer se cortar mal.

## Riscos

- **Enquadramento 4:3 com `object-cover`** pode cortar garrafas em pé.
  Mitigação: verificação visual; ajuste pontual se necessário.
- **Migração em produção:** V7 roda via Flyway no deploy do Render. Os
  `UPDATE`s são idempotentes e não destrutivos (só preenchem `image_url` e
  trocam `layout`).

## Testes

- ITs do backend já rodam todas as migrações (Testcontainers) — V7 incluída.
- Frontend: suíte existente (`npm test`); ajustar testes que codificam o
  layout antigo de bebidas/molhos.
