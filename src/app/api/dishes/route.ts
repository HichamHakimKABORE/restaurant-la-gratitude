import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
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
import { sanitizeText, validateImageSource } from '@/lib/validation';
import { isAllowedOrigin } from '@/lib/csrf';
import { getClientIp } from '@/lib/rate-limit';
import { readJsonObjectBody } from '@/lib/request-body';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const CACHE_TTL_MS = 10000; // 10 seconds server RAM cache (invalidated immediately on any write)

const ALLOWED_CATEGORIES = new Set([
  'Plats',
  'Pizzas',
  'Salades',
  'Poulets',
  'Soupes',
  'Grillades',
  'Boissons'
]);
const ALLOWED_MODES = new Set(['daily', 'always', 'order']);
const ALLOWED_STOCK = new Set(['available', 'low', 'soldout']);
const ALLOWED_QUADRANTS = new Set([
  'quad-tl',
  'quad-tr',
  'quad-bl',
  'quad-br',
  'quad-full',
  'full'
]);

function sanitizeDishOptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .slice(0, 20)
    .map(item => sanitizeText(item, 60))
    .filter(Boolean);
}

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
      global._dishesCache.date === todayStr &&
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
      const flipped = await sql`
        UPDATE restaurant_settings
        SET daily_menu_date = ${todayStr}
        WHERE id = 1 AND COALESCE(daily_menu_date, '') <> ${todayStr}
        RETURNING id
      `;
      if (flipped.length > 0) {
        await sql`
          UPDATE dishes
          SET is_available_today = false, stock_status = 'soldout'
          WHERE availability_mode = 'daily' AND is_available_today = true
        `;
      }
      const rows = (await sql`
        SELECT id, slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order
        FROM dishes
        ORDER BY display_order ASC, id ASC
      `) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now(), date: todayStr };
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
    return NextResponse.json(
      { error: 'Origine non autorisée (CSRF).' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json(
      { error: 'Session expirée. Veuillez vous reconnecter.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const parsed = await readJsonObjectBody(request, 1024 * 1024, 'Requête trop volumineuse (max 1 Mo).');
  if (!parsed.ok) return parsed.response;
  try {
    const body = parsed.data;
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
        global._dishesCache = { data: rows, ts: Date.now(), date: todayStr };
        await autoSyncTodayMenuReport(sql, rows, todayStr);
        await recordAdminAuditLog(
          'daily_menu_bulk',
          null,
          targetAvail ? 'Menu du Jour : tout coché' : 'Menu du Jour : tout décoché',
          getClientIp(request)
        );
        return NextResponse.json(
          { ok: true, source: 'neon', dishes: rows },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      } else {
        invalidateDishesCache();
        const mem = getMemoryDishes();
        for (const d of mem) {
          if (d.availability_mode === 'daily') {
            d.is_available_today = targetAvail;
            d.stock_status = targetStatus;
          }
        }
        return NextResponse.json(
          { ok: true, source: 'memory', dishes: mem },
          { headers: { 'Cache-Control': 'no-store' } }
        );
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

    const dishId = Number(id);
    if (!Number.isInteger(dishId) || dishId <= 0) {
      return NextResponse.json({ error: 'Identifiant de plat invalide.' }, { status: 400 });
    }

    const cleanName = name !== undefined ? sanitizeText(name, 160) : null;
    if (name !== undefined && !cleanName) {
      return NextResponse.json({ error: 'Le nom du plat ne peut pas être vide.' }, { status: 400 });
    }

    let cleanPrice: number | null = null;
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0 || p > 5_000_000) {
        return NextResponse.json({ error: 'Prix invalide (doit être compris entre 0 et 5 000 000 FCFA).' }, { status: 400 });
      }
      cleanPrice = Math.round(p);
    }

    if (category !== undefined && !ALLOWED_CATEGORIES.has(String(category))) {
      return NextResponse.json({ error: 'Catégorie de plat invalide.' }, { status: 400 });
    }
    if (availability_mode !== undefined && !ALLOWED_MODES.has(String(availability_mode))) {
      return NextResponse.json({ error: 'Mode de disponibilité invalide.' }, { status: 400 });
    }
    if (stock_status !== undefined && !ALLOWED_STOCK.has(String(stock_status))) {
      return NextResponse.json({ error: 'Statut de stock invalide.' }, { status: 400 });
    }
    if (image_quadrant !== undefined && !ALLOWED_QUADRANTS.has(String(image_quadrant))) {
      return NextResponse.json({ error: 'Cadrage image invalide.' }, { status: 400 });
    }

    let cleanOrder: number | null = null;
    if (display_order !== undefined) {
      const ord = Number(display_order);
      if (!Number.isInteger(ord) || ord < 0 || ord > 99999) {
        return NextResponse.json({ error: 'Ordre d’affichage invalide.' }, { status: 400 });
      }
      cleanOrder = ord;
    }

    const cleanDescription = description !== undefined ? sanitizeText(description, 600) : null;
    const cleanOptions = options_json !== undefined ? sanitizeDishOptions(options_json) : null;

    let cleanImageUrl: string | null = null;
    if (image_url !== undefined) {
      const checkImg = validateImageSource(image_url);
      if (!checkImg.ok) {
        return NextResponse.json({ error: checkImg.error || 'Image non valide.' }, { status: 400 });
      }
      cleanImageUrl = checkImg.value;
    }

    if (sql) {
      await sql`
        UPDATE dishes
        SET
          name = COALESCE(${cleanName}, name),
          price = COALESCE(${cleanPrice}, price),
          category = COALESCE(${category !== undefined ? String(category) : null}, category),
          availability_mode = COALESCE(${availability_mode !== undefined ? String(availability_mode) : null}, availability_mode),
          is_available_today = COALESCE(${typeof is_available_today === 'boolean' ? is_available_today : null}, is_available_today),
          stock_status = COALESCE(${stock_status !== undefined ? String(stock_status) : null}, stock_status),
          image_url = COALESCE(${cleanImageUrl}, image_url),
          image_quadrant = COALESCE(${image_quadrant !== undefined ? String(image_quadrant) : null}, image_quadrant),
          description = COALESCE(${cleanDescription}, description),
          display_order = COALESCE(${cleanOrder}, display_order),
          options_json = COALESCE(${cleanOptions ? JSON.stringify(cleanOptions) : null}::jsonb, options_json)
        WHERE id = ${dishId}
      `;
      if (typeof is_available_today === 'boolean') {
        await sql`UPDATE restaurant_settings SET daily_menu_date = ${todayStr} WHERE id = 1`;
      }
      const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now(), date: todayStr };
      await autoSyncTodayMenuReport(sql, rows, todayStr);
      await recordAdminAuditLog('dish_updated', dishId, cleanName ? `Mise à jour: ${cleanName}` : 'Mise à jour plat', getClientIp(request));

      return NextResponse.json(
        { ok: true, source: 'neon', dishes: rows },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } else {
      invalidateDishesCache();
      const mem = getMemoryDishes();
      const target = mem.find(d => d.id === dishId);
      if (target) {
        if (typeof is_available_today === 'boolean') target.is_available_today = is_available_today;
        if (stock_status !== undefined) target.stock_status = String(stock_status) as Dish['stock_status'];
        if (cleanName !== null) target.name = cleanName;
        if (cleanPrice !== null) target.price = cleanPrice;
        if (category !== undefined) target.category = String(category) as Dish['category'];
        if (availability_mode !== undefined) target.availability_mode = String(availability_mode) as Dish['availability_mode'];
        if (cleanImageUrl !== null) target.image_url = cleanImageUrl;
        if (image_quadrant !== undefined) target.image_quadrant = String(image_quadrant) as Dish['image_quadrant'];
        if (cleanDescription !== null) target.description = cleanDescription;
        if (cleanOptions !== null) target.options_json = cleanOptions;
        if (cleanOrder !== null) target.display_order = cleanOrder;
      }
      return NextResponse.json(
        { ok: true, source: 'memory', dishes: mem },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  } catch (error) {
    console.error('PATCH /api/dishes error:', error);
    return NextResponse.json(
      { error: 'Failed to update dish' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: 'Origine non autorisée (CSRF).' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json(
      { error: 'Session expirée. Veuillez vous reconnecter.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const parsed = await readJsonObjectBody(request, 1024 * 1024, 'Requête trop volumineuse (max 1 Mo).');
  if (!parsed.ok) return parsed.response;
  try {
    const body = parsed.data;
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

    const cleanName = sanitizeText(name, 160);
    const cleanPrice = Number(price);
    if (
      !cleanName ||
      !ALLOWED_CATEGORIES.has(String(category)) ||
      price === undefined ||
      !Number.isFinite(cleanPrice) ||
      cleanPrice < 0 ||
      cleanPrice > 5_000_000
    ) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants, catégorie ou prix invalide.' },
        { status: 400 }
      );
    }

    const mode = availability_mode ? String(availability_mode) : 'daily';
    if (!ALLOWED_MODES.has(mode)) {
      return NextResponse.json({ error: 'Mode de disponibilité invalide.' }, { status: 400 });
    }

    const quad = image_quadrant ? String(image_quadrant) : 'quad-tl';
    if (!ALLOWED_QUADRANTS.has(quad)) {
      return NextResponse.json({ error: 'Cadrage image invalide.' }, { status: 400 });
    }

    const orderNum = display_order !== undefined ? Number(display_order) : 50;
    if (!Number.isInteger(orderNum) || orderNum < 0 || orderNum > 99999) {
      return NextResponse.json({ error: 'Ordre d’affichage invalide.' }, { status: 400 });
    }

    let finalImageUrl = '/images/dishes_grid_1.jpg';
    if (image_url !== undefined && image_url !== null && image_url !== '') {
      const checkImg = validateImageSource(image_url);
      if (!checkImg.ok) {
        return NextResponse.json({ error: checkImg.error || 'Image non valide.' }, { status: 400 });
      }
      finalImageUrl = checkImg.value;
    }

    const baseSlug =
      cleanName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80) || 'plat';
    const slug = `${baseSlug}-${randomBytes(4).toString('hex')}`;

    const sql = await ensureNeonSchema();
    const opts = sanitizeDishOptions(options_json) || [];
    const cleanDescription = sanitizeText(description, 600);
    const roundedPrice = Math.round(cleanPrice);
    const todayStr = getLogicalMenuDate();

    if (sql) {
      await sql`
        INSERT INTO dishes (slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order)
        VALUES (
          ${slug},
          ${cleanName},
          ${String(category)},
          ${roundedPrice},
          ${mode},
          true,
          'available',
          ${JSON.stringify(opts)}::jsonb,
          ${finalImageUrl},
          ${quad},
          ${cleanDescription},
          ${orderNum}
        )
      `;
      if (mode === 'daily') {
        await sql`UPDATE restaurant_settings SET daily_menu_date = ${todayStr} WHERE id = 1`;
      }
      const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now(), date: todayStr };
      if (mode === 'daily') {
        await autoSyncTodayMenuReport(sql, rows, todayStr);
      }
      await recordAdminAuditLog('dish_created', slug, `Création plat: ${cleanName} (${roundedPrice} FCFA)`, getClientIp(request));
      return NextResponse.json(
        { ok: true, source: 'neon', dishes: rows },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } else {
      invalidateDishesCache();
      const mem = getMemoryDishes();
      const newDish: Dish = {
        id: mem.length > 0 ? Math.max(...mem.map(d => d.id)) + 1 : 1,
        slug,
        name: cleanName,
        category: category as Dish['category'],
        price: roundedPrice,
        availability_mode: mode as Dish['availability_mode'],
        is_available_today: true,
        stock_status: 'available',
        options_json: opts,
        image_url: finalImageUrl,
        image_quadrant: quad as Dish['image_quadrant'],
        description: cleanDescription,
        display_order: orderNum
      };
      mem.push(newDish);
      return NextResponse.json(
        { ok: true, source: 'memory', dishes: mem },
        { headers: { 'Cache-Control': 'no-store' } }
      );
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
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Identifiant de plat invalide.' }, { status: 400 });
    }

    const sql = await ensureNeonSchema();
    const todayStr = getLogicalMenuDate();
    if (sql) {
      await sql`DELETE FROM dishes WHERE id = ${id}`;
      await recordAdminAuditLog('dish_deleted', id, `Suppression plat ID ${id}`, getClientIp(request));
      const rows = (await sql`SELECT * FROM dishes ORDER BY display_order ASC, id ASC`) as Dish[];
      global._dishesCache = { data: rows, ts: Date.now(), date: todayStr };
      await autoSyncTodayMenuReport(sql, rows, todayStr);
      return NextResponse.json(
        { ok: true, source: 'neon', dishes: rows },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } else {
      invalidateDishesCache();
      const mem = getMemoryDishes();
      const idx = mem.findIndex(d => d.id === id);
      if (idx !== -1) mem.splice(idx, 1);
      return NextResponse.json(
        { ok: true, source: 'memory', dishes: mem },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  } catch (error) {
    console.error('DELETE /api/dishes error:', error);
    return NextResponse.json(
      { error: 'Failed to delete dish' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
