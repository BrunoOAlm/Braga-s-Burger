import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetForm } from './ResetForm';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';

const push = vi.fn();
const getMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: getMock }),
}));

const refresh = vi.fn();
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ refresh }) }));

describe('ResetForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
  });

  it('sem token mostra erro', () => {
    getMock.mockReturnValue(null);
    render(<ResetForm />);
    expect(screen.getByText(/link inválido/i)).toBeInTheDocument();
  });

  it('senhas diferentes mostra erro client', async () => {
    getMock.mockReturnValue('tok-123');
    render(<ResetForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^nova senha/i), 'senha12345');
    await user.type(screen.getByLabelText(/confirmar senha/i), 'diferente9');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/não conferem/i),
    );
  });

  it('reset-token-invalid mostra mensagem', async () => {
    getMock.mockReturnValue('tok-123');
    vi.spyOn(api, 'resetPassword').mockRejectedValue(
      new ApiError(401, 'reset-token-invalid', 'T', 'D'),
    );
    render(<ResetForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^nova senha/i), 'senha12345');
    await user.type(screen.getByLabelText(/confirmar senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /inválido ou expirado/i,
      ),
    );
  });
});
