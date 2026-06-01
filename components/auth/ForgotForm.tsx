'use client';

import { useState, type FormEvent } from 'react';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { humanizeAuth } from '@/lib/humanize-auth';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await api.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p className="text-paper">
        Se este e-mail estiver cadastrado, enviamos um link de redefinição.
        Confira sua caixa de entrada (e o spam).
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-paper">
      <h1 className="font-heading text-2xl font-extrabold">
        Esqueci minha senha
      </h1>

      <label htmlFor="forgot-email" className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
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
        {submitting ? 'Enviando...' : 'Enviar link'}
      </button>
    </form>
  );
}
