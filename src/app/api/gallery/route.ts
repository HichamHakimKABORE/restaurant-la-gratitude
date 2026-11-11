import { NextResponse } from 'next/server';
import {
  ensureNeonSchema,
  getMemoryGallery,
  invalidateGalleryCache,
  recordAdminAuditLog,
  GalleryImage
} from '@/lib/db';
import { isAdminRequest } from '@/lib/auth-server';
import { sanitizeText, validateImageSource } from '@/lib/validation';
import { isAllowedOrigin } from '@/lib/csrf';
import { getClientIp } from '@/lib/rate-limit';
import { readJsonObjectBody } from '@/lib/request-body';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const GALLERY_CACHE_TTL_MS = 10000;

export async function GET() {
  try {
    if (
      global._galleryCache &&
      Date.now() - global._galleryCache.ts < GALLERY_CACHE_TTL_MS
    ) {
      return NextResponse.json(
        {
          source: 'cache',
          images: global._galleryCache.data
        },
        { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
      );
    }

    const sql = await ensureNeonSchema();
    if (sql) {
      const rows = (await sql`
        SELECT id, title, image_url, display_order, created_at
        FROM restaurant_gallery
        ORDER BY display_order ASC, id DESC
      `) as GalleryImage[];
      global._galleryCache = { data: rows, ts: Date.now() };
      return NextResponse.json(
        { source: 'neon', images: rows },
        { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
      );
    }
    return NextResponse.json({ source: 'memory', images: getMemoryGallery() });
  } catch (error) {
    console.error('GET /api/gallery error:', error);
    return NextResponse.json({
      source: 'fallback',
      images: global._galleryCache?.data || getMemoryGallery()
    });
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
      { error: 'Non autorisé.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const parsed = await readJsonObjectBody(request, 1024 * 1024, 'Requête trop volumineuse (max 1 Mo).');
  if (!parsed.ok) return parsed.response;
  try {
    const body = parsed.data;
    const { title, image_url, display_order } = body;

    const checkImg = validateImageSource(image_url);
    if (!checkImg.ok) {
      return NextResponse.json(
        { error: checkImg.error || 'Image non autorisée.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cleanTitle = sanitizeText(title, 180) || 'Photo Restaurant La Gratitude';
    const orderNum = display_order !== undefined ? Number(display_order) : 50;
    if (!Number.isInteger(orderNum) || orderNum < 0 || orderNum > 99999) {
      return NextResponse.json(
        { error: 'Ordre d’affichage invalide.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const sql = await ensureNeonSchema();
    invalidateGalleryCache();

    if (sql) {
      await sql`
        INSERT INTO restaurant_gallery (title, image_url, display_order)
        VALUES (
          ${cleanTitle},
          ${checkImg.value},
          ${orderNum}
        )
      `;
      const rows = (await sql`
        SELECT id, title, image_url, display_order, created_at
        FROM restaurant_gallery
        ORDER BY display_order ASC, id DESC
      `) as GalleryImage[];
      global._galleryCache = { data: rows, ts: Date.now() };
      await recordAdminAuditLog('gallery_added', null, `Photo ajoutée: ${cleanTitle}`, getClientIp(request));
      return NextResponse.json(
        { ok: true, source: 'neon', images: rows },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } else {
      const mem = getMemoryGallery();
      const newImg: GalleryImage = {
        id: mem.length > 0 ? Math.max(...mem.map(i => i.id)) + 1 : 1,
        title: cleanTitle,
        image_url: checkImg.value,
        display_order: orderNum,
        created_at: new Date().toISOString()
      };
      mem.unshift(newImg);
      return NextResponse.json(
        { ok: true, source: 'memory', images: mem },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  } catch (error) {
    console.error('POST /api/gallery error:', error);
    return NextResponse.json(
      { error: 'Failed to add image' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
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
      { error: 'Non autorisé.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const parsed = await readJsonObjectBody(request, 1024 * 1024, 'Requête trop volumineuse (max 1 Mo).');
  if (!parsed.ok) return parsed.response;
  try {
    const body = parsed.data;
    const { id, title, display_order } = body;
    const imgId = Number(id);
    if (!Number.isInteger(imgId) || imgId <= 0) {
      return NextResponse.json({ error: 'Identifiant de photo invalide.' }, { status: 400 });
    }

    const cleanTitle =
      title !== undefined
        ? sanitizeText(title, 180) || 'Photo Restaurant La Gratitude'
        : null;

    let cleanOrder: number | null = null;
    if (display_order !== undefined) {
      const ord = Number(display_order);
      if (!Number.isInteger(ord) || ord < 0 || ord > 99999) {
        return NextResponse.json({ error: 'Ordre d’affichage invalide.' }, { status: 400 });
      }
      cleanOrder = ord;
    }

    const sql = await ensureNeonSchema();
    invalidateGalleryCache();

    if (sql) {
      if (cleanOrder === 1) {
        await sql`
          UPDATE restaurant_gallery
          SET display_order = display_order + 1
          WHERE id <> ${imgId}
        `;
      }
      await sql`
        UPDATE restaurant_gallery
        SET title = COALESCE(${cleanTitle}, title),
            display_order = COALESCE(${cleanOrder}, display_order)
        WHERE id = ${imgId}
      `;
      const rows = (await sql`
        SELECT id, title, image_url, display_order, created_at
        FROM restaurant_gallery
        ORDER BY display_order ASC, id DESC
      `) as GalleryImage[];
      global._galleryCache = { data: rows, ts: Date.now() };
      await recordAdminAuditLog(
        'gallery_updated',
        imgId,
        cleanTitle ? `Mise à jour photo: ${cleanTitle}` : `Mise à jour ordre photo ID ${imgId}`,
        getClientIp(request)
      );
      return NextResponse.json(
        { ok: true, source: 'neon', images: rows },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } else {
      const mem = getMemoryGallery();
      const img = mem.find(i => i.id === imgId);
      if (img) {
        if (cleanTitle !== null) img.title = cleanTitle;
        if (cleanOrder !== null) img.display_order = cleanOrder;
      }
      return NextResponse.json(
        { ok: true, source: 'memory', images: mem },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  } catch (error) {
    console.error('PATCH /api/gallery error:', error);
    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: 'Origine non autorisée (CSRF).' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json(
      { error: 'Non autorisé.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: 'Identifiant de photo invalide.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const sql = await ensureNeonSchema();
    invalidateGalleryCache();

    if (sql) {
      await sql`DELETE FROM restaurant_gallery WHERE id = ${id}`;
      await recordAdminAuditLog('gallery_deleted', id, `Suppression photo ID ${id}`, getClientIp(request));
      const rows = (await sql`
        SELECT id, title, image_url, display_order, created_at
        FROM restaurant_gallery
        ORDER BY display_order ASC, id DESC
      `) as GalleryImage[];
      global._galleryCache = { data: rows, ts: Date.now() };
      return NextResponse.json(
        { ok: true, source: 'neon', images: rows },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } else {
      const mem = getMemoryGallery();
      const idx = mem.findIndex(i => i.id === id);
      if (idx !== -1) mem.splice(idx, 1);
      return NextResponse.json(
        { ok: true, source: 'memory', images: mem },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  } catch (error) {
    console.error('DELETE /api/gallery error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
