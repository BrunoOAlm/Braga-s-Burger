import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminPageHeader } from './AdminPageHeader';

describe('AdminPageHeader', () => {
  it('renders title and optional action', () => {
    render(<AdminPageHeader title="Produtos" action={<button>Novo</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Produtos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument();
  });
});
