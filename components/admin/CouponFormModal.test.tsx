import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CouponFormModal } from './CouponFormModal';

describe('CouponFormModal', () => {
  it('rejects percent > 100', async () => {
    const onSubmit = vi.fn();
    render(<CouponFormModal open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Código/), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/^Valor/), { target: { value: '150' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/0 < valor <= 100/),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('uppercases code on submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CouponFormModal open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Código/), { target: { value: 'off10' } });
    fireEvent.change(screen.getByLabelText(/^Valor/), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ code: 'OFF10' })),
    );
  });
});
