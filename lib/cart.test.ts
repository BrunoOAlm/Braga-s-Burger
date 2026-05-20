import { describe, it, expect } from 'vitest';
import { calcSubtotal, calcDiscount, findCoupon, groupByCategory } from './cart';
import type { CartItem, Coupon, Product, Category } from './types';

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

describe('calcDiscount', () => {
  it('aplica desconto percentual', () => {
    const c: Coupon = { code: 'X', type: 'percent', value: 10 };
    expect(calcDiscount(100, c)).toBe(10);
  });

  it('aplica desconto fixo', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 7 };
    expect(calcDiscount(100, c)).toBe(7);
  });

  it('retorna 0 se subtotal < minSubtotal', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 5, minSubtotal: 40 };
    expect(calcDiscount(30, c)).toBe(0);
  });

  it('aplica desconto se subtotal == minSubtotal', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 5, minSubtotal: 40 };
    expect(calcDiscount(40, c)).toBe(5);
  });

  it('retorna 0 quando cupom é null', () => {
    expect(calcDiscount(100, null)).toBe(0);
  });

  it('não passa do subtotal (desconto fixo maior)', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 200 };
    expect(calcDiscount(50, c)).toBe(50);
  });
});

describe('findCoupon', () => {
  const list: Coupon[] = [
    { code: 'BEMVINDO10', type: 'percent', value: 10 },
    { code: 'FRETE5', type: 'fixed', value: 5 },
  ];

  it('encontra cupom por código (case-insensitive)', () => {
    expect(findCoupon('bemvindo10', list)?.code).toBe('BEMVINDO10');
    expect(findCoupon('FRETE5', list)?.code).toBe('FRETE5');
  });

  it('retorna null pra código inexistente', () => {
    expect(findCoupon('XYZ', list)).toBeNull();
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
