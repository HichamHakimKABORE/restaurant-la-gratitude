import { cookies } from 'next/headers';
import { ensureNeonSchema } from './db';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  timingSafeEqual,
  verifySessionToken
} from './session';

const encoder = new TextEncoder();

export async function hashAdminPassword(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`gratitude-pwd-v1:${plain}`)
  );
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/** Crée une session signée et la place dans un cookie httpOnly. */
export async function setAdminSession(): Promise<void> {
  const token = await createSessionToken();
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export function clearAdminSession(): void {
  cookies().delete(SESSION_COOKIE);
}

export async function hasAdminSession(): Promise<boolean> {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
}

/**
 * Vérifie les identifiants admin :
 * 1. D'abord par rapport aux identifiants personnalisés enregistrés par l'admin dans Neon PostgreSQL (si définis).
 * 2. Sinon (ou en secours), par rapport aux variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD.
 */
export async function verifyAdminCredentials(
  email: unknown,
  password: unknown
): Promise<boolean> {
  if (typeof email !== 'string' || typeof password !== 'string') return false;
  const inputEmail = email.trim().toLowerCase();

  try {
    const sql = await ensureNeonSchema();
    if (sql) {
      const rows = await sql`
        SELECT admin_custom_email, admin_custom_password_hash
        FROM restaurant_settings
        WHERE id = 1
      `;
      const customEmail = (rows[0]?.admin_custom_email || '').trim().toLowerCase();
      const customHash = (rows[0]?.admin_custom_password_hash || '').trim();
      if (customEmail && customHash) {
        const inputHash = await hashAdminPassword(password);
        if (
          timingSafeEqual(inputEmail, customEmail) &&
          timingSafeEqual(inputHash, customHash)
        ) {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('[AUTH] Neon custom check fallback:', err);
  }

  const expectedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || '';

  if (!expectedEmail || !expectedPassword) {
    console.error(
      '[AUTH] ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans les variables d’environnement.'
    );
    return false;
  }

  const emailOk = timingSafeEqual(inputEmail, expectedEmail);
  const passwordOk = timingSafeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}
