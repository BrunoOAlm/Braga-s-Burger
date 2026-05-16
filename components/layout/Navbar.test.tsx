import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

describe('Navbar', () => {
  it('exibe a marca e os links de navegação', () => {
    render(<Navbar />);
    expect(screen.getByText("Braga's Burger")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cardápio' })).toHaveAttribute('href', '#cardapio');
    expect(screen.getByRole('link', { name: 'Peça agora' })).toBeInTheDocument();
  });
});
