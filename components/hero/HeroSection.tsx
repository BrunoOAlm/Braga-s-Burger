import { Button } from '@/components/ui/Button';

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-dark px-6 text-center">
      <p className="mb-4 font-body text-sm uppercase tracking-[0.3em] text-brand-gold">
        Hamburgueria artesanal
      </p>
      <h1 className="font-heading text-5xl font-extrabold text-white md:text-7xl">
        Braga&apos;s Burger
      </h1>
      <p className="mt-4 max-w-md text-base text-white/70">
        Os melhores hambúrgueres da Zona Norte, feitos na hora e entregues quentinhos.
      </p>
      <div className="mt-8">
        <Button href="#cardapio">Ver cardápio</Button>
      </div>
    </section>
  );
}
