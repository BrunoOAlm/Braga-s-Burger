'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { formatProductPrice } from '@/lib/format';
import { AddToCartButton } from '@/components/cart/AddToCartButton';

const categoryIcon: Record<string, string> = {
  tabuas: '🍽️',
  molhos: '🥫',
  bebidas: '🥤',
};

type ProductCardProps = {
  product: Product;
};

// next/image só aceita hosts configurados; uma imageUrl externa (ex.: editada
// pelo admin) estouraria 500 na página inteira. Só tratamos como imagem válida
// um caminho local servido por /public; o resto degrada para o placeholder.
function isLocalImage(src: string | null | undefined): src is string {
  return !!src && src.startsWith('/');
}

// Bebidas e molhos têm fotos em retrato (garrafa/lata centrada); object-cover
// num frame quadrado corta a tampa e a base. Usamos object-contain (produto
// inteiro) sobre um fundo desfocado da própria foto: o card preenche até a
// borda, sem barras mortas e sem decapitar. Comida (burgers, tabuas, porções,
// sobremesas) é quadrada e preenche o frame com object-cover.
const containCategories = new Set(['bebidas', 'molhos']);

export function ProductCard({ product }: ProductCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <div className="relative aspect-square overflow-hidden bg-ink">
        {isLocalImage(product.imageUrl) ? (
          containCategories.has(product.categoryId) ? (
            <>
              {/* Fundo: a própria foto em cover + blur, preenchendo a borda. */}
              <Image
                src={product.imageUrl}
                alt=""
                aria-hidden
                fill
                className="scale-110 object-cover opacity-60 blur-2xl"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {/* Frente: produto inteiro, sem corte. */}
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </>
          ) : (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )
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
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="font-heading text-lg font-bold text-paper">
            {formatProductPrice(product)}
          </p>
          <AddToCartButton product={product} />
        </div>
      </div>
    </motion.article>
  );
}
