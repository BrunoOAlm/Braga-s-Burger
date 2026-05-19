import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeaturedCarousel } from './FeaturedCarousel';

describe('FeaturedCarousel', () => {
  it('exibe os produtos marcados como destaque', () => {
    render(<FeaturedCarousel />);
    // O loop do Embla reposiciona os slides por transform — não há nós duplicados no DOM.
    expect(screen.getByText('Duplo')).toBeInTheDocument();
    expect(screen.getByText('Majestoso')).toBeInTheDocument();
  });

  it('não exibe produtos fora dos destaques', () => {
    render(<FeaturedCarousel />);
    expect(screen.queryByText('Braguinha')).not.toBeInTheDocument();
  });

  it('renderiza os botões de navegação do carrossel', () => {
    render(<FeaturedCarousel />);
    expect(
      screen.getByRole('button', { name: 'Ver destaques anteriores' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver mais destaques' }),
    ).toBeInTheDocument();
  });
});
