'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { categories, products } from '@/data/menu';
import { filterProducts } from '@/lib/filter';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';

export function MenuSection() {
  const [active, setActive] = useState<string | null>(null);
  const visible = filterProducts(products, active);

  return (
    <section id="cardapio" className="bg-brand-cream px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-brand-dark md:text-4xl">
          Nosso cardápio
        </h2>
        <p className="mt-2 text-center text-brand-dark/60">
          Escolha uma categoria e monte seu pedido.
        </p>

        <div className="mt-8">
          <CategoryFilter categories={categories} active={active} onChange={setActive} />
        </div>

        <motion.div
          layout
          className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {visible.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
