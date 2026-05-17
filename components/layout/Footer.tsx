import { Logo } from '@/components/ui/Logo';

const navLinks = [
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contato', href: '#contato' },
];

const legalLinks = [
  { label: 'Termos de Uso', href: '/termos' },
  { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-ink px-6 py-10 text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={56} />
          <p className="text-sm">Hamburgueria artesanal — Higienópolis, RJ</p>
        </div>
        <ul className="flex flex-wrap gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm transition-colors hover:text-paper">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-2 text-xs text-faint md:flex-row md:items-center md:justify-between">
        <p>© {year} Braga&apos;s Burger. Todos os direitos reservados.</p>
        <ul className="flex gap-4">
          {legalLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-paper">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
