import { describe, it, expect } from 'vitest';
import { estimateDeliveryMinutes, estimateTotalMinutes } from './delivery-time';

describe('estimateDeliveryMinutes', () => {
  it.each([
    [4.99, 10],
    [5.99, 15],
    [6.99, 20],
    [7.99, 25],
    [8.99, 30],
    [9.99, 35],
    [10.99, 40],
  ])('taxa R$ %s → %s min', (fee, expected) => {
    expect(estimateDeliveryMinutes(fee)).toBe(expected);
  });

  it('taxa fora da tabela → arredonda pra faixa mais próxima', () => {
    // 5.50 mais próximo de 5.99 → 15
    expect(estimateDeliveryMinutes(5.5)).toBe(15);
  });
});

describe('estimateTotalMinutes', () => {
  it('retirada: apenas tempo de preparo', () => {
    expect(estimateTotalMinutes('pickup', 25)).toBe(25);
  });

  it('entrega: preparo + faixa de entrega', () => {
    expect(estimateTotalMinutes('delivery', 25, 4.99)).toBe(35); // 25 + 10
    expect(estimateTotalMinutes('delivery', 25, 10.99)).toBe(65); // 25 + 40
  });

  it('entrega sem taxa informada: só preparo (defensivo)', () => {
    expect(estimateTotalMinutes('delivery', 25)).toBe(25);
  });
});
