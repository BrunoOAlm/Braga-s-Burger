import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('tem o título acessível "Braga\'s Burger"', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { name: "Braga's Burger" })).toBeInTheDocument();
  });

  it('mostra o CTA para o cardápio', () => {
    render(<HeroSection />);
    const cta = screen.getByRole('link', { name: 'Ver cardápio' });
    expect(cta).toHaveAttribute('href', '#cardapio');
  });

  it('mostra a logo', () => {
    render(<HeroSection />);
    expect(screen.getByAltText("Braga's Burger")).toBeInTheDocument();
  });
});
