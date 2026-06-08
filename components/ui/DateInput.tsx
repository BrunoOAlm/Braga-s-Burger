'use client';

type Props = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
};

export function DateInput({ id, value, onChange, min, max, disabled }: Props) {
  return (
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      disabled={disabled}
      className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none disabled:opacity-50"
    />
  );
}
