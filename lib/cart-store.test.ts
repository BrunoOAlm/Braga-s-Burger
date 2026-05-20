import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart-store';
import type { Product } from './types';

const product = (id: string, price: number): Product => ({
  id,
  categoryId: 'burgers',
  name: id,
  description: '',
  price,
  priceFrom: false,
  imageUrl: null,
  featured: false,
  available: true,
});

beforeEach(() => {
  useCartStore.getState().clear();
});

describe('cart store', () => {
  it('começa vazio', () => {
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().coupon).toBeNull();
  });

  it('addItem cria entrada nova quando o produto não está no carrinho', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe('chicken');
    expect(items[0].quantity).toBe(1);
  });

  it('addItem incrementa quantidade quando o produto já está no carrinho', () => {
    const p = product('chicken', 25.9);
    useCartStore.getState().addItem(p);
    useCartStore.getState().addItem(p);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it('removeItem remove pelo id do item', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().removeItem(id);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('setQuantity ajusta a quantidade do item', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().setQuantity(id, 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('setQuantity ≤ 0 remove o item', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().setQuantity(id, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('setNotes atualiza a observação', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().setNotes(id, 'sem cebola');
    expect(useCartStore.getState().items[0].notes).toBe('sem cebola');
  });

  it('clear esvazia o carrinho e remove o cupom', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    useCartStore.getState().applyCoupon({ code: 'X', type: 'percent', value: 10 });
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().coupon).toBeNull();
  });

  it('applyCoupon e removeCoupon', () => {
    useCartStore.getState().applyCoupon({ code: 'X', type: 'percent', value: 10 });
    expect(useCartStore.getState().coupon?.code).toBe('X');
    useCartStore.getState().removeCoupon();
    expect(useCartStore.getState().coupon).toBeNull();
  });
});
