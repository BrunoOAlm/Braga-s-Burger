'use client';

import { useEffect, useRef } from 'react';
import { Modal } from './Modal';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  destructive, onConfirm, onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => cancelRef.current?.focus());
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title">
      <h2 id="confirm-title" className="text-lg font-semibold text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm text-neutral-700">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded px-4 py-2 text-sm font-medium text-white ${
            destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-800 hover:bg-neutral-900'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
