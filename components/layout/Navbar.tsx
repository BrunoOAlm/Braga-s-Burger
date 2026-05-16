import { Button } from '@/components/ui/Button';

const links = [
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Destaques', href: '#destaques' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contato', href: '#contato' },
];

export function Navbar() {
  return (
    <nav className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-full bg-brand-dark/90 px-6 py-3 backdrop-blur">
      <span className="font-heading text-lg font-extrabold text-brand-gold">
        Braga&apos;s Burger
      </span>
      <ul className="hidden gap-6 md:flex">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-sm font-medium text-white/80 transition-colors hover:text-brand-gold"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <Button href="#cardapio">Peça agora</Button>
    </nav>
  );
}
