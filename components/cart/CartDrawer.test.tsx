import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartDrawer } from './CartDrawer';
import { useCartStore } from '@/lib/cart-store';
import type { Product } from '@/lib/types';

vi.mock('@/lib/menu-api', () => ({
  validateCoupon: vi.fn(async ({ code }: { code: string }) => {
    if (code.toUpperCase() === 'BEMVINDO10') {
      return { valid: true, type: 'percent', value: 10, discount: 2.59 };
    }
    return { valid: false };
  }),
}));

const product = (id: string, price: number): Product => ({
  id,
  categoryId: 'burgers',
  name: id,
  description: '',
  price,
  priceFrom: false,
  imageUrl: null,
  featured: false,
  available: true,
});

beforeEach(() => useCartStore.getState().clear());

describe('CartDrawer', () => {
  it('lista os itens do carrinho', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    expect(screen.getByText('chicken')).toBeInTheDocument();
    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument();
  });

  it('mostra mensagem amigável quando vazio', () => {
    render(<CartDrawer open={true} onClose={() => {}} />);
    expect(screen.getByText(/carrinho est[áa] vazio/i)).toBeInTheDocument();
  });

  it('botão de incremento aumenta a quantidade', async () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /aumentar/i }));
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('aplicar cupom valido salva no estado', async () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText(/cupom/i), 'BEMVINDO10');
    await userEvent.click(screen.getByRole('button', { name: /aplicar cupom/i }));
    await waitFor(() => {
      expect(useCartStore.getState().coupon?.code).toBe('BEMVINDO10');
    });
    expect(useCartStore.getState().coupon?.discount).toBe(2.59);
  });

  it('cupom inválido mostra mensagem de erro', async () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText(/cupom/i), 'XYZ');
    await userEvent.click(screen.getByRole('button', { name: /aplicar cupom/i }));
    await waitFor(() => {
      expect(screen.getByText(/cupom inválido/i)).toBeInTheDocument();
    });
  });

  it('botão Fechar pedido aparece quando há itens', () => {
    useCartStore.getState().addItem(product('chicken', 25.9));
    render(<CartDrawer open={true} onClose={() => {}} />);
    expect(screen.getByRole('link', { name: /fechar pedido/i })).toBeInTheDocument();
  });
});
