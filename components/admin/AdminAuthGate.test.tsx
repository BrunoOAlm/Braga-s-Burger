import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminAuthGate } from './AdminAuthGate';

const replaceMock = vi.fn();
let mockAuth: { admin: unknown; loading: boolean } = { admin: null, loading: true };
let mockPath = '/admin/pedidos';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => mockPath,
}));
vi.mock('@/lib/admin-auth', () => ({ useAdminAuth: () => mockAuth }));

describe('AdminAuthGate', () => {
  it('shows loading state', () => {
    mockAuth = { admin: null, loading: true };
    mockPath = '/admin/pedidos';
    render(<AdminAuthGate><span>inside</span></AdminAuthGate>);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('redirects to entrar?next=path when unauthenticated', async () => {
    mockAuth = { admin: null, loading: false };
    mockPath = '/admin/pedidos';
    render(<AdminAuthGate><span>inside</span></AdminAuthGate>);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith(
      '/admin/entrar?next=%2Fadmin%2Fpedidos',
    ));
  });

  it('renders children when authenticated', () => {
    mockAuth = { admin: { id: 'adm_1' }, loading: false };
    mockPath = '/admin/pedidos';
    render(<AdminAuthGate><span>inside</span></AdminAuthGate>);
    expect(screen.getByText('inside')).toBeInTheDocument();
  });

  it('renders children without redirect on /admin/entrar', () => {
    mockAuth = { admin: null, loading: false };
    mockPath = '/admin/entrar';
    replaceMock.mockClear();
    render(<AdminAuthGate><span>login-form</span></AdminAuthGate>);
    expect(screen.getByText('login-form')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
