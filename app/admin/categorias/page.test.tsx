import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CategoriasPage from './page';
import * as adminApi from '@/lib/admin-api';

vi.mock('@/lib/admin-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/admin-api')>()),
}));

describe('CategoriasPage', () => {
  it('renders categories list', async () => {
    vi.spyOn(adminApi, 'listCategories').mockResolvedValue([
      { id: 'b', name: 'Burgers', displayOrder: 1, layout: 'grid' },
    ]);
    vi.spyOn(adminApi, 'listProducts').mockResolvedValue([]);
    render(<CategoriasPage />);
    await waitFor(() => expect(screen.getByText('Burgers')).toBeInTheDocument());
  });
});
