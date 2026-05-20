import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryStep } from './DeliveryStep';

describe('DeliveryStep', () => {
  it('na Retirada não mostra formulário de endereço e habilita Próximo', () => {
    render(
      <DeliveryStep
        method="pickup"
        address={null}
        onMethodChange={() => {}}
        onAddressChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/CEP/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /próximo/i })).toBeEnabled();
  });

  it('na Entrega exige endereço completo pra liberar Próximo', () => {
    render(
      <DeliveryStep
        method="delivery"
        address={null}
        onMethodChange={() => {}}
        onAddressChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.getByLabelText(/CEP/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /próximo/i })).toBeDisabled();
  });

  it('chama onMethodChange ao trocar pra Retirada', async () => {
    const onMethodChange = vi.fn();
    render(
      <DeliveryStep
        method="delivery"
        address={null}
        onMethodChange={onMethodChange}
        onAddressChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    await userEvent.click(screen.getByLabelText(/Retirada/i));
    expect(onMethodChange).toHaveBeenCalledWith('pickup');
  });
});
