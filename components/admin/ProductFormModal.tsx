'use client';
import { useState } from 'react';
import { AdminCategory, AdminProduct, ApiError } from '@/lib/admin-api';
import { FormModal } from './FormModal';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  product?: AdminProduct;
  categories: AdminCategory[];
  onClose: () => void;
  onSubmit: (p: AdminProduct) => Promise<void>;
};

const EMPTY: AdminProduct = {
  id: '',
  categoryId: '',
  name: '',
  price: 0,
  featured: false,
  available: true,
  displayOrder: 100,
};

function humanizeApi(err: ApiError): string {
  return err.detail || err.title || 'Erro inesperado.';
}

export function ProductFormModal({
  open,
  mode,
  product,
  categories,
  onClose,
  onSubmit,
}: Props) {
  const [draft, setDraft] = useState<AdminProduct>(product ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevKey, setPrevKey] = useState({ product, open });

  // "Adjusting state during render": reseta o form quando a prop muda.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (prevKey.product !== product || prevKey.open !== open) {
    setPrevKey({ product, open });
    setDraft(product ?? EMPTY);
    setError(null);
  }

  async function handle() {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(draft);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? humanizeApi(e) : 'Falha na conexão.');
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === 'create' ? 'Novo produto' : `Editar ${product?.name ?? ''}`;
  const isEdit = mode === 'edit';

  return (
    <FormModal
      open={open}
      title={title}
      onClose={onClose}
      onSubmit={handle}
      submitting={submitting}
      error={error}
    >
      <FormField label="ID (slug)" htmlFor="p-id" required hint="ex: x-burger">
        <input
          id="p-id"
          value={draft.id}
          onChange={(e) => setDraft({ ...draft, id: e.target.value })}
          disabled={isEdit}
          required
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
        />
      </FormField>
      <FormField label="Categoria" htmlFor="p-cat" required>
        <Select
          id="p-cat"
          value={draft.categoryId}
          onChange={(v) => setDraft({ ...draft, categoryId: v })}
          placeholder="— Selecione —"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </FormField>
      <FormField label="Nome" htmlFor="p-name" required>
        <input
          id="p-name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          required
          maxLength={120}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Descrição" htmlFor="p-desc">
        <textarea
          id="p-desc"
          value={draft.description ?? ''}
          onChange={(e) => setDraft({ ...draft, description: e.target.value || undefined })}
          rows={3}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Preço" htmlFor="p-price" required>
          <input
            id="p-price"
            type="number"
            step="0.01"
            min="0"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
            required
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </FormField>
        <FormField label="A partir de" htmlFor="p-pricefrom" hint="opcional">
          <input
            id="p-pricefrom"
            type="number"
            step="0.01"
            min="0"
            value={draft.priceFrom ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                priceFrom: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </FormField>
      </div>
      <FormField label="URL da imagem" htmlFor="p-img" hint="https://… ou /images/…">
        <input
          id="p-img"
          value={draft.imageUrl ?? ''}
          onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value || undefined })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      {draft.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.imageUrl} alt="preview" className="h-20 w-20 rounded border object-cover" />
      )}
      <div className="mt-3 flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={draft.featured}
            onChange={(v) => setDraft({ ...draft, featured: v })}
            aria-label="Destaque"
          />
          Destaque
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={draft.available}
            onChange={(v) => setDraft({ ...draft, available: v })}
            aria-label="Ativo"
          />
          Ativo
        </label>
      </div>
    </FormModal>
  );
}
