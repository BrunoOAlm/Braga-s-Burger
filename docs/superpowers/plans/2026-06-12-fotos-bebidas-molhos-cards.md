# Fotos Bebidas/Molhos + Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bebidas e molhos passam a renderizar como cards (foto + botão Adicionar) usando as fotos novas otimizadas, via migração V7.

**Architecture:** As imagens vivem em `public/images/products/` e as URLs no banco (`products.image_url`). O frontend já decide grid/list pelo campo `categories.layout` — então a mudança toda é dados (migração V7) + otimização dos arquivos de imagem. Nenhum componente novo.

**Tech Stack:** sharp (otimização), Flyway/PostgreSQL (V7), Spring MockMvc IT, Vitest (front).

**Spec:** `docs/superpowers/specs/2026-06-12-fotos-bebidas-molhos-cards-design.md`

---

### Task 1: Otimizar imagens de produtos

As 21 webp novas têm ~2MB cada; os 3 molhos são `.png` de ~2MB; a foto da
tônica está em `public/images/products/agua-tonica-lata_files/1129e168-e2c8-4711-b69e-13c5d856e74f.png`
(página web salva — o resto da pasta é lixo). `coca-cola-zero-600ml` não tem
foto (fica de fora).

**Files:**
- Create: `scripts/optimize-product-images.mjs`
- Modify: `public/images/products/*.webp` (recomprimidos no lugar)
- Delete: `public/images/products/molho-{alho,bacon,barbecue}.png`, pasta `agua-tonica-lata_files/`

- [ ] **Step 1: Criar o script de otimização**

```js
// scripts/optimize-product-images.mjs
// Recomprime fotos de produto pesadas para webp ~800px.
// Uso: node scripts/optimize-product-images.mjs
import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DIR = 'public/images/products';
const MAX_WIDTH = 800;
const THRESHOLD = 200 * 1024; // abaixo disso já está otimizado

// Foto da tônica salva dentro da pasta de página web (caso especial).
const EXTRA = [
  {
    src: path.join(DIR, 'agua-tonica-lata_files', '1129e168-e2c8-4711-b69e-13c5d856e74f.png'),
    dest: path.join(DIR, 'agua-tonica-lata.webp'),
  },
];

async function optimize(src, dest) {
  const before = (await stat(src)).size;
  const buf = await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  await writeFile(dest, buf);
  console.log(
    `${path.basename(src)} -> ${path.basename(dest)}: ` +
    `${Math.round(before / 1024)}KB -> ${Math.round(buf.length / 1024)}KB`
  );
}

const entries = await readdir(DIR, { withFileTypes: true });
for (const e of entries) {
  if (!e.isFile() || !/\.(webp|png)$/i.test(e.name)) continue;
  const src = path.join(DIR, e.name);
  if ((await stat(src)).size < THRESHOLD) continue;
  await optimize(src, path.join(DIR, e.name.replace(/\.png$/i, '.webp')));
}
for (const { src, dest } of EXTRA) await optimize(src, dest);
```

- [ ] **Step 2: Rodar o script**

Run: `node scripts/optimize-product-images.mjs`
Expected: ~25 linhas `X -> Y: ~2000KB -> 30-90KB`. Nenhum arquivo antigo (~15KB) tocado.

- [ ] **Step 3: Deletar fontes não otimizadas**

```powershell
Remove-Item public\images\products\molho-alho.png, public\images\products\molho-bacon.png, public\images\products\molho-barbecue.png
Remove-Item -Recurse -Force public\images\products\agua-tonica-lata_files
```

- [ ] **Step 4: Conferir resultado**

Run: `Get-ChildItem public\images\products | Where-Object Length -gt 200KB`
Expected: vazio. E `agua-tonica-lata.webp` existe.

- [ ] **Step 5: Verificação visual rápida**

Abrir (Read) `agua-tonica-lata.webp` e `molho-alho.webp` otimizados para
confirmar que a conversão não quebrou as imagens.

- [ ] **Step 6: Commit**

```powershell
git add scripts/optimize-product-images.mjs public/images/products
git commit -m "feat: fotos otimizadas de bebidas e molhos (~2MB -> <100KB)"
```

---

### Task 2: Migração V7 — bebidas/molhos viram grid com fotos (TDD)

**Files:**
- Modify: `backend/src/test/java/com/bragas/api/catalog/MenuControllerIT.java`
- Create: `backend/src/main/resources/db/migration/V7__bebidas_molhos_grid_e_fotos.sql`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `MenuControllerIT.java` (depois do teste `get_menu_ordering_by_display_order`):

```java
@Test
void get_menu_bebidas_e_molhos_em_grid_com_fotos() throws Exception {
    mvc.perform(get("/api/v1/menu"))
        .andExpect(status().isOk())
        // V7: bebidas e molhos viram cards (grid) com foto.
        .andExpect(jsonPath("$.categories[?(@.id=='bebidas')].layout").value("grid"))
        .andExpect(jsonPath("$.categories[?(@.id=='molhos')].layout").value("grid"))
        .andExpect(jsonPath(
            "$.categories[?(@.id=='bebidas')].products[?(@.id=='coca-cola-lata')].imageUrl")
            .value("/images/products/coca-cola-lata.webp"))
        // sem foto ainda: placeholder no front, image_url continua NULL.
        .andExpect(jsonPath(
            "$.categories[?(@.id=='bebidas')].products[?(@.id=='coca-cola-zero-600ml')].imageUrl")
            .value(org.hamcrest.Matchers.contains((Object) null)));
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend; .\gradlew.bat test --tests "com.bragas.api.catalog.MenuControllerIT"`
Expected: FAIL no teste novo (layout vem `list`, imageUrl vem null). Os 2 testes antigos passam.

