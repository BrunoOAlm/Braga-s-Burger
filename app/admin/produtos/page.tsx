'use client';

import { useState } from 'react';
import * as adminApi from '@/lib/admin-api';
import { AdminProduct, ApiError } from '@/lib/admin-api';
import { useAdminCategories, useAdminProducts } from '@/lib/admin-catalog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ProductsTable } from '@/components/admin/ProductsTable';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function humanizeApi(err: ApiError): string {
  return err.detail || err.title || 'Erro inesperado.';
}

export default function ProdutosPage() {
  const { items: products, refetch } = useAdminProducts();
  const { items: categories } = useAdminCategories();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [formOpen, setFormOpen] = useState<{
    mode: 'create' | 'edit';
    product?: AdminProduct;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = products.filter((p) => {
    if (filterCat && p.categoryId !== filterCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleSubmit(p: AdminProduct) {
    if (formOpen?.mode === 'create') {
      await adminApi.createProduct(p);
    } else {
      await adminApi.updateProduct(p.id, p);
    }
    await refetch();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await adminApi.deleteProduct(pendingDelete.id);
      await refetch();
      setPendingDelete(null);
      setDeleteError(null);
    } catch (e) {
      if (e instanceof ApiError && e.type === 'product-has-orders') {
        setDeleteError('Produto tem pedidos vinculados. Desative em vez de excluir.');
      } else if (e instanceof ApiError) {
        setDeleteError(humanizeApi(e));
      } else {
        setDeleteError('Falha na conexão.');
      }
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Produtos"
        action={
          <button
            onClick={() => setFormOpen({ mode: 'create' })}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Novo produto
          </button>
        }
      />
      <div className="mt-4 flex gap-3">
        <input
          aria-label="Buscar"
          placeholder="Buscar por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          aria-label="Filtro categoria"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todas categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <ProductsTable
        products={filtered}
        categories={categories}
        onEdit={(p) => setFormOpen({ mode: 'edit', product: p })}
        onDelete={(p) => {
          setDeleteError(null);
          setPendingDelete(p);
        }}
        onToggleAvailable={async (p, next) => {
          await adminApi.updateProduct(p.id, { available: next });
          await refetch();
        }}
        onToggleFeatured={async (p, next) => {
          await adminApi.updateProduct(p.id, { featured: next });
          await refetch();
        }}
      />

      {formOpen && (
        <ProductFormModal
          open
          mode={formOpen.mode}
          product={formOpen.product}
          categories={categories}
          onClose={() => setFormOpen(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir produto?"
        message={
          deleteError
            ? deleteError
            : `Esta ação não pode ser desfeita. Produto: ${pendingDelete?.name ?? ''}.`
        }
        confirmLabel={deleteError ? 'Fechar' : 'Excluir'}
        destructive={!deleteError}
        onConfirm={
          deleteError
            ? () => {
                setPendingDelete(null);
                setDeleteError(null);
              }
            : confirmDelete
        }
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
