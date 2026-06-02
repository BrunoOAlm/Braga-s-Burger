'use client';

import { useState } from 'react';
import { filterProducts } from '@/lib/filter';
import type { Category, Product } from '@/lib/types';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { ProductList } from './ProductList';

interface MenuSectionProps {
  categories: Category[];
  products: Product[];
}

function CategoryBlock({
  category,
  products,
  showHeading,
}: {
  category: Category;
  products: Product[];
  showHeading: boolean;
}) {
  const items = filterProducts(products, category.id);
  if (items.length === 0) return null;

  return (
    <div className="mt-12">
      {showHeading && (
        <h3 className="mb-6 font-heading text-2xl font-bold text-paper">{category.name}</h3>
      )}
      {category.layout === 'list' ? (
        <ProductList products={items} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuSection({ categories, products }: MenuSectionProps) {
  const [active, setActive] = useState<string | null>(null);
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  const visible = active === null ? sorted : sorted.filter((c) => c.id === active);

  return (
    <section id="cardapio" className="bg-ink px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-paper md:text-4xl">
          Nosso cardápio
        </h2>
        <p className="mt-2 text-center text-muted">
          Escolha uma categoria e monte seu pedido.
        </p>

        <div className="mt-8">
          <CategoryFilter categories={categories} active={active} onChange={setActive} />
        </div>

        {visible.map((category) => (
          <CategoryBlock
            key={category.id}
            category={category}
            products={products}
            showHeading={active === null}
          />
        ))}
      </div>
    </section>
  );
}
