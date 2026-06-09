import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminHeader } from './AdminHeader';

const logoutMock = vi.fn().mockResolvedValue(undefined);
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/lib/admin-auth', () => ({
  useAdminAuth: () => ({ admin: { email: 'a@b' }, logout: logoutMock }),
}));

describe('AdminHeader', () => {
  it('logs out and redirects', async () => {
    render(<AdminHeader />);
    fireEvent.click(screen.getByText('Sair'));
    await waitFor(() => expect(logoutMock).toHaveBeenCalled());
    expect(replaceMock).toHaveBeenCalledWith('/admin/entrar');
  });

  it('persists sound preference in localStorage', () => {
    render(<AdminHeader />);
    fireEvent.click(screen.getByRole('switch'));
    expect(localStorage.getItem('admin-sound-enabled')).toBe('false');
  });
});
