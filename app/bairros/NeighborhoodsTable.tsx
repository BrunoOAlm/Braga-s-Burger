'use client';

import { useMemo, useState } from 'react';
import { deliveryAreas } from '@/data/delivery';
import { formatPrice } from '@/lib/format';

export function NeighborhoodsTable() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deliveryAreas;
    return deliveryAreas.filter((a) => a.neighborhood.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <label className="block">
        <span className="text-sm text-muted">Buscar bairro</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Higienópolis, Tijuca..."
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="mt-6 text-muted">Nenhum bairro encontrado.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line">
          {filtered.map((a) => (
            <li key={a.neighborhood} className="flex justify-between py-3 text-sm">
              <span>{a.neighborhood}</span>
              <span className="font-semibold">{formatPrice(a.fee)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
