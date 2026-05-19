import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: "Termos de Uso — Braga's Burger",
};

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Estes Termos de Uso descrevem as regras para utilização do site do Braga&apos;s Burger e
        do serviço de pedidos de alimentos. Ao usar o site, o cliente concorda com estas regras.
      </p>
      <p>
        Os pedidos estão sujeitos à disponibilidade dos itens, ao horário de funcionamento e às
        áreas de entrega divulgadas. Preços e taxas de entrega podem ser atualizados sem aviso
        prévio.
      </p>
      <p>
        A entrega é feita nos bairros atendidos, mediante a taxa correspondente; também é possível
        retirar o pedido no local. O pedido mínimo é de R$ 25,00.
      </p>
      <p>
        Dúvidas ou problemas com um pedido devem ser comunicados pelos canais de contato
        divulgados no site.
      </p>
    </LegalPage>
  );
}
