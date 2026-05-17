import { DeliveryLookup } from './DeliveryLookup';

const payments = [
  'Dinheiro',
  'Crédito',
  'Débito',
  'Pix (QR Code)',
  'Vale-refeição: Ticket, Sodexo, Alelo, Gren Card',
];

export function InfoSection() {
  return (
    <section id="contato" className="bg-ink px-6 py-20 text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-heading text-xl font-bold text-paper">Horário</h3>
          <p className="mt-3 text-sm text-muted">Terça a Quinta: 18h – 23h40</p>
          <p className="text-sm text-muted">Sexta a Domingo: 18h – 00h</p>
          <p className="text-sm text-faint">Segunda: fechado</p>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-paper">Entrega</h3>
          <p className="mt-3 text-sm text-muted">Entrega ou retirada no local.</p>
          <p className="text-sm text-muted">Pedido mínimo: R$ 25,00</p>
          <div className="mt-4">
            <DeliveryLookup />
          </div>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-paper">Formas de pagamento</h3>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {payments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-heading text-xl font-bold text-paper">Contato</h3>
          <p className="mt-3 text-sm text-muted">Higienópolis — Zona Norte, Rio de Janeiro</p>
          <a
            href="https://wa.me/5521984019048"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-sm text-muted transition-colors hover:text-paper"
          >
            WhatsApp: (21) 98401-9048
          </a>
          <a
            href="https://www.instagram.com/bragas_burger/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-sm text-muted transition-colors hover:text-paper"
          >
            Instagram: @bragas_burger
          </a>
        </div>
      </div>
    </section>
  );
}
