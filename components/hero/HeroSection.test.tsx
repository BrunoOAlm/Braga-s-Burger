import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('exibe a marca e o CTA', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { name: /Braga's Burger/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver cardápio' })).toHaveAttribute('href', '#cardapio');
  });

  it('mostra o botão Pular quando a intro está rodando', () => {
    render(<HeroSection />);
    expect(screen.getByRole('button', { name: 'Pular' })).toBeInTheDocument();
  });

  it('não mostra o botão Pular se a intro já foi vista nesta sessão', () => {
    window.sessionStorage.setItem('bragas_intro_seen', 'true');
    render(<HeroSection />);
    expect(screen.queryByRole('button', { name: 'Pular' })).not.toBeInTheDocument();
  });
});
