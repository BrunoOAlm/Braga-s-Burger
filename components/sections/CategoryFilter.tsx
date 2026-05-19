'use client';

import { useRef, type KeyboardEvent } from 'react';
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

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabClass = (isActive: boolean) =>
    `cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
      isActive
        ? 'border-paper bg-paper text-ink'
        : 'border-line bg-surface text-muted hover:text-paper'
    }`;

  // Padrão ARIA radiogroup: as setas movem seleção e foco juntos, com volta
  // no fim/início. Só a opção ativa fica na ordem de Tab (roving tabindex).
  const handleKeyDown = (event: KeyboardEvent) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const current = options.findIndex((o) => o.id === active);
    const next = (current + step + options.length) % options.length;
    onChange(options[next].id);
    buttonRefs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Categorias do cardápio"
      className="flex flex-wrap justify-center gap-3"
      onKeyDown={handleKeyDown}
    >
      {options.map((option, index) => {
        const isActive = active === option.id;
        return (
          <button
            key={option.id ?? 'todos'}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
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
