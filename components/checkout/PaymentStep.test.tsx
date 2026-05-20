import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentStep } from './PaymentStep';

describe('PaymentStep', () => {
  it('lista as 4 formas de pagamento', () => {
    render(
      <PaymentStep
        payment={null}
        changeFor={undefined}
        onPaymentChange={() => {}}
        onChangeForChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.getByLabelText(/Pix/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cartão de crédito/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cartão de débito/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dinheiro/i)).toBeInTheDocument();
  });

  it('mostra campo de troco só quando Dinheiro está selecionado', () => {
    const onPaymentChange = vi.fn();
    const { rerender } = render(
      <PaymentStep
        payment={null}
        changeFor={undefined}
        onPaymentChange={onPaymentChange}
        onChangeForChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/Troco/i)).not.toBeInTheDocument();
    rerender(
      <PaymentStep
        payment="cash"
        changeFor={undefined}
        onPaymentChange={onPaymentChange}
        onChangeForChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.getByLabelText(/Troco para/i)).toBeInTheDocument();
  });

  it('botão Próximo desabilitado sem forma selecionada', () => {
    render(
      <PaymentStep
        payment={null}
        changeFor={undefined}
        onPaymentChange={() => {}}
        onChangeForChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /próximo/i })).toBeDisabled();
  });
});
