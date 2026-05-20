'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Coupon, Product } from './types';

interface CartState {
  items: CartItem[];
  coupon: Coupon | null;
  addItem: (product: Product) => void;
  removeItem: (cartItemId: string) => void;
  setQuantity: (cartItemId: string, quantity: number) => void;
  setNotes: (cartItemId: string, notes: string) => void;
  clear: () => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      coupon: null,

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          const newItem: CartItem = {
            id: `${product.id}-${Date.now()}`,
            product,
            quantity: 1,
            notes: '',
          };
          return { items: [...state.items, newItem] };
        }),

      removeItem: (cartItemId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== cartItemId) })),

      setQuantity: (cartItemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== cartItemId) };
          }
          return {
            items: state.items.map((i) => (i.id === cartItemId ? { ...i, quantity } : i)),
          };
        }),

      setNotes: (cartItemId, notes) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === cartItemId ? { ...i, notes } : i)),
        })),

      clear: () => set({ items: [], coupon: null }),

      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),
    }),
    { name: 'bragas-cart' },
  ),
);
