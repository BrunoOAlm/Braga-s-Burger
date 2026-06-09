import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InlineToggle } from './InlineToggle';

describe('InlineToggle', () => {
  it('toggles optimistically and confirms on success', async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined);
    render(<InlineToggle initial={false} onToggle={onToggle} label="X" />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('reverts on error and shows alert', async () => {
    const onToggle = vi.fn().mockRejectedValue(new Error('boom'));
    render(<InlineToggle initial={false} onToggle={onToggle} label="X" />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
});
