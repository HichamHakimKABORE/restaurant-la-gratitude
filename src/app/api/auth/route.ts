import { NextResponse } from 'next/server';
import {
  clearAdminSession,
  hasAdminSession,
  setAdminSession,
  verifyAdminCredentials
} from '@/lib/auth-server';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
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

    if (!verifyAdminCredentials(body.email, body.password)) {
      // Ralentit le bruteforce même quand le limiteur est contourné.
      await new Promise(resolve => setTimeout(resolve, 350));
      return NextResponse.json(
        { ok: false, error: 'Identifiant ou mot de passe incorrect.' },
        { status: 401 }
      );
    }

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
  return NextResponse.json(
    { authenticated: await hasAdminSession() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
