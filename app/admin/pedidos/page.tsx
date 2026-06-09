'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { playNewOrderSound, useOrderQueue } from '@/lib/admin-orders';
import * as adminApi from '@/lib/admin-api';
import { AdminOrder, OrderStatus } from '@/lib/admin-api';
import { OrderQueueTabs } from '@/components/admin/OrderQueueTabs';
import { OrderCard } from '@/components/admin/OrderCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

function countByStatus(orders: AdminOrder[]) {
  let received = 0;
  let preparing = 0;
  let out = 0;
  for (const o of orders) {
    if (o.status === 'RECEIVED') received++;
    else if (o.status === 'PREPARING') preparing++;
    else if (o.status === 'OUT') out++;
  }
  return { received, preparing, out };
}

export default function PedidosPage() {
  const search = useSearchParams();
  const scope = search?.get('scope') === 'history' ? 'history' : 'active';
  const { orders, loading, error, newOrder, clearNewOrder, refetch } = useOrderQueue(
    scope as 'active' | 'history',
  );
  const [pendingCancel, setPendingCancel] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (newOrder) {
      playNewOrderSound();
      clearNewOrder();
    }
  }, [newOrder, clearNewOrder]);

  async function handleTransition(orderId: string, to: OrderStatus, destructive: boolean) {
    if (destructive) {
      setPendingCancel({ id: orderId });
      return;
    }
    await adminApi.updateOrderStatus(orderId, to);
    await refetch();
  }

  async function confirmCancel() {
    if (!pendingCancel) return;
    await adminApi.updateOrderStatus(pendingCancel.id, 'CANCELLED');
    setPendingCancel(null);
    await refetch();
  }

  const counts = countByStatus(orders);

  return (
    <div>
      <AdminPageHeader title="Pedidos" />
      <OrderQueueTabs counts={counts} />

      {error && (
        <div
          className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          Falha ao carregar fila. Tentando novamente em 10s.
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-neutral-200" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-center text-sm text-neutral-500">
          Sem pedidos {scope === 'active' ? 'ativos' : 'no histórico'}.
        </p>
      ) : (
        <div className="mt-6 grid gap-3">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onTransition={(to, dest) => handleTransition(o.id, to, dest)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingCancel}
        title="Cancelar pedido?"
        message="Esta ação não pode ser revertida."
        confirmLabel="Cancelar pedido"
        cancelLabel="Voltar"
        destructive
        onConfirm={confirmCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
}
