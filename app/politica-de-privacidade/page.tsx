import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: "Política de Privacidade — Braga's Burger",
};

export default function PoliticaPage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta Política de Privacidade explica como o Braga&apos;s Burger trata os dados pessoais
        fornecidos pelos clientes ao usar o site e fazer pedidos.
      </p>
      <p>
        Podem ser coletados dados como nome, telefone, endereço de entrega e forma de pagamento,
        utilizados exclusivamente para processar e entregar os pedidos e para contato sobre eles.
      </p>
      <p>
        Os dados não são vendidos a terceiros. O cliente pode solicitar informações sobre seus
        dados pelos canais de contato divulgados no site, conforme a Lei Geral de Proteção de
        Dados (LGPD).
      </p>
    </LegalPage>
  );
}
