'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ParticleExplosion } from './ParticleExplosion';

type BurgerRainProps = {
  onComplete: () => void;
};

const BURGER_COUNT = 14;

// Gerado fora do render: executado apenas uma vez no módulo, valores estáveis.
function generateBurgers() {
  return Array.from({ length: BURGER_COUNT }).map((_, index) => ({
    id: index,
    x: Math.random() * 100,
    rotateTo: Math.random() * 720 - 360,
    duration: 1.6 + Math.random() * 0.8, // ~±20%
    delay: Math.random() * 1.5,
  }));
}

export function BurgerRain({ onComplete }: BurgerRainProps) {
  // Inicializador lazy: executado somente no primeiro mount, nunca durante re-renders.
  const [burgers] = useState(generateBurgers);

  const lastIndex = burgers.reduce(
    (slowest, b) => (b.delay + b.duration > slowest.delay + slowest.duration ? b : slowest),
    burgers[0],
  ).id;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {burgers.map((burger) => (
        <motion.div
          key={burger.id}
          className="absolute text-4xl"
          style={{ left: `${burger.x}%`, top: '-10%' }}
          initial={{ y: 0, rotate: 0 }}
          animate={{ y: '100vh', rotate: burger.rotateTo }}
          transition={{ duration: burger.duration, delay: burger.delay, ease: 'easeIn' }}
          onAnimationComplete={() => {
            if (burger.id === lastIndex) onComplete();
          }}
        >
          🍔
        </motion.div>
      ))}
      {burgers.map((burger) => (
        <motion.div
          key={`boom-${burger.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.6, delay: burger.delay + burger.duration }}
        >
          <ParticleExplosion x={burger.x} />
        </motion.div>
      ))}
    </div>
  );
}
