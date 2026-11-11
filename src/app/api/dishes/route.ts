import { NextResponse } from 'next/server';
import {
  ensureNeonSchema,
  getMemoryDishes,
  invalidateDishesCache,
  invalidateMenuHistoryCache,
  getLogicalMenuDate,
  sortDailyMenuDishes,
  recordAdminAuditLog,
  Dish
} from '@/lib/db';
import { isAdminRequest } from '@/lib/auth-server';
import { validateImageSource } from '@/lib/validation';
import { isAllowedOrigin } from '@/lib/csrf';
import { getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const CACHE_TTL_MS = 10000; // 10 seconds server RAM cache (invalidated immediately on any write)

async function autoSyncTodayMenuReport(sql: any, allDishes: Dish[], todayStr: string) {
  try {
    const activeDaily = sortDailyMenuDishes(
      allDishes.filter(d => d.availability_mode === 'daily' && d.is_available_today)
    ).map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      price: d.price,
      stock_status: d.stock_status,
      is_available_today: d.is_available_today
    }));

    await sql`
      INSERT INTO daily_menu_history (menu_date, dishes_json, total_dishes, notes, updated_at)
      VALUES (
        ${todayStr},
        ${JSON.stringify(activeDaily)}::jsonb,
        ${activeDaily.length},
        ${`Synchronisation automatique du Menu du Jour (${activeDaily.length} plats)`},
        NOW()
      )
      ON CONFLICT (menu_date) DO UPDATE
      SET dishes_json = EXCLUDED.dishes_json,
          total_dishes = EXCLUDED.total_dishes,
          notes = EXCLUDED.notes,
          updated_at = NOW()
    `;
    invalidateMenuHistoryCache();
  } catch (err) {
    console.warn('Auto-sync menu report warning:', err);
  }
}

