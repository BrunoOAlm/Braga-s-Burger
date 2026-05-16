'use client';

import { motion } from 'framer-motion';

const COLORS = ['#ef6c00', '#ff8c00', '#ffd700', '#8b4513', '#ffffff'];

type ParticleExplosionProps = {
  x: number; // posição horizontal em % (0-100)
};

export function ParticleExplosion({ x }: ParticleExplosionProps) {
  const particles = Array.from({ length: 12 });

  return (
    <div className="absolute bottom-24" style={{ left: `${x}%` }}>
      {particles.map((_, index) => {
        const angle = (index / particles.length) * Math.PI * 2;
        const distance = 60 + Math.random() * 40;
        return (
          <motion.span
            key={index}
            className="absolute h-2 w-2 rounded-full"
            style={{ backgroundColor: COLORS[index % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
