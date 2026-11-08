import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/components/CartContext';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://restaurantlagratitude.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Restaurant La Gratitude — Zagtouli, Ouagadougou | Menu du Jour & Spécialités',
    template: '%s | Restaurant La Gratitude'
  },
  description:
    'Restaurant La Gratitude à Zagtouli (route de Bobo, Ouagadougou, Burkina Faso). Découvrez notre Menu du Jour (Riz, Soupes, Tô, Grillades), nos Pizzas au four, Poulets flambés et rabilés. Commandez au +226 02 80 99 06.',
  keywords: [
    'Restaurant La Gratitude',
    'La Gratitude Zagtouli',
    'Restaurant Zagtouli',
    'Restaurant Ouagadougou',
    'Restaurant route de Bobo Ouagadougou',
    'Menu du jour Ouagadougou',
    'Poulet flambé Ouagadougou',
    'Poulet rabilé Zagtouli',
    'Pizza Zagtouli',
    'Soupe de poisson Ouagadougou',
    'Restaurant Burkina Faso'
  ],
  authors: [{ name: 'Restaurant La Gratitude' }],
  creator: 'Restaurant La Gratitude',
  publisher: 'Restaurant La Gratitude',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  openGraph: {
    type: 'website',
    locale: 'fr_BF',
    siteName: 'Restaurant La Gratitude',
    title: 'Restaurant La Gratitude — Zagtouli, Ouagadougou (Route de Bobo)',
    description:
      'Une cuisine savoureuse, un service de qualité à Zagtouli (Ouagadougou). Menu du jour, Pizzas, Poulets, Soupes et Grillades. Tél : +226 02 80 99 06.',
    images: [
      {
        url: '/images/logo_gratitude.jpg',
        width: 800,
        height: 800,
        alt: 'Logo officiel Restaurant La Gratitude — Zagtouli, Ouagadougou'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Restaurant La Gratitude — Zagtouli, Ouagadougou',
    description:
      'Découvrez notre Menu du Jour et nos spécialités sur commande à Zagtouli (route de Bobo). Tél : +226 02 80 99 06.',
    images: ['/images/logo_gratitude.jpg']
  }
};

const restaurantJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: 'Restaurant La Gratitude',
  alternateName: 'La Gratitude Zagtouli',
  description:
    'Une cuisine savoureuse, un service de qualité à Zagtouli, route de Bobo, Ouagadougou, Burkina Faso.',
  image: `${SITE_URL}/images/logo_gratitude.jpg`,
  telephone: '+22602809906',
  priceRange: '1000 FCFA - 6500 FCFA',
  servesCuisine: ['Cuisine Burkinabè', 'Africaine', 'Grillades', 'Pizzas', 'Soupes'],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Zagtouli, Route Nationale N°1 (Route de Bobo-Dioulasso)',
    addressLocality: 'Ouagadougou',
    addressCountry: 'BF'
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 12.3289,
    longitude: -1.6289
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ],
      opens: '07:00',
      closes: '23:00'
    }
  ]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
