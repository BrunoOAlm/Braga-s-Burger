import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from './SignupForm';
import { ApiError } from '@/lib/api-client';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const signupMock = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ signup: signupMock }),
}));

describe('SignupForm', () => {
  beforeEach(() => {
    signupMock.mockReset();
    push.mockReset();
  });

  it('submit chama signup e redireciona para /', async () => {
    signupMock.mockResolvedValue(undefined);
    render(<SignupForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nome completo/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'j@e.com');
    await user.type(screen.getByLabelText(/telefone/i), '(21) 99999-0000');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => expect(signupMock).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith('/');
  });

  it('409 email-already-taken mostra mensagem', async () => {
    signupMock.mockRejectedValue(
      new ApiError(409, 'email-already-taken', 'T', 'D'),
    );
    render(<SignupForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nome completo/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'dup@e.com');
    await user.type(screen.getByLabelText(/telefone/i), '(21) 99999-0000');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/já está cadastrado/i),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('429 too-many-requests mostra mensagem de rate limit', async () => {
    signupMock.mockRejectedValue(
      new ApiError(429, 'too-many-requests', 'T', 'D'),
    );
    render(<SignupForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nome completo/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.type(screen.getByLabelText(/telefone/i), '(21) 99999-0000');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/muitas tentativas/i),
    );
  });
});
