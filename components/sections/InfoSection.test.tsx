import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoSection } from './InfoSection';

describe('InfoSection', () => {
  it('exibe horário, contato e link do Instagram', () => {
    render(<InfoSection />);
    expect(screen.getByText(/Horário/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me'),
    );
    expect(screen.getByRole('link', { name: /Instagram/i })).toBeInTheDocument();
  });
});
