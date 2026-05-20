import { describe, it, expect } from 'vitest';
import { buildCancelMessage } from './order-cancel-message';

describe('buildCancelMessage', () => {
  it('monta a mensagem com o número do pedido', () => {
    expect(buildCancelMessage('#3417')).toBe('Olá, gostaria de cancelar o pedido #3417.');
  });
});
