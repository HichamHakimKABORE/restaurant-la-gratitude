/**
 * Protection contre les attaques CSRF (Cross-Site Request Forgery).
 * Vérifie que toute requête de modification (POST, PATCH, DELETE, PUT)
 * provient strictement du même hôte et du même protocole que le serveur.
 */
export function isAllowedOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site' || secFetchSite === 'same-site') {
    return false;
  }

  const rawHost = request.headers.get('host');
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const effectiveHost = forwardedHost || rawHost;
  if (!effectiveHost) return false;

  // Vérifie la cohérence entre Host et l'URL de requête si les deux sont présents
  try {
    const reqUrlHost = new URL(request.url).host;
    if (reqUrlHost && rawHost && reqUrlHost !== rawHost && reqUrlHost !== forwardedHost) {
      return false;
    }
  } catch {}

  const expectHttps =
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.url.startsWith('https://');

  const isSameOriginUrl = (rawUrl: string): boolean => {
    try {
      const parsed = new URL(rawUrl);
      if (expectHttps && parsed.protocol !== 'https:') return false;
      return parsed.host === effectiveHost || parsed.host === rawHost;
    } catch {
      return false;
    }
  };

  const origin = request.headers.get('origin');
  if (origin) {
    return isSameOriginUrl(origin);
  }

  const referer = request.headers.get('referer');
  if (referer) {
    return isSameOriginUrl(referer);
  }

  return secFetchSite === 'same-origin';
}
