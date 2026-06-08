import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('renders label associated with input', () => {
    render(
      <FormField label="Nome" htmlFor="name">
        <input id="name" />
      </FormField>
    );
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('shows error with role=alert', () => {
    render(
      <FormField label="X" htmlFor="x" error="Obrigatório">
        <input id="x" />
      </FormField>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório');
  });

  it('shows asterisk when required', () => {
    render(<FormField label="X" htmlFor="x" required><input id="x" /></FormField>);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
