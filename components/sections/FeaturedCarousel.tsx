'use client';

import { useState } from 'react';
import { products } from '@/data/menu';
import { ProductCard } from './ProductCard';

export function FeaturedCarousel() {
  const featured = products.filter((product) => product.featured);
  const [paused, setPaused] = useState(false);

  return (
    <section id="destaques" className="bg-ink px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-paper md:text-4xl">
          Destaques da casa
        </h2>
        <p className="mt-2 text-center text-muted">
          Os campeões de pedido — passe o mouse para pausar.
        </p>

        <div
          className="mt-10 overflow-x-auto"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex gap-6 pb-4"
            style={{
              animation: 'carousel-scroll 24s linear infinite',
              animationPlayState: paused ? 'paused' : 'running',
            }}
          >
            {[...featured, ...featured].map((product, index) => (
              <div key={`${product.id}-${index}`} className="w-72 shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
