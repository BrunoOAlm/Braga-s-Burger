import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderStatusScreen } from './OrderStatusScreen';

let openSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
});

describe('OrderStatusScreen', () => {
  it('mostra o número do pedido e o tempo estimado', () => {
    render(<OrderStatusScreen orderId="#3417" estimatedMinutes={{ min: 30, max: 40 }} />);
    expect(screen.getByText('#3417')).toBeInTheDocument();
    expect(screen.getByText(/30–40 min/)).toBeInTheDocument();
  });

  it('botão Cancelar pedido abre WhatsApp com mensagem de cancelamento', async () => {
    render(<OrderStatusScreen orderId="#3417" estimatedMinutes={{ min: 30, max: 40 }} />);
    await userEvent.click(screen.getByRole('button', { name: /cancelar pedido/i }));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('text='), '_blank');
    const arg = openSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(arg)).toContain('cancelar o pedido #3417');
  });
});
