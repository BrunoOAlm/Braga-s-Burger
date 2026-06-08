import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormModal } from './FormModal';

describe('FormModal', () => {
  it('submits form on Salvar click', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FormModal open title="X" onClose={vi.fn()} onSubmit={onSubmit}>
        <input />
      </FormModal>
    );
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('shows error banner when error prop set', () => {
    render(
      <FormModal open title="X" onClose={vi.fn()} onSubmit={vi.fn()} error="Falhou">
        <input />
      </FormModal>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
  });

  it('disables buttons while submitting', () => {
    render(
      <FormModal open title="X" onClose={vi.fn()} onSubmit={vi.fn()} submitting>
        <input />
      </FormModal>
    );
    expect(screen.getByText('Salvando…')).toBeDisabled();
    expect(screen.getByText('Cancelar')).toBeDisabled();
  });
});
