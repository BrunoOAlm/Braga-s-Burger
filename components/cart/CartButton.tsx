'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cart-store';

interface Props {
  onOpen: () => void;
}

export function CartButton({ onOpen }: Props) {
  const totalItems = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0),
  );

  // Some o FAB enquanto o rodapé está à vista: no canto inferior direito ele
  // cobriria os links (Termos/Política), sobretudo em telas estreitas/mobile.
  const [footerVisible, setFooterVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const footer = document.querySelector('footer');
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  if (totalItems === 0) return null;

  return (
    <button
      type="button"
      aria-label={`Abrir carrinho com ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
      onClick={onOpen}
      aria-hidden={footerVisible}
      className={`fixed bottom-6 right-6 z-40 flex h-14 items-center gap-3 rounded-full bg-paper px-5 text-ink shadow-lg transition-all duration-300 hover:bg-white ${
        footerVisible ? 'pointer-events-none translate-y-4 opacity-0' : ''
      }`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span className="font-semibold">Carrinho</span>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-2 text-xs font-bold text-paper">
        {totalItems}
      </span>
    </button>
  );
}
