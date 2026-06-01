'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import type { ReactNode } from 'react';
import type { User } from '@/lib/types-api';

export function AccountGate({
  children,
}: {
  children: (user: User) => ReactNode;
}) {
  const { state } = useAuth();
  if (state.status === 'loading') {
    return <p className="text-paper">Carregando...</p>;
  }
  if (state.status === 'anonymous') {
    return (
      <div className="text-paper">
        <p>Você precisa estar logado para acessar esta página.</p>
        <p className="mt-2 text-sm text-muted">
          <Link href="/entrar" className="underline">
            Entrar
          </Link>{' '}
          ou{' '}
          <Link href="/cadastro" className="underline">
            criar conta
          </Link>
          .
        </p>
      </div>
    );
  }
  return <>{children(state.user)}</>;
}
