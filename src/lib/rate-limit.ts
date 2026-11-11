/**
 * Limiteur de débit en mémoire (par instance).
 * Protège contre le spam de commandes et le bruteforce du login.
 * Sur un déploiement multi-instances, compléter par un limiteur partagé
 * (Upstash Redis / table Postgres) — mais ceci bloque déjà l'essentiel.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // Nettoyage opportuniste pour éviter une fuite mémoire.
  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function getClientIp(request: Request): string {
  // 1. En-têtes certifiés non falsifiables injectés par l'hébergeur / proxy de bordure (Vercel, Cloudflare)
  const realIp =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('cf-connecting-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim().split(',')[0].trim();
  }

  // 2. Si x-forwarded-for est utilisé, le DERNIER élément est celui ajouté par le proxy de bordure,
  // alors que le premier peut être forgé par le client HTTP.
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return '127.0.0.1';
}
