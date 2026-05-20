import { describe, it, expect } from 'vitest';
import { estimateClock } from './order-time';

describe('estimateClock', () => {
  it('soma os minutos mínimos e máximos no horário atual', () => {
    const now = new Date('2026-05-20T18:00:00');
    expect(estimateClock(now, { min: 30, max: 50 })).toEqual({
      start: '18:30',
      end: '18:50',
    });
  });

  it('preserva zero à esquerda nos minutos', () => {
    const now = new Date('2026-05-20T18:55:00');
    expect(estimateClock(now, { min: 5, max: 10 })).toEqual({
      start: '19:00',
      end: '19:05',
    });
  });

  it('atravessa a meia-noite', () => {
    const now = new Date('2026-05-20T23:50:00');
    expect(estimateClock(now, { min: 20, max: 40 })).toEqual({
      start: '00:10',
      end: '00:30',
    });
  });
});
