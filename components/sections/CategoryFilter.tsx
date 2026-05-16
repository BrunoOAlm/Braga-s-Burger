'use client';

import type { Category } from '@/lib/types';

type CategoryFilterProps = {
  categories: Category[];
  active: string | null;
  onChange: (categoryId: string | null) => void;
};

export function CategoryFilter({ categories, active, onChange }: CategoryFilterProps) {
  const sorted = [...categories].sort((a, b) => a.order - b.order);

  const tabClass = (isActive: boolean) =>
    `cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
      isActive
        ? 'bg-brand-orange text-white'
        : 'bg-white text-brand-dark/70 hover:text-brand-orange'
    }`;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <button type="button" className={tabClass(active === null)} onClick={() => onChange(null)}>
        Todos
      </button>
      {sorted.map((category) => (
        <button
          key={category.id}
          type="button"
          className={tabClass(active === category.id)}
          onClick={() => onChange(category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
