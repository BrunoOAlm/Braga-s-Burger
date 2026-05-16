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
