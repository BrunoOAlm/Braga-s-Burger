import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderStatusScreen } from './OrderStatusScreen';
import * as api from '@/lib/api-client';
import type { OrderResponse } from '@/lib/types-api';
import type { Address, Customer } from '@/lib/types';

let openSpy: ReturnType<typeof vi.spyOn>;
let getOrderSpy: ReturnType<typeof vi.spyOn>;

const customer: Customer = { name: 'João Silva', phone: '(21) 99999-0000' };

const address: Address = {
  cep: '20000-000',
  street: 'Rua das Acácias',
  number: '123',
  neighborhood: 'Higienópolis',
  complement: 'apto 302',
};

function makeOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: 'ord_01HZ',
    displayId: '#3417',
    status: 'RECEIVED',
    fulfillmentType: 'DELIVERY',
    customer,
    address,
    payment: 'PIX',
    items: [],
    totals: { subtotal: 30, discount: 0, deliveryFee: 5, total: 35 },
    estimatedMinutes: { min: 30, max: 50 },
    createdAt: '2026-05-21T18:00:00Z',
    timestamps: {
      receivedAt: '2026-05-21T18:00:00Z',
      preparingAt: null,
      outAt: null,
      deliveredAt: null,
      cancelledAt: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  openSpy.mockClear();
  getOrderSpy = vi.spyOn(api, 'getOrder').mockResolvedValue(makeOrder());
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderDelivery() {
  return render(
    <OrderStatusScreen
      orderId="ord_01HZ"
      initialEstimatedMinutes={{ min: 30, max: 50 }}
      method="delivery"
      customer={customer}
      address={address}
    />,
  );
}

function renderPickup() {
  return render(
    <OrderStatusScreen
      orderId="ord_01HZ"
      initialEstimatedMinutes={{ min: 25, max: 25 }}
      method="pickup"
      customer={customer}
    />,
  );
}

describe('OrderStatusScreen — layout', () => {
  it('mostra o título "Acompanhe seu pedido" e o número do pedido', async () => {
    renderDelivery();
    expect(screen.getByText(/acompanhe seu pedido/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText(/#3417/).length).toBeGreaterThan(0),
    );
  });

  it('mostra a janela de previsão de entrega em HH:MM', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T18:00:00'));
    try {
      renderDelivery();
      expect(screen.getByText('18:30 – 18:50')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renderiza a janela de previsão no formato HH:MM – HH:MM', () => {
    renderDelivery();
    const clockText = screen.getByText(/^\d{2}:\d{2} – \d{2}:\d{2}$/);
    expect(clockText).toBeInTheDocument();
  });

  it('mostra as 4 etapas da timeline com apenas "Recebido" ativa', async () => {
    renderDelivery();
    await waitFor(() => {
      const timeline = screen.getByRole('list');
      const items = within(timeline).getAllByRole('listitem');
      expect(items).toHaveLength(4);
      expect(within(items[0]).getByText('Recebido')).toBeInTheDocument();
      expect(within(items[1]).getByText('Em preparo')).toBeInTheDocument();
      expect(within(items[2]).getByText('Saiu')).toBeInTheDocument();
      expect(within(items[3]).getByText('Entregue')).toBeInTheDocument();
      expect(items[0]).toHaveAttribute('aria-current', 'step');
      expect(items[1]).not.toHaveAttribute('aria-current');
    });
  });

  it('mostra dados do cliente', () => {
    renderDelivery();
    expect(screen.getByText(/joão silva/i)).toBeInTheDocument();
    expect(screen.getByText(/\(21\) 99999-0000/)).toBeInTheDocument();
  });

  it('em delivery, mostra "Entrega em" com rua, número e bairro', () => {
    renderDelivery();
    expect(screen.getByText(/entrega em/i)).toBeInTheDocument();
    expect(screen.getByText(/rua das acácias, 123/i)).toBeInTheDocument();
    expect(screen.getByText(/higienópolis/i)).toBeInTheDocument();
    expect(screen.getByText(/apto 302/i)).toBeInTheDocument();
  });

  it('em pickup, mostra "Retirada no balcão" sem endereço do cliente', () => {
    renderPickup();
    expect(screen.getByText(/retirada no balcão/i)).toBeInTheDocument();
    expect(screen.queryByText(/entrega em/i)).not.toBeInTheDocument();
  });
});

describe('OrderStatusScreen — ações', () => {
  it('CTA "Abrir conversa no WhatsApp" abre o WhatsApp com a mensagem de contato', async () => {
    renderDelivery();
    await waitFor(() => expect(getOrderSpy).toHaveBeenCalled());
    await userEvent.click(
      screen.getByRole('button', { name: /abrir conversa no whatsapp/i }),
    );
    expect(openSpy).toHaveBeenCalled();
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain('wa.me/');
    expect(decodeURIComponent(url)).toContain('Olá, sobre o pedido #3417');
  });

  it('botão "Cancelar pedido" abre o WhatsApp com a mensagem de cancelamento', async () => {
    renderDelivery();
    await waitFor(() => expect(getOrderSpy).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /cancelar pedido/i }));
    const url = openSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain('cancelar o pedido #3417');
  });

  it('link "Ajuda" abre o WhatsApp com a mensagem de ajuda', async () => {
    renderDelivery();
    await waitFor(() => expect(getOrderSpy).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /ajuda/i }));
    const url = openSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain('preciso de ajuda com o pedido #3417');
  });

  it('link "Voltar ao cardápio" leva para a home', () => {
    renderDelivery();
    const back = screen.getByRole('link', { name: /voltar ao cardápio/i });
    expect(back).toHaveAttribute('href', '/');
  });
});

