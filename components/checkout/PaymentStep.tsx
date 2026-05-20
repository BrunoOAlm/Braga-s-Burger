'use client';

import type { PaymentMethod } from '@/lib/types';

interface Props {
  payment: PaymentMethod | null;
  changeFor: number | undefined;
  onPaymentChange: (p: PaymentMethod) => void;
  onChangeForChange: (v: number | undefined) => void;
  onNext: () => void;
  onBack: () => void;
}

const OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'Pix' },
  { value: 'credit', label: 'Cartão de crédito' },
  { value: 'debit', label: 'Cartão de débito' },
  { value: 'cash', label: 'Dinheiro' },
];

export function PaymentStep({
  payment,
  changeFor,
  onPaymentChange,
  onChangeForChange,
  onNext,
  onBack,
}: Props) {
  return (
    <section aria-labelledby="step-payment">
      <h2 id="step-payment" className="font-heading text-xl font-bold">
        Pagamento
      </h2>
      <p className="mt-1 text-sm text-muted">
        O motoboy cobra na entrega (ou pague no balcão ao retirar).
      </p>

      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">Forma de pagamento</legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="payment"
              value={o.value}
              checked={payment === o.value}
              onChange={() => onPaymentChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </fieldset>

      {payment === 'cash' && (
        <label className="mt-4 block text-sm">
          Troco para
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={changeFor ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChangeForChange(v === '' ? undefined : Number(v));
            }}
            className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
          />
        </label>
      )}

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded border border-line px-4 py-2 hover:border-paper"
        >
          Voltar
        </button>
        <button
          type="button"
          disabled={!payment}
          onClick={onNext}
          className="cursor-pointer rounded bg-paper px-6 py-2 font-semibold text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próximo
        </button>
      </div>
    </section>
  );
}
