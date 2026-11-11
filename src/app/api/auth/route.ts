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
import { ensureNeonSchema } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isAllowedOrigin } from '@/lib/csrf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FAILURES_PER_IP = 8;
const HIGH_GLOBAL_FAILURE_THRESHOLD = 40;

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: 'Origine non autorisée (CSRF).' },
      { status: 403 }
    );
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 16 * 1024) {
    return NextResponse.json(
      { ok: false, error: 'Requête trop volumineuse.' },
      { status: 413 }
    );
  }
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Corps de requête invalide.' },
        { status: 400 }
      );
    }

    if (body.action === 'logout') {
      clearAdminSession();
      return NextResponse.json({ ok: true });
    }

    const clientIp = getClientIp(request);

    // 1re barrière : limiteur rapide en mémoire.
    const limit = rateLimit(`login:${clientIp}`, 8, 15 * 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Trop de tentatives de connexion. Réessayez dans ${limit.retryAfter} secondes.`
        },
        { status: 429 }
      );
    }

    // 2e barrière : compteur d'échecs partagé dans la base (valable sur tous les serveurs).
    // Le blocage est appliqué par IP uniquement (évite qu'un attaquant ne verrouille l'admin légitime).
    let highGlobalActivity = false;
    try {
      const counts = await getLoginFailureCounts(clientIp);
      if (counts.ip >= MAX_FAILURES_PER_IP) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Trop de tentatives de connexion depuis cet appareil. Réessayez dans 15 minutes.'
          },
          { status: 429 }
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
      // Ralentit le bruteforce même quand le limiteur est contourné.
      await new Promise(resolve => setTimeout(resolve, 350));
      return NextResponse.json(
        { ok: false, error: 'Identifiant ou mot de passe incorrect.' },
        { status: 401 }
      );
    }

    try {
      await clearLoginFailures(clientIp);
    } catch {}

    await setAdminSession();
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur.' },
      { status: 500 }
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
