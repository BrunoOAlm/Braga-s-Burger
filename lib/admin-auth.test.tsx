import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthProvider, useAdminAuth } from './admin-auth';
import * as adminApi from './admin-api';
import { ApiError } from './admin-api';

function Probe() {
  const { admin, loading } = useAdminAuth();
  if (loading) return <span>loading</span>;
  return <span>{admin ? admin.email : 'guest'}</span>;
}

beforeEach(() => {
  vi.spyOn(adminApi, 'me').mockReset();
  vi.spyOn(adminApi, 'login').mockReset();
  vi.spyOn(adminApi, 'logout').mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('AdminAuthProvider', () => {
  it('exposes admin after successful me()', async () => {
    vi.spyOn(adminApi, 'me').mockResolvedValue({
      id: 'adm_1',
      email: 'a@b',
      name: 'A',
      createdAt: '2026-06-07T00:00:00Z',
    });
    render(
      <AdminAuthProvider>
        <Probe />
      </AdminAuthProvider>,
    );
    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('a@b')).toBeInTheDocument());
  });

  it('sets admin=null on 401', async () => {
    vi.spyOn(adminApi, 'me').mockRejectedValue(
      new ApiError(401, 'unauthenticated', 'X', 'd'),
    );
    render(
      <AdminAuthProvider>
        <Probe />
      </AdminAuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('guest')).toBeInTheDocument());
  });

  it('login() refreshes admin state', async () => {
    vi.spyOn(adminApi, 'me')
      .mockRejectedValueOnce(new ApiError(401, 'unauthenticated', 'X', 'd'))
      .mockResolvedValueOnce({ id: 'adm_1', email: 'a@b', name: 'A', createdAt: '' });
    vi.spyOn(adminApi, 'login').mockResolvedValue(undefined as unknown as void);

    function Caller() {
      const { admin, login } = useAdminAuth();
      return (
        <>
          <button onClick={() => login('a@b', 'pwd')}>go</button>
          <span data-testid="who">{admin?.email ?? 'guest'}</span>
        </>
      );
    }
    render(
      <AdminAuthProvider>
        <Caller />
      </AdminAuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('guest'));
    await act(async () => {
      screen.getByText('go').click();
    });
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('a@b'));
  });
});
