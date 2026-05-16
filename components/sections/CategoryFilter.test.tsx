import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilter } from './CategoryFilter';
import type { Category } from '@/lib/types';

const categories: Category[] = [
  { id: 'classicos', name: 'Clássicos', order: 1 },
  { id: 'combos', name: 'Combos', order: 2 },
];

describe('CategoryFilter', () => {
  it('renderiza "Todos" mais cada categoria', () => {
    render(<CategoryFilter categories={categories} active={null} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clássicos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Combos' })).toBeInTheDocument();
  });

  it('chama onChange com o id da categoria clicada', async () => {
    const onChange = vi.fn();
    render(<CategoryFilter categories={categories} active={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Combos' }));
    expect(onChange).toHaveBeenCalledWith('combos');
  });
});
