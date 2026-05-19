'use client';

import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { products } from '@/data/menu';
import { ProductCard } from './ProductCard';

export function FeaturedCarousel() {
  const featured = products.filter((product) => product.featured);
  const reduceMotion = useReducedMotion();

  // Mantém a instância do plugin estável entre renders (useState lazy init).
  // Criar Autoplay() a cada render geraria objetos descartáveis sem necessidade.
  const [autoplay] = useState(() =>
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  // Com prefers-reduced-motion, o array de plugins fica vazio → sem autoplay.
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    reduceMotion ? [] : [autoplay],
  );

  const arrowClass =
    'hidden h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-paper transition-colors hover:border-paper sm:flex';

  return (
    <section id="destaques" className="bg-ink px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-paper md:text-4xl">
          Destaques da casa
        </h2>
        <p className="mt-2 text-center text-muted">Os campeões de pedido.</p>

        <div className="mt-10 flex items-center gap-3">
          <button
            type="button"
            aria-label="Ver destaques anteriores"
            onClick={() => emblaApi?.scrollPrev()}
            className={arrowClass}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {featured.map((product) => (
                <div key={product.id} className="w-72 shrink-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-label="Ver mais destaques"
            onClick={() => emblaApi?.scrollNext()}
            className={arrowClass}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
