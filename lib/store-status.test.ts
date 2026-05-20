import { describe, it, expect } from 'vitest';
import { isOpen } from './store-status';
import type { OpeningHours } from '@/config/store';

const hours: OpeningHours = {
  sun: ['18:00', '00:00'],
  mon: null,
  tue: ['18:00', '23:40'],
  wed: ['18:00', '23:40'],
  thu: ['18:00', '23:40'],
  fri: ['18:00', '00:00'],
  sat: ['18:00', '00:00'],
};

// helper: cria Date local. Mês é 0-indexed (4 = maio).
const at = (yyyy: number, m1to12: number, d: number, hh: number, mm: number) =>
  new Date(yyyy, m1to12 - 1, d, hh, mm);

describe('isOpen', () => {
  it('terça às 19:00 → aberto', () => {
    expect(isOpen(at(2026, 5, 19, 19, 0), hours)).toBe(true); // ter
  });

  it('terça às 17:59 → fechado', () => {
    expect(isOpen(at(2026, 5, 19, 17, 59), hours)).toBe(false);
  });

  it('terça às 23:41 → fechado', () => {
    expect(isOpen(at(2026, 5, 19, 23, 41), hours)).toBe(false);
  });

  it('segunda → fechado o dia todo', () => {
    expect(isOpen(at(2026, 5, 18, 19, 0), hours)).toBe(false);
  });

  it('sexta às 23:30 → aberto (fecha à meia-noite)', () => {
    expect(isOpen(at(2026, 5, 22, 23, 30), hours)).toBe(true);
  });

  it('sábado às 00:00 → ainda parte do sábado (limite superior exclusivo)', () => {
    // "00:00" representa a meia-noite seguinte como fim do intervalo.
    expect(isOpen(at(2026, 5, 23, 0, 0), hours)).toBe(false);
  });

  it('sexta às 23:59 → aberto', () => {
    expect(isOpen(at(2026, 5, 22, 23, 59), hours)).toBe(true);
  });
});
