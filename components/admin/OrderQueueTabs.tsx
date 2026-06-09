'use client';
import { useRouter, useSearchParams } from 'next/navigation';

type Counts = { received: number; preparing: number; out: number };

type Props = { counts: Counts };

const TABS = [
  { key: 'active', label: 'Ativos' },
  { key: 'history', label: 'Histórico' },
] as const;

export function OrderQueueTabs({ counts }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const current = search?.get('scope') === 'history' ? 'history' : 'active';
  const activeTotal = counts.received + counts.preparing + counts.out;

  return (
    <div className="mt-4 flex gap-2 border-b border-neutral-200">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => router.replace(`/admin/pedidos?scope=${t.key}`)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            current === t.key
              ? 'border-red-600 text-red-700'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {t.label}
          {t.key === 'active' && (
            <span className="ml-1 rounded bg-neutral-200 px-1.5 text-xs">{activeTotal}</span>
          )}
        </button>
      ))}
    </div>
  );
}
