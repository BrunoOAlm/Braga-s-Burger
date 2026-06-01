'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as api from '@/lib/api-client';
import type { OrderSummary } from '@/lib/types-api';

const LIMIT = 20;

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Em preparo',
  OUT: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function MyOrdersList() {
  const [items, setItems] = useState<OrderSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .listMyOrders(LIMIT, offset)
      .then((page) => {
        if (cancelled) return;
        setItems((prev) =>
          offset === 0 ? page.items : [...(prev ?? []), ...page.items],
        );
        setTotal(page.total);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offset]);

  if (items === null) return <p className="text-paper">Carregando...</p>;

  if (items.length === 0) {
    return (
      <div className="text-paper">
        <h2 className="font-heading text-xl font-bold">
          Você ainda não fez pedidos com sua conta
        </h2>
        <p className="mt-2 text-sm text-muted">
          <Link href="/#cardapio" className="underline">
            Faça seu primeiro pedido
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-paper">
      <h1 className="font-heading text-2xl font-extrabold">Meus pedidos</h1>
      <ul className="flex flex-col gap-2">
        {items.map((o) => (
          <li key={o.id}>
            <Link
              href={`/checkout?orderId=${o.id}`}
              className="block rounded-2xl border border-line bg-surface p-4 hover:border-paper"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{o.displayId}</span>
                <span className="text-sm text-muted">
                  {formatDate(o.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span>{STATUS_LABEL[o.status] ?? o.status}</span>
                <span className="font-semibold">{formatBRL(o.total)}</span>
              </div>
              <div className="mt-1 text-xs text-muted">
                {o.itemsCount} {o.itemsCount === 1 ? 'item' : 'itens'}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {items.length < total && (
        <button
          onClick={() => setOffset(items.length)}
          disabled={loading}
          className="rounded-full border border-line px-6 py-2 text-sm hover:bg-surface disabled:opacity-60"
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  );
}
