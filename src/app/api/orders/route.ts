import { NextResponse } from 'next/server';
import {
  ensureNeonSchema,
  getMemoryOrders,
  invalidateOrdersCache,
  Order
} from '@/lib/db';

export const dynamic = 'force-dynamic';

const ORDERS_CACHE_TTL_MS = 4000; // 4s RAM cache, invalidated immediately on POST/PATCH/DELETE

export async function GET() {
  try {
    if (
      global._ordersCache &&
      Date.now() - global._ordersCache.ts < ORDERS_CACHE_TTL_MS
    ) {
      return NextResponse.json({
        source: 'cache',
        orders: global._ordersCache.data
      });
    }

    const sql = await ensureNeonSchema();
    if (sql) {
      const rows = (await sql`
        SELECT id, order_code, customer_name, customer_phone, order_type, order_detail, payment_method, items_json, total_cfa, status, notes, created_at
        FROM orders
        ORDER BY id DESC
      `) as Order[];
      global._ordersCache = { data: rows, ts: Date.now() };
      return NextResponse.json({ source: 'neon', orders: rows });
    }
    return NextResponse.json({ source: 'memory', orders: getMemoryOrders() });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({
      source: 'fallback',
      orders: global._ordersCache?.data || getMemoryOrders()
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      order_type,
      order_detail,
      payment_method,
      items,
      total_cfa,
      notes
    } = body;

    if (!customer_name?.trim() || !customer_phone?.trim() || !order_detail?.trim()) {
      return NextResponse.json(
        { error: 'Le nom, le numéro de téléphone et la précision (table / adresse / heure) sont obligatoires' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Le panier ne peut pas être vide' },
        { status: 400 }
      );
    }

    const code = `#CMD-2026-${Math.floor(100 + Math.random() * 900)}`;
    const sql = await ensureNeonSchema();

    if (sql) {
      await sql`
        INSERT INTO orders (order_code, customer_name, customer_phone, order_type, order_detail, payment_method, items_json, total_cfa, status, notes)
        VALUES (
          ${code},
          ${customer_name || 'Client Web'},
          ${customer_phone || '+226'},
          ${order_type || 'Sur place'},
          ${order_detail || ''},
          ${payment_method || 'Espèces'},
          ${JSON.stringify(items || [])}::jsonb,
          ${Number(total_cfa || 0)},
          'En cours',
          ${notes || ''}
        )
      `;
      const rows = (await sql`SELECT * FROM orders ORDER BY id DESC`) as Order[];
      global._ordersCache = { data: rows, ts: Date.now() };
      return NextResponse.json({ ok: true, order_code: code, orders: rows });
    } else {
      invalidateOrdersCache();
      const mem = getMemoryOrders();
      const newOrder: Order = {
        id: mem.length > 0 ? Math.max(...mem.map(o => o.id)) + 1 : 1,
        order_code: code,
        customer_name: customer_name || 'Client Web',
        customer_phone: customer_phone || '+226',
        order_type: order_type || 'Sur place',
        order_detail: order_detail || '',
        payment_method: payment_method || 'Espèces',
        items_json: items || [],
        total_cfa: Number(total_cfa || 0),
        status: 'En cours',
        notes: notes || '',
        created_at: new Date().toISOString()
      };
      mem.unshift(newOrder);
      return NextResponse.json({ ok: true, order_code: code, orders: mem });
    }
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    const sql = await ensureNeonSchema();

    if (sql) {
      await sql`UPDATE orders SET status = ${status} WHERE id = ${Number(id)}`;
      const rows = (await sql`SELECT * FROM orders ORDER BY id DESC`) as Order[];
      global._ordersCache = { data: rows, ts: Date.now() };
      return NextResponse.json({ ok: true, orders: rows });
    } else {
      invalidateOrdersCache();
      const mem = getMemoryOrders();
      const target = mem.find(o => o.id === Number(id));
      if (target && status) target.status = status;
      return NextResponse.json({ ok: true, orders: mem });
    }
  } catch (error) {
    console.error('PATCH /api/orders error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const sql = await ensureNeonSchema();
    if (sql) {
      await sql`DELETE FROM orders WHERE id = ${id}`;
      const rows = (await sql`SELECT * FROM orders ORDER BY id DESC`) as Order[];
      global._ordersCache = { data: rows, ts: Date.now() };
      return NextResponse.json({ ok: true, orders: rows });
    } else {
      invalidateOrdersCache();
      const mem = getMemoryOrders();
      const idx = mem.findIndex(o => o.id === id);
      if (idx !== -1) mem.splice(idx, 1);
      return NextResponse.json({ ok: true, orders: mem });
    }
  } catch (error) {
    console.error('DELETE /api/orders error:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
