import { NextResponse } from 'next/server';
import {
  ensureNeonSchema,
  getMemoryDishes,
  invalidateDishesCache,
  Dish
} from '@/lib/db';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10000; // 10 seconds server RAM cache (invalidated immediately on any write)

export async function GET() {
  try {
    if (
      global._dishesCache &&
      Date.now() - global._dishesCache.ts < CACHE_TTL_MS
    ) {
      return NextResponse.json({
        source: 'cache',
        dishes: global._dishesCache.data
      });
    }

    const sql = await ensureNeonSchema();
    if (sql) {
      const rows = (await sql`
        SELECT id, slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order
        FROM dishes
        ORDER BY display_order ASC, id ASC
      `) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now() };
      return NextResponse.json({ source: 'neon', dishes: rows });
    }
    return NextResponse.json({ source: 'memory', dishes: getMemoryDishes() });
  } catch (error) {
    console.error('GET /api/dishes error:', error);
    return NextResponse.json({
      source: 'fallback',
      dishes: global._dishesCache?.data || getMemoryDishes()
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const sql = await ensureNeonSchema();

    const {
      id,
      is_available_today,
      stock_status,
      name,
      price,
      category,
      availability_mode,
      image_url,
      image_quadrant,
      options_json,
      description
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Dish ID required' }, { status: 400 });
    }

    if (sql) {
      await sql`
        UPDATE dishes
        SET
          name = COALESCE(${name ?? null}, name),
          price = COALESCE(${price !== undefined ? Number(price) : null}, price),
          category = COALESCE(${category ?? null}, category),
          availability_mode = COALESCE(${availability_mode ?? null}, availability_mode),
          is_available_today = COALESCE(${typeof is_available_today === 'boolean' ? is_available_today : null}, is_available_today),
          stock_status = COALESCE(${stock_status ?? null}, stock_status),
          image_url = COALESCE(${image_url ?? null}, image_url),
          image_quadrant = COALESCE(${image_quadrant ?? null}, image_quadrant),
          description = COALESCE(${description ?? null}, description),
          options_json = COALESCE(${options_json ? JSON.stringify(options_json) : null}::jsonb, options_json)
        WHERE id = ${Number(id)}
      `;
      const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now() };
      return NextResponse.json({ ok: true, source: 'neon', dishes: rows });
    } else {
      invalidateDishesCache();
      const mem = getMemoryDishes();
      const target = mem.find(d => d.id === Number(id));
      if (target) {
        if (typeof is_available_today === 'boolean') target.is_available_today = is_available_today;
        if (stock_status !== undefined) target.stock_status = stock_status;
        if (name !== undefined) target.name = name;
        if (price !== undefined) target.price = Number(price);
        if (category !== undefined) target.category = category;
        if (availability_mode !== undefined) target.availability_mode = availability_mode;
        if (image_url !== undefined) target.image_url = image_url;
        if (image_quadrant !== undefined) target.image_quadrant = image_quadrant;
        if (description !== undefined) target.description = description;
        if (options_json !== undefined) target.options_json = options_json;
      }
      return NextResponse.json({ ok: true, source: 'memory', dishes: mem });
    }
  } catch (error) {
    console.error('PATCH /api/dishes error:', error);
    return NextResponse.json({ error: 'Failed to update dish' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      price,
      availability_mode,
      image_url,
      image_quadrant,
      description,
      options_json
    } = body;

    if (!name || !category || !price) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const slug =
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString().slice(-4);

    const sql = await ensureNeonSchema();
    const opts = Array.isArray(options_json) ? options_json : [];

    if (sql) {
      await sql`
        INSERT INTO dishes (slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order)
        VALUES (
          ${slug},
          ${name},
          ${category},
          ${Number(price)},
          ${availability_mode || 'daily'},
          true,
          'available',
          ${JSON.stringify(opts)}::jsonb,
          ${image_url || '/images/dishes_grid_1.jpg'},
          ${image_quadrant || 'quad-tl'},
          ${description || ''},
          99
        )
      `;
      const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now() };
      return NextResponse.json({ ok: true, source: 'neon', dishes: rows });
    } else {
      invalidateDishesCache();
      const mem = getMemoryDishes();
      const newDish: Dish = {
        id: mem.length > 0 ? Math.max(...mem.map(d => d.id)) + 1 : 1,
        slug,
        name,
        category,
        price: Number(price),
        availability_mode: availability_mode || 'daily',
        is_available_today: true,
        stock_status: 'available',
        options_json: opts,
        image_url: image_url || '/images/dishes_grid_1.jpg',
        image_quadrant: image_quadrant || 'quad-tl',
        description: description || '',
        display_order: 99
      };
      mem.push(newDish);
      return NextResponse.json({ ok: true, source: 'memory', dishes: mem });
    }
  } catch (error) {
    console.error('POST /api/dishes error:', error);
    return NextResponse.json({ error: 'Failed to create dish' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const sql = await ensureNeonSchema();
    if (sql) {
      await sql`DELETE FROM dishes WHERE id = ${id}`;
      const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now() };
      return NextResponse.json({ ok: true, source: 'neon', dishes: rows });
    } else {
      invalidateDishesCache();
      const mem = getMemoryDishes();
      const idx = mem.findIndex(d => d.id === id);
      if (idx !== -1) mem.splice(idx, 1);
      return NextResponse.json({ ok: true, source: 'memory', dishes: mem });
    }
  } catch (error) {
    console.error('DELETE /api/dishes error:', error);
    return NextResponse.json({ error: 'Failed to delete dish' }, { status: 500 });
  }
}
