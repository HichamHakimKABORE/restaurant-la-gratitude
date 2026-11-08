import { NextResponse } from 'next/server';
import { ensureNeonSchema, getMemorySettings } from '@/lib/db';
import { isAdminRequest } from '@/lib/session';
import { hashAdminPassword } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  try {
    const sql = await ensureNeonSchema();
    if (sql) {
      await sql`
        UPDATE restaurant_settings
        SET phone = '+226 02 80 99 06', whatsapp = '22602809906'
        WHERE id = 1 AND (phone LIKE '%60%18%' OR whatsapp LIKE '%6018%' OR phone IS NULL);
      `;
      const rows = await sql`
        SELECT id, restaurant_name, slogan, sub_slogan, phone, whatsapp, address, opening_hours
        FROM restaurant_settings
        WHERE id = 1
      `;
      if (rows.length > 0) {
        return NextResponse.json({ source: 'neon', settings: rows[0] });
      }
    }
    return NextResponse.json({ source: 'memory', settings: getMemorySettings() });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ source: 'fallback', settings: getMemorySettings() });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
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
      new_admin_email,
      new_admin_password
    } = body;

    const sql = await ensureNeonSchema();
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

      if (
        typeof new_admin_email === 'string' &&
        new_admin_email.trim() !== '' &&
        typeof new_admin_password === 'string' &&
        new_admin_password.trim().length >= 4
      ) {
        const pwdHash = await hashAdminPassword(new_admin_password.trim());
        await sql`
          UPDATE restaurant_settings
          SET
            admin_custom_email = ${new_admin_email.trim().toLowerCase()},
            admin_custom_password_hash = ${pwdHash}
          WHERE id = 1
        `;
      }

      const rows = await sql`
        SELECT id, restaurant_name, slogan, sub_slogan, phone, whatsapp, address, opening_hours
        FROM restaurant_settings
        WHERE id = 1
      `;
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
