'use client';

type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  'aria-label'?: string;
};

export function Select({ value, onChange, options, placeholder, id, disabled, 'aria-label': ariaLabel }: Props) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none disabled:opacity-50"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
