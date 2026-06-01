import { Suspense } from 'react';
import { ResetForm } from '@/components/auth/ResetForm';

export const metadata = { title: "Redefinir senha — Braga's Burger" };

export default function RedefinirSenhaPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Suspense>
        <ResetForm />
      </Suspense>
    </main>
  );
}
