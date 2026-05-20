'use client';

import type { Customer } from '@/lib/types';

interface Props {
  value: Customer;
  onChange: (c: Customer) => void;
  onNext: () => void;
}

export function IdentificationStep({ value, onChange, onNext }: Props) {
  const isValid = value.name.trim().length > 1 && value.phone.trim().length >= 10;
  return (
    <section aria-labelledby="step-identification">
      <h2 id="step-identification" className="font-heading text-xl font-bold">
        Identificação
      </h2>

      <label className="mt-4 block text-sm">
        Nome
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>

      <label className="mt-4 block text-sm">
        Telefone
        <input
          type="tel"
          inputMode="numeric"
          placeholder="(21) 99999-9999"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>

      <button
        type="button"
        disabled={!isValid}
        onClick={onNext}
        className="mt-6 cursor-pointer rounded bg-paper px-6 py-2 font-semibold text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Próximo
      </button>
    </section>
  );
}
