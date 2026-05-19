import Image from 'next/image';

type LogoProps = {
  size?: number;
  priority?: boolean;
  className?: string;
};

export function Logo({ size = 48, priority = false, className }: LogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt="Braga's Burger"
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
