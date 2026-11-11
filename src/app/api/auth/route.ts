import { NextResponse } from 'next/server';
import {
  clearAdminSession,
  clearLoginFailures,
  getLoginFailureCounts,
  hasAdminSession,
  recordLoginFailure,
  setAdminSession,
  verifyAdminCredentials
} from '@/lib/auth-server';
import { ensureNeonSchema, recordAdminAuditLog } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isAllowedOrigin } from '@/lib/csrf';
import { readJsonObjectBody } from '@/lib/request-body';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FAILURES_PER_IP = 8;
const HIGH_GLOBAL_FAILURE_THRESHOLD = 40;

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: 'Origine non autorisée (CSRF).' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const parsed = await readJsonObjectBody(request, 16 * 1024, 'Requête trop volumineuse.');
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const clientIp = getClientIp(request);

    if (body.action === 'logout') {
      if (await hasAdminSession()) {
        await recordAdminAuditLog('admin_logout', null, 'Déconnexion administrateur', clientIp).catch(() => {});
      }
      clearAdminSession();
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // 1re barrière : limiteur rapide en mémoire.
    const limit = rateLimit(`login:${clientIp}`, 8, 15 * 60_000);
    if (!limit.allowed) {
      await recordAdminAuditLog('admin_login_blocked', null, 'Limite de tentatives en mémoire atteinte', clientIp).catch(() => {});
      return NextResponse.json(
        {
          ok: false,
          error: `Trop de tentatives de connexion. Réessayez dans ${limit.retryAfter} secondes.`
        },
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 2e barrière : compteur d'échecs partagé dans la base (valable sur tous les serveurs).
    // Le blocage est appliqué par IP uniquement (évite qu'un attaquant ne verrouille l'admin légitime).
    let highGlobalActivity = false;
    try {
      const counts = await getLoginFailureCounts(clientIp);
      if (counts.ip >= MAX_FAILURES_PER_IP) {
        await recordAdminAuditLog('admin_login_blocked', null, 'Blocage IP en base (429)', clientIp).catch(() => {});
        return NextResponse.json(
          {
            ok: false,
            error: 'Trop de tentatives de connexion depuis cet appareil. Réessayez dans 15 minutes.'
          },
          { status: 429, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      if (counts.total >= HIGH_GLOBAL_FAILURE_THRESHOLD) {
        highGlobalActivity = true;
      }
    } catch (err) {
      console.warn('[AUTH] Compteur d’échecs indisponible :', err);
    }

    if (highGlobalActivity) {
      await new Promise(resolve => setTimeout(resolve, 900));
    }

    if (!(await verifyAdminCredentials(body.email, body.password))) {
      try {
        await recordLoginFailure(clientIp);
      } catch (err) {
        console.warn('[AUTH] Enregistrement de l’échec impossible :', err);
      }
      await recordAdminAuditLog('admin_login_failed', null, 'Échec de connexion administrateur', clientIp).catch(() => {});
      // Ralentit le bruteforce même quand le limiteur est contourné.
      await new Promise(resolve => setTimeout(resolve, 350));
      return NextResponse.json(
        { ok: false, error: 'Identifiant ou mot de passe incorrect.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    try {
      await clearLoginFailures(clientIp);
    } catch {}

    await setAdminSession();
    await recordAdminAuditLog('admin_login_success', null, 'Connexion administrateur réussie', clientIp).catch(() => {});
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function GET() {
  const authenticated = await hasAdminSession();
  let databaseConnected: boolean | undefined;

  // L'état de la base n'est révélé qu'à l'administrateur connecté.
  if (authenticated) {
    try {
      const sql = await ensureNeonSchema();
      databaseConnected = Boolean(sql);
      if (sql) await sql`SELECT 1`;
    } catch {
      databaseConnected = false;
    }
  }

  return NextResponse.json(
    {
      authenticated,
      ...(authenticated ? { database_connected: databaseConnected } : {})
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
