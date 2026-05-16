import { describe, it, expect } from 'vitest';
import { formatPrice } from './format';

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
