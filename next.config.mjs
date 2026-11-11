const isDev = process.env.NODE_ENV !== 'production';

// Politique de sécurité du contenu : seules les sources nécessaires au site sont autorisées.
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injecte de petits scripts en ligne ; 'unsafe-eval' uniquement en développement.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Photos du site, photos téléversées (Base64) et générateurs de QR Code.
  "img-src 'self' data: blob: https://api.qrserver.com https://quickchart.io",
  "connect-src 'self'",
  // Carte Google Maps de la page Contact.
  "frame-src https://www.google.com https://maps.google.com https://*.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self)'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy }
        ]
      }
    ];
  }
};

export default nextConfig;
