import { describe, it, expect } from 'vitest';
import { calcSubtotal, groupByCategory } from './cart';
import type { CartItem, Product, Category } from './types';

const product = (id: string, categoryId: string, price: number): Product => ({
  id,
  categoryId,
  name: id,
  description: '',
  price,
  priceFrom: false,
  imageUrl: null,
  featured: false,
  available: true,
});

const item = (p: Product, qty: number): CartItem => ({
  id: `cart-${p.id}`,
  product: p,
  quantity: qty,
  notes: '',
});

describe('calcSubtotal', () => {
  it('soma preço × quantidade de todos os itens', () => {
    const items = [
      item(product('a', 'burgers', 10), 2), // 20
      item(product('b', 'burgers', 7.5), 3), // 22.5
    ];
    expect(calcSubtotal(items)).toBe(42.5);
  });

  it('retorna 0 para carrinho vazio', () => {
    expect(calcSubtotal([])).toBe(0);
  });
});

describe('groupByCategory', () => {
  const cats: Category[] = [
    { id: 'burgers', name: 'Burgers', order: 1, layout: 'grid' },
    { id: 'porcoes', name: 'Porções', order: 4, layout: 'grid' },
    { id: 'bebidas', name: 'Bebidas', order: 7, layout: 'list' },
  ];

  it('agrupa itens por categoria na ordem das categorias', () => {
    const items = [
      item(product('coca', 'bebidas', 8), 1),
      item(product('duplo', 'burgers', 40), 1),
      item(product('fritas', 'porcoes', 20), 1),
    ];
    const groups = groupByCategory(items, cats);
    expect(groups.map((g) => g.category.id)).toEqual(['burgers', 'porcoes', 'bebidas']);
    expect(groups[0].items.map((i) => i.product.id)).toEqual(['duplo']);
  });

  it('omite categorias sem itens', () => {
    const items = [item(product('duplo', 'burgers', 40), 1)];
    expect(groupByCategory(items, cats).map((g) => g.category.id)).toEqual(['burgers']);
  });
});
