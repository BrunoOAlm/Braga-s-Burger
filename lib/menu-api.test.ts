import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as api from './menu-api';

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getMenu', () => {
  it('faz GET /menu com revalidate default 300', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ categories: [] }), { status: 200 }));
    const result = await api.getMenu();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/menu$/);
    expect((init as { next: { revalidate: number } }).next.revalidate).toBe(300);
    expect(result.categories).toEqual([]);
  });

  it('lanca erro se HTTP nao for 2xx', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(api.getMenu()).rejects.toThrow(/HTTP 500/);
  });
});

describe('validateCoupon', () => {
  it('faz POST /coupons/validate com credentials:include e retorna response', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ valid: true, discount: 5 }), { status: 200 }));
    const result = await api.validateCoupon({ code: 'BEMVINDO10', subtotal: 50 });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/coupons\/validate$/);
    expect(init?.method).toBe('POST');
    expect((init as { credentials: string }).credentials).toBe('include');
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(5);
  });
});
