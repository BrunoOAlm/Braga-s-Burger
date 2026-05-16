import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
