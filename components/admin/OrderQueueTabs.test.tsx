import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderQueueTabs } from './OrderQueueTabs';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({ get: () => 'active' }),
}));

describe('OrderQueueTabs', () => {
  it('shows active total count', () => {
    render(<OrderQueueTabs counts={{ received: 2, preparing: 1, out: 1 }} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('navigates on tab click', () => {
    render(<OrderQueueTabs counts={{ received: 0, preparing: 0, out: 0 }} />);
    fireEvent.click(screen.getByText('Histórico'));
    expect(replaceMock).toHaveBeenCalledWith('/admin/pedidos?scope=history');
  });
});
