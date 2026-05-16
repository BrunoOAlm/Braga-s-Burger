'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#ef6c00', '#ff8c00', '#ffd700', '#8b4513', '#ffffff'];
const PARTICLE_COUNT = 12;

type ParticleExplosionProps = {
  x: number; // posição horizontal em % (0-100)
};

type Particle = {
  angle: number;
  distance: number;
};

// Gerado fora do render via inicializador lazy — valores estáveis por mount.
function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }).map((_, index) => ({
    angle: (index / PARTICLE_COUNT) * Math.PI * 2,
    distance: 60 + Math.random() * 40,
  }));
}

export function ParticleExplosion({ x }: ParticleExplosionProps) {
  // Inicializador lazy: executado somente no primeiro mount, nunca durante re-renders.
  const [particles] = useState(generateParticles);

  return (
    <div className="absolute bottom-24" style={{ left: `${x}%` }}>
      {particles.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute h-2 w-2 rounded-full"
          style={{ backgroundColor: COLORS[index % COLORS.length] }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: Math.cos(particle.angle) * particle.distance,
            y: Math.sin(particle.angle) * particle.distance,
            opacity: 0,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
