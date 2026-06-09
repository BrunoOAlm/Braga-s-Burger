'use client';
import { AdminOrder, OrderStatus } from '@/lib/admin-api';

type Transition = { label: string; to: OrderStatus; destructive?: boolean };

const NEXT: Record<OrderStatus, Transition[]> = {
  RECEIVED: [
    { label: 'Aceitar', to: 'PREPARING' },
    { label: 'Cancelar', to: 'CANCELLED', destructive: true },
  ],
  PREPARING: [
    { label: 'Saiu p/ entrega', to: 'OUT' },
    { label: 'Cancelar', to: 'CANCELLED', destructive: true },
  ],
  OUT: [
    { label: 'Confirmar entrega', to: 'DELIVERED' },
    { label: 'Cancelar', to: 'CANCELLED', destructive: true },
  ],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  RECEIVED: 'bg-yellow-100 text-yellow-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  OUT: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-neutral-200 text-neutral-700',
};

type Props = {
  order: AdminOrder;
  onTransition: (to: OrderStatus, destructive: boolean) => void;
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function OrderCard({ order, onTransition }: Props) {
  return (
    <article className="rounded-lg bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between">
        <div>
          <div className="text-sm text-neutral-500">{fmtTime(order.createdAt)}</div>
          <div className="text-lg font-semibold">#{order.displayId}</div>
          <div className="text-sm text-neutral-700">
            {order.customerName} · {order.customerPhone}
          </div>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_BADGE[order.status]}`}>
          {order.status}
        </span>
      </header>
      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((it) => (
          <li key={it.productId}>
            {it.quantity}× {it.productName}
            {it.notes && <span className="text-neutral-500"> — {it.notes}</span>}
          </li>
        ))}
      </ul>
      <footer className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
        <span className="font-semibold">{fmtBRL(order.totals.total)}</span>
        <div className="flex gap-2">
          {NEXT[order.status].map((t) => (
            <button
              key={t.to}
              type="button"
              onClick={() => onTransition(t.to, !!t.destructive)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                t.destructive
                  ? 'border border-red-300 text-red-700 hover:bg-red-50'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </footer>
    </article>
  );
}
