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

        <div className="mt-8 text-sm leading-relaxed text-muted [&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-paper [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_li]:marker:text-faint [&_strong]:font-semibold [&_strong]:text-paper">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
