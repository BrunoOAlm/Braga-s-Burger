import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renderiza a imagem da logo com texto alternativo', () => {
    render(<Logo />);
    const img = screen.getByAltText("Braga's Burger");
    expect(img).toBeInTheDocument();
  });

  it('aplica o tamanho informado', () => {
    render(<Logo size={120} />);
    const img = screen.getByAltText("Braga's Burger");
    expect(img).toHaveAttribute('width', '120');
  });
});
