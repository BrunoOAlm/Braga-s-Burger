import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryLookup } from './DeliveryLookup';

describe('DeliveryLookup', () => {
  it('não mostra taxa antes de escolher um bairro', () => {
    render(<DeliveryLookup />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra a taxa correta do bairro escolhido', async () => {
    render(<DeliveryLookup />);
    await userEvent.selectOptions(screen.getByLabelText(/bairro/i), 'Higienópolis');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Higienópolis');
    expect(status).toHaveTextContent('R$ 4,99');
  });
});
