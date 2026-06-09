import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductsTable } from './ProductsTable';
import { AdminCategory, AdminProduct } from '@/lib/admin-api';

const cats: AdminCategory[] = [
  { id: 'burgers', name: 'Burgers', displayOrder: 1, layout: 'grid' },
];
const prods: AdminProduct[] = [
  {
    id: 'x',
    categoryId: 'burgers',
    name: 'X-Burger',
    price: 25,
    featured: false,
    available: true,
    displayOrder: 1,
  },
];

describe('ProductsTable', () => {
  it('renders products with category name resolved', () => {
    render(
      <ProductsTable
        products={prods}
        categories={cats}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleAvailable={vi.fn().mockResolvedValue(undefined)}
        onToggleFeatured={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.getByText('X-Burger')).toBeInTheDocument();
    expect(screen.getByText('Burgers')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*25,00/)).toBeInTheDocument();
  });
});
