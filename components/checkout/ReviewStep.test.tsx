import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewStep } from './ReviewStep';

describe('ReviewStep', () => {
  it('renderiza resumo com os totais passados', () => {
    render(
      <ReviewStep
        subtotal={100}
        deliveryFee={5}
        discount={0}
        total={105}
        method="delivery"
        onSubmit={() => {}}
        onBack={() => {}}
        estimatedRange={{ min: 30, max: 40 }}
      />,
    );
    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument();
    expect(screen.getByText(/30–40 min/)).toBeInTheDocument();
  });

  it('chama onSubmit ao clicar Enviar pedido', async () => {
    const onSubmit = vi.fn();
    render(
      <ReviewStep
        subtotal={100}
        deliveryFee={0}
        discount={0}
        total={100}
        method="pickup"
        onSubmit={onSubmit}
        onBack={() => {}}
        estimatedRange={{ min: 20, max: 30 }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /enviar pedido/i }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
