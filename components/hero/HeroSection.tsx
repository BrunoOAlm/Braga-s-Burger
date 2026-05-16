'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { BurgerRain } from './BurgerRain';
import { hasSeenIntro, markIntroSeen } from '@/lib/intro';

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  // começa como false no servidor; o efeito decide no cliente
  const [introRunning, setIntroRunning] = useState(false);

  useEffect(() => {
    if (!hasSeenIntro() && !reduceMotion) {
      setIntroRunning(true);
    }
  }, [reduceMotion]);

  const finishIntro = () => {
    markIntroSeen();
    setIntroRunning(false);
  };

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-dark px-6 text-center">
      <AnimatePresence>
        {introRunning && (
          <motion.div
            key="intro"
            className="absolute inset-0 z-20 bg-brand-dark"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <BurgerRain onComplete={finishIntro} />
            <button
              type="button"
              onClick={finishIntro}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Pular
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mb-4 font-body text-sm uppercase tracking-[0.3em] text-brand-gold">
        Hamburgueria artesanal
      </p>
      <h1 className="font-heading text-5xl font-extrabold text-white md:text-7xl">
        Braga&apos;s Burger
      </h1>
      <p className="mt-4 max-w-md text-base text-white/70">
        Os melhores hambúrgueres da Zona Norte, feitos na hora e entregues quentinhos.
      </p>
      <div className="mt-8">
        <Button href="#cardapio">Ver cardápio</Button>
      </div>
    </section>
  );
}
