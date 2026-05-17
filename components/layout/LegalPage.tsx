import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <h1 className="font-heading text-3xl font-extrabold text-paper md:text-4xl">{title}</h1>

        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          <strong className="text-paper">Aviso:</strong> este é um texto provisório, sem validade
          jurídica. A versão oficial deve ser redigida por um advogado antes de o site entrar em
          operação recebendo pedidos.
        </p>

        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">{children}</div>
      </main>
      <Footer />
    </>
  );
}
