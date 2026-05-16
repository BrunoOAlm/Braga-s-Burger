import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/types';

const product: Product = {
  id: 'x-bacon',
  categoryId: 'classicos',
  name: 'X-Bacon',
  description: 'Bacon crocante e queijo.',
  price: 27.9,
  imageUrl: '/images/x-bacon.jpg',
  featured: false,
  available: true,
};

describe('ProductCard', () => {
  it('exibe nome, descrição e preço formatado', () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText('X-Bacon')).toBeInTheDocument();
    expect(screen.getByText('Bacon crocante e queijo.')).toBeInTheDocument();
    expect(screen.getByText('R$ 27,90')).toBeInTheDocument();
  });

  it('exibe "Esgotado" quando o produto está indisponível', () => {
    render(<ProductCard product={{ ...product, available: false }} />);
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });
});
