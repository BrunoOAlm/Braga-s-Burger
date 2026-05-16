import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('exibe a marca e o ano atual', () => {
    render(<Footer />);
    expect(screen.getAllByText(/Braga's Burger/)).toHaveLength(2);
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });
});
