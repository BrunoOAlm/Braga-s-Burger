import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminTable } from './AdminTable';

describe('AdminTable', () => {
  it('renders columns and rows', () => {
    render(
      <AdminTable
        columns={[
          { key: 'n', header: 'Nome', render: (r: { n: string }) => r.n },
        ]}
        rows={[{ n: 'A' }, { n: 'B' }]}
        rowKey={(r) => r.n}
      />
    );
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('shows empty message when no rows', () => {
    render(
      <AdminTable
        columns={[{ key: 'n', header: 'X', render: () => null }]}
        rows={[]}
        rowKey={() => 'k'}
        emptyMessage="Vazio."
      />
    );
    expect(screen.getByText('Vazio.')).toBeInTheDocument();
  });
});
