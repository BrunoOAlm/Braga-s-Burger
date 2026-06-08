'use client';
import { FormEvent, ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  submitting?: boolean;
  error?: string | null;
  children: ReactNode;
  submitLabel?: string;
};

export function FormModal({
  open, title, onClose, onSubmit, submitting, error, children, submitLabel = 'Salvar',
}: Props) {
  const titleId = 'form-modal-title';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId}>
      <form onSubmit={handleSubmit}>
        <h2 id={titleId} className="text-lg font-semibold text-neutral-900">{title}</h2>
        {error && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Salvando…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
