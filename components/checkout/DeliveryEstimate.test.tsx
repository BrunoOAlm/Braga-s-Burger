import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeliveryEstimate } from './DeliveryEstimate';

describe('DeliveryEstimate', () => {
  it('mostra faixa correta pra entrega no Higienópolis (taxa 4,99)', () => {
    render(<DeliveryEstimate method="delivery" fee={4.99} />);
    // 25 + 10 = 35 → 30–40 min
    expect(screen.getByText(/30–40 min/)).toBeInTheDocument();
  });

  it('mostra disclaimer', () => {
    render(<DeliveryEstimate method="pickup" />);
    expect(screen.getByText(/loja confirma no chat/i)).toBeInTheDocument();
  });

  it('na retirada usa só preparo (25 min)', () => {
    render(<DeliveryEstimate method="pickup" />);
    // 25 → 20–30 min
    expect(screen.getByText(/20–30 min/)).toBeInTheDocument();
  });

  it('na entrega sem taxa informada cai pra só preparo', () => {
    render(<DeliveryEstimate method="delivery" />);
    expect(screen.getByText(/20–30 min/)).toBeInTheDocument();
  });
});
