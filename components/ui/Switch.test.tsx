import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders with aria-checked reflecting checked', () => {
    render(<Switch checked onChange={vi.fn()} aria-label="X" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles on click', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="X" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not fire when disabled', () => {
    const onChange = vi.fn();
    render(<Switch checked onChange={onChange} disabled aria-label="X" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
