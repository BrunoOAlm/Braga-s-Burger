'use client';

type Props = {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
};

export function RowActions({ onEdit, onDelete, editLabel = 'Editar', deleteLabel = 'Excluir' }: Props) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="text-sm text-neutral-700 underline-offset-4 hover:underline"
      >
        {editLabel}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="text-sm text-red-600 underline-offset-4 hover:underline"
      >
        {deleteLabel}
      </button>
    </div>
  );
}
