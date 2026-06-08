'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { buildCancelMessage } from '@/lib/order-cancel-message';
import {
  buildContactMessage,
  buildHelpMessage,
} from '@/lib/order-message';
import { estimateClock } from '@/lib/order-time';
import * as api from '@/lib/api-client';
import { storeConfig } from '@/config/store';
import type { OrderResponse, OrderStatus } from '@/lib/types-api';
import type { Address, Customer, DeliveryMethod } from '@/lib/types';

interface Props {
  orderId: string;
  initialEstimatedMinutes: { min: number; max: number };
  method: DeliveryMethod;
  customer: Customer;
  address?: Address;
}

const STEPS = [
  { key: 'received', label: 'Recebido' },
  { key: 'preparing', label: 'Em preparo' },
  { key: 'out', label: 'Saiu' },
  { key: 'delivered', label: 'Entregue' },
] as const;

const STATUS_TO_INDEX: Record<Exclude<OrderStatus, 'CANCELLED'>, number> = {
  RECEIVED: 0,
  PREPARING: 1,
  OUT: 2,
  DELIVERED: 3,
};

const POLL_MS = 10_000;

function openWhatsApp(text: string) {
  const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function OrderStatusScreen({
  orderId,
  initialEstimatedMinutes,
  method,
  customer,
  address,
}: Props) {
  const clear = useCartStore((s) => s.clear);
  const [order, setOrder] = useState<OrderResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const updated = await api.getOrder(orderId);
        if (mounted) setOrder(updated);
      } catch {
        // tick silencioso: próximo tick tenta de novo.
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [orderId]);

  const displayId = order?.displayId ?? orderId;
  const status: OrderStatus = order?.status ?? 'RECEIVED';
  const estimatedMinutes = order?.estimatedMinutes ?? initialEstimatedMinutes;
  const clock = useMemo(
    () => estimateClock(new Date(), estimatedMinutes),
    [estimatedMinutes],
  );

  if (status === 'CANCELLED') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
        <header className="flex items-center justify-between border-b border-line pb-4">
          <Link
            href="/"
            aria-label="Início"
            className="text-paper hover:text-white"
          >
            ←
          </Link>
          <h1 className="text-xs uppercase tracking-widest text-faint">
            Acompanhe seu pedido
          </h1>
          <span aria-hidden="true" className="w-4" />
        </header>

        <section className="mt-10 rounded border border-line bg-surface p-8 text-center">
          <p className="font-heading text-2xl font-extrabold text-paper">
            Pedido cancelado pela loja
          </p>
          <p className="mt-2 text-sm text-faint">
            Entre em contato com a loja se precisar de mais informações.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => openWhatsApp(buildContactMessage(displayId))}
              className="cursor-pointer rounded bg-paper px-4 py-3 font-semibold text-ink hover:bg-white"
            >
              Falar com a loja
            </button>
            <Link
              href="/"
              onClick={() => clear()}
              className="cursor-pointer rounded border border-line px-4 py-3 text-center text-sm hover:border-paper"
            >
              Voltar ao cardápio
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const activeIndex = STATUS_TO_INDEX[status];
  const progressPct = ((activeIndex + 1) / STEPS.length) * 100;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
      <header className="flex items-center justify-between border-b border-line pb-4">
        <Link
          href="/"
          aria-label="Início"
          className="text-paper hover:text-white"
        >
          ←
        </Link>
        <h1 className="text-xs uppercase tracking-widest text-faint">
          Acompanhe seu pedido
        </h1>
        <button
          type="button"
          onClick={() => openWhatsApp(buildHelpMessage(displayId))}
          className="cursor-pointer text-sm text-paper underline-offset-4 hover:underline"
        >
          Ajuda
        </button>
      </header>

      <section
        role="status"
        aria-live="polite"
        aria-label="Previsão de entrega"
        className="mt-6"
      >
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-widest text-faint">
            Previsão de entrega
          </p>
          <p className="text-xs text-faint">Pedido {displayId}</p>
        </div>
        <p className="mt-1 font-heading text-4xl font-extrabold text-paper">
          {clock.start} – {clock.end}
        </p>
        <span className="sr-only">
          Status atual: {STEPS[activeIndex].label}. Previsão de entrega entre {clock.start} e {clock.end}.
        </span>

        <div className="mt-6 h-1 rounded bg-line">
          <div
            className="h-full rounded bg-paper transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <ol className="mt-3 grid grid-cols-4 gap-2 text-center">
          {STEPS.map((step, i) => {
            const active = i === activeIndex;
            return (
              <li
                key={step.key}
                aria-current={active ? 'step' : undefined}
                className="flex flex-col items-center gap-1"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${active ? 'bg-paper' : 'bg-line'}`}
                />
                <span
                  className={`text-[10px] ${active ? 'text-paper' : 'text-faint'}`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-6 flex gap-3">
        <span
          aria-hidden="true"
          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-paper"
        />
        <p className="text-sm text-paper">
          {STEPS[activeIndex].label} —{' '}
          <span className="text-muted">
            {status === 'RECEIVED'
              ? 'aguardando confirmação da loja.'
              : status === 'PREPARING'
                ? 'sua comida já está sendo preparada.'
                : status === 'OUT'
                  ? method === 'delivery'
                    ? 'o entregador está a caminho.'
                    : 'seu pedido está pronto para retirada.'
                  : 'pedido entregue. Obrigado!'}
          </span>
        </p>
      </section>

      <section className="mt-6 rounded border border-line bg-surface p-6">
        <h2 className="text-xs uppercase tracking-widest text-faint">
          Detalhes do pedido
        </h2>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paper text-sm font-bold text-ink">
            BB
          </div>
          <div className="flex-1">
            <p className="font-semibold text-paper">{storeConfig.brandName}</p>
            <p className="text-xs text-faint">N° do pedido {displayId}</p>
          </div>
          <button
            type="button"
            onClick={() => openWhatsApp(buildContactMessage(displayId))}
            className="cursor-pointer text-sm text-paper underline-offset-4 hover:underline"
          >
            Ligar
          </button>
        </div>

        <hr className="my-4 border-line" />

        {method === 'delivery' && address ? (
          <div>
            <p className="text-xs uppercase tracking-widest text-faint">Entrega em</p>
            <p className="mt-1 text-sm text-paper">
              {address.street}, {address.number} — {address.neighborhood}
            </p>
            {address.complement && (
              <p className="text-xs text-muted">Complemento: {address.complement}</p>
            )}
            {address.reference && (
              <p className="text-xs text-muted">Referência: {address.reference}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-widest text-faint">
              Retirada no balcão
            </p>
            <p className="mt-1 text-sm text-paper">{storeConfig.address}</p>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs uppercase tracking-widest text-faint">Cliente</p>
          <p className="mt-1 text-sm text-paper">
            {customer.name} — {customer.phone}
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => openWhatsApp(buildContactMessage(displayId))}
          className="w-full cursor-pointer rounded bg-paper px-4 py-3 font-semibold text-ink transition-colors hover:bg-white"
        >
          Abrir conversa no WhatsApp
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openWhatsApp(buildCancelMessage(displayId))}
            className="cursor-pointer rounded border border-line px-4 py-2 text-sm hover:border-paper"
          >
            Cancelar pedido
          </button>
          <Link
            href="/"
            onClick={() => clear()}
            className="cursor-pointer rounded border border-line px-4 py-2 text-center text-sm hover:border-paper"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </section>
    </main>
  );
}
