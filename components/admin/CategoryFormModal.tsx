'use client';
import { useState } from 'react';
import { AdminCategory, ApiError } from '@/lib/admin-api';
import { FormModal } from './FormModal';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  category?: AdminCategory;
  onClose: () => void;
  onSubmit: (c: AdminCategory) => Promise<void>;
};

const EMPTY: AdminCategory = { id: '', name: '', displayOrder: 100, layout: 'grid' };

function humanizeApi(err: ApiError): string {
  return err.detail || err.title || 'Erro inesperado.';
}

export function CategoryFormModal({ open, mode, category, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<AdminCategory>(category ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevKey, setPrevKey] = useState({ category, open });

  // "Adjusting state during render": reseta o form quando a prop muda.
  if (prevKey.category !== category || prevKey.open !== open) {
    setPrevKey({ category, open });
    setDraft(category ?? EMPTY);
    setError(null);
  }

  async function handle() {
    setSubmitting(true);
    try {
      await onSubmit(draft);
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
      title={mode === 'create' ? 'Nova categoria' : `Editar ${category?.name ?? ''}`}
      onClose={onClose}
      onSubmit={handle}
      submitting={submitting}
      error={error}
    >
      <FormField label="ID (slug)" htmlFor="c-id" required>
        <input
          id="c-id"
          value={draft.id}
          onChange={(e) => setDraft({ ...draft, id: e.target.value })}
          required
          disabled={mode === 'edit'}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
        />
      </FormField>
      <FormField label="Nome" htmlFor="c-name" required>
        <input
          id="c-name"
          maxLength={120}
          required
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Ordem" htmlFor="c-order">
        <input
          id="c-order"
          type="number"
          value={draft.displayOrder}
          onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Layout" htmlFor="c-layout">
        <Select
          id="c-layout"
          value={draft.layout}
          onChange={(v) => setDraft({ ...draft, layout: v as 'grid' | 'list' })}
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'list', label: 'Lista' },
          ]}
        />
      </FormField>
    </FormModal>
  );
}
