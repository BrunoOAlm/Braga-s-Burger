import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Força o useReducedMotion a retornar true (usuário com "reduzir movimento"
// ativado no sistema). Isso reproduz a condição do bug de hidratação.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

import { Reveal } from './Reveal';

describe('Reveal', () => {
  it('renderiza os filhos', () => {
    render(
      <Reveal>
        <p>Conteúdo visível</p>
      </Reveal>,
    );
    expect(screen.getByText('Conteúdo visível')).toBeInTheDocument();
  });

  it('mantém o mesmo wrapper <div> com prefers-reduced-motion ativo (sem mismatch de hidratação)', () => {
    // O servidor sempre renderiza o wrapper <motion.div>. O cliente PRECISA
    // renderizar a mesma estrutura, mesmo com "reduzir movimento" ativo —
    // caso contrário, o HTML não bate e ocorre erro de hidratação.
    const { container } = render(
      <Reveal>
        <p>conteúdo</p>
      </Reveal>,
    );
    expect((container.firstChild as HTMLElement).tagName).toBe('DIV');
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });
});
