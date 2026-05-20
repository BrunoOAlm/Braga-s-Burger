'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import { buildCancelMessage } from '@/lib/order-cancel-message';
import { storeConfig } from '@/config/store';

interface Props {
  orderId: string;
  estimatedMinutes: { min: number; max: number };
}

export function OrderStatusScreen({ orderId, estimatedMinutes }: Props) {
  const clear = useCartStore((s) => s.clear);

  const cancelOrder = () => {
    const msg = buildCancelMessage(orderId);
    const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-paper">
      <div className="rounded border border-line bg-surface p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-faint">Pedido</p>
        <h1 className="font-heading text-4xl font-extrabold">{orderId}</h1>

        <p className="mt-6 text-paper">✅ Pedido enviado pelo WhatsApp.</p>
        <p className="mt-2 text-sm text-muted">
          Aguardando confirmação da loja. Você vai receber uma mensagem no chat.
        </p>

        <p className="mt-6 rounded border border-line bg-ink p-3 text-sm">
          🕗 Tempo estimado:{' '}
          <strong>
            {estimatedMinutes.min}–{estimatedMinutes.max} min
          </strong>
          <span className="ml-2 text-xs text-faint">A loja confirma no chat.</span>
        </p>

        <button
          type="button"
          onClick={cancelOrder}
          className="mt-6 cursor-pointer rounded border border-line px-6 py-2 text-sm hover:border-paper"
        >
          Cancelar pedido
        </button>

        <div className="mt-6 border-t border-line pt-6">
          <Link
            href="/"
            onClick={() => clear()}
            className="block w-full rounded bg-paper px-4 py-3 font-semibold text-ink transition-colors hover:bg-white"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    </main>
  );
}
