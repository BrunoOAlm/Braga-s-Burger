'use client';

import { Suspense } from 'react';
import { MyOrdersList } from '@/components/account/MyOrdersList';
import { AccountGate } from '@/components/account/AccountGate';

export default function MeusPedidosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <AccountGate>
        {() => (
          <Suspense>
            <MyOrdersList />
          </Suspense>
        )}
      </AccountGate>
    </main>
  );
}
