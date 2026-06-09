import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminLoginForm } from './AdminLoginForm';
import { ApiError } from '@/lib/admin-api';

const loginMock = vi.fn();
const replaceMock = vi.fn();
const searchMock = { get: vi.fn().mockReturnValue(null) };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchMock,
}));
vi.mock('@/lib/admin-auth', () => ({ useAdminAuth: () => ({ login: loginMock }) }));

describe('AdminLoginForm', () => {
  it('submits and redirects to default on success', async () => {
    loginMock.mockResolvedValueOnce(undefined);
    searchMock.get.mockReturnValue(null);
    render(<AdminLoginForm />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'a@b' } });
    fireEvent.change(screen.getByLabelText(/Senha/), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('a@b', 'pwd'));
    expect(replaceMock).toHaveBeenCalledWith('/admin/pedidos');
  });

  it('shows generic error on 401', async () => {
    loginMock.mockRejectedValueOnce(new ApiError(401, 'invalid-credentials', 'X', 'd'));
    render(<AdminLoginForm />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'a@b' } });
    fireEvent.change(screen.getByLabelText(/Senha/), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email ou senha incorretos.'));
  });

  it('respects next param', async () => {
    searchMock.get.mockReturnValue('/admin/produtos');
    loginMock.mockResolvedValueOnce(undefined);
    render(<AdminLoginForm />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'a@b' } });
    fireEvent.change(screen.getByLabelText(/Senha/), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/admin/produtos'));
  });
});
