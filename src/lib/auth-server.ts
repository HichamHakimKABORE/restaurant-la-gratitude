import { cookies } from 'next/headers';
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual as nodeTimingSafeEqual
} from 'node:crypto';
import { ensureNeonSchema } from './db';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  readSessionCookie,
  readSessionPayload,
  timingSafeEqual,
  timingSafeEqualDigest
} from './session';

declare global {
  // eslint-disable-next-line no-var
  var _adminValidAfterCache: { value: number; ts: number } | undefined;
}

export const MIN_ADMIN_PASSWORD_LENGTH = 8;

const SCRYPT_KEYLEN = 64;
const SCRYPT_PREFIX = 'scrypt$';
const VALID_AFTER_CACHE_MS = 5000;

// ---------------------------------------------------------------------------
// Hachage des mots de passe : scrypt avec un sel aléatoire propre à chaque mot
// de passe. Les anciens hash SHA-256 restent acceptés puis sont convertis
// automatiquement au premier login réussi.
// ---------------------------------------------------------------------------

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password.normalize('NFKC'),
      salt,
      SCRYPT_KEYLEN,
      (err, key) => (err ? reject(err) : resolve(key))
    );
  });
}

function legacySha256(plain: string): string {
  return createHash('sha256').update(`gratitude-pwd-v1:${plain}`).digest('hex');
}

export async function hashAdminPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(plain, salt);
  return `${SCRYPT_PREFIX}${salt.toString('hex')}$${key.toString('hex')}`;
}

