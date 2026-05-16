'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const photos = [
  '/images/galeria-1.jpg',
  '/images/galeria-2.jpg',
  '/images/galeria-3.jpg',
  '/images/galeria-4.jpg',
  '/images/galeria-5.jpg',
  '/images/galeria-6.jpg',
];

export function Gallery() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenIndex(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex]);

  return (
    <section id="galeria" className="bg-brand-cream px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-brand-dark md:text-4xl">
          Galeria
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              aria-label={`Ampliar foto ${index + 1}`}
              onClick={() => setOpenIndex(index)}
              className="aspect-square cursor-pointer overflow-hidden rounded-xl bg-brand-brown/20 bg-cover bg-center transition-transform duration-200 hover:scale-[1.03]"
              style={{ backgroundImage: `url(${photo})` }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Foto ampliada"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/90 p-6"
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setOpenIndex(null)}
              className="absolute right-6 top-6 cursor-pointer rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Fechar
            </button>
            <div
              className="aspect-square w-full max-w-xl rounded-2xl bg-brand-brown/40 bg-cover bg-center"
              style={{ backgroundImage: `url(${photos[openIndex]})` }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
