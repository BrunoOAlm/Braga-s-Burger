import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToCartButton } from './AddToCartButton';
import { useCartStore } from '@/lib/cart-store';
import type { Product } from '@/lib/types';

const product: Product = {
  id: 'chicken',
  categoryId: 'burgers',
  name: 'Chicken',
  description: '',
  price: 25.9,
  priceFrom: false,
  imageUrl: null,
  featured: false,
  available: true,
};

beforeEach(() => useCartStore.getState().clear());

describe('AddToCartButton', () => {
  it('adiciona o produto ao carrinho ao clicar', async () => {
    render(<AddToCartButton product={product} />);
    await userEvent.click(screen.getByRole('button', { name: /adicionar/i }));
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe('chicken');
  });

  it('desabilita quando o produto está indisponível', () => {
    render(<AddToCartButton product={{ ...product, available: false }} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
