'use client';

import { useState, type FormEvent } from 'react';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { humanizeAuth } from '@/lib/humanize-auth';
import type { User } from '@/lib/types-api';

export function ProfileForm({ initialUser }: { initialUser: User }) {
  const { refresh } = useAuth();
  const [name, setName] = useState(initialUser.name);
  const [phone, setPhone] = useState(initialUser.phone);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await api.updateMe({ name, phone });
      await refresh();
      setSuccess(true);
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
      <h2 className="font-heading text-xl font-bold">Meus dados</h2>

      <label htmlFor="prof-email" className="flex flex-col gap-1 text-sm">
        E-mail (não editável)
        <input
          id="prof-email"
          type="email"
          value={initialUser.email}
          readOnly
          disabled
          className="rounded-lg border border-line bg-surface px-3 py-2 text-muted"
        />
      </label>

      <label htmlFor="prof-name" className="flex flex-col gap-1 text-sm">
        Nome
        <input
          id="prof-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={120}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-paper"
        />
      </label>

      <label htmlFor="prof-phone" className="flex flex-col gap-1 text-sm">
        Telefone
        <input
          id="prof-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          minLength={8}
          maxLength={40}
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
          Dados atualizados.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {submitting ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
