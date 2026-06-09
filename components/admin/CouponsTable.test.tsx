import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CouponsTable } from './CouponsTable';

describe('CouponsTable', () => {
  it('renders coupons with formatted value', () => {
    render(
      <CouponsTable
        coupons={[{ code: 'OFF10', type: 'percent', value: 10, active: true }]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleActive={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.getByText('OFF10')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });
});