describe('OrderStatusScreen — polling', () => {
  it('faz uma chamada imediata a api.getOrder no mount', async () => {
    renderDelivery();
    await waitFor(() => expect(getOrderSpy).toHaveBeenCalledTimes(1));
    expect(getOrderSpy).toHaveBeenCalledWith('ord_01HZ');
  });

  it('faz nova chamada a cada 10s', async () => {
    vi.useFakeTimers();
    renderDelivery();
    await vi.waitFor(() => expect(getOrderSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(getOrderSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(getOrderSpy).toHaveBeenCalledTimes(3);
  });

  it('quando status="PREPARING", item 1 da timeline tem aria-current="step" e item 0 não', async () => {
    getOrderSpy.mockResolvedValue(makeOrder({ status: 'PREPARING' }));
    renderDelivery();

    await waitFor(() => {
      const items = within(screen.getByRole('list')).getAllByRole('listitem');
      expect(items[1]).toHaveAttribute('aria-current', 'step');
      expect(items[0]).not.toHaveAttribute('aria-current');
    });
  });

  it('quando status="CANCELLED", esconde a timeline e mostra "Pedido cancelado pela loja"', async () => {
    getOrderSpy.mockResolvedValue(makeOrder({ status: 'CANCELLED' }));
    renderDelivery();

    await waitFor(() => {
      expect(screen.getByText(/pedido cancelado pela loja/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('falha de tick é silenciosa — não rompe a UI, próximo tick tenta de novo', async () => {
    vi.useFakeTimers();
    getOrderSpy
      .mockResolvedValueOnce(makeOrder({ status: 'RECEIVED' }))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(makeOrder({ status: 'PREPARING' }));

    renderDelivery();
    await vi.waitFor(() => expect(getOrderSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(getOrderSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await vi.waitFor(() => {
      const items = within(screen.getByRole('list')).getAllByRole('listitem');
      expect(items[1]).toHaveAttribute('aria-current', 'step');
    });
  });

  it('unmount limpa o interval (não chama mais getOrder após desmontar)', async () => {
    vi.useFakeTimers();
    const { unmount } = renderDelivery();
    await vi.waitFor(() => expect(getOrderSpy).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(getOrderSpy).toHaveBeenCalledTimes(1);
  });
});
