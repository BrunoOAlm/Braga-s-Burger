'use client';

import { useState, type FormEvent } from 'react';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { humanizeAuth } from '@/lib/humanize-auth';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccess(false);
    if (newPassword !== confirm) {
      setErrorMessage('As novas senhas não conferem.');
      return;
    }
    setSubmitting(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      if (err instanceof ApiError && err.type === 'invalid-credentials') {
        setErrorMessage('Senha atual incorreta.');
      } else {
        setErrorMessage(
          err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-paper">
      <h2 className="font-heading text-xl font-bold">Trocar senha</h2>

      <label htmlFor="cp-current" className="flex flex-col gap-1 text-sm">
        Senha atual
        <input
          id="cp-current"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      <label htmlFor="cp-new" className="flex flex-col gap-1 text-sm">
        Nova senha (mín. 8)
        <input
          id="cp-new"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      <label htmlFor="cp-confirm" className="flex flex-col gap-1 text-sm">
        Confirmar nova senha
        <input
          id="cp-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-green-400">
          Senha alterada com sucesso.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {submitting ? 'Trocando...' : 'Trocar senha'}
      </button>
    </form>
  );
}
