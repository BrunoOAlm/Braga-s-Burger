'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const entrance = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.5, delay, ease: 'easeOut' as const },
  });

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center">
      {!reduceMotion && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
      )}
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/85"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center">
        <h1 className="sr-only">Braga&apos;s Burger</h1>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
        >
          <Logo size={140} priority />
        </motion.div>

        <motion.p
          className="mt-6 text-xs uppercase tracking-[0.3em] text-muted"
          {...entrance(0.25)}
        >
          Hamburgueria artesanal
        </motion.p>

        <motion.p className="mt-3 max-w-md text-base text-paper/80" {...entrance(0.4)}>
          Os melhores hambúrgueres da Zona Norte, feitos na hora.
        </motion.p>

        <motion.div className="mt-8" {...entrance(0.55)}>
          <Button href="#cardapio">Ver cardápio</Button>
        </motion.div>
      </div>
    </section>
  );
}
