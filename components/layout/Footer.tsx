const footerLinks = [
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contato', href: '#contato' },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-brand-dark px-6 py-10 text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-heading text-lg font-extrabold text-brand-gold">
            Braga&apos;s Burger
          </p>
          <p className="mt-1 text-sm">Hamburgueria artesanal — Zona Norte</p>
        </div>
        <ul className="flex gap-6">
          {footerLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm transition-colors hover:text-brand-gold">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-xs text-white/40">
        © {year} Braga&apos;s Burger. Todos os direitos reservados.
      </p>
    </footer>
  );
}
