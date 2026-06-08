import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateInput } from './DateInput';

describe('DateInput', () => {
  it('emits ISO value on change', () => {
    const onChange = vi.fn();
    render(<DateInput value="" onChange={onChange} id="d" />);
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: '2026-06-07' } });
    expect(onChange).toHaveBeenCalledWith('2026-06-07');
  });
});
