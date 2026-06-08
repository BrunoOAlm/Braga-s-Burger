import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductFormModal } from './ProductFormModal';
import { ApiError } from '@/lib/admin-api';

const cats = [{ id: 'b', name: 'Burgers', displayOrder: 1, layout: 'grid' as const }];

describe('ProductFormModal', () => {
  it('submits new product', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductFormModal
        open
        mode="create"
        categories={cats}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText(/ID/), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText(/Categoria/), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: 'X-Burger' } });
    fireEvent.change(screen.getByLabelText(/^Preço/), { target: { value: '25' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('shows humanized error on ApiError', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(409, 'product-already-exists', 'Existe', 'já cadastrado'));
    render(
      <ProductFormModal
        open
        mode="create"
        categories={cats}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText(/ID/), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText(/Categoria/), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/^Preço/), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
