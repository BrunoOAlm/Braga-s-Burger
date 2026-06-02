import type { Category, CartItem } from './types';

export function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
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
