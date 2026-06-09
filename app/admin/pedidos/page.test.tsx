import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PedidosPage from './page';
import * as adminApi from '@/lib/admin-api';

vi.mock('@/lib/admin-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/admin-api')>()),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => 'active' }),
  useRouter: () => ({ replace: vi.fn() }),
}));

const sample: adminApi.AdminOrder = {
  id: 'o1',
  displayId: '1234',
  status: 'RECEIVED',
  customerName: 'João',
  customerPhone: '21000',
  items: [{ productId: 'p1', productName: 'X', quantity: 1, unitPrice: 10 }],
  totals: { subtotal: 10, discount: 0, deliveryFee: 0, total: 10 },
  createdAt: '2026-06-07T00:00:00Z',
};

describe('PedidosPage', () => {
  it('renders orders and calls updateOrderStatus on Aceitar', async () => {
    vi.spyOn(adminApi, 'getOrders').mockResolvedValue({
      items: [sample],
      page: 0,
      size: 20,
      total: 1,
    });
    const updateSpy = vi.spyOn(adminApi, 'updateOrderStatus').mockResolvedValue(sample);
    render(<PedidosPage />);
    await waitFor(() => expect(screen.getByText(/#1234/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Aceitar'));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('o1', 'PREPARING'));
  });

  it('opens ConfirmDialog on Cancelar', async () => {
    vi.spyOn(adminApi, 'getOrders').mockResolvedValue({
      items: [sample],
      page: 0,
      size: 20,
      total: 1,
    });
    render(<PedidosPage />);
    await waitFor(() => expect(screen.getByText(/#1234/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.getByText('Cancelar pedido?')).toBeInTheDocument();
  });
});
