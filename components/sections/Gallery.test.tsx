import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Gallery } from './Gallery';

describe('Gallery', () => {
  it('não mostra o lightbox antes do clique', () => {
    render(<Gallery />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre o lightbox ao clicar numa foto e fecha no botão', async () => {
    render(<Gallery />);
    await userEvent.click(screen.getAllByRole('button', { name: /Ampliar foto/ })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
