'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const photos = [
  '/gallery/gallery-1.webp',
  '/gallery/gallery-2.webp',
  '/gallery/gallery-3.webp',
  '/gallery/gallery-4.webp',
  '/gallery/gallery-5.webp',
  '/gallery/rodizio.webp',
];

export function Gallery() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const open = (index: number) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setOpenIndex(index);
  };

  const close = () => {
    setOpenIndex(null);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (openIndex === null) return;
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      } else if (event.key === 'Tab') {
        // Único elemento focável no diálogo: o botão Fechar → trava o foco.
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex]);

  return (
    <section id="galeria" className="bg-ink px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-extrabold text-paper md:text-4xl">
          Galeria
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              aria-label={`Ampliar foto ${index + 1}`}
              onClick={() => open(index)}
              className="aspect-square cursor-pointer overflow-hidden rounded-xl border border-line bg-cover bg-center transition-transform duration-200 hover:scale-[1.03]"
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
            onClick={close}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-6"
          >
            <button
              ref={closeRef}
              type="button"
              aria-label="Fechar"
              onClick={close}
              className="absolute right-6 top-6 cursor-pointer rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-paper hover:border-paper"
            >
              Fechar
            </button>
            <div
              className="aspect-square w-full max-w-xl rounded-2xl bg-surface bg-cover bg-center"
              style={{ backgroundImage: `url(${photos[openIndex]})` }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
