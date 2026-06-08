'use client';
import { AdminCategory, AdminProduct } from '@/lib/admin-api';
import { AdminTable, Column } from './AdminTable';
import { InlineToggle } from './InlineToggle';
import { RowActions } from './RowActions';

type Props = {
  products: AdminProduct[];
  categories: AdminCategory[];
  onEdit: (p: AdminProduct) => void;
  onDelete: (p: AdminProduct) => void;
  onToggleAvailable: (p: AdminProduct, next: boolean) => Promise<unknown>;
  onToggleFeatured: (p: AdminProduct, next: boolean) => Promise<unknown>;
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProductsTable({
  products,
  categories,
  onEdit,
  onDelete,
  onToggleAvailable,
  onToggleFeatured,
}: Props) {
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const columns: Column<AdminProduct>[] = [
    {
      key: 'thumb',
      header: '',
      render: (p) =>
        p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <div className="h-10 w-10 rounded bg-neutral-200" />
        ),
    },
    { key: 'name', header: 'Nome', render: (p) => p.name },
    { key: 'cat', header: 'Categoria', render: (p) => catName(p.categoryId) },
    { key: 'price', header: 'Preço', render: (p) => fmtBRL(p.price) },
    {
      key: 'available',
      header: 'Ativo',
      render: (p) => (
        <InlineToggle
          initial={p.available}
          label="Ativo"
          onToggle={(next) => onToggleAvailable(p, next)}
        />
      ),
    },
    {
      key: 'featured',
      header: 'Destaque',
      render: (p) => (
        <InlineToggle
          initial={p.featured}
          label="Destaque"
          onToggle={(next) => onToggleFeatured(p, next)}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p) => <RowActions onEdit={() => onEdit(p)} onDelete={() => onDelete(p)} />,
    },
  ];

  return (
    <AdminTable
      columns={columns}
      rows={products}
      rowKey={(p) => p.id}
      emptyMessage="Nenhum produto cadastrado."
    />
  );
}
