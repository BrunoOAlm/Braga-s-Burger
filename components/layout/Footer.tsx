import { Logo } from '@/components/ui/Logo';
import { deliveryMethods, paymentMethods } from './footer-icons';

const navLinks = [
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contato', href: '#contato' },
];

const legalLinks = [
  { label: 'Termos de Uso', href: '/termos' },
  { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
];

// Eyebrow de seção: pequena, em caixa-alta, com um traço vermelho da marca.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-faint">
      <span className="h-3 w-0.5 rounded-full bg-red-600" aria-hidden="true" />
      {children}
    </h2>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-ink px-6 py-12 text-muted">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1.2fr]">
        {/* Marca */}
        <div>
          <div className="flex items-center gap-3">
            <Logo size={56} />
            <span className="font-heading text-lg font-bold text-paper">Braga&apos;s Burger</span>
          </div>
          <p className="mt-4 max-w-xs text-sm">
            Hamburgueria artesanal em Higienópolis, RJ. Smash, costela e clássicos
            no capricho — para comer no salão, retirar ou receber em casa.
          </p>
        </div>

        {/* Navegação */}
        <nav aria-label="Rodapé">
          <SectionLabel>Navegação</SectionLabel>
          <ul className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm transition-colors hover:text-paper">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Formas de entrega */}
        <div>
          <SectionLabel>Formas de entrega</SectionLabel>
          <ul className="flex flex-col gap-3">
            {deliveryMethods.map((method) => (
              <li key={method.label} className="text-sm">
                {method.href ? (
                  <a
                    href={method.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 transition-colors hover:text-paper"
                  >
                    <span className="text-paper">{method.icon}</span>
                    {method.label}
                  </a>
                ) : (
                  <span className="flex items-center gap-2.5">
                    <span className="text-paper">{method.icon}</span>
                    {method.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Formas de pagamento */}
      <div className="mx-auto mt-12 max-w-6xl border-t border-line pt-8">
        <SectionLabel>Formas de pagamento</SectionLabel>
        <ul className="flex flex-wrap gap-2">
          {paymentMethods.map((method) => method.node && (
            <li
              key={method.label}
              title={method.label}
              className="flex h-8 min-w-[3rem] items-center justify-center rounded-md bg-paper px-2 shadow-sm ring-1 ring-black/5"
            >
              {method.node}
            </li>
          ))}
        </ul>
      </div>

      {/* Barra inferior */}
      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-3 border-t border-line pt-6 text-xs text-faint md:flex-row md:items-center md:justify-between">
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
