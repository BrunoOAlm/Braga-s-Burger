import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckoutPage from './page';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import type { OrderResponse } from '@/lib/types-api';
import { useCartStore } from '@/lib/cart-store';
import { fixtureProducts as products } from '@/lib/__fixtures__/menu';

// Quarta-feira 19:00 BRT (loja aberta — storeConfig.openingHours.wed = ['18:00','23:40']).
const OPEN_TIME = new Date('2026-05-20T22:00:00');

const sampleOrder: OrderResponse = {
  id: 'ord_01HZ',
  displayId: '#3417',
  status: 'RECEIVED',
  fulfillmentType: 'PICKUP',
  customer: { name: 'Bruno', phone: '(21) 99999-0000' },
  payment: 'PIX',
  items: [
    {
      productId: products[0].id,
      productName: products[0].name,
      unitPrice: products[0].price,
      quantity: 2,
    },
  ],
  totals: {
    subtotal: products[0].price * 2,
    discount: 0,
    deliveryFee: 0,
    total: products[0].price * 2,
  },
  estimatedMinutes: { min: 20, max: 30 },
  createdAt: '2026-05-20T22:00:00Z',
  timestamps: {
    receivedAt: '2026-05-20T22:00:00Z',
    preparingAt: null,
    outAt: null,
    deliveredAt: null,
    cancelledAt: null,
  },
};

let openSpy: ReturnType<typeof vi.spyOn>;
let createOrderSpy: ReturnType<typeof vi.spyOn>;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ state: { status: 'anonymous' } }),
}));

vi.mock('@/lib/menu-api', () => ({
  getMenu: vi.fn().mockResolvedValue({
    categories: [
      { id: 'burgers', name: 'Burgers', displayOrder: 10, layout: 'grid', products: [] },
    ],
  }),
  validateCoupon: vi.fn().mockResolvedValue({ valid: false }),
}));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(OPEN_TIME);

  useCartStore.setState({
    items: [{ id: 'ci1', product: products[0], quantity: 2, notes: '' }],
    coupon: null,
  });

  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  createOrderSpy = vi.spyOn(api, 'createOrder').mockResolvedValue(sampleOrder);
  vi.spyOn(api, 'getOrder').mockResolvedValue(sampleOrder);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  useCartStore.setState({ items: [], coupon: null });
});

async function fillUntilReview(user: ReturnType<typeof userEvent.setup>) {
  // identification
  await user.type(screen.getByLabelText(/^nome$/i), 'Bruno Almeida');
  await user.type(screen.getByLabelText(/^telefone$/i), '(21) 99999-0000');
  await user.click(screen.getByRole('button', { name: /próximo/i }));

  // delivery — escolher "Retirada no local" (sem endereço)
  await user.click(screen.getByRole('radio', { name: /retirada no local/i }));
  await user.click(screen.getByRole('button', { name: /próximo/i }));

  // payment — Pix
  await user.click(screen.getByRole('radio', { name: /^pix$/i }));
  await user.click(screen.getByRole('button', { name: /próximo/i }));
}

describe('CheckoutPage — submit integrado', () => {
  it('chama api.createOrder com o payload montado e abre WhatsApp em sucesso', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() => expect(createOrderSpy).toHaveBeenCalledTimes(1));
    const payload = createOrderSpy.mock.calls[0][0];
    expect(payload.fulfillmentType).toBe('PICKUP');
    expect(payload.payment).toBe('PIX');
    expect(payload.items).toEqual([
      { productId: products[0].id, quantity: 2 },
    ]);
    expect(payload.address).toBeUndefined();
  });

  it('em sucesso, abre WhatsApp com o displayId do response (não gerado client-side)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    const url = openSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain('#3417');
  });

  it('em ApiError(store-closed) mostra mensagem humanizada e fica na tela review', async () => {
    createOrderSpy.mockRejectedValueOnce(
      new ApiError(409, 'store-closed', 'Loja fechada', 'A loja não aceita pedidos agora.'),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() =>
      expect(screen.getByText(/loja está fechada agora/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /enviar pedido/i })).toBeInTheDocument();
  });

  it('em ApiError(network-error) mostra mensagem genérica de conexão', async () => {
    createOrderSpy.mockRejectedValueOnce(
      new ApiError(0, 'network-error', 'Sem conexão', 'Não consegui falar com o servidor.'),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() =>
      expect(screen.getByText(/sem conexão com o servidor/i)).toBeInTheDocument(),
    );
  });

  it('em ApiError(delivery-area-not-served) mostra "Não entregamos no bairro"', async () => {
    createOrderSpy.mockRejectedValueOnce(
      new ApiError(400, 'delivery-area-not-served', 'Bairro fora', 'Bairro não atendido.'),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPage />);

    await fillUntilReview(user);
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() =>
      expect(screen.getByText(/não entregamos no bairro selecionado/i)).toBeInTheDocument(),
    );
  });
});
