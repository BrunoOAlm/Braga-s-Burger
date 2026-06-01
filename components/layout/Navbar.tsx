'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { HeaderUserMenu } from './HeaderUserMenu';

const links = [
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Destaques', href: '#destaques' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contato', href: '#contato' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="fixed inset-x-4 top-4 z-50 mx-auto max-w-6xl">
      <div className="flex items-center justify-between rounded-full border border-line bg-ink/85 px-6 py-3 backdrop-blur">
        <a href="#" aria-label="Braga's Burger — início" className="flex items-center">
          <Logo size={40} priority />
        </a>

        {/* Links — desktop */}
        <ul className="hidden gap-6 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-muted transition-colors hover:text-paper"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA + user menu — desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <HeaderUserMenu />
          <Button href="#cardapio">Peça agora</Button>
        </div>

        {/* Botão hambúrguer — mobile */}
        <button
          type="button"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer text-paper md:hidden"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Menu — mobile */}
      {open && (
        <div className="mt-2 rounded-2xl border border-line bg-ink/95 p-4 backdrop-blur md:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={close}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-paper"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#cardapio"
            onClick={close}
            className="mt-3 block rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            Peça agora
          </a>
          <div className="mt-3">
            <HeaderUserMenu />
          </div>
        </div>
      )}
    </nav>
  );
}
