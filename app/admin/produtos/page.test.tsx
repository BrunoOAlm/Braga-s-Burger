import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProdutosPage from './page';
import * as adminApi from '@/lib/admin-api';

vi.mock('@/lib/admin-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/admin-api')>()),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

describe('ProdutosPage', () => {
  it('lists products and opens Novo modal', async () => {
    vi.spyOn(adminApi, 'listProducts').mockResolvedValue([
      {
        id: 'x',
        categoryId: 'b',
        name: 'X-Burger',
        price: 25,
        featured: false,
        available: true,
        displayOrder: 1,
      },
    ]);
    vi.spyOn(adminApi, 'listCategories').mockResolvedValue([
      { id: 'b', name: 'Burgers', displayOrder: 1, layout: 'grid' },
    ]);
    render(<ProdutosPage />);
    await waitFor(() => expect(screen.getByText('X-Burger')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Novo produto'));
    expect(screen.getByRole('heading', { level: 2, name: 'Novo produto' })).toBeInTheDocument();
  });
});
