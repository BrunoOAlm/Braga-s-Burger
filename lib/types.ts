export interface Category {
  id: string;
  name: string;
  order: number;
  layout: 'grid' | 'list'; // grid = cards com foto; list = lista compacta
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string; // bebidas/molhos podem não ter descrição
  price: number; // em reais, ex.: 22.90
  priceFrom: boolean; // true → exibe "A partir de R$ X"
  imageUrl: string | null; // null → exibe placeholder
  featured: boolean; // aparece no carrossel de destaques
  available: boolean; // false → exibe "Esgotado"
}

export interface DeliveryArea {
  neighborhood: string;
  fee: number; // taxa de entrega em reais
}

export interface CartItem {
  id: string; // id único do item no carrinho (não confundir com product.id)
  product: Product;
  quantity: number;
  notes: string; // observação livre ("sem cebola"); '' se nenhuma
  // futuro: options?: SelectedOption[] — customização multi-step
}

export interface Coupon {
  code: string;
  type: 'percent' | 'fixed';
  value: number; // 10 → 10% (percent) ou R$ 10 (fixed)
  minSubtotal?: number; // subtotal mínimo (R$) — usado só no DB seed legado
  discount?: number; // calculado pelo backend em POST /coupons/validate
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference?: string;
}

export type DeliveryMethod = 'delivery' | 'pickup';
export type PaymentMethod = 'pix' | 'cash' | 'credit' | 'debit';

export interface Customer {
  name: string;
  phone: string;
}
