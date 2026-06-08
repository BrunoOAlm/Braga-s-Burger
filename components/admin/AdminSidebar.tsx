'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/produtos', label: 'Produtos' },
  { href: '/admin/categorias', label: 'Categorias' },
  { href: '/admin/cupons', label: 'Cupons' },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Admin"
      className="hidden min-h-screen w-56 shrink-0 bg-neutral-900 text-neutral-100 md:block"
    >
      <div className="px-4 py-4 text-lg font-semibold">Bragas Admin</div>
      <ul>
        {ITEMS.map((it) => {
          const active = path?.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={`block px-4 py-2 hover:bg-neutral-800 ${
                  active ? 'bg-neutral-800 font-semibold' : ''
                }`}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
