import { estimateTotalMinutes } from '@/lib/delivery-time';
import { storeConfig } from '@/config/store';
import type { DeliveryMethod } from '@/lib/types';

interface Props {
  method: DeliveryMethod;
  fee?: number;
}

export function rangeFor(minutes: number): { min: number; max: number } {
  return { min: minutes - 5, max: minutes + 5 };
}

export function DeliveryEstimate({ method, fee }: Props) {
  const total = estimateTotalMinutes(method, storeConfig.averagePrepTime, fee);
  const { min, max } = rangeFor(total);
  return (
    <div className="rounded border border-line bg-surface p-3 text-sm">
      <p className="text-paper">
        🕗 Tempo estimado: <strong>{min}–{max} min</strong>
      </p>
      <p className="mt-1 text-xs text-faint">A loja confirma no chat.</p>
    </div>
  );
}
