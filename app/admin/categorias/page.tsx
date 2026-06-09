'use client';
import { useMemo, useState } from 'react';
import * as adminApi from '@/lib/admin-api';
import { AdminCategory, ApiError } from '@/lib/admin-api';
import { useAdminCategories, useAdminProducts } from '@/lib/admin-catalog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { CategoriesTable } from '@/components/admin/CategoriesTable';
import { CategoryFormModal } from '@/components/admin/CategoryFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function humanizeApi(err: ApiError): string {
  return err.detail || err.title || 'Erro inesperado.';
}

export default function CategoriasPage() {
  const { items: categories, refetch } = useAdminCategories();
  const { items: products } = useAdminProducts();
  const [formOpen, setFormOpen] = useState<{
    mode: 'create' | 'edit';
    category?: AdminCategory;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of products) m[p.categoryId] = (m[p.categoryId] ?? 0) + 1;
    return m;
  }, [products]);

  async function handleSubmit(c: AdminCategory) {
    if (formOpen?.mode === 'create') await adminApi.createCategory(c);
    else await adminApi.updateCategory(c.id, c);
    await refetch();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await adminApi.deleteCategory(pendingDelete.id);
      await refetch();
      setPendingDelete(null);
      setDeleteError(null);
    } catch (e) {
      if (e instanceof ApiError && e.type === 'category-has-products') {
        setDeleteError(
          `Categoria tem ${counts[pendingDelete.id] ?? 0} produtos. Mova-os ou exclua-os primeiro.`,
        );
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
        title="Categorias"
        action={
          <button
            onClick={() => setFormOpen({ mode: 'create' })}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Nova categoria
          </button>
        }
      />
      <CategoriesTable
        categories={categories}
        productsByCategory={counts}
        onEdit={(c) => setFormOpen({ mode: 'edit', category: c })}
        onDelete={(c) => {
          setDeleteError(null);
          setPendingDelete(c);
        }}
      />

      {formOpen && (
        <CategoryFormModal
          open
          mode={formOpen.mode}
          category={formOpen.category}
          onClose={() => setFormOpen(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir categoria?"
        message={deleteError ?? `Categoria: ${pendingDelete?.name ?? ''}.`}
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
