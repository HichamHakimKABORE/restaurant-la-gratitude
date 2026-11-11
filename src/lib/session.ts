/**
 * Session administrateur signée (HMAC-SHA256).
 * Compatible Edge (middleware) et Node (route handlers) : uniquement Web Crypto.
 *
 * Le cookie ne contient plus une valeur statique : il contient
 * `<payload base64url>.<signature HMAC>`. Impossible à forger sans le secret.
 */

export const SESSION_COOKIE = 'gratitude_admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 h

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getSecret(): string {
  const customSecret = process.env.ADMIN_SESSION_SECRET;
  if (customSecret && customSecret.trim().length >= 16) {
    return `la-gratitude-session-hmac:${customSecret.trim()}`;
  }
  // Dérivation renforcée : combine le mot de passe et l'URL secrète de la base Neon
  // Un attaquant connaissant uniquement ADMIN_PASSWORD ne peut pas forger de cookie.
  const base = process.env.ADMIN_PASSWORD || 'la-gratitude-root-pwd';
  const dbBound = process.env.DATABASE_URL || 'no-db-bound';
  return `la-gratitude-session-derived:${base}:${dbBound}`;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  return toBase64Url(new Uint8Array(signature));
}

/** Comparaison à temps constant (évite les attaques temporelles). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createSessionToken(
  ttlSeconds: number = SESSION_MAX_AGE_SECONDS
): Promise<string> {
  const now = Date.now();
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        sub: 'admin',
        iat: now,
        exp: now + ttlSeconds * 1000
      })
    )
  );
  return `${payload}.${await sign(payload)}`;
}

export interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

/** Lit et vérifie (signature + expiration) le contenu d'un jeton de session. */
export async function readSessionPayload(
  token?: string | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const expected = await sign(parts[0]);
    if (!timingSafeEqual(parts[1], expected)) return null;
    const payload = JSON.parse(decoder.decode(fromBase64Url(parts[0])));
    if (
      payload?.sub === 'admin' &&
      typeof payload.exp === 'number' &&
      typeof payload.iat === 'number' &&
      payload.exp > Date.now()
    ) {
      return payload as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifySessionToken(
  token?: string | null
): Promise<boolean> {
  return (await readSessionPayload(token)) !== null;
}

export function readSessionCookie(
  cookieHeader: string | null | undefined
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Vérifie qu'une requête API provient bien de l'administrateur connecté. */
export async function isAdminRequest(request: Request): Promise<boolean> {
  return verifySessionToken(readSessionCookie(request.headers.get('cookie')));
}
