import { describe, it, expect } from 'vitest';
import { filterProducts } from './filter';
import type { Product } from './types';

const base: Omit<Product, 'id' | 'categoryId'> = {
  name: 'X',
  description: 'desc',
  price: 10,
  priceFrom: false,
  imageUrl: '/x.jpg',
  featured: false,
  available: true,
};

const products: Product[] = [
  { ...base, id: '1', categoryId: 'classicos' },
  { ...base, id: '2', categoryId: 'classicos' },
  { ...base, id: '3', categoryId: 'combos' },
];

describe('filterProducts', () => {
  it('retorna todos os produtos quando a categoria é null', () => {
    expect(filterProducts(products, null)).toHaveLength(3);
  });

  it('retorna só os produtos da categoria pedida', () => {
    const result = filterProducts(products, 'classicos');
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.categoryId === 'classicos')).toBe(true);
  });

  it('retorna lista vazia quando nenhuma categoria bate', () => {
    expect(filterProducts(products, 'inexistente')).toHaveLength(0);
  });
});
