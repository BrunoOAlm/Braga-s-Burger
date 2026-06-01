import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';
import './globals.css';
import { CartLauncher } from '@/components/cart/CartLauncher';
import { RegisterServiceWorker } from '@/components/pwa/RegisterServiceWorker';
import { InstallBanner } from '@/components/ui/InstallBanner';
import { AuthProvider } from '@/lib/auth-context';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-poppins',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Braga's Burger — Hamburgueria artesanal",
  description:
    'Os melhores hambúrgueres artesanais da Zona Norte. Peça online e receba em casa.',
  openGraph: {
    title: "Braga's Burger",
    description: 'Hambúrgueres artesanais com entrega na Zona Norte.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${inter.variable} antialiased`}>
      <body>
        <AuthProvider>
          {children}
          <CartLauncher />
          <InstallBanner />
          <RegisterServiceWorker />
        </AuthProvider>
      </body>
    </html>
  );
}
