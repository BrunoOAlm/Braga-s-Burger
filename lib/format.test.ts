import { describe, it, expect } from 'vitest';
import { formatPrice, formatProductPrice } from './format';

describe('formatPrice', () => {
  it('formata um valor com centavos', () => {
    expect(formatPrice(28.9)).toBe('R$ 28,90');
  });

  it('formata um valor inteiro com ,00', () => {
    expect(formatPrice(15)).toBe('R$ 15,00');
  });

  it('formata zero', () => {
    expect(formatPrice(0)).toBe('R$ 0,00');
  });
});

describe('formatProductPrice', () => {
  it('prefixa "A partir de" quando priceFrom é true', () => {
    expect(formatProductPrice({ price: 22.9, priceFrom: true })).toBe('A partir de R$ 22,90');
  });

  it('mostra só o preço quando priceFrom é false', () => {
    expect(formatProductPrice({ price: 3.9, priceFrom: false })).toBe('R$ 3,90');
  });
});
