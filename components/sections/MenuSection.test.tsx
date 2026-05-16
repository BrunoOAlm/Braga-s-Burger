import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuSection } from './MenuSection';

describe('MenuSection', () => {
  it('mostra todos os produtos por padrão', () => {
    render(<MenuSection />);
    expect(screen.getByText('Cheese Salada')).toBeInTheDocument();
    expect(screen.getByText('Milkshake de Ovomaltine')).toBeInTheDocument();
  });

  it('filtra os produtos ao clicar numa categoria', async () => {
    render(<MenuSection />);
    await userEvent.click(screen.getByRole('button', { name: 'Bebidas' }));
    expect(screen.getByText('Refrigerante Lata')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('Cheese Salada')).not.toBeInTheDocument(),
    );
  });
});
