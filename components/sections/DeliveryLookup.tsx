'use client';

import { useMemo, useState } from 'react';
import { deliveryAreas } from '@/data/delivery';
import { formatPrice } from '@/lib/format';

export function DeliveryLookup() {
  const [selected, setSelected] = useState('');

  const sorted = useMemo(
    () =>
      [...deliveryAreas].sort((a, b) =>
        a.neighborhood.localeCompare(b.neighborhood, 'pt-BR'),
      ),
    [],
  );
  const area = deliveryAreas.find((a) => a.neighborhood === selected);

  return (
    <div>
      <label htmlFor="bairro-entrega" className="block text-sm text-muted">
        Consulte a taxa do seu bairro
      </label>
      <select
        id="bairro-entrega"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-paper"
      >
        <option value="">Selecione um bairro…</option>
        {sorted.map((a) => (
          <option key={a.neighborhood} value={a.neighborhood}>
            {a.neighborhood}
          </option>
        ))}
      </select>
      {area && (
        <p className="mt-3 text-sm text-paper" role="status">
          Taxa para <strong>{area.neighborhood}</strong>:{' '}
          <strong>{formatPrice(area.fee)}</strong>
        </p>
      )}
    </div>
  );
}
