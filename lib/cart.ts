import type { Category, CartItem, Coupon } from './types';

export function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
}

export function calcDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon) return 0;
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) return 0;
  const raw = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value;
  return Math.min(raw, subtotal);
}

export function findCoupon(code: string, list: Coupon[]): Coupon | null {
  const upper = code.trim().toUpperCase();
  return list.find((c) => c.code.toUpperCase() === upper) ?? null;
}

export interface CategoryGroup {
  category: Category;
  items: CartItem[];
}

export function groupByCategory(items: CartItem[], categories: Category[]): CategoryGroup[] {
  return categories
    .map((category) => ({
      category,
      items: items.filter((i) => i.product.categoryId === category.id),
    }))
    .filter((g) => g.items.length > 0);
}
