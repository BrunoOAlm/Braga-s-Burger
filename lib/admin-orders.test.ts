import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrderQueue } from './admin-orders';
import * as adminApi from './admin-api';

beforeEach(() => {
  vi.spyOn(adminApi, 'getOrders').mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mockList = (items: unknown[]) => ({
  items,
  page: 0,
  size: 20,
  total: items.length,
});

describe('useOrderQueue', () => {
  it('fetches initial active orders', async () => {
    vi.spyOn(adminApi, 'getOrders').mockResolvedValue(mockList([{ id: 'o1' }]) as never);
    const { result } = renderHook(() => useOrderQueue('active'));
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
  });

  it('polls every 10s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.spyOn(adminApi, 'getOrders').mockResolvedValue(mockList([]) as never);
    renderHook(() => useOrderQueue('active'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('detects new order after first poll when count grows', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.spyOn(adminApi, 'getOrders');
    spy.mockResolvedValueOnce(mockList([{ id: 'o1' }]) as never);
    spy.mockResolvedValueOnce(mockList([{ id: 'o2' }, { id: 'o1' }]) as never);
    const { result } = renderHook(() => useOrderQueue('active'));
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await waitFor(() => expect(result.current.newOrder).toMatchObject({ id: 'o2' }));
  });

  it('skips poll when document.hidden', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.spyOn(adminApi, 'getOrders').mockResolvedValue(mockList([]) as never);
    renderHook(() => useOrderQueue('active'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(spy).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });
});
