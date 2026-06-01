import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { ApiError } from '@/lib/api-client';

const push = vi.fn();
const getMock = vi.fn().mockReturnValue(null);
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: getMock }),
}));

const loginMock = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ login: loginMock }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset();
    push.mockReset();
    getMock.mockReturnValue(null);
  });

  it('redireciona para /meus-pedidos por padrão', async () => {
    loginMock.mockResolvedValue(undefined);
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/meus-pedidos'),
    );
  });

  it('redireciona para ?next= se presente', async () => {
    getMock.mockReturnValue('/perfil');
    loginMock.mockResolvedValue(undefined);
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/perfil'));
  });

  it('401 invalid-credentials mostra mensagem genérica', async () => {
    loginMock.mockRejectedValue(
      new ApiError(401, 'invalid-credentials', 'T', 'D'),
    );
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.type(screen.getByLabelText(/senha/i), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/incorretos/i),
    );
  });
});
