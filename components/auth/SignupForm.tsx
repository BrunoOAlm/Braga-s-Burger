'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { humanizeAuth } from '@/lib/humanize-auth';

export function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signup({ name, email, phone, password });
      router.push('/');
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-paper">
      <h1 className="font-heading text-2xl font-extrabold">Criar conta</h1>

      <label htmlFor="signup-name" className="flex flex-col gap-1 text-sm">
        Nome completo
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={120}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      <label htmlFor="signup-email" className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
          autoComplete="email"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      <label htmlFor="signup-phone" className="flex flex-col gap-1 text-sm">
        Telefone
        <input
          id="signup-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          minLength={8}
          maxLength={40}
          autoComplete="tel"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      <label htmlFor="signup-password" className="flex flex-col gap-1 text-sm">
        Senha (mín. 8 caracteres)
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      {errorMessage && (
        <p id="signup-error" role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {submitting ? 'Criando...' : 'Criar conta'}
      </button>

      <p className="text-sm text-muted">
        Já tem conta?{' '}
        <a href="/entrar" className="underline">
          Entrar
        </a>
      </p>
    </form>
  );
}
