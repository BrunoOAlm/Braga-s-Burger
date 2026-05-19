import { describe, it, expect } from 'vitest';
import { categories, products } from './menu';
import { deliveryAreas } from './delivery';

describe('dados do cardápio', () => {
  it('tem 7 categorias e 83 produtos', () => {
    expect(categories).toHaveLength(7);
    expect(products).toHaveLength(83);
  });

  it('todo produto pertence a uma categoria existente', () => {
    const ids = new Set(categories.map((c) => c.id));
    expect(products.every((p) => ids.has(p.categoryId))).toBe(true);
  });

  it('tem exatamente 6 destaques', () => {
    const featured = products.filter((p) => p.featured).map((p) => p.id).sort();
    expect(featured).toEqual(
      ['crispy-catupiry', 'duplo', 'epico', 'explosao-cheddar', 'majestoso', 'triplo-smash'].sort(),
    );
  });

  it('produtos das categorias list (molhos/bebidas) não têm foto', () => {
    const listCats = new Set(categories.filter((c) => c.layout === 'list').map((c) => c.id));
    const listProducts = products.filter((p) => listCats.has(p.categoryId));
    expect(listProducts.every((p) => p.imageUrl === null)).toBe(true);
  });

  it('não tem ids de produto duplicados', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
  });
});

describe('dados de entrega', () => {
  it('tem 39 bairros', () => {
    expect(deliveryAreas).toHaveLength(39);
  });
});
