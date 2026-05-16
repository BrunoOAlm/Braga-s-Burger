import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeaturedCarousel } from './FeaturedCarousel';

describe('FeaturedCarousel', () => {
  it('exibe apenas produtos marcados como destaque', () => {
    render(<FeaturedCarousel />);
    // "Braga's Supremo" é featured: true (o carrossel duplica os itens para o loop)
    expect(screen.getAllByText("Braga's Supremo").length).toBeGreaterThan(0);
    // "X-Bacon" é featured: false → não aparece
    expect(screen.queryByText('X-Bacon')).not.toBeInTheDocument();
  });
});
