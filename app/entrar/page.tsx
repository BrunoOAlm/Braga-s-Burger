import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: "Entrar — Braga's Burger" };

export default function EntrarPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
