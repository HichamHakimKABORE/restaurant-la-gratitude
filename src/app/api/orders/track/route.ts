import { NextResponse } from 'next/server';
import { ensureNeonSchema, getMemoryOrders, type Order } from '@/lib/db';
import { getRestaurantInfo } from '@/lib/order-service';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const TOKEN_PATTERN = /^[a-f0-9]{32,64}$/i;

/**
 * Suivi public d'une commande.
 * Le client ne peut lire QUE les commandes dont il possède le jeton secret
 * (192 bits aléatoires). Aucun accès à la liste complète, aucun accès par
 * simple numéro de téléphone ou code court.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTokens = (searchParams.get('tokens') || '')
    .split(',')
    .map(token => token.trim())
    .filter(Boolean);

  const clientIp = getClientIp(request);
  const limit = rateLimit(`track:${clientIp}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans un instant.' },
      { status: 429, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const sql = await ensureNeonSchema();
    const restaurant = await getRestaurantInfo(sql);

    if (rawTokens.length === 0) {
      return NextResponse.json(
        { orders: [], restaurant },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (rawTokens.length > 20) {
      return NextResponse.json(
        { error: 'Trop de commandes demandées.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!rawTokens.every(token => TOKEN_PATTERN.test(token))) {
      return NextResponse.json(
        { error: 'Jeton de suivi invalide.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (sql) {
      const rows = (await sql`
        SELECT id, order_code, customer_name, customer_phone, order_type,
               order_detail, payment_method, payment_ref, items_json, total_cfa,
               status, notes, created_at
        FROM orders
        WHERE track_token IN (
          SELECT value FROM jsonb_array_elements_text(${JSON.stringify(rawTokens)}::jsonb)
        )
        ORDER BY id DESC
      `) as Order[];

      return NextResponse.json(
        { orders: rows, restaurant },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const memoryOrders = getMemoryOrders().filter(
      order => order.track_token && rawTokens.includes(order.track_token)
    );

    return NextResponse.json(
      { orders: memoryOrders, restaurant },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('GET /api/orders/track error:', error);
    return NextResponse.json(
      { orders: [], restaurant: await getRestaurantInfo(null) },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
