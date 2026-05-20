'use client';

import { useCartStore } from '@/lib/cart-store';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
}

export function AddToCartButton({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <button
      type="button"
      aria-label={`Adicionar ${product.name} ao carrinho`}
      disabled={!product.available}
      onClick={() => addItem(product)}
      className="cursor-pointer rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      Adicionar
    </button>
  );
}
