import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from './AdminSidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/produtos' }));

describe('AdminSidebar', () => {
  it('highlights active link via aria-current', () => {
    render(<AdminSidebar />);
    const active = screen.getByRole('link', { name: 'Produtos' });
    expect(active).toHaveAttribute('aria-current', 'page');
    const other = screen.getByRole('link', { name: 'Pedidos' });
    expect(other).not.toHaveAttribute('aria-current');
  });
});
