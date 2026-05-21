import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createOrder, getOrder, ApiError } from './api-client';
import type { CreateOrderRequest, OrderResponse } from './types-api';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sampleRequest: CreateOrderRequest = {
  customer: { name: 'Bruno', phone: '(21) 99999-0000' },
  fulfillmentType: 'PICKUP',
  payment: 'PIX',
  items: [{ productId: 'p1', quantity: 1 }],
};

const sampleResponse: OrderResponse = {
  id: 'ord_01H...',
  displayId: '#3417',
  status: 'RECEIVED',
  fulfillmentType: 'PICKUP',
  customer: { name: 'Bruno', phone: '(21) 99999-0000' },
  payment: 'PIX',
  items: [
    { productId: 'p1', productName: 'Burger', unitPrice: 25, quantity: 1 },
  ],
  totals: { subtotal: 25, discount: 0, deliveryFee: 0, total: 25 },
  estimatedMinutes: { min: 20, max: 30 },
  createdAt: '2026-05-21T19:00:00Z',
  timestamps: {
    receivedAt: '2026-05-21T19:00:00Z',
    preparingAt: null,
    outAt: null,
    deliveredAt: null,
    cancelledAt: null,
  },
};

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createOrder', () => {
  it('faz POST para /orders com Content-Type e body JSON e retorna OrderResponse', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(201, sampleResponse));

    const result = await createOrder(sampleRequest);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/orders$/);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init?.body as string)).toEqual(sampleRequest);
    expect(result).toEqual(sampleResponse);
  });
});

describe('createOrder — erros', () => {
  it('em 400 com Problem Details lança ApiError com status, type, title, detail', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(400, {
        type: 'https://bragas/errors/store-closed',
        title: 'Loja fechada',
        detail: 'A loja não aceita pedidos agora.',
        status: 400,
      }),
    );

    await expect(createOrder(sampleRequest)).rejects.toMatchObject({
      status: 400,
      type: 'store-closed',
      title: 'Loja fechada',
      detail: 'A loja não aceita pedidos agora.',
    });
  });

  it('em erro sem corpo JSON usa defaults (type=unknown, detail=HTTP N)', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(createOrder(sampleRequest)).rejects.toMatchObject({
      status: 500,
      type: 'unknown',
      title: 'Erro',
      detail: 'HTTP 500',
    });
  });

  it('em falha de rede lança ApiError com status=0 e type=network-error', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(createOrder(sampleRequest)).rejects.toMatchObject({
      status: 0,
      type: 'network-error',
    });
  });

  it('o erro lançado é uma instância de ApiError', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(400, { type: 'x' }));
    try {
      await createOrder(sampleRequest);
      expect.fail('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
    }
  });
});

describe('getOrder', () => {
  it('faz GET para /orders/:id e retorna OrderResponse', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, sampleResponse));

    const result = await getOrder('ord_01HZ');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/orders\/ord_01HZ$/);
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
    expect(result).toEqual(sampleResponse);
  });
});
