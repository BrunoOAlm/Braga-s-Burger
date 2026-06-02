import type { MenuResponse } from './types-api';
import type { Category, Product } from './types';

// Converte a resposta do GET /menu (shape api: categorias com produtos
// embutidos) para o shape legado consumido pelos componentes client
// existentes: { categories: Category[], products: Product[] } com `order`
// derivado de displayOrder.
export function toLegacyMenu(menu: MenuResponse): {
  categories: Category[];
  products: Product[];
} {
  const categories: Category[] = menu.categories.map((c) => ({
    id: c.id,
    name: c.name,
    order: c.displayOrder,
    layout: c.layout,
  }));
  const products: Product[] = menu.categories.flatMap((c) =>
    c.products.map((p) => ({
      id: p.id,
      categoryId: c.id,
      name: p.name,
      description: p.description,
      price: p.price,
      priceFrom: p.priceFrom,
      imageUrl: p.imageUrl,
      featured: p.featured,
      available: p.available,
    })),
  );
  return { categories, products };
}
