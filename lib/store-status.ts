import type { OpeningHours } from '@/config/store';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Retorna true se a loja está aberta naquele momento.
 *
 * Convenção de "00:00" como fim do intervalo:
 *   - `['18:00', '00:00']` significa "abre 18h, fecha à meia-noite (inclusive)".
 *   - A meia-noite em si pertence ao dia seguinte; ou seja, 00:00 do sábado já é "fechado"
 *     pela janela de sexta. A função considera o intervalo [abre, fecha) no mesmo dia,
 *     tratando "00:00" como 24:00 do dia da janela.
 */
export function isOpen(now: Date, hours: OpeningHours): boolean {
  const dayKey = DAYS[now.getDay()];
  const window = hours[dayKey];
  if (!window) return false;
  const [open, close] = window;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const openMin = toMinutes(open);
  const closeMin = close === '00:00' ? 24 * 60 : toMinutes(close);
  return minutes >= openMin && minutes < closeMin;
}
