import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/components/CartContext';

export const metadata: Metadata = {
  title: 'Restaurant La Gratitude — Zagtouli, Route de Bobo | Menu du Jour & Commandes',
  description:
    'Bienvenue au Restaurant La Gratitude à Zagtouli (route de Bobo, Ouagadougou). Découvrez notre menu du jour en direct, pizzas au four, poulets rabilés/flambés, grillades, soupes et boissons. Commandez au +226 02 80 99 06.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
