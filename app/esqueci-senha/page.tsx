import { ForgotForm } from '@/components/auth/ForgotForm';

export const metadata = { title: "Esqueci a senha — Braga's Burger" };

export default function EsqueciSenhaPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <ForgotForm />
    </main>
  );
}
