import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NeighborhoodsTable } from './NeighborhoodsTable';

describe('NeighborhoodsTable', () => {
  it('mostra a lista completa por padrão', () => {
    render(<NeighborhoodsTable />);
    expect(screen.getByText('Higienópolis')).toBeInTheDocument();
    expect(screen.getByText('Grajaú')).toBeInTheDocument();
  });

  it('filtra pela busca (case-insensitive)', async () => {
    render(<NeighborhoodsTable />);
    await userEvent.type(screen.getByLabelText(/buscar/i), 'tij');
    expect(screen.getByText('Tijuca')).toBeInTheDocument();
    expect(screen.queryByText('Higienópolis')).not.toBeInTheDocument();
  });

  it('mensagem amigável quando nada bate', async () => {
    render(<NeighborhoodsTable />);
    await userEvent.type(screen.getByLabelText(/buscar/i), 'xyznada');
    expect(screen.getByText(/nenhum bairro encontrado/i)).toBeInTheDocument();
  });
});
