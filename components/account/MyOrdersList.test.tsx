import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyOrdersList } from './MyOrdersList';
import * as api from '@/lib/api-client';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe('MyOrdersList', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('empty state', async () => {
    vi.spyOn(api, 'listMyOrders').mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    render(<MyOrdersList />);
    await waitFor(() =>
      expect(
        screen.getByText(/ainda não fez pedidos/i),
      ).toBeInTheDocument(),
    );
  });

  it('renderiza cards e links para checkout?orderId=', async () => {
    vi.spyOn(api, 'listMyOrders').mockResolvedValue({
      items: [
        {
          id: 'ord_1',
          displayId: '#1001',
          status: 'DELIVERED',
          total: 50.5,
          itemsCount: 2,
          createdAt: '2026-05-20T20:00:00Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
    render(<MyOrdersList />);
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument());
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/checkout?orderId=ord_1',
    );
    expect(screen.getByText(/entregue/i)).toBeInTheDocument();
  });

  it('Carregar mais incrementa offset', async () => {
    const spy = vi
      .spyOn(api, 'listMyOrders')
      .mockResolvedValueOnce({
        items: Array.from({ length: 20 }, (_, i) => ({
          id: `ord_${i}`,
          displayId: `#100${i}`,
          status: 'DELIVERED',
          total: 10,
          itemsCount: 1,
          createdAt: '2026-05-20T20:00:00Z',
        })),
        total: 25,
        limit: 20,
        offset: 0,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'ord_x',
            displayId: '#999',
            status: 'DELIVERED',
            total: 10,
            itemsCount: 1,
            createdAt: '2026-05-20T20:00:00Z',
          },
        ],
        total: 25,
        limit: 20,
        offset: 20,
      });
    render(<MyOrdersList />);
    await waitFor(() => expect(screen.getByText('#1000')).toBeInTheDocument());
    await userEvent.click(
      screen.getByRole('button', { name: /carregar mais/i }),
    );
    await waitFor(() => expect(spy).toHaveBeenCalledWith(20, 20));
  });
});
