import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/types';

const base: Product = {
  id: 'p1',
  categoryId: 'burgers',
  name: 'Duplo',
  description: 'Dois blends.',
  price: 39.9,
  priceFrom: true,
  imageUrl: '/images/products/duplo.webp',
  featured: true,
  available: true,
};

describe('ProductCard', () => {
  it('mostra nome, descrição e preço com "A partir de"', () => {
    render(<ProductCard product={base} />);
    expect(screen.getByText('Duplo')).toBeInTheDocument();
    expect(screen.getByText('Dois blends.')).toBeInTheDocument();
    expect(screen.getByText('A partir de R$ 39,90')).toBeInTheDocument();
  });

  it('mostra a foto quando há imageUrl', () => {
    render(<ProductCard product={base} />);
    expect(screen.getByAltText('Duplo')).toBeInTheDocument();
  });

  it('mostra placeholder quando imageUrl é null', () => {
    render(<ProductCard product={{ ...base, imageUrl: null }} />);
    expect(screen.queryByAltText('Duplo')).not.toBeInTheDocument();
    expect(screen.getByTestId('product-placeholder')).toBeInTheDocument();
  });

  it('cai no placeholder quando imageUrl não é local (host externo não quebra a página)', () => {
    // next/image só aceita hosts configurados; uma URL externa (ex.: edição
    // de admin) estouraria 500 na página inteira. ProductCard só renderiza
    // imagens locais (/images/...); o resto degrada para o placeholder.
    render(<ProductCard product={{ ...base, imageUrl: 'https://encrypted-tbn3.gstatic.com/shopping?q=x' }} />);
    expect(screen.queryByAltText('Duplo')).not.toBeInTheDocument();
    expect(screen.getByTestId('product-placeholder')).toBeInTheDocument();
  });

  it('mostra "Esgotado" quando indisponível', () => {
    render(<ProductCard product={{ ...base, available: false }} />);
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });
});
