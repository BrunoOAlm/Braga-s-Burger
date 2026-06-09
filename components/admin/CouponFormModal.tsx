'use client';
import { useState } from 'react';
import { AdminCoupon, ApiError } from '@/lib/admin-api';
import { FormModal } from './FormModal';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { DateInput } from '@/components/ui/DateInput';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  coupon?: AdminCoupon;
  onClose: () => void;
  onSubmit: (c: AdminCoupon) => Promise<void>;
};

const EMPTY: AdminCoupon = { code: '', type: 'percent', value: 0, active: true };

function humanizeApi(err: ApiError): string {
  return err.detail || err.title || 'Erro inesperado.';
}

export function CouponFormModal({ open, mode, coupon, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<AdminCoupon>(coupon ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevKey, setPrevKey] = useState({ coupon, open });

  // "Adjusting state during render": reseta o form quando a prop muda.
  if (prevKey.coupon !== coupon || prevKey.open !== open) {
    setPrevKey({ coupon, open });
    setDraft(coupon ?? EMPTY);
    setError(null);
  }

  function validate(): string | null {
    if (draft.type === 'percent' && (draft.value <= 0 || draft.value > 100)) {
      return 'Cupom percent deve ter 0 < valor <= 100.';
    }
    if (draft.type === 'fixed' && draft.value <= 0) {
      return 'Cupom fixed deve ter valor > 0.';
    }
    if (draft.validFrom && draft.validUntil && draft.validFrom >= draft.validUntil) {
      return 'Valid from deve ser antes de valid until.';
    }
    return null;
  }

  async function handle() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ ...draft, code: draft.code.toUpperCase() });
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? humanizeApi(e) : 'Falha na conexão.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      open={open}
      title={mode === 'create' ? 'Novo cupom' : `Editar ${coupon?.code ?? ''}`}
      onClose={onClose}
      onSubmit={handle}
      submitting={submitting}
      error={error}
    >
      <FormField label="Código" htmlFor="c-code" required>
        <input
          id="c-code"
          required
          disabled={mode === 'edit'}
          value={draft.code}
          onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm uppercase disabled:bg-neutral-100"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Tipo" htmlFor="c-type" required>
          <Select
            id="c-type"
            value={draft.type}
            onChange={(v) => setDraft({ ...draft, type: v as 'percent' | 'fixed' })}
            options={[
              { value: 'percent', label: 'Percent (%)' },
              { value: 'fixed', label: 'Fixo (R$)' },
            ]}
          />
        </FormField>
        <FormField label="Valor" htmlFor="c-value" required>
          <input
            id="c-value"
            type="number"
            step="0.01"
            required
            value={draft.value}
            onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </FormField>
      </div>
      <FormField label="Subtotal mínimo" htmlFor="c-min" hint="opcional">
        <input
          id="c-min"
          type="number"
          step="0.01"
          value={draft.minSubtotal ?? ''}
          onChange={(e) =>
            setDraft({
              ...draft,
              minSubtotal: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Válido de" htmlFor="c-from">
          <DateInput
            id="c-from"
            value={draft.validFrom ?? ''}
            onChange={(v) => setDraft({ ...draft, validFrom: v || undefined })}
          />
        </FormField>
        <FormField label="Válido até" htmlFor="c-until">
          <DateInput
            id="c-until"
            value={draft.validUntil ?? ''}
            onChange={(v) => setDraft({ ...draft, validUntil: v || undefined })}
          />
        </FormField>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <Switch
          checked={draft.active}
          onChange={(v) => setDraft({ ...draft, active: v })}
          aria-label="Ativo"
        />
        Ativo
      </label>
    </FormModal>
  );
}
