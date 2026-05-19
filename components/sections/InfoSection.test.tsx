import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoSection } from './InfoSection';

describe('InfoSection', () => {
  it('mostra os blocos de informação', () => {
    render(<InfoSection />);
    expect(screen.getByRole('heading', { name: 'Horário' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrega' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Formas de pagamento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contato' })).toBeInTheDocument();
  });

  it('linka o WhatsApp real', () => {
    render(<InfoSection />);
    const wpp = screen.getByRole('link', { name: /WhatsApp/ });
    expect(wpp).toHaveAttribute('href', 'https://wa.me/5521984019048');
  });

  it('inclui a consulta de taxa por bairro', () => {
    render(<InfoSection />);
    expect(screen.getByLabelText(/bairro/i)).toBeInTheDocument();
  });
});
