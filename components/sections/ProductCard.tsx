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
