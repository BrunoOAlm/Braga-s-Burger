import { describe, expect, it } from 'vitest';
import { buildContactMessage, buildHelpMessage } from './order-message';

describe('buildContactMessage', () => {
  it('monta uma mensagem curta com o número do pedido', () => {
    expect(buildContactMessage('#3417')).toBe('Olá, sobre o pedido #3417.');
  });
});

describe('buildHelpMessage', () => {
  it('monta um pedido de ajuda com o número do pedido', () => {
    expect(buildHelpMessage('#3417')).toBe('Olá, preciso de ajuda com o pedido #3417.');
  });
});
