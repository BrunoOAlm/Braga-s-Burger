import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeaderUserMenu } from './HeaderUserMenu';
import type { AuthState } from '@/lib/auth-context';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

let mockState: AuthState = { status: 'anonymous' };
const logout = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ state: mockState, logout }),
}));

describe('HeaderUserMenu', () => {
  beforeEach(() => {
    logout.mockReset();
    push.mockReset();
  });

  it('anonymous mostra Entrar/Criar conta', () => {
    mockState = { status: 'anonymous' };
    render(<HeaderUserMenu />);
    expect(screen.getByText(/entrar/i)).toBeInTheDocument();
    expect(screen.getByText(/criar conta/i)).toBeInTheDocument();
  });

  it('authenticated mostra "Olá, [primeiroNome]" e abre menu', async () => {
    mockState = {
      status: 'authenticated',
      user: {
        id: 'usr_1',
        email: 'a@b.c',
        name: 'João Silva',
        phone: 'p',
        createdAt: '2026-01-01',
      },
    };
    render(<HeaderUserMenu />);
    expect(screen.getByText(/olá, joão/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /olá/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /meus pedidos/i }),
    ).toBeInTheDocument();
  });

  it('logout chama api e redireciona para /', async () => {
    mockState = {
      status: 'authenticated',
      user: {
        id: 'usr_1',
        email: 'a@b.c',
        name: 'João',
        phone: 'p',
        createdAt: '2026-01-01',
      },
    };
    logout.mockResolvedValue(undefined);
    render(<HeaderUserMenu />);
    await userEvent.click(screen.getByRole('button', { name: /olá/i }));
    await userEvent.click(
      screen.getByRole('menuitem', { name: /sair/i }),
    );
    await waitFor(() => expect(logout).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });
});
