import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartButton } from './CartButton';
import { useCartStore } from '@/lib/cart-store';
import type { Product } from '@/lib/types';

const product = (id: string): Product => ({
  id,
  categoryId: 'burgers',
  name: id,
  description: '',
  price: 10,
  priceFrom: false,
  imageUrl: null,
  featured: false,
  available: true,
});

beforeEach(() => useCartStore.getState().clear());

describe('CartButton', () => {
  it('não aparece quando o carrinho está vazio', () => {
    render(<CartButton onOpen={() => {}} />);
    expect(screen.queryByRole('button', { name: /carrinho/i })).not.toBeInTheDocument();
  });

  it('mostra o total de itens (somando quantidades)', () => {
    useCartStore.getState().addItem(product('a'));
    useCartStore.getState().addItem(product('a')); // qty=2
    useCartStore.getState().addItem(product('b')); // outro produto
    render(<CartButton onOpen={() => {}} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('chama onOpen quando clicado', async () => {
    useCartStore.getState().addItem(product('a'));
    let opened = false;
    render(<CartButton onOpen={() => { opened = true; }} />);
    await userEvent.click(screen.getByRole('button', { name: /carrinho/i }));
    expect(opened).toBe(true);
  });
});
