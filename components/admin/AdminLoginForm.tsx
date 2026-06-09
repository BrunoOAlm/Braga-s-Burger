'use client';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';
import { ApiError } from '@/lib/admin-api';
import { humanizeAuth } from '@/lib/humanize-auth';
import { FormField } from '@/components/ui/FormField';

export function AdminLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const raw = search?.get('next');
      // só aceita paths internos do admin — bloqueia open redirect (ex.: //evil.com, https://evil.com)
      const next = raw && /^\/admin(\/|$)/.test(raw) ? raw : '/admin/pedidos';
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Email ou senha incorretos.');
      } else if (err instanceof ApiError) {
        setError(humanizeAuth(err));
      } else {
        setError('Falha na conexão.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-20 max-w-sm rounded-lg bg-white p-8 shadow">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Acesso admin</h1>
      {error && (
        <div
          className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}
      <FormField label="Email" htmlFor="adm-email" required>
        <input
          id="adm-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
        />
      </FormField>
      <FormField label="Senha" htmlFor="adm-pwd" required>
        <input
          id="adm-pwd"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
        />
      </FormField>
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-full rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {submitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
