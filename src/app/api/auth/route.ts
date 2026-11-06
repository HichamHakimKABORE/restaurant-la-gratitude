import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === 'logout') {
      cookies().delete('gratitude_admin_session');
      return NextResponse.json({ ok: true });
    }

    const { email, password } = body;
    const expectedEmail = process.env.ADMIN_EMAIL || 'admin@lagratitude.bf';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'gratitude2026';

    if (
      email?.trim().toLowerCase() === expectedEmail.toLowerCase() &&
      password === expectedPassword
    ) {
      cookies().set('gratitude_admin_session', 'authenticated_lagratitude_2026', {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: 'Identifiant ou mot de passe incorrect.' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ ok: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET() {
  const session = cookies().get('gratitude_admin_session')?.value;
  return NextResponse.json({
    authenticated: session === 'authenticated_lagratitude_2026'
  });
}
