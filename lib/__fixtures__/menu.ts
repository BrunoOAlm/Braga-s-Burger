// Fixtures usadas por testes — espelham o shape do shape legado em
// lib/types (que é o que os componentes client consomem após o adapter).
// Mantemos só os produtos/categorias necessários para os testes; o
// catálogo real fica no DB (V4 + API GET /menu).

import type { Category, Coupon, Product } from '../types';

export const fixtureCategories: Category[] = [
  { id: 'burgers', name: 'Burgers', order: 1, layout: 'grid' },
  { id: 'trios', name: 'Trios', order: 2, layout: 'grid' },
  { id: 'tabuas', name: 'Tábuas', order: 3, layout: 'grid' },
  { id: 'porcoes', name: 'Porções', order: 4, layout: 'grid' },
  { id: 'sobremesas', name: 'Sobremesas', order: 5, layout: 'grid' },
  { id: 'molhos', name: 'Molhos', order: 6, layout: 'grid' },
  { id: 'bebidas', name: 'Bebidas', order: 7, layout: 'grid' },
];

export const fixtureProducts: Product[] = [
  {
    id: 'braguinha',
    categoryId: 'burgers',
    name: 'Braguinha',
    description: 'Pão de brioche, blend bovino, queijo, ovo, alface, tomate e molho de bacon.',
    price: 22.9,
    priceFrom: true,
    imageUrl: '/images/products/braguinha.webp',
    featured: false,
    available: true,
  },
  {
    id: 'chicken',
    categoryId: 'burgers',
    name: 'Chicken',
    description: 'Pão brioche, tiras de frango, queijo, alface, tomate e molho de bacon.',
    price: 25.9,
    priceFrom: true,
    imageUrl: '/images/products/chicken.webp',
    featured: false,
    available: true,
  },
  {
    id: 'duplo',
    categoryId: 'burgers',
    name: 'Duplo',
    description: 'Pão brioche, 2 blends bovinos, queijos, bacon americano e molho de alho.',
    price: 39.9,
    priceFrom: true,
    imageUrl: '/images/products/duplo.webp',
    featured: true,
    available: true,
  },
  {
    id: 'majestoso',
    categoryId: 'burgers',
    name: 'Majestoso',
    description: 'Pão brioche, 2 carnes, catupiry, cheddar, cebola crispy e bacon.',
    price: 37.9,
    priceFrom: true,
    imageUrl: '/images/products/majestoso.webp',
    featured: true,
    available: true,
  },
  {
    id: 'coca-cola-lata',
    categoryId: 'bebidas',
    name: 'Coca-Cola Lata',
    description: '',
    price: 7.9,
    priceFrom: false,
    imageUrl: null,
    featured: false,
    available: true,
  },
];

export const fixtureCoupons: Coupon[] = [
  { code: 'BEMVINDO10', type: 'percent', value: 10 },
  { code: 'FRETE5', type: 'fixed', value: 5, minSubtotal: 40 },
];
