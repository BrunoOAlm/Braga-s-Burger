import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from './admin-api';
import { ApiError } from './admin-api';

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});
afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetchOk(body: unknown, status = 200) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status,
    json: async () => body,
  });
}

function mockFetchError(status: number, body: unknown) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => body,
  });
}

describe('admin-api', () => {
  it('me() does GET with credentials include', async () => {
    mockFetchOk({ id: 'adm_1', email: 'a@b', name: 'A', createdAt: '2026-06-07T00:00:00Z' });
    await adminApi.me();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/admin/me'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('login() posts JSON body', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => null,
    });
    await adminApi.login('a@b', 'pwd');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ email: 'a@b', password: 'pwd' });
  });

  it('getOrders() builds query string', async () => {
    mockFetchOk({ items: [], page: 0, size: 20, total: 0 });
    await adminApi.getOrders({ status: 'RECEIVED', page: 1, size: 50 });
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('status=RECEIVED');
    expect(url).toContain('page=1');
    expect(url).toContain('size=50');
  });

  it('throws ApiError with parsed problem details on 401', async () => {
    mockFetchError(401, {
      type: 'https://bragas.com/errors/unauthenticated',
      title: 'Não autenticado',
      detail: 'Faça login.',
    });
    await expect(adminApi.me()).rejects.toMatchObject({
      name: 'ApiError',
      type: 'unauthenticated',
      status: 401,
    });
  });

  it('updateOrderStatus PATCHes with to', async () => {
    mockFetchOk({ id: 'o1', status: 'PREPARING' });
    await adminApi.updateOrderStatus('o1', 'PREPARING');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].method).toBe('PATCH');
    expect(JSON.parse(call[1].body)).toEqual({ to: 'PREPARING' });
  });

  it('exports ApiError reusing api-client class', () => {
    const e = new ApiError(500, 'x', 'T', 'd');
    expect(e).toBeInstanceOf(ApiError);
    expect(e.name).toBe('ApiError');
  });
});
