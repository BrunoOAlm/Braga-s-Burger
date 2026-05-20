'use client';

import { AddressForm } from './AddressForm';
import { DeliveryEstimate } from './DeliveryEstimate';
import { deliveryAreas } from '@/data/delivery';
import type { Address, DeliveryMethod } from '@/lib/types';

interface Props {
  method: DeliveryMethod;
  address: Address | null;
  onMethodChange: (m: DeliveryMethod) => void;
  onAddressChange: (a: Address | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DeliveryStep({
  method,
  address,
  onMethodChange,
  onAddressChange,
  onNext,
  onBack,
}: Props) {
  const isValid = method === 'pickup' || (method === 'delivery' && address !== null);
  const fee = address
    ? deliveryAreas.find(
        (a) => a.neighborhood.toLowerCase() === address.neighborhood.toLowerCase(),
      )?.fee
    : undefined;

  return (
    <section aria-labelledby="step-delivery">
      <h2 id="step-delivery" className="font-heading text-xl font-bold">
        Entrega
      </h2>

      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">Modalidade</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="method"
            value="delivery"
            checked={method === 'delivery'}
            onChange={() => onMethodChange('delivery')}
          />
          Entrega no endereço
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="method"
            value="pickup"
            checked={method === 'pickup'}
            onChange={() => onMethodChange('pickup')}
          />
          Retirada no local
        </label>
      </fieldset>

      {method === 'delivery' && (
        <div className="mt-4">
          <AddressForm value={address} onChange={onAddressChange} />
        </div>
      )}

      <div className="mt-4">
        <DeliveryEstimate method={method} fee={fee} />
      </div>

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
          disabled={!isValid}
          onClick={onNext}
          className="cursor-pointer rounded bg-paper px-6 py-2 font-semibold text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próximo
        </button>
      </div>
    </section>
  );
}
