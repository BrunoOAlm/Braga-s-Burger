import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoriesTable } from './CategoriesTable';

describe('CategoriesTable', () => {
  it('renders categories with product counts', () => {
    render(
      <CategoriesTable
        categories={[{ id: 'b', name: 'Burgers', displayOrder: 1, layout: 'grid' }]}
        productsByCategory={{ b: 12 }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Burgers')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
