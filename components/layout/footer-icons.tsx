import type { ReactNode } from 'react';
import { PixGlyph } from '@/components/ui/PaymentGlyphs';

// Selos de pagamento e ícones de entrega do rodapé.
// As marcas são representadas como "cards" brancos com o wordmark/marca na cor
// da bandeira — o formato em que esses selos aparecem nas páginas de pedido.
// Pix e Mastercard usam a marca geométrica real (SVG); as demais usam o
// wordmark na cor oficial. Se um dia houver os SVGs oficiais, basta trocar o
// conteúdo de cada badge aqui.

// Link da loja no iFood (entrega via app).
const IFOOD_URL =
  'https://www.ifood.com.br/delivery/rio-de-janeiro-rj/bragas-burger-higienopolis/7dbfd7c6-9963-4209-9f9b-bc2ca9293d8e';

// Wordmark simples na cor da marca, dentro do card branco.
function Wordmark({ text, color, italic = false }: { text: string; color: string; italic?: boolean }) {
  return (
    <span
      className={`font-heading text-[0.8rem] font-bold leading-none tracking-tight ${italic ? 'italic' : ''}`}
      style={{ color }}
    >
      {text}
    </span>
  );
}

function PixMark() {
  return (
    <span className="flex items-center gap-1">
      <PixGlyph size={16} />
      <Wordmark text="Pix" color="#32BCAD" />
    </span>
  );
}

function MastercardMark() {
  return (
    <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true">
      <circle cx="13" cy="11" r="8" fill="#EB001B" />
      <circle cx="21" cy="11" r="8" fill="#F79E1B" />
      <path fill="#FF5F00" d="M17 5a8 8 0 0 1 0 12 8 8 0 0 1 0-12Z" />
    </svg>
  );
}

function CashIcon() {
  return (
    <span className="flex items-center gap-1">
      <svg width="18" height="14" viewBox="0 0 24 18" aria-hidden="true">
        <rect x="1" y="1" width="22" height="16" rx="2" fill="#1E8E3E" />
        <circle cx="12" cy="9" r="3.5" fill="#fff" />
      </svg>
      <Wordmark text="Dinheiro" color="#1E8E3E" />
    </span>
  );
}

// Ordem: Pix e dinheiro primeiro, depois cartões, depois vale-refeição.
export const paymentMethods = [
  { label: 'Pix', node: <PixMark /> },
  { label: 'Dinheiro', node: <CashIcon /> },
  { label: 'Visa', node: <Wordmark text="VISA" color="#1434CB" italic /> },
  { label: 'Mastercard', node: <MastercardMark /> },
  { label: 'Elo', node: <Wordmark text="elo" color="#0a0a0a" /> },
  { label: 'American Express', node: <Wordmark text="AMEX" color="#006FCF" /> },
  { label: 'Hipercard', node: <Wordmark text="Hipercard" color="#822124" /> },
  { label: 'Sodexo', node: <Wordmark text="Sodexo" color="#E3000F" /> },
  { label: 'Alelo', node: <Wordmark text="Alelo" color="#00A19A" /> },
  { label: 'VR', node: <Wordmark text="VR" color="#2E7D32" /> },
  { label: 'Ticket', node: <Wordmark text="Ticket" color="#003DA5" /> },
  { label: 'Ben', node: <Wordmark text="Ben" color="#FF6A13" /> },
];

// Ícones de entrega (monocromáticos, na cor do texto do rodapé).
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function ScooterIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 18h7M18 15.5V9h-3M5 9h6l3 6M11 9 9.5 5H7" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  );
}

function UtensilsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11M17 3c-1.5 0-2.5 1.5-2.5 4s1 4 2.5 4M17 3v18" />
    </svg>
  );
}

function IfoodMark() {
  return (
    <span className="flex h-5 items-center rounded bg-[#EA1D2C] px-1.5 text-[0.7rem] font-bold leading-none text-white">
      iFood
    </span>
  );
}

export const deliveryMethods: Array<{ label: string; icon: ReactNode; href?: string }> = [
  { label: 'Delivery próprio', icon: <ScooterIcon /> },
  { label: 'Retirada no balcão', icon: <BagIcon /> },
  { label: 'iFood', icon: <IfoodMark />, href: IFOOD_URL },
  { label: 'Consumo no local', icon: <UtensilsIcon /> },
];
