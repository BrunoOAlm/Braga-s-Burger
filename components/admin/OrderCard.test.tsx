import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderCard } from './OrderCard';
import { AdminOrder } from '@/lib/admin-api';

const baseOrder: AdminOrder = {
  id: 'o1',
  displayId: '1234',
  status: 'RECEIVED',
  customerName: 'João',
  customerPhone: '(21) 90000-0000',
  items: [{ productId: 'p1', name: 'Burger', quantity: 2, unitPrice: 25 }],
  totals: { subtotal: 50, discount: 0, deliveryFee: 5, total: 55 },
  createdAt: '2026-06-07T14:30:00Z',
};

describe('OrderCard', () => {
  it('renders RECEIVED with Aceitar + Cancelar buttons', () => {
    render(<OrderCard order={baseOrder} onTransition={vi.fn()} />);
    expect(screen.getByText('Aceitar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('calls onTransition with target status', () => {
    const onT = vi.fn();
    render(<OrderCard order={baseOrder} onTransition={onT} />);
    fireEvent.click(screen.getByText('Aceitar'));
    expect(onT).toHaveBeenCalledWith('PREPARING', false);
  });

  it('marks Cancelar as destructive', () => {
    const onT = vi.fn();
    render(<OrderCard order={baseOrder} onTransition={onT} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onT).toHaveBeenCalledWith('CANCELLED', true);
  });

  it('renders no actions for DELIVERED', () => {
    render(<OrderCard order={{ ...baseOrder, status: 'DELIVERED' }} onTransition={vi.fn()} />);
    expect(screen.queryByText('Aceitar')).not.toBeInTheDocument();
  });
});
