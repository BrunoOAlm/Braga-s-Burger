'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function HeaderUserMenu() {
  const { state, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div
        aria-hidden
        className="h-8 w-20 animate-pulse rounded-full bg-surface"
      />
    );
  }

  if (state.status === 'anonymous') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <a
          href="/entrar"
          className="rounded-full px-3 py-1.5 text-paper hover:bg-surface"
        >
          Entrar
        </a>
        <a
          href="/cadastro"
          className="rounded-full bg-white px-3 py-1.5 font-semibold text-ink hover:bg-paper"
        >
          Criar conta
        </a>
      </div>
    );
  }

  const firstName = state.user.name.split(' ')[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="rounded-full px-3 py-1.5 text-sm text-paper hover:bg-surface"
      >
        Olá, {firstName} ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-2xl border border-line bg-ink/95 p-2 backdrop-blur"
        >
          <a
            role="menuitem"
            href="/meus-pedidos"
            className="block rounded-lg px-3 py-2 text-sm text-paper hover:bg-surface"
          >
            Meus pedidos
          </a>
          <a
            role="menuitem"
            href="/perfil"
            className="block rounded-lg px-3 py-2 text-sm text-paper hover:bg-surface"
          >
            Perfil
          </a>
          <button
            role="menuitem"
            onClick={async () => {
              await logout();
              router.push('/');
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-paper hover:bg-surface"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
