import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderToast } from './OrderToast';

describe('OrderToast', () => {
  it('não renderiza quando message é null', () => {
    const { container } = render(<OrderToast message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza a mensagem quando fornecida', () => {
    render(<OrderToast message="Loja fechada" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Loja fechada');
  });
});
