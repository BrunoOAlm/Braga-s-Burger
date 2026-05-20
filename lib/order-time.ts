function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

function formatHHMM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Janela de hora ("18:30"–"18:50") prevista a partir de `now` e uma faixa de minutos. */
export function estimateClock(
  now: Date,
  minutes: { min: number; max: number },
): { start: string; end: string } {
  return {
    start: formatHHMM(addMinutes(now, minutes.min)),
    end: formatHHMM(addMinutes(now, minutes.max)),
  };
}
