import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CheckoutPage from './page';
import { useCartStore } from '@/lib/cart-store';
import { fixtureProducts as products } from '@/lib/__fixtures__/menu';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    state: {
      status: 'authenticated',
      user: {
        id: 'usr_1',
        email: 'a@b.c',
        name: 'João Silva',
        phone: '(21) 99999-0000',
        createdAt: '2026-01-01',
      },
    },
  }),
}));

beforeEach(() => {
  useCartStore.setState({
    items: [{ id: 'ci1', product: products[0], quantity: 1, notes: '' }],
    coupon: null,
  });
});

afterEach(() => {
  useCartStore.setState({ items: [], coupon: null });
});

describe('CheckoutPage — SP4b auth', () => {
  it('logado: nome/telefone vêm pré-preenchidos no IdentificationStep', () => {
    render(<CheckoutPage />);
    expect((screen.getByLabelText(/^nome$/i) as HTMLInputElement).value).toBe(
      'João Silva',
    );
    expect(
      (screen.getByLabelText(/^telefone$/i) as HTMLInputElement).value,
    ).toBe('(21) 99999-0000');
  });
});
