import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductList } from './ProductList';
import type { Product } from '@/lib/types';

const products: Product[] = [
  { id: 'b1', categoryId: 'bebidas', name: 'Coca-Cola Lata', price: 7.9, priceFrom: false, imageUrl: null, featured: false, available: true },
  { id: 'b2', categoryId: 'bebidas', name: 'Água com gás', price: 4.9, priceFrom: false, imageUrl: null, featured: false, available: true },
];

describe('ProductList', () => {
  it('renderiza uma linha por produto com nome e preço', () => {
    render(<ProductList products={products} />);
    expect(screen.getByText('Coca-Cola Lata')).toBeInTheDocument();
    expect(screen.getByText('R$ 7,90')).toBeInTheDocument();
    expect(screen.getByText('Água com gás')).toBeInTheDocument();
    expect(screen.getByText('R$ 4,90')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
