import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotForm } from './ForgotForm';
import * as api from '@/lib/api-client';

describe('ForgotForm', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('submit chama forgotPassword e mostra mensagem genérica', async () => {
    vi.spyOn(api, 'forgotPassword').mockResolvedValue();
    render(<ForgotForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.c');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/se este e-mail estiver cadastrado/i),
      ).toBeInTheDocument(),
    );
    expect(api.forgotPassword).toHaveBeenCalledWith({ email: 'a@b.c' });
  });
});
