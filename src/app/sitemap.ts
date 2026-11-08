import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://restaurantlagratitude.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${BASE_URL}/menu-du-jour`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95
    },
    {
      url: `${BASE_URL}/menu`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85
    },
    {
      url: `${BASE_URL}/commander`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8
    }
  ];
}
