'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { humanizeAuth } from '@/lib/humanize-auth';

export function ResetForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { refresh } = useAuth();
  const token = sp.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="text-paper">
        <h1 className="font-heading text-2xl font-extrabold">Link inválido</h1>
        <p className="mt-2 text-sm text-muted">
          O link de redefinição está incompleto.{' '}
          <a className="underline" href="/esqueci-senha">
            Peça um novo
          </a>
          .
        </p>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (newPassword !== confirm) {
      setErrorMessage('As senhas não conferem.');
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword({ token, newPassword });
      await refresh();
      router.push('/meus-pedidos');
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
      <h1 className="font-heading text-2xl font-extrabold">Redefinir senha</h1>

      <label htmlFor="reset-new" className="flex flex-col gap-1 text-sm">
        Nova senha (mín. 8)
        <input
          id="reset-new"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          maxLength={100}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      <label htmlFor="reset-confirm" className="flex flex-col gap-1 text-sm">
        Confirmar senha
        <input
          id="reset-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          maxLength={100}
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
        {submitting ? 'Redefinindo...' : 'Redefinir senha'}
      </button>
    </form>
  );
}
