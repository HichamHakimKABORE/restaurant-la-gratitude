/**
 * Protection contre les attaques CSRF (Cross-Site Request Forgery).
 * Vérifie que toute requête de modification (POST, PATCH, DELETE, PUT)
 * provient strictement du même hôte que le site.
 */
export function isAllowedOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return false;
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get('referer');
  if (referer && host) {
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  return secFetchSite === 'same-origin';
}
