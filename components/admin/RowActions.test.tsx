import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RowActions } from './RowActions';

describe('RowActions', () => {
  it('calls callbacks on click', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<RowActions onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.click(screen.getByText('Excluir'));
    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
