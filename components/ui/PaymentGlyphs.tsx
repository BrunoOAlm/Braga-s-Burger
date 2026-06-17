// Glifos de pagamento reutilizados no checkout (ao lado de cada opção) e no
// rodapé (dentro dos cards de bandeira). Pix mantém a cor teal oficial; cartão
// e dinheiro herdam a cor do texto (currentColor) para casar com cada contexto.

export function PixGlyph({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        fill="#32BCAD"
        d="M16 4.2 19.6 7.8a3 3 0 0 0 2.1.9h1.1L16 1.8 9.1 8.7h1.1a3 3 0 0 0 2.1-.9L16 4.2Zm0 23.6-3.6-3.6a3 3 0 0 0-2.1-.9H9.2L16 30.2l6.9-6.9h-1.2a3 3 0 0 0-2.1.9L16 27.8Zm11.9-13.9-3.4-3.4h-1.7a2 2 0 0 0-1.4.6l-4.5 4.5a1.7 1.7 0 0 1-2.4 0l-4.5-4.5a2 2 0 0 0-1.4-.6H6.8L3.4 13.9a3 3 0 0 0 0 4.2l3.4 3.4h1.8a2 2 0 0 0 1.4-.6l4.5-4.5a1.7 1.7 0 0 1 2.4 0l4.5 4.5a2 2 0 0 0 1.4.6h1.7l3.4-3.4a3 3 0 0 0 0-4.2Z"
      />
    </svg>
  );
}

export function CardGlyph({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19" />
      <path d="M6 15h3" />
    </svg>
  );
}

export function CashGlyph({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5h.01M18 14.5h.01" />
    </svg>
  );
}
