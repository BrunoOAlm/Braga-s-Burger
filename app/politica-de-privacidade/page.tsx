import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: "Política de Privacidade — Braga's Burger",
};

export default function PoliticaPage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        O Braga&apos;s Burger valoriza a privacidade de seus clientes e está comprometido com a
        proteção dos dados pessoais tratados em seu site, em conformidade com a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018 - LGPD).
      </p>

      <h2>1. Dados Coletados</h2>
      <p>Ao utilizar nosso site, poderemos coletar as seguintes informações:</p>
      <ul>
        <li>Nome completo;</li>
        <li>Telefone;</li>
        <li>E-mail;</li>
        <li>Endereço de entrega;</li>
        <li>Histórico de pedidos;</li>
        <li>Preferências de consumo;</li>
        <li>Informações necessárias para processamento de pagamentos.</li>
      </ul>

      <h2>2. Finalidade do Tratamento dos Dados</h2>
      <p>Os dados coletados poderão ser utilizados para:</p>
      <ul>
        <li>Processamento e entrega de pedidos;</li>
        <li>Atendimento ao cliente;</li>
        <li>Comunicação sobre pedidos realizados;</li>
        <li>Envio de promoções e novidades, quando autorizado pelo usuário;</li>
        <li>Cumprimento de obrigações legais e regulatórias;</li>
        <li>Aprimoramento dos serviços oferecidos.</li>
      </ul>

      <h2>3. Armazenamento das Informações</h2>
      <p>
        Os dados poderão ser armazenados em servidores próprios ou de terceiros contratados,
        utilizando medidas técnicas e administrativas adequadas para proteção das informações.
      </p>

      <h2>4. Segurança</h2>
      <p>
        Adotamos práticas de segurança compatíveis com os padrões de mercado para proteger os
        dados pessoais contra acesso não autorizado, perda, alteração ou divulgação indevida.
      </p>
      <p>
        Apesar dos esforços empregados, nenhum sistema é totalmente livre de riscos, razão pela
        qual não é possível garantir segurança absoluta.
      </p>

      <h2>5. Compartilhamento de Dados</h2>
      <p>Os dados poderão ser compartilhados apenas quando necessário para:</p>
      <ul>
        <li>Processamento de pagamentos;</li>
        <li>Realização de entregas;</li>
        <li>Cumprimento de obrigações legais;</li>
        <li>Prestação de serviços por fornecedores contratados.</li>
      </ul>
      <p>O Braga&apos;s Burger não comercializa dados pessoais de seus clientes.</p>

      <h2>6. Comunicação</h2>
      <p>Poderemos utilizar seus dados para envio de:</p>
      <ul>
        <li>Informações sobre pedidos;</li>
        <li>Atualizações dos serviços;</li>
        <li>Comunicados institucionais;</li>
        <li>Promoções e campanhas de marketing, quando autorizado pelo usuário.</li>
      </ul>
      <p>
        O usuário poderá solicitar o cancelamento de comunicações promocionais a qualquer momento.
      </p>

      <h2>7. Direitos do Titular</h2>
      <p>Nos termos da LGPD, o usuário poderá solicitar:</p>
      <ul>
        <li>Confirmação da existência de tratamento;</li>
        <li>Acesso aos dados;</li>
        <li>Correção de dados incompletos ou desatualizados;</li>
        <li>Exclusão de dados, quando legalmente possível;</li>
        <li>Portabilidade dos dados;</li>
        <li>Revogação do consentimento.</li>
      </ul>

      <h2>8. Exclusão de Dados</h2>
      <p>
        Para solicitar a exclusão de seus dados pessoais, o usuário deverá entrar em contato pelos
        canais oficiais do Braga&apos;s Burger informando os dados utilizados no cadastro.
      </p>
      <p>
        A exclusão será realizada observando-se os prazos legais e obrigações regulatórias
        aplicáveis.
      </p>

      <h2>9. Alterações desta Política</h2>
      <p>
        Esta Política poderá ser atualizada periodicamente para refletir alterações legais ou
        operacionais.
      </p>

      <h2>10. Contato</h2>
      <p>
        Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus dados
        pessoais, entre em contato pelos canais oficiais do Braga&apos;s Burger.
      </p>
      <p>
        Ao utilizar o site, o usuário declara estar ciente e concordar com os termos desta Política
        de Privacidade.
      </p>
    </LegalPage>
  );
}