async function verifyPasswordHash(
  plain: string,
  stored: string
): Promise<{ ok: boolean; legacy: boolean }> {
  if (stored.startsWith(SCRYPT_PREFIX)) {
    const [, saltHex, keyHex] = stored.split('$');
    if (!saltHex || !keyHex) return { ok: false, legacy: false };
    const expected = Buffer.from(keyHex, 'hex');
    const actual = await deriveKey(plain, Buffer.from(saltHex, 'hex'));
    return {
      ok: expected.length === actual.length && nodeTimingSafeEqual(expected, actual),
      legacy: false
    };
  }
  return { ok: timingSafeEqual(legacySha256(plain), stored), legacy: true };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

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
  cookies().set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

/**
 * Date (ms) avant laquelle toutes les sessions sont considérées comme révoquées.
 * Elle est mise à jour à chaque changement d'identifiants Admin.
 */
async function getSessionValidAfter(): Promise<number> {
  const cached = global._adminValidAfterCache;
  if (cached && Date.now() - cached.ts < VALID_AFTER_CACHE_MS) return cached.value;
  const sql = await ensureNeonSchema();
  if (!sql) {
    if (process.env.DATABASE_URL?.trim()) {
      throw new Error('Base de données indisponible pour vérifier la session.');
    }
    return 0;
  }
  const rows = await sql`SELECT session_valid_after FROM restaurant_settings WHERE id = 1`;
  const value = Number(rows[0]?.session_valid_after || 0);
  global._adminValidAfterCache = { value, ts: Date.now() };
  return value;
}

export async function revokeAllAdminSessions(): Promise<void> {
  global._adminValidAfterCache = undefined;
  const sql = await ensureNeonSchema();
  if (!sql) return;
  await sql`
    UPDATE restaurant_settings
    SET session_valid_after = ${Date.now()}
    WHERE id = 1
  `;
}

export async function isValidAdminToken(token?: string | null): Promise<boolean> {
  const payload = await readSessionPayload(token);
  if (!payload) return false;
  try {
    const validAfter = await getSessionValidAfter();
    return payload.iat >= validAfter;
  } catch (err) {
    console.warn('[AUTH] Vérification de révocation indisponible :', err);
    return false;
  }
}

/** Vérifie qu'une requête API provient bien de l'administrateur connecté (session non révoquée). */
export async function isAdminRequest(request: Request): Promise<boolean> {
  return isValidAdminToken(readSessionCookie(request.headers.get('cookie')));
}

export async function hasAdminSession(): Promise<boolean> {
  return isValidAdminToken(cookies().get(SESSION_COOKIE)?.value);
}

// ---------------------------------------------------------------------------
// Identifiants
// ---------------------------------------------------------------------------

async function getCustomCredentials(): Promise<{ email: string; hash: string } | null> {
  const sql = await ensureNeonSchema();
  if (!sql) {
    if (process.env.DATABASE_URL?.trim()) {
      throw new Error('Base de données indisponible pour vérifier les identifiants.');
    }
    return null;
  }
  const rows = await sql`
    SELECT admin_custom_email, admin_custom_password_hash
    FROM restaurant_settings
    WHERE id = 1
  `;
  const email = String(rows[0]?.admin_custom_email || '').trim().toLowerCase();
  const hash = String(rows[0]?.admin_custom_password_hash || '').trim();
  return email && hash ? { email, hash } : null;
}

async function verifyEnvCredentials(inputEmail: string, password: string): Promise<boolean> {
  const expectedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || '';

  if (!expectedEmail || !expectedPassword) {
    console.error(
      '[AUTH] ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans les variables d’environnement.'
    );
    return false;
  }

  const [emailOk, passwordOk] = await Promise.all([
    timingSafeEqualDigest(inputEmail, expectedEmail),
    timingSafeEqualDigest(password, expectedPassword)
  ]);
  return emailOk && passwordOk;
}

/**
 * Vérifie les identifiants admin :
 * - Si l'admin a défini ses propres identifiants (base Neon), SEULS ceux-ci sont valables.
 *   L'ancien couple ADMIN_EMAIL / ADMIN_PASSWORD de Vercel est alors désactivé.
 * - Procédure de secours (mot de passe oublié) : définir ADMIN_FORCE_ENV_LOGIN=true
 *   dans Vercel réactive temporairement le couple ADMIN_EMAIL / ADMIN_PASSWORD.
 * - Sans identifiants personnalisés, on utilise ADMIN_EMAIL / ADMIN_PASSWORD.
 */
export async function verifyAdminCredentials(
  email: unknown,
  password: unknown
): Promise<boolean> {
  if (typeof email !== 'string' || typeof password !== 'string') return false;
  if (password.length > 200 || email.length > 200) return false;
  const inputEmail = email.trim().toLowerCase();

  let custom: { email: string; hash: string } | null = null;
  try {
    custom = await getCustomCredentials();
  } catch (err) {
    console.error('[AUTH] Lecture des identifiants personnalisés impossible :', err);
    return false;
  }

  if (custom) {
    const emailOk = await timingSafeEqualDigest(inputEmail, custom.email);
    const check = await verifyPasswordHash(password, custom.hash);
    if (emailOk && check.ok) {
      if (check.legacy) {
        try {
          const upgraded = await hashAdminPassword(password);
          const sql = await ensureNeonSchema();
          if (sql) {
            await sql`UPDATE restaurant_settings SET admin_custom_password_hash = ${upgraded} WHERE id = 1`;
          }
        } catch (err) {
          console.warn('[AUTH] Mise à niveau du hash impossible :', err);
        }
      }
      return true;
    }
    if (process.env.ADMIN_FORCE_ENV_LOGIN !== 'true') return false;
  }

  return await verifyEnvCredentials(inputEmail, password);
}

/** Vérifie le mot de passe ACTUEL (exigé avant tout changement d'accès Admin). */
export async function verifyCurrentAdminPassword(password: unknown): Promise<boolean> {
  if (typeof password !== 'string' || !password || password.length > 200) return false;
  let custom: { email: string; hash: string } | null = null;
  try {
    custom = await getCustomCredentials();
  } catch {
    return false;
  }
  if (custom) {
    return (await verifyPasswordHash(password, custom.hash)).ok;
  }
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && (await timingSafeEqualDigest(password, expected));
}

/**
 * Enregistre les nouveaux identifiants et révoque TOUTES les sessions existantes
 * (autres appareils, cookies copiés...). L'appelant doit ensuite recréer la session
 * de l'admin courant avec setAdminSession().
 */
export async function updateAdminCredentials(
  email: string,
  newPassword: string
): Promise<boolean> {
  const sql = await ensureNeonSchema();
  if (!sql) return false;
  const hash = await hashAdminPassword(newPassword);
  await sql`
    UPDATE restaurant_settings
    SET admin_custom_email = ${email.trim().toLowerCase()},
        admin_custom_password_hash = ${hash},
        session_valid_after = ${Date.now()}
    WHERE id = 1
  `;
  global._adminValidAfterCache = undefined;
  return true;
}

// ---------------------------------------------------------------------------
// Limitation des tentatives de connexion, partagée entre tous les serveurs
// (stockée dans la base Neon, donc impossible à contourner en changeant de serveur).
// ---------------------------------------------------------------------------

export async function getLoginFailureCounts(
  ip: string
): Promise<{ ip: number; total: number }> {
  const sql = await ensureNeonSchema();
  if (!sql) return { ip: 0, total: 0 };
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE ip = ${ip})::int AS ip_count,
      COUNT(*)::int AS total
    FROM admin_login_failures
    WHERE created_at > NOW() - INTERVAL '15 minutes'
  `;
  return { ip: rows[0]?.ip_count ?? 0, total: rows[0]?.total ?? 0 };
}

export async function recordLoginFailure(ip: string): Promise<void> {
  const sql = await ensureNeonSchema();
  if (!sql) return;
  await sql`INSERT INTO admin_login_failures (ip) VALUES (${ip})`;
  await sql`DELETE FROM admin_login_failures WHERE created_at < NOW() - INTERVAL '1 day'`;
}

export async function clearLoginFailures(ip: string): Promise<void> {
  const sql = await ensureNeonSchema();
  if (!sql) return;
  await sql`DELETE FROM admin_login_failures WHERE ip = ${ip}`;
}
