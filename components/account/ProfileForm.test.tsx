import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileForm } from './ProfileForm';
import * as api from '@/lib/api-client';

const refresh = vi.fn();
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ refresh }) }));

const baseUser = {
  id: 'usr_1',
  email: 'a@b.c',
  name: 'A',
  phone: '(21) 99999-0000',
  createdAt: '2026-01-01',
};

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refresh.mockReset();
  });

  it('email é read-only', () => {
    render(<ProfileForm initialUser={baseUser} />);
    expect(screen.getByLabelText(/e-mail/i)).toBeDisabled();
  });

  it('submit chama updateMe e refresh', async () => {
    vi.spyOn(api, 'updateMe').mockResolvedValue(baseUser);
    render(<ProfileForm initialUser={baseUser} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/^nome/i));
    await user.type(screen.getByLabelText(/^nome/i), 'Novo Nome');
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() =>
      expect(api.updateMe).toHaveBeenCalledWith({
        name: 'Novo Nome',
        phone: '(21) 99999-0000',
      }),
    );
    expect(refresh).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/atualizados/i),
    );
  });
});
