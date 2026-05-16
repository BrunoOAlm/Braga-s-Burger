import type { Product } from './types';

export function filterProducts(
  products: Product[],
  categoryId: string | null,
): Product[] {
  if (categoryId === null) return products;
  return products.filter((product) => product.categoryId === categoryId);
}
