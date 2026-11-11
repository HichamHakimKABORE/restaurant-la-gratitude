import { NextResponse } from 'next/server';
import {
  ensureNeonSchema,
  getMemoryGallery,
  invalidateGalleryCache,
  recordAdminAuditLog,
  GalleryImage
} from '@/lib/db';
import { isAdminRequest } from '@/lib/auth-server';
import { validateImageSource } from '@/lib/validation';
import { isAllowedOrigin } from '@/lib/csrf';
import { getClientIp } from '@/lib/rate-limit';

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
      return NextResponse.json({
        source: 'cache',
        images: global._galleryCache.data
      });
    }

    const sql = await ensureNeonSchema();
    if (sql) {
      const rows = (await sql`
        SELECT id, title, image_url, display_order, created_at
        FROM restaurant_gallery
        ORDER BY display_order ASC, id DESC
      `) as GalleryImage[];
      global._galleryCache = { data: rows, ts: Date.now() };
      return NextResponse.json({ source: 'neon', images: rows });
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
    return NextResponse.json({ error: 'Origine non autorisée (CSRF).' }, { status: 403 });
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { title, image_url, display_order } = body;

    if (!image_url || !image_url.trim()) {
      return NextResponse.json({ error: 'Image requise' }, { status: 400 });
    }

    const checkImg = validateImageSource(image_url);
    if (!checkImg.ok) {
      return NextResponse.json({ error: checkImg.error || 'Image non autorisée.' }, { status: 400 });
    }

    const sql = await ensureNeonSchema();
    invalidateGalleryCache();

    if (sql) {
      await sql`
        INSERT INTO restaurant_gallery (title, image_url, display_order)
        VALUES (
          ${title || 'Photo Restaurant La Gratitude'},
          ${image_url},
          ${Number(display_order || 50)}
        )
      `;
      const rows = (await sql`
        SELECT id, title, image_url, display_order, created_at
        FROM restaurant_gallery
        ORDER BY display_order ASC, id DESC
      `) as GalleryImage[];
      global._galleryCache = { data: rows, ts: Date.now() };
      await recordAdminAuditLog('gallery_added', null, `Photo ajoutée: ${title || 'Sans titre'}`, getClientIp(request));
      return NextResponse.json({ ok: true, source: 'neon', images: rows });
    } else {
      const mem = getMemoryGallery();
      const newImg: GalleryImage = {
        id: mem.length > 0 ? Math.max(...mem.map(i => i.id)) + 1 : 1,
        title: title || 'Photo Restaurant La Gratitude',
        image_url,
        display_order: Number(display_order || 50),
        created_at: new Date().toISOString()
      };
      mem.unshift(newImg);
      return NextResponse.json({ ok: true, source: 'memory', images: mem });
    }
  } catch (error) {
    console.error('POST /api/gallery error:', error);
    return NextResponse.json({ error: 'Failed to add image' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origine non autorisée (CSRF).' }, { status: 403 });
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, title, display_order } = body;
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const sql = await ensureNeonSchema();
    invalidateGalleryCache();

    if (sql) {
      if (Number(display_order) === 1) {
        await sql`
          UPDATE restaurant_gallery
          SET display_order = display_order + 1
          WHERE id <> ${Number(id)}
        `;
      }
      await sql`
        UPDATE restaurant_gallery
        SET title = ${title || 'Photo Restaurant La Gratitude'},
            display_order = COALESCE(${display_order !== undefined ? Number(display_order) : null}, display_order)
        WHERE id = ${Number(id)}
      `;
      const rows = (await sql`
        SELECT id, title, image_url, display_order, created_at
        FROM restaurant_gallery
        ORDER BY display_order ASC, id DESC
      `) as GalleryImage[];
      global._galleryCache = { data: rows, ts: Date.now() };
      await recordAdminAuditLog('gallery_added', null, `Photo ajoutée: ${title || 'Sans titre'}`, getClientIp(request));
      return NextResponse.json({ ok: true, source: 'neon', images: rows });
    } else {
      const mem = getMemoryGallery();
      const img = mem.find(i => i.id === Number(id));
      if (img) {
        if (title !== undefined) img.title = title;
        if (display_order !== undefined) img.display_order = Number(display_order);
      }
      return NextResponse.json({ ok: true, source: 'memory', images: mem });
    }
  } catch (error) {
    console.error('PATCH /api/gallery error:', error);
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Origine non autorisée (CSRF).' }, { status: 403 });
  }
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

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
      await recordAdminAuditLog('gallery_added', null, `Photo ajoutée: ${title || 'Sans titre'}`, getClientIp(request));
      return NextResponse.json({ ok: true, source: 'neon', images: rows });
    } else {
      const mem = getMemoryGallery();
      const idx = mem.findIndex(i => i.id === id);
      if (idx !== -1) mem.splice(idx, 1);
      return NextResponse.json({ ok: true, source: 'memory', images: mem });
    }
  } catch (error) {
    console.error('DELETE /api/gallery error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
