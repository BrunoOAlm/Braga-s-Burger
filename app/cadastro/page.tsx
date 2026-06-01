import { SignupForm } from '@/components/auth/SignupForm';

export const metadata = { title: "Criar conta — Braga's Burger" };

export default function CadastroPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <SignupForm />
    </main>
  );
}
