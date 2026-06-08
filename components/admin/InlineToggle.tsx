'use client';
import { useState } from 'react';
import { Switch } from '@/components/ui/Switch';

type Props = {
  initial: boolean;
  onToggle: (next: boolean) => Promise<unknown>;
  label: string;
};

export function InlineToggle({ initial, onToggle, label }: Props) {
  const [checked, setChecked] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handle(next: boolean) {
    setBusy(true);
    setError(false);
    setChecked(next);
    try {
      await onToggle(next);
    } catch {
      setChecked(!next);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Switch checked={checked} onChange={handle} aria-label={label} disabled={busy} />
      {error && <span className="text-xs text-red-600" role="alert">Falhou</span>}
    </span>
  );
}
