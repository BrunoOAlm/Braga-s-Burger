import type { DeliveryMethod } from './types';

// Mapeamento por faixa de taxa de entrega → minutos médios.
const FEE_TO_MINUTES: Array<{ fee: number; minutes: number }> = [
  { fee: 4.99, minutes: 10 },
  { fee: 5.99, minutes: 15 },
  { fee: 6.99, minutes: 20 },
  { fee: 7.99, minutes: 25 },
  { fee: 8.99, minutes: 30 },
  { fee: 9.99, minutes: 35 },
  { fee: 10.99, minutes: 40 },
];

/** Faixa de tempo de entrega em minutos, ancorada na taxa mais próxima. */
export function estimateDeliveryMinutes(fee: number): number {
  let best = FEE_TO_MINUTES[0];
  let bestDelta = Math.abs(fee - best.fee);
  for (const row of FEE_TO_MINUTES) {
    const delta = Math.abs(fee - row.fee);
    if (delta < bestDelta) {
      best = row;
      bestDelta = delta;
    }
  }
  return best.minutes;
}

/** Tempo total estimado: preparo + entrega (se delivery), ou só preparo (se pickup). */
export function estimateTotalMinutes(
  method: DeliveryMethod,
  prepTime: number,
  fee?: number,
): number {
  if (method === 'pickup') return prepTime;
  if (fee === undefined) return prepTime;
  return prepTime + estimateDeliveryMinutes(fee);
}
