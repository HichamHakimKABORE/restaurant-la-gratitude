import { NextResponse } from 'next/server';
import { ensureNeonSchema, getMemorySettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = await ensureNeonSchema();
    if (sql) {
      await sql`
        UPDATE restaurant_settings
        SET phone = '+226 02 80 99 06', whatsapp = '22602809906'
        WHERE id = 1 AND (phone LIKE '%60%18%' OR whatsapp LIKE '%6018%' OR phone IS NULL);
      `;
      const rows = await sql`SELECT * FROM restaurant_settings WHERE id = 1`;
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
  try {
    const body = await request.json();
    const {
      restaurant_name,
      slogan,
      sub_slogan,
      phone,
      whatsapp,
      address,
      opening_hours
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
      const rows = await sql`SELECT * FROM restaurant_settings WHERE id = 1`;
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
