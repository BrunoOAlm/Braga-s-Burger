import type { ReactNode } from 'react';

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
};

const styles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-orange text-white hover:bg-brand-orange-light',
  ghost: 'bg-transparent text-brand-dark border border-brand-dark/20 hover:border-brand-orange',
};

export function Button({ children, href, onClick, variant = 'primary' }: ButtonProps) {
  const className = `inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer ${styles[variant]}`;

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
