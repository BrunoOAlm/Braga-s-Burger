'use client';
import { useState } from 'react';
import * as adminApi from '@/lib/admin-api';
import { AdminCoupon } from '@/lib/admin-api';
import { useAdminCoupons } from '@/lib/admin-catalog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { CouponsTable } from '@/components/admin/CouponsTable';
import { CouponFormModal } from '@/components/admin/CouponFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function CuponsPage() {
  const { items: coupons, refetch } = useAdminCoupons();
  const [formOpen, setFormOpen] = useState<{
    mode: 'create' | 'edit';
    coupon?: AdminCoupon;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCoupon | null>(null);

  async function handleSubmit(c: AdminCoupon) {
    if (formOpen?.mode === 'create') await adminApi.createCoupon(c);
    else await adminApi.updateCoupon(c.code, c);
    await refetch();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await adminApi.deleteCoupon(pendingDelete.code);
    await refetch();
    setPendingDelete(null);
  }

  return (
    <div>
      <AdminPageHeader
        title="Cupons"
        action={
          <button
            onClick={() => setFormOpen({ mode: 'create' })}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Novo cupom
          </button>
        }
      />
      <CouponsTable
        coupons={coupons}
        onEdit={(c) => setFormOpen({ mode: 'edit', coupon: c })}
        onDelete={(c) => setPendingDelete(c)}
        onToggleActive={async (c, next) => {
          await adminApi.updateCoupon(c.code, { active: next });
          await refetch();
        }}
      />

      {formOpen && (
        <CouponFormModal
          open
          mode={formOpen.mode}
          coupon={formOpen.coupon}
          onClose={() => setFormOpen(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir cupom?"
        message={`Cupom: ${pendingDelete?.code ?? ''}.`}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
