'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { buildCancelMessage } from '@/lib/order-cancel-message';
import {
  buildContactMessage,
  buildHelpMessage,
} from '@/lib/order-message';
import { estimateClock } from '@/lib/order-time';
import { storeConfig } from '@/config/store';
import type { Address, Customer, DeliveryMethod } from '@/lib/types';

interface Props {
  orderId: string;
  estimatedMinutes: { min: number; max: number };
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

const ACTIVE_INDEX = 0;

function openWhatsApp(text: string) {
  const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function OrderStatusScreen({
  orderId,
  estimatedMinutes,
  method,
  customer,
  address,
}: Props) {
  const clear = useCartStore((s) => s.clear);
  const clock = useMemo(
    () => estimateClock(new Date(), estimatedMinutes),
    [estimatedMinutes],
  );
  const progressPct = ((ACTIVE_INDEX + 1) / STEPS.length) * 100;

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
          onClick={() => openWhatsApp(buildHelpMessage(orderId))}
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
          <p className="text-xs text-faint">Pedido {orderId}</p>
        </div>
        <p className="mt-1 font-heading text-4xl font-extrabold text-paper">
          {clock.start} – {clock.end}
        </p>
        <span className="sr-only">
          Pedido recebido. Previsão de entrega entre {clock.start} e {clock.end}.
        </span>

        <div className="mt-6 h-1 rounded bg-line">
          <div
            className="h-full rounded bg-paper transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <ol className="mt-3 grid grid-cols-4 gap-2 text-center">
          {STEPS.map((step, i) => {
            const active = i === ACTIVE_INDEX;
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
          Pedido recebido —{' '}
          <span className="text-muted">
            aguardando confirmação da loja no WhatsApp.
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
            <p className="text-xs text-faint">N° do pedido {orderId}</p>
          </div>
          <button
            type="button"
            onClick={() => openWhatsApp(buildContactMessage(orderId))}
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
          onClick={() => openWhatsApp(buildContactMessage(orderId))}
          className="w-full cursor-pointer rounded bg-paper px-4 py-3 font-semibold text-ink transition-colors hover:bg-white"
        >
          Abrir conversa no WhatsApp
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openWhatsApp(buildCancelMessage(orderId))}
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
