'use client';

import { formatPrice } from '@/lib/format';
import type { DeliveryMethod } from '@/lib/types';

interface Props {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  method: DeliveryMethod;
  estimatedRange: { min: number; max: number };
  onSubmit: () => void;
  onBack: () => void;
}

export function ReviewStep({
  subtotal,
  deliveryFee,
  discount,
  total,
  method,
  estimatedRange,
  onSubmit,
  onBack,
}: Props) {
  return (
    <section aria-labelledby="step-review">
      <h2 id="step-review" className="font-heading text-xl font-bold">
        Revisão
      </h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        {method === 'delivery' && (
          <div className="flex justify-between">
            <dt>Taxa de entrega</dt>
            <dd>{formatPrice(deliveryFee)}</dd>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-muted">
            <dt>Desconto</dt>
            <dd>-{formatPrice(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>

      <p className="mt-4 rounded border border-line bg-surface p-3 text-sm">
        🕗 Tempo estimado: <strong>{estimatedRange.min}–{estimatedRange.max} min</strong>
        <span className="ml-2 text-xs text-faint">A loja confirma no chat.</span>
      </p>

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
          onClick={onSubmit}
          className="cursor-pointer rounded bg-paper px-6 py-2 font-semibold text-ink transition-colors hover:bg-white"
        >
          Enviar pedido
        </button>
      </div>
    </section>
  );
}
