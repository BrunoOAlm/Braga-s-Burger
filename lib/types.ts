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
