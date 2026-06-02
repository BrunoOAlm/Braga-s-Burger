import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { categories, products } from '@/data/menu';
import { MenuSection } from './MenuSection';

describe('MenuSection', () => {
  it('mostra o título do cardápio', () => {
    render(<MenuSection categories={categories} products={products} />);
    expect(screen.getByRole('heading', { name: 'Nosso cardápio' })).toBeInTheDocument();
  });

  it('em "Todos" mostra os blocos de categoria com cabeçalho', () => {
    render(<MenuSection categories={categories} products={products} />);
    expect(screen.getByRole('heading', { name: 'Burgers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bebidas' })).toBeInTheDocument();
  });

  it('ao escolher uma categoria mostra só ela', async () => {
    render(<MenuSection categories={categories} products={products} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Bebidas' }));
    expect(screen.queryByRole('heading', { name: 'Burgers' })).not.toBeInTheDocument();
    expect(screen.getByText('Coca-Cola Lata')).toBeInTheDocument();
  });
});
