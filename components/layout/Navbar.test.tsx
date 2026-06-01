import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from './Navbar';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ state: { status: 'anonymous' }, logout: vi.fn() }),
}));

describe('Navbar', () => {
  it('exibe a logo e os links de navegação', () => {
    render(<Navbar />);
    expect(screen.getByAltText("Braga's Burger")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cardápio' })).toHaveAttribute('href', '#cardapio');
  });

  it('abre o menu mobile ao clicar no botão e mostra os links', async () => {
    render(<Navbar />);
    // menu fechado: apenas o link de desktop (1 ocorrência de "Contato")
    expect(screen.getAllByRole('link', { name: 'Contato' })).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));

    // menu aberto: link de desktop + link do menu mobile (2 ocorrências)
    expect(screen.getAllByRole('link', { name: 'Contato' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toBeInTheDocument();
  });

  it('fecha o menu mobile ao clicar num link', async () => {
    render(<Navbar />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));

    const contatoLinks = screen.getAllByRole('link', { name: 'Contato' });
    await userEvent.click(contatoLinks[contatoLinks.length - 1]);

    expect(screen.getAllByRole('link', { name: 'Contato' })).toHaveLength(1);
  });
});
