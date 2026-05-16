import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza o texto como botão por padrão', () => {
    render(<Button>Peça agora</Button>);
    expect(screen.getByRole('button', { name: 'Peça agora' })).toBeInTheDocument();
  });

  it('renderiza como link quando recebe href', () => {
    render(<Button href="#cardapio">Ver cardápio</Button>);
    const link = screen.getByRole('link', { name: 'Ver cardápio' });
    expect(link).toHaveAttribute('href', '#cardapio');
  });
});
