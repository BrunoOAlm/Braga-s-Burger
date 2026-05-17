import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeaturedCarousel } from './FeaturedCarousel';

describe('FeaturedCarousel', () => {
  it('exibe apenas produtos marcados como destaque', () => {
    render(<FeaturedCarousel />);
    // "Duplo" é featured: true (o carrossel duplica os itens para o loop)
    expect(screen.getAllByText('Duplo').length).toBeGreaterThan(0);
    // "Braguinha" é featured: false → não aparece
    expect(screen.queryByText('Braguinha')).not.toBeInTheDocument();
  });
});
