import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

describe('Select', () => {
  it('renders options and reflects value', () => {
    render(
      <Select
        value="b"
        onChange={vi.fn()}
        aria-label="X"
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('b');
  });

  it('calls onChange on selection', () => {
    const onChange = vi.fn();
    render(
      <Select
        value="a"
        onChange={onChange}
        aria-label="X"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
