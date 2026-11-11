import { NextResponse } from 'next/server';
import {
  ensureNeonSchema,
  getMemorySettings,
  invalidateSettingsCache,
  recordAdminAuditLog,
  type RestaurantSettings
} from '@/lib/db';
import {
  isAdminRequest,
  verifyCurrentAdminPassword,
  updateAdminCredentials,
  setAdminSession,
  MIN_ADMIN_PASSWORD_LENGTH
} from '@/lib/auth-server';
import { isAllowedOrigin } from '@/lib/csrf';
import { getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const SETTINGS_CACHE_TTL_MS = 10000;

export async function GET() {
  try {
    if (
      global._settingsCache &&
      Date.now() - global._settingsCache.ts < SETTINGS_CACHE_TTL_MS
    ) {
      return NextResponse.json({
        source: 'cache',
        settings: global._settingsCache.data
      });
    }

    const sql = await ensureNeonSchema();
    if (sql) {
      const rows = (await sql`
        SELECT id, restaurant_name, slogan, sub_slogan, phone, whatsapp, address, opening_hours
        FROM restaurant_settings
        WHERE id = 1
      `) as RestaurantSettings[];
      if (rows.length > 0) {
        global._settingsCache = { data: rows[0], ts: Date.now() };
        return NextResponse.json({ source: 'neon', settings: rows[0] });
      }
    }
    return NextResponse.json({ source: 'memory', settings: getMemorySettings() });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({
      source: 'fallback',
      settings: global._settingsCache?.data || getMemorySettings()
    });
  }
}

export async function PATCH(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origine de requête non autorisée (CSRF).' }, { status: 403 });
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Session expirée. Veuillez vous reconnecter.' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const {
      restaurant_name,
      slogan,
      sub_slogan,
      phone,
      whatsapp,
      address,
      opening_hours,
      current_admin_password,
      new_admin_email,
      new_admin_password
    } = body;

    const wantsCredentialsChange =
      (typeof new_admin_email === 'string' && new_admin_email.trim() !== '') ||
      (typeof new_admin_password === 'string' && new_admin_password.trim() !== '');

    if (wantsCredentialsChange) {
      if (!current_admin_password || typeof current_admin_password !== 'string') {
        return NextResponse.json(
          { error: 'Le mot de passe Admin actuel est obligatoire pour modifier vos accès.' },
          { status: 400 }
        );
      }

      const isCurrentValid = await verifyCurrentAdminPassword(current_admin_password);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: 'Mot de passe Admin actuel incorrect.' },
          { status: 403 }
        );
      }

      const emailTrim = (new_admin_email || '').trim();
      const pwdTrim = (new_admin_password || '').trim();

      if (!emailTrim || !pwdTrim) {
        return NextResponse.json(
          { error: 'Veuillez saisir à la fois le nouvel identifiant et le nouveau mot de passe.' },
          { status: 400 }
        );
      }

      if (pwdTrim.length < MIN_ADMIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { error: `Le nouveau mot de passe doit comporter au moins ${MIN_ADMIN_PASSWORD_LENGTH} caractères.` },
          { status: 400 }
        );
      }

      const updated = await updateAdminCredentials(emailTrim, pwdTrim);
      if (!updated) {
        return NextResponse.json(
          { error: 'Impossible de modifier les identifiants (base de données indisponible).' },
          { status: 500 }
        );
      }

      // Renouvelle immédiatement la session locale de l'admin pour qu'il ne soit pas déconnecté
      await setAdminSession();
    }

    const sql = await ensureNeonSchema();
    invalidateSettingsCache();
    if (sql) {
      await sql`
        UPDATE restaurant_settings
        SET
          restaurant_name = COALESCE(${restaurant_name ?? null}, restaurant_name),
          slogan = COALESCE(${slogan ?? null}, slogan),
          sub_slogan = COALESCE(${sub_slogan ?? null}, sub_slogan),
          phone = COALESCE(${phone ?? null}, phone),
          whatsapp = COALESCE(${whatsapp ?? null}, whatsapp),
          address = COALESCE(${address ?? null}, address),
          opening_hours = COALESCE(${opening_hours ?? null}, opening_hours),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `;

      const rows = (await sql`
        SELECT id, restaurant_name, slogan, sub_slogan, phone, whatsapp, address, opening_hours
        FROM restaurant_settings
        WHERE id = 1
      `) as RestaurantSettings[];
      if (rows[0]) {
        global._settingsCache = { data: rows[0], ts: Date.now() };
      }
      const clientIp = getClientIp(request);
      await recordAdminAuditLog(
        'settings_updated',
        '1',
        wantsCredentialsChange ? 'Paramètres et identifiants modifiés' : 'Paramètres généraux modifiés',
        clientIp
      );

      return NextResponse.json({ ok: true, source: 'neon', settings: rows[0] });
    } else {
      const mem = getMemorySettings();
      if (restaurant_name !== undefined) mem.restaurant_name = restaurant_name;
      if (slogan !== undefined) mem.slogan = slogan;
      if (sub_slogan !== undefined) mem.sub_slogan = sub_slogan;
      if (phone !== undefined) mem.phone = phone;
      if (whatsapp !== undefined) mem.whatsapp = whatsapp;
      if (address !== undefined) mem.address = address;
      if (opening_hours !== undefined) mem.opening_hours = opening_hours;
      return NextResponse.json({ ok: true, source: 'memory', settings: mem });
    }
  } catch (error) {
    console.error('PATCH /api/settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
