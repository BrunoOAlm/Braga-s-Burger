'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  delay?: number;
};

export function Reveal({ children, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  // O wrapper <motion.div> é renderizado SEMPRE — estrutura idêntica no
  // servidor e no cliente, evitando erro de hidratação. A preferência de
  // movimento reduzido afeta só o `transition` (duração 0 = sem animação
  // perceptível); `transition` não vai para o HTML do servidor.
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.5, delay, ease: 'easeOut' }
      }
    >
      {children}
    </motion.div>
  );
}
