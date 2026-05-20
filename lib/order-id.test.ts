import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateOrderId } from './order-id';

afterEach(() => {
  vi.useRealTimers();
});

describe('generateOrderId', () => {
  it('retorna formato #XXXX (4 dígitos com padding)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 19, 0, 0, 42)); // millis terminam em 0042
    expect(generateOrderId()).toMatch(/^#\d{4}$/);
  });

  it('valor extraído dos últimos 4 dígitos do timestamp', () => {
    vi.useFakeTimers();
    // construímos um timestamp cujos últimos 4 dígitos são 3417
    const ts = 1234567890000 + 3417;
    vi.setSystemTime(new Date(ts));
    expect(generateOrderId()).toBe('#3417');
  });

  it('aplica padding quando os últimos 4 dígitos têm menos que 4 chars', () => {
    vi.useFakeTimers();
    const ts = 1234567890000 + 42; // termina em ...0042
    vi.setSystemTime(new Date(ts));
    expect(generateOrderId()).toBe('#0042');
  });
});
