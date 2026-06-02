// Lê data/menu.ts e data/coupons.ts e emite SQL INSERTs para a V4.
// Uso: npx tsx --tsconfig tsconfig.json scripts/generate-catalog-seed.ts >> backend/src/main/resources/db/migration/V4__create_catalog_and_seed.sql

import { categories, products } from '@/data/menu';
import { coupons } from '@/data/coupons';

function sqlString(v: string): string {
  return "'" + v.replace(/'/g, "''") + "'";
}

function sqlBool(v: boolean): string {
  return v ? 'true' : 'false';
}

function sqlOrNull(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  return sqlString(v);
}

const lines: string[] = [];
lines.push('');
lines.push('-- seed: categorias');
categories.forEach((c) => {
  const displayOrder = c.order * 10;
  lines.push(
    `INSERT INTO categories (id, name, display_order, layout) VALUES (` +
    `${sqlString(c.id)}, ${sqlString(c.name)}, ${displayOrder}, ${sqlString(c.layout)});`
  );
});

lines.push('');
lines.push('-- seed: produtos');
const orderPerCategory = new Map<string, number>();
products.forEach((p) => {
  const next = (orderPerCategory.get(p.categoryId) ?? 0) + 1;
  orderPerCategory.set(p.categoryId, next);
  const displayOrder = next * 10;
  lines.push(
    `INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES (` +
    `${sqlString(p.id)}, ${sqlString(p.categoryId)}, ${sqlString(p.name)}, ` +
    `${sqlString(p.description ?? '')}, ${p.price.toFixed(2)}, ${sqlBool(p.priceFrom ?? false)}, ` +
    `${sqlOrNull(p.imageUrl)}, ${sqlBool(p.featured ?? false)}, ${sqlBool(p.available ?? true)}, ` +
    `${displayOrder});`
  );
});

lines.push('');
lines.push('-- seed: cupons');
coupons.forEach((c) => {
  const minSub = c.minSubtotal != null ? c.minSubtotal.toFixed(2) : 'NULL';
  lines.push(
    `INSERT INTO coupons (code, type, value, min_subtotal, active) VALUES (` +
    `${sqlString(c.code.toUpperCase())}, ${sqlString(c.type)}, ${c.value.toFixed(2)}, ${minSub}, true);`
  );
});

console.log(lines.join('\n'));
