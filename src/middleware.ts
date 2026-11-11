import { NextResponse, type NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { SESSION_COOKIE, readSessionPayload } from '@/lib/session';

/**
 * Protection des pages admin côté serveur (Edge Middleware) :
 * - vérifie la signature HMAC, l'expiration ET la date de révocation en base (session_valid_after) ;
 * - force Cache-Control: no-store, private sur toutes les routes /admin/*.
 */
async function isTokenNotRevoked(issuedAtMs: number): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.trim()) {
    return process.env.NODE_ENV !== 'production';
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const cleanUrl = dbUrl.replace('&channel_binding=require', '');
    const sql = neon(cleanUrl, { fetchOptions: { signal: controller.signal } });
    const rows = await sql`
      SELECT session_valid_after
      FROM restaurant_settings
      WHERE id = 1
      LIMIT 1
    `;
    const validAfter = Number(rows[0]?.session_valid_after || 0);
    return issuedAtMs >= validAfter;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/admin/login') {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store, private');
    return res;
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = await readSessionPayload(token);
  if (payload && (await isTokenNotRevoked(payload.iat))) {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store, private');
    return res;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  const redirectRes = NextResponse.redirect(loginUrl);
  redirectRes.headers.set('Cache-Control', 'no-store, private');
  return redirectRes;
}

export const config = {
  matcher: ['/admin', '/admin/:path*']
};
