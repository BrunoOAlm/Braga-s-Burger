import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('exibe a marca, a tagline e o CTA', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { name: /Braga's Burger/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver cardápio' })).toHaveAttribute('href', '#cardapio');
  });
});
