'use client';
import { AdminCategory } from '@/lib/admin-api';
import { AdminTable, Column } from './AdminTable';
import { RowActions } from './RowActions';

type Props = {
  categories: AdminCategory[];
  productsByCategory: Record<string, number>;
  onEdit: (c: AdminCategory) => void;
  onDelete: (c: AdminCategory) => void;
};

export function CategoriesTable({ categories, productsByCategory, onEdit, onDelete }: Props) {
  const columns: Column<AdminCategory>[] = [
    { key: 'name', header: 'Nome', render: (c) => c.name },
    { key: 'layout', header: 'Layout', render: (c) => c.layout },
    { key: 'order', header: 'Ordem', render: (c) => String(c.displayOrder) },
    {
      key: 'count',
      header: 'Produtos',
      render: (c) => String(productsByCategory[c.id] ?? 0),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => <RowActions onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />,
    },
  ];
  return (
    <AdminTable
      columns={columns}
      rows={categories}
      rowKey={(c) => c.id}
      emptyMessage="Nenhuma categoria cadastrada."
    />
  );
}
