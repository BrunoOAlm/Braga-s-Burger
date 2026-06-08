import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryFormModal } from './CategoryFormModal';

describe('CategoryFormModal', () => {
  it('submits new category', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CategoryFormModal open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/ID/), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: 'Burgers' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});
