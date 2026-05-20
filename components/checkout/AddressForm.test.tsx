import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressForm } from './AddressForm';

beforeEach(() => {
  global.fetch = vi.fn();
});

describe('AddressForm', () => {
  it('busca o CEP na ViaCEP e preenche rua e bairro', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        logradouro: 'Rua Tenente Abel Cunha',
        bairro: 'Higienópolis',
      }),
    });

    render(<AddressForm value={null} onChange={() => {}} />);
    await userEvent.type(screen.getByLabelText(/CEP/i), '20000000');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://viacep.com.br/ws/20000000/json/'),
      );
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/^Rua/i)).toHaveValue('Rua Tenente Abel Cunha');
    });
    expect(screen.getByLabelText(/Bairro/i)).toHaveValue('Higienópolis');
  });

  it('mostra aviso quando o bairro não é atendido', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logradouro: 'X', bairro: 'Botafogo' }),
    });

    render(<AddressForm value={null} onChange={() => {}} />);
    await userEvent.type(screen.getByLabelText(/CEP/i), '22000000');

    await waitFor(() => {
      expect(screen.getByText(/bairro não atendido/i)).toBeInTheDocument();
    });
  });
});
