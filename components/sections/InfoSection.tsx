const neighborhoods = [
  'Santana', 'Tucuruvi', 'Mandaqui', 'Casa Verde', 'Vila Maria',
  'Jaçanã', 'Tremembé', 'Vila Guilherme', 'Lauzane Paulista', 'Imirim',
];

export function InfoSection() {
  return (
    <section id="contato" className="bg-brand-dark px-6 py-20 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <h3 className="font-heading text-xl font-bold text-brand-gold">Horário</h3>
          <p className="mt-3 text-sm text-white/70">Terça a domingo</p>
          <p className="text-sm text-white/70">18h às 23h30</p>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-brand-gold">Áreas de entrega</h3>
          <p className="mt-3 text-sm text-white/70">
            Atendemos mais de 20 bairros da Zona Norte, entre eles:{' '}
            {neighborhoods.join(', ')} e região.
          </p>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-brand-gold">Contato</h3>
          <a
            href="https://wa.me/5511999999999"
            className="mt-3 block text-sm text-white/70 transition-colors hover:text-brand-gold"
          >
            WhatsApp: (11) 99999-9999
          </a>
          <a
            href="https://instagram.com/bragas_burger"
            className="mt-1 block text-sm text-white/70 transition-colors hover:text-brand-gold"
          >
            Instagram: @bragas_burger
          </a>
        </div>
      </div>
    </section>
  );
}
