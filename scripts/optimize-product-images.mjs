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
