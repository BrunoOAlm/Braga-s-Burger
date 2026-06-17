import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: "Termos de Uso — Braga's Burger",
};

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Por favor, leia atentamente os presentes Termos de Uso. Ao acessar, cadastrar-se ou
        realizar pedidos através do site do Braga&apos;s Burger, você declara estar de acordo com
        todas as condições aqui estabelecidas.
      </p>

      <h2>1. Serviços Oferecidos</h2>
      <p>
        <strong>1.1.</strong> O presente Termo regula a utilização do site do Braga&apos;s Burger,
        que possibilita aos usuários visualizar o cardápio, realizar pedidos online, optar por
        entrega em domicílio ou retirada no local, bem como efetuar pagamentos por meio das formas
        disponibilizadas no site.
      </p>
      <p>
        <strong>1.2.</strong> O Braga&apos;s Burger disponibiliza uma plataforma digital própria
        para comercialização de seus produtos alimentícios, permitindo ao usuário realizar pedidos
        de forma prática e segura.
      </p>
      <p>
        <strong>1.3.</strong> O Braga&apos;s Burger é responsável pelo preparo, embalagem,
        disponibilização e entrega dos produtos comercializados por meio do site, observadas as
        condições operacionais e áreas de atendimento informadas no momento da compra.
      </p>

      <h2>2. Cadastro</h2>
      <p>
        <strong>2.1.</strong> Para utilizar determinados recursos do site, o usuário deverá
        fornecer informações verdadeiras, completas e atualizadas, assumindo total responsabilidade
        pela exatidão dos dados informados.
      </p>
      <p>
        O Braga&apos;s Burger reserva-se o direito de suspender ou cancelar cadastros que contenham
        informações incorretas, falsas ou que violem estes Termos de Uso.
      </p>
      <p>
        <strong>2.2.</strong> Após a realização do cadastro, o usuário terá acesso aos serviços por
        meio de login e senha, sendo responsável pela guarda e sigilo dessas informações.
      </p>

      <h2>3. Obrigações do Usuário</h2>
      <p>
        <strong>3.1.</strong> O usuário compromete-se a não compartilhar seu login e senha com
        terceiros, assumindo integral responsabilidade pelas atividades realizadas em sua conta.
      </p>
      <p>
        <strong>3.2.</strong> O usuário deverá manter seus dados cadastrais sempre atualizados,
        especialmente endereço, telefone e e-mail.
      </p>
      <p>
        <strong>3.3.</strong> O usuário compromete-se a efetuar o pagamento integral dos produtos
        adquiridos por meio das formas de pagamento disponibilizadas pelo Braga&apos;s Burger.
      </p>
      <p>
        <strong>3.4.</strong> Caso sejam comercializados produtos sujeitos a restrições legais de
        idade, o usuário declara possuir idade mínima exigida pela legislação vigente para sua
        aquisição.
      </p>

      <h2>4. Obrigações do Braga&apos;s Burger</h2>
      <p>
        <strong>4.1.</strong> Disponibilizar ambiente virtual seguro para consulta do cardápio,
        realização de pedidos e pagamentos online.
      </p>
      <p>
        <strong>4.2.</strong> Empregar medidas razoáveis de segurança para proteger as informações
        dos usuários e os dados relacionados às operações realizadas no site.
      </p>
      <p>
        <strong>4.3.</strong> Prestar atendimento aos clientes por meio dos canais de comunicação
        disponibilizados no site.
      </p>

      <h2>5. Pedidos, Entregas e Cancelamentos</h2>
      <p>
        <strong>5.1.</strong> Os pedidos somente serão processados após a confirmação do pagamento,
        quando aplicável.
      </p>
      <p>
        <strong>5.2.</strong> Os prazos de entrega informados são estimativas e podem sofrer
        alterações em razão de fatores externos, como condições climáticas, trânsito ou alta
        demanda.
      </p>
      <p>
        <strong>5.3.</strong> Após o início do preparo do pedido, o cancelamento poderá não ser
        possível, exceto nos casos previstos pela legislação aplicável.
      </p>
      <p>
        <strong>5.4.</strong> Eventuais problemas relacionados ao pedido deverão ser comunicados ao
        Braga&apos;s Burger por meio dos canais oficiais de atendimento.
      </p>

      <h2>6. Modificações dos Termos</h2>
      <p>
        <strong>6.1.</strong> O Braga&apos;s Burger poderá alterar estes Termos de Uso a qualquer
        momento para adequação legal, operacional ou melhoria dos serviços.
      </p>
      <p>
        <strong>6.2.</strong> As alterações entrarão em vigor a partir de sua publicação no site.
      </p>

      <h2>7. Comunicação</h2>
      <p>
        <strong>7.1.</strong> Toda comunicação entre o Braga&apos;s Burger e o usuário poderá
        ocorrer por e-mail, telefone, WhatsApp ou demais canais informados durante o cadastro.
      </p>
      <p>
        <strong>7.2.</strong> O usuário compromete-se a manter seus dados de contato atualizados.
      </p>

      <h2>8. Aceitação dos Termos</h2>
      <p>
        <strong>8.1.</strong> Ao utilizar o site, o usuário declara ter lido, compreendido e
        aceitado integralmente os presentes Termos de Uso.
      </p>

      <h2>9. Foro</h2>
      <p>
        <strong>9.1.</strong> Fica eleito o foro da Comarca da Capital do Estado do Rio de Janeiro
        - RJ para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia a
        qualquer outro, por mais privilegiado que seja.
      </p>
    </LegalPage>
  );
}
