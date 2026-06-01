'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { humanizeAuth } from '@/lib/humanize-auth';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      router.push(sp.get('next') ?? '/meus-pedidos');
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
      <h1 className="font-heading text-2xl font-extrabold">Entrar</h1>

      <label htmlFor="login-email" className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      <label htmlFor="login-password" className="flex flex-col gap-1 text-sm">
        Senha
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>

      <div className="flex justify-between text-sm text-muted">
        <a href="/esqueci-senha" className="underline">
          Esqueci minha senha
        </a>
        <a href="/cadastro" className="underline">
          Criar conta
        </a>
      </div>
    </form>
  );
}