- [ ] **Step 3: Criar a migração V7**

```sql
-- V7__bebidas_molhos_grid_e_fotos.sql
-- Bebidas e molhos viram cards (grid) com foto + botão Adicionar.
-- V4 seedou layout='list' e image_url=NULL; V4 já rodou em produção,
-- então a mudança vai em migração nova. O guard "image_url IS NULL"
-- preserva fotos que o admin tenha trocado manualmente.

UPDATE categories SET layout = 'grid' WHERE id IN ('bebidas', 'molhos');

UPDATE products SET image_url = '/images/products/' || id || '.webp'
WHERE image_url IS NULL
  AND id IN (
    'agua-com-gas',
    'agua-tonica-lata',
    'coca-cola-2l',
    'coca-cola-600ml',
    'coca-cola-lata',
    'coca-cola-zero-2l',
    'coca-cola-zero-lata',
    'corona-330ml',
    'red-bull-250ml',
    'fanta-laranja-lata',
    'guarana-antartica-600ml',
    'guarana-antartica-2l',
    'guarana-antartica-lata',
    'guarana-antartica-zero-lata',
    'guaravita-300ml',
    'h2o-limao',
    'h2o-limoneto',
    'heineken-330ml',
    'heineken-330ml-zero',
    'ice-tea-pessego-300ml',
    'matte-300ml',
    'sprite-lata',
    'molho-barbecue',
    'molho-alho',
    'molho-bacon'
  );
-- Fora da lista de propósito (sem foto ainda): coca-cola-zero-600ml.
```

Nota: os slugs dos produtos coincidem com os nomes dos arquivos webp, por
isso o `'/images/products/' || id || '.webp'` funciona para todos.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend; .\gradlew.bat test --tests "com.bragas.api.catalog.MenuControllerIT"`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```powershell
git add backend/src/main/resources/db/migration/V7__bebidas_molhos_grid_e_fotos.sql backend/src/test/java/com/bragas/api/catalog/MenuControllerIT.java
git commit -m "feat: V7 - bebidas e molhos em grid com fotos no cardapio"
```

---

### Task 3: Atualizar fixture do frontend

A fixture espelha o seed do banco; precisa refletir o layout novo.

**Files:**
- Modify: `lib/__fixtures__/menu.ts:14-15`

- [ ] **Step 1: Trocar layout de molhos/bebidas para grid**

```ts
// antes
  { id: 'molhos', name: 'Molhos', order: 6, layout: 'list' },
  { id: 'bebidas', name: 'Bebidas', order: 7, layout: 'list' },
// depois
  { id: 'molhos', name: 'Molhos', order: 6, layout: 'grid' },
  { id: 'bebidas', name: 'Bebidas', order: 7, layout: 'grid' },
```

- [ ] **Step 2: Rodar a suíte do front**

Run: `npm test`
Expected: PASS. Se algum teste assumir bebidas como lista, ajustar a
asserção para grid/ProductCard (grep prévio não encontrou nenhum).

- [ ] **Step 3: Commit**

```powershell
git add lib/__fixtures__/menu.ts
git commit -m "test: fixture do menu reflete bebidas/molhos em grid (V7)"
```

---

### Task 4: Verificação visual no app

- [ ] **Step 1: Subir o dev server e olhar o cardápio**

Run: `npm run dev` (background) e abrir `http://localhost:3000/#cardapio`.
Verificar: bebidas e molhos como cards, fotos carregando, botão Adicionar
presente, `coca-cola-zero-600ml` com placeholder 🥤.

- [ ] **Step 2: Checar enquadramento 4:3 (risco do spec)**

As fotos são ~quadradas; `object-cover` em 4:3 corta ~12% em cima/baixo.
Se alguma garrafa/lata ficar decapitada, trocar o corte SOMENTE se ficar
ruim de verdade (decisão visual; opção: `object-contain` condicional por
categoria em `ProductCard`). Caso contrário, não mexer.

---

### Task 5: Suíte completa, PR e merge

- [ ] **Step 1: Backend completo**

Run: `cd backend; .\gradlew.bat test`
Expected: PASS. Se 1 IT falhar com `ContainerLaunchException` (flakiness
conhecida do Docker/Testcontainers), re-rodar só aquele IT isolado — passa.

- [ ] **Step 2: Front completo (se ainda não rodou verde na Task 3)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Push, PR e merge**

```powershell
git push -u origin feat/fotos-bebidas-molhos
gh pr create --title "Fotos de bebidas/molhos + cards com botao Adicionar" --body "Bebidas e molhos viram cards com foto e botao Adicionar (migracao V7 muda layout para grid e preenche image_url). Fotos novas otimizadas de ~2MB para <100KB. coca-cola-zero-600ml segue sem foto (placeholder) ate conseguirmos a imagem. Spec: docs/superpowers/specs/2026-06-12-fotos-bebidas-molhos-cards-design.md"
gh pr merge --merge
```

Depois do merge o Render redeploya o master e a V7 roda via Flyway em produção.

- [ ] **Step 4: Conferir produção**

Abrir o site em produção e confirmar que as bebidas aparecem como cards
com foto (pode levar alguns minutos pelo deploy + ISR de 5 min).
