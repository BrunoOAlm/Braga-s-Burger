'use client';

import type { Category } from '@/lib/types';

type CategoryFilterProps = {
  categories: Category[];
  active: string | null;
  onChange: (categoryId: string | null) => void;
};

export function CategoryFilter({ categories, active, onChange }: CategoryFilterProps) {
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  const options: { id: string | null; name: string }[] = [
    { id: null, name: 'Todos' },
    ...sorted.map((c) => ({ id: c.id, name: c.name })),
  ];

  const tabClass = (isActive: boolean) =>
    `cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
      isActive
        ? 'border-paper bg-paper text-ink'
        : 'border-line bg-surface text-muted hover:text-paper'
    }`;

  return (
    <div
      role="radiogroup"
      aria-label="Categorias do cardápio"
      className="flex flex-wrap justify-center gap-3"
    >
      {options.map((option) => {
        const isActive = active === option.id;
        return (
          <button
            key={option.id ?? 'todos'}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={tabClass(isActive)}
            onClick={() => onChange(option.id)}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
