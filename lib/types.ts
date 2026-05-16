export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // em reais, ex.: 28.90
  imageUrl: string;
  featured: boolean; // true → aparece no carrossel de destaques
  available: boolean; // false → exibe "esgotado"
}
