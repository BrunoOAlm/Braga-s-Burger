import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CuponsPage from './page';
import * as adminApi from '@/lib/admin-api';

vi.mock('@/lib/admin-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/admin-api')>()),
}));

describe('CuponsPage', () => {
  it('renders coupons list', async () => {
    vi.spyOn(adminApi, 'listCoupons').mockResolvedValue([
      { code: 'OFF10', type: 'percent', value: 10, active: true },
    ]);
    render(<CuponsPage />);
    await waitFor(() => expect(screen.getByText('OFF10')).toBeInTheDocument());
  });
});
