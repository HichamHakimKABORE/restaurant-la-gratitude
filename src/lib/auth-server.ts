import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  timingSafeEqual,
  verifySessionToken
} from './session';

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
 * Vérifie les identifiants admin.
 * Aucun mot de passe par défaut : si ADMIN_EMAIL / ADMIN_PASSWORD ne sont pas
 * configurés, la connexion est refusée (et l'erreur est journalisée).
 */
export function verifyAdminCredentials(
  email: unknown,
  password: unknown
): boolean {
  const expectedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || '';

  if (!expectedEmail || !expectedPassword) {
    console.error(
      '[AUTH] ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans les variables d’environnement.'
    );
    return false;
  }
  if (typeof email !== 'string' || typeof password !== 'string') return false;

  const emailOk = timingSafeEqual(email.trim().toLowerCase(), expectedEmail);
  const passwordOk = timingSafeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}
