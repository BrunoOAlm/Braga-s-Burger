import type { Product } from '@/lib/types';
import { formatProductPrice } from '@/lib/format';

type ProductListProps = {
  products: Product[];
};

export function ProductList({ products }: ProductListProps) {
  return (
    <ul className="grid gap-x-10 sm:grid-cols-2">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex items-baseline gap-3 border-b border-line py-3"
        >
          <span className="font-medium text-paper">{product.name}</span>
          <span className="h-px flex-1 self-end bg-line" aria-hidden="true" />
          <span className="font-heading font-semibold text-paper">
            {formatProductPrice(product)}
          </span>
        </li>
      ))}
    </ul>
  );
}
