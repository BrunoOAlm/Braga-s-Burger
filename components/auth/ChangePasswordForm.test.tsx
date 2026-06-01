import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordForm } from './ChangePasswordForm';
import * as api from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';

describe('ChangePasswordForm', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('senha atual errada mostra mensagem específica', async () => {
    vi.spyOn(api, 'changePassword').mockRejectedValue(
      new ApiError(401, 'invalid-credentials', 'T', 'D'),
    );
    render(<ChangePasswordForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/senha atual/i), 'errada00');
    await user.type(screen.getByLabelText(/^nova senha/i), 'senha12345');
    await user.type(
      screen.getByLabelText(/confirmar nova senha/i),
      'senha12345',
    );
    await user.click(screen.getByRole('button', { name: /trocar senha/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /senha atual incorreta/i,
      ),
    );
  });

  it('sucesso mostra confirmação', async () => {
    vi.spyOn(api, 'changePassword').mockResolvedValue();
    render(<ChangePasswordForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/senha atual/i), 'senha12345');
    await user.type(screen.getByLabelText(/^nova senha/i), 'nova-senha-456');
    await user.type(
      screen.getByLabelText(/confirmar nova senha/i),
      'nova-senha-456',
    );
    await user.click(screen.getByRole('button', { name: /trocar senha/i }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /alterada com sucesso/i,
      ),
    );
  });
});
