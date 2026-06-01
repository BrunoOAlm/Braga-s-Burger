import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-context';
import * as api from './api-client';
import { ApiError } from './api-client';

vi.mock('./api-client', async (orig) => ({
  ...(await orig<typeof import('./api-client')>()),
}));

function Probe() {
  const { state } = useAuth();
  return (
    <div>
      state:{state.status}
      {state.status === 'authenticated' ? `:${state.user.email}` : ''}
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('getMe 200 → authenticated', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({
      id: 'usr_1',
      email: 'a@b.c',
      name: 'A',
      phone: 'p',
      createdAt: '2026-01-01',
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByText('state:authenticated:a@b.c'),
      ).toBeInTheDocument(),
    );
  });

  it('getMe 401 → anonymous', async () => {
    vi.spyOn(api, 'getMe').mockRejectedValue(
      new ApiError(401, 'unauthenticated', 'T', 'D'),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('state:anonymous')).toBeInTheDocument(),
    );
  });

  it('login() seta authenticated', async () => {
    vi.spyOn(api, 'getMe')
      .mockRejectedValueOnce(new ApiError(401, 'unauthenticated', 'T', 'D'))
      .mockResolvedValueOnce({
        id: 'usr_1',
        email: 'a@b.c',
        name: 'A',
        phone: 'p',
        createdAt: '2026-01-01',
      });
    vi.spyOn(api, 'login').mockResolvedValue();

    function Btn() {
      const { state, login } = useAuth();
      return (
        <div>
          <span>state:{state.status}</span>
          <button
            onClick={() =>
              login({ email: 'a@b.c', password: 'senha12345' })
            }
          >
            go
          </button>
        </div>
      );
    }
    render(
      <AuthProvider>
        <Btn />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('state:anonymous')).toBeInTheDocument(),
    );

    await act(async () => {
      screen.getByText('go').click();
    });
    await waitFor(() =>
      expect(screen.getByText('state:authenticated')).toBeInTheDocument(),
    );
  });

  it('logout() volta para anonymous', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({
      id: 'usr_1',
      email: 'a@b.c',
      name: 'A',
      phone: 'p',
      createdAt: '2026-01-01',
    });
    vi.spyOn(api, 'logout').mockResolvedValue();

    function Btn() {
      const { state, logout } = useAuth();
      return (
        <div>
          <span>state:{state.status}</span>
          <button onClick={() => logout()}>out</button>
        </div>
      );
    }
    render(
      <AuthProvider>
        <Btn />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('state:authenticated')).toBeInTheDocument(),
    );
    await act(async () => {
      screen.getByText('out').click();
    });
    await waitFor(() =>
      expect(screen.getByText('state:anonymous')).toBeInTheDocument(),
    );
  });
});