export async function GET() {
  try {
    const todayStr = getLogicalMenuDate();
    if (
      global._dishesCache &&
      Date.now() - global._dishesCache.ts < CACHE_TTL_MS
    ) {
      return NextResponse.json(
        {
          source: 'cache',
          dishes: global._dishesCache.data
        },
        { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } }
      );
    }

    const sql = await ensureNeonSchema();
    if (sql) {
      const settingsDateRows = await sql`SELECT daily_menu_date FROM restaurant_settings WHERE id = 1`;
      const currentMenuDate = settingsDateRows[0]?.daily_menu_date || '';
      if (currentMenuDate !== todayStr) {
        await sql`
          UPDATE dishes
          SET is_available_today = false, stock_status = 'soldout'
          WHERE availability_mode = 'daily' AND is_available_today = true
        `;
        await sql`UPDATE restaurant_settings SET daily_menu_date = ${todayStr} WHERE id = 1`;
      }
      const rows = (await sql`
        SELECT id, slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order
        FROM dishes
        ORDER BY display_order ASC, id ASC
      `) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now() };
      return NextResponse.json(
        { source: 'neon', dishes: rows },
        { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } }
      );
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
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origine non autorisée (CSRF).' }, { status: 403 });
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1024 * 1024) {
    return NextResponse.json({ error: 'Requête trop volumineuse (max 1 Mo).' }, { status: 413 });
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Session expirée. Veuillez vous reconnecter.' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const sql = await ensureNeonSchema();
    const todayStr = getLogicalMenuDate();

    // Action spéciale : réinitialiser (tout décocher) ou tout cocher d'un seul coup
    if (body.action === 'reset_daily' || body.action === 'check_all_daily') {
      const targetAvail = body.action === 'check_all_daily';
      const targetStatus = targetAvail ? 'available' : 'soldout';
      if (sql) {
        await sql`
          UPDATE dishes
          SET is_available_today = ${targetAvail}, stock_status = ${targetStatus}
          WHERE availability_mode = 'daily'
        `;
        await sql`UPDATE restaurant_settings SET daily_menu_date = ${todayStr} WHERE id = 1`;
        const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
        global._dishesCache = { data: rows, ts: Date.now() };
        await autoSyncTodayMenuReport(sql, rows, todayStr);
        return NextResponse.json({ ok: true, source: 'neon', dishes: rows });
      } else {
        invalidateDishesCache();
        const mem = getMemoryDishes();
        for (const d of mem) {
          if (d.availability_mode === 'daily') {
            d.is_available_today = targetAvail;
            d.stock_status = targetStatus;
          }
        }
        return NextResponse.json({ ok: true, source: 'memory', dishes: mem });
      }
    }

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
      description,
      display_order
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Dish ID required' }, { status: 400 });
    }

    if (image_url) {
      const checkImg = validateImageSource(image_url);
      if (!checkImg.ok) {
        return NextResponse.json({ error: checkImg.error || 'Image non valide.' }, { status: 400 });
      }
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
          display_order = COALESCE(${display_order !== undefined ? Number(display_order) : null}, display_order),
          options_json = COALESCE(${options_json ? JSON.stringify(options_json) : null}::jsonb, options_json)
        WHERE id = ${Number(id)}
      `;
      if (typeof is_available_today === 'boolean') {
        await sql`UPDATE restaurant_settings SET daily_menu_date = ${todayStr} WHERE id = 1`;
      }
      const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now() };
      await autoSyncTodayMenuReport(sql, rows, todayStr);
      await recordAdminAuditLog('dish_updated', id, name ? `Mise à jour: ${name}` : 'Mise à jour plat', getClientIp(request));

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
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origine non autorisée (CSRF).' }, { status: 403 });
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1024 * 1024) {
    return NextResponse.json({ error: 'Requête trop volumineuse (max 1 Mo).' }, { status: 413 });
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Session expirée. Veuillez vous reconnecter.' }, { status: 401 });
  }
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
      options_json,
      display_order
    } = body;

    if (!name || !category || price === undefined || Number(price) < 0 || Number.isNaN(Number(price))) {
      return NextResponse.json({ error: 'Champs obligatoires manquants ou prix invalide' }, { status: 400 });
    }

    if (image_url) {
      const checkImg = validateImageSource(image_url);
      if (!checkImg.ok) {
        return NextResponse.json({ error: checkImg.error || 'Image non valide.' }, { status: 400 });
      }
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
    const mode = availability_mode || 'daily';
    const orderNum = display_order !== undefined ? Number(display_order) : 50;
    const todayStr = getLogicalMenuDate();

    if (sql) {
      await sql`
        INSERT INTO dishes (slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order)
        VALUES (
          ${slug},
          ${name},
          ${category},
          ${Number(price)},
          ${mode},
          true,
          'available',
          ${JSON.stringify(opts)}::jsonb,
          ${image_url || '/images/dishes_grid_1.jpg'},
          ${image_quadrant || 'quad-tl'},
          ${description || ''},
          ${orderNum}
        )
      `;
      if (mode === 'daily') {
        await sql`UPDATE restaurant_settings SET daily_menu_date = ${todayStr} WHERE id = 1`;
      }
      const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now() };
      if (mode === 'daily') {
        await autoSyncTodayMenuReport(sql, rows, todayStr);
      }
      await recordAdminAuditLog('dish_created', slug, `Création plat: ${name} (${Number(price)} FCFA)`, getClientIp(request));
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
        availability_mode: mode,
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
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origine non autorisée (CSRF).' }, { status: 403 });
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Session expirée. Veuillez vous reconnecter.' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const sql = await ensureNeonSchema();
    const todayStr = getLogicalMenuDate();
    if (sql) {
      await sql`DELETE FROM dishes WHERE id = ${id}`;
      await recordAdminAuditLog('dish_deleted', id, `Suppression plat ID ${id}`, getClientIp(request));
      const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now() };
      await autoSyncTodayMenuReport(sql, rows, todayStr);
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
