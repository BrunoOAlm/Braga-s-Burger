import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilter } from './CategoryFilter';
import type { Category } from '@/lib/types';

const categories: Category[] = [
  { id: 'burgers', name: 'Burgers', order: 1, layout: 'grid' },
  { id: 'bebidas', name: 'Bebidas', order: 2, layout: 'list' },
];

describe('CategoryFilter', () => {
  it('é um radiogroup com "Todos" mais cada categoria', () => {
    render(<CategoryFilter categories={categories} active={null} onChange={() => {}} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Burgers' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bebidas' })).toBeInTheDocument();
  });

  it('marca aria-checked na opção ativa', () => {
    render(<CategoryFilter categories={categories} active="burgers" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Burgers' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Todos' })).toHaveAttribute('aria-checked', 'false');
  });

  it('chama onChange com o id da categoria clicada', async () => {
    const onChange = vi.fn();
    render(<CategoryFilter categories={categories} active={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Bebidas' }));
    expect(onChange).toHaveBeenCalledWith('bebidas');
  });

  it('chama onChange com null ao clicar em "Todos"', async () => {
    const onChange = vi.fn();
    render(<CategoryFilter categories={categories} active="burgers" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Todos' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
