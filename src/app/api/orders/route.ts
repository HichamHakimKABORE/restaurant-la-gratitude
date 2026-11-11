import { NextResponse } from 'next/server';
import {
  ensureNeonSchema,
  getMemoryOrders,
  recordAdminAuditLog,
  type Order
} from '@/lib/db';
import { isAdminRequest } from '@/lib/auth-server';
import { isAllowedOrigin } from '@/lib/csrf';
import { getClientIp } from '@/lib/rate-limit';
import { normalizeOrderStatus, sanitizeText } from '@/lib/validation';
import { canTransition } from '@/lib/order-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: message, ...extra },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST() {
  return jsonError(
    'Les commandes se font directement par appel téléphonique ou WhatsApp au +226 02 80 99 06.',
    403
  );
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return jsonError('Non autorisé.', 401);
  }

  try {
    const sql = await ensureNeonSchema();
    if (sql) {
      const rows = (await sql`
        SELECT id, order_code, customer_name, customer_phone, order_type,
               order_detail, payment_method, payment_ref, items_json, total_cfa,
               status, status_version, notes, paid_at, paid_by, needs_review,
               created_at, updated_at
        FROM orders
        ORDER BY id DESC
      `) as Order[];
      return NextResponse.json(
        { source: 'neon', orders: rows },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { source: 'memory', orders: getMemoryOrders() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return jsonError('Impossible de charger les commandes.', 500);
  }
}

async function readAllOrders(sql: unknown): Promise<Order[]> {
  if (!sql) return getMemoryOrders();
  const query = sql as (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<Order[]>;
  return query`
    SELECT id, order_code, customer_name, customer_phone, order_type,
           order_detail, payment_method, payment_ref, items_json, total_cfa,
           status, status_version, notes, paid_at, paid_by, needs_review,
           created_at, updated_at
    FROM orders
    ORDER BY id DESC
  `;
}

export async function PATCH(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonError('Origine non autorisée (CSRF).', 403);
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 64 * 1024) {
    return jsonError('Requête trop volumineuse.', 413);
  }
  if (!(await isAdminRequest(request))) {
    return jsonError('Non autorisé.', 401);
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError('Corps de requête invalide.', 400);
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return jsonError('Identifiant de commande invalide.', 400);
    }

    const clientIp = getClientIp(request);
    const sql = await ensureNeonSchema();

    // ---- Action : marquer la commande comme payée -------------------------
    if (body.action === 'mark_paid') {
      if (!sql) {
        const memoryOrder = getMemoryOrders().find(order => order.id === id);
        if (!memoryOrder) return jsonError('Commande introuvable.', 404);
        memoryOrder.paid_at = memoryOrder.paid_at || new Date().toISOString();
        memoryOrder.paid_by = memoryOrder.paid_by || 'admin';
        return NextResponse.json(
          { ok: true, order: memoryOrder, orders: getMemoryOrders() },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      const paidRows = (await sql`
        UPDATE orders
        SET paid_at = COALESCE(paid_at, NOW()),
            paid_by = COALESCE(paid_by, 'admin'),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, order_code, customer_name, customer_phone, order_type,
                  order_detail, payment_method, payment_ref, items_json, total_cfa,
                  status, status_version, notes, paid_at, paid_by, needs_review,
                  created_at, updated_at
      `) as Order[];

      if (!paidRows[0]) return jsonError('Commande introuvable.', 404);

      try {
        await sql`
          INSERT INTO order_events (order_id, action, actor, ip)
          VALUES (${id}, 'marked_paid', 'admin', ${clientIp})
        `;
      } catch (auditError) {
        console.error('order_events mark_paid error:', auditError);
      }

      return NextResponse.json(
        {
          ok: true,
          order: paidRows[0],
          orders: await readAllOrders(sql)
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // ---- Action : changement de statut ------------------------------------
    const status = normalizeOrderStatus(body.status);
    if (!status) return jsonError('Statut invalide.', 400);

    const version =
      body.version !== undefined ? Number(body.version) : undefined;
    const cancelReason = sanitizeText(body.cancel_reason, 200);

    if (!sql) {
      const memoryOrders = getMemoryOrders();
      const order = memoryOrders.find(item => item.id === id);
      if (!order) return jsonError('Commande introuvable.', 404);

      if (!canTransition(order.status, status)) {
        return jsonError(
          `Transition impossible : ${order.status} → ${status}.`,
          409,
          { code: 'INVALID_TRANSITION' }
        );
      }
      if (
        Number.isInteger(version) &&
        version! > 0 &&
        order.status_version !== undefined &&
        order.status_version !== version
      ) {
        return jsonError(
          'Cette commande a été modifiée par un autre poste. Rechargez la page.',
          409,
          { code: 'STALE' }
        );
      }

      order.status = status;
      order.status_version = (order.status_version || 1) + 1;
      order.updated_at = new Date().toISOString();
      if (status === 'Annulée' && cancelReason) order.notes = `${order.notes || ''}\nAnnulée : ${cancelReason}`.trim();
      return NextResponse.json(
        { ok: true, order, orders: memoryOrders },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const currentRows = (await sql`
      SELECT id, status, status_version
      FROM orders
      WHERE id = ${id}
      LIMIT 1
    `) as Array<{ id: number; status: string; status_version: number }>;

    const current = currentRows[0];
    if (!current) return jsonError('Commande introuvable.', 404);

    if (!canTransition(current.status, status)) {
      return jsonError(
        `Transition impossible : ${current.status} → ${status}.`,
        409,
        { code: 'INVALID_TRANSITION' }
      );
    }

    let updatedRows: Order[];
    if (Number.isInteger(version) && version! > 0) {
      updatedRows = (await sql`
        UPDATE orders
        SET status = ${status},
            status_version = status_version + 1,
            updated_at = NOW(),
            prepared_at = CASE WHEN ${status} = 'Préparée' THEN NOW() ELSE prepared_at END,
            delivered_at = CASE WHEN ${status} = 'Livrée' THEN NOW() ELSE delivered_at END,
            cancel_reason = CASE WHEN ${status} = 'Annulée' THEN ${cancelReason || null} ELSE cancel_reason END
        WHERE id = ${id} AND status_version = ${version}
        RETURNING id, order_code, customer_name, customer_phone, order_type,
                  order_detail, payment_method, payment_ref, items_json, total_cfa,
                  status, status_version, notes, paid_at, paid_by, needs_review,
                  created_at, updated_at
      `) as Order[];

      if (!updatedRows[0]) {
        return jsonError(
          'Cette commande a été modifiée par un autre poste. Rechargez la page.',
          409,
          { code: 'STALE' }
        );
      }
    } else {
      updatedRows = (await sql`
        UPDATE orders
        SET status = ${status},
            status_version = status_version + 1,
            updated_at = NOW(),
            prepared_at = CASE WHEN ${status} = 'Préparée' THEN NOW() ELSE prepared_at END,
            delivered_at = CASE WHEN ${status} = 'Livrée' THEN NOW() ELSE delivered_at END,
            cancel_reason = CASE WHEN ${status} = 'Annulée' THEN ${cancelReason || null} ELSE cancel_reason END
        WHERE id = ${id}
        RETURNING id, order_code, customer_name, customer_phone, order_type,
                  order_detail, payment_method, payment_ref, items_json, total_cfa,
                  status, status_version, notes, paid_at, paid_by, needs_review,
                  created_at, updated_at
      `) as Order[];
    }

    try {
      await sql`
        INSERT INTO order_events (order_id, from_status, to_status, action, actor, ip)
        VALUES (${id}, ${current.status}, ${status}, 'status_change', 'admin', ${clientIp})
      `;
    } catch (auditError) {
      console.error('order_events status error:', auditError);
    }

    return NextResponse.json(
      {
        ok: true,
        order: updatedRows[0],
        orders: await readAllOrders(sql)
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('PATCH /api/orders error:', error);
    return jsonError('Impossible de mettre à jour la commande.', 500);
  }
}

export async function DELETE(request: Request) {
  if (!isAllowedOrigin(request)) {
    return jsonError('Origine non autorisée (CSRF).', 403);
  }
  if (!(await isAdminRequest(request))) {
    return jsonError('Non autorisé.', 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return jsonError('Identifiant de commande invalide.', 400);
    }

    const sql = await ensureNeonSchema();
    if (sql) {
      const deletedRows = (await sql`
        DELETE FROM orders WHERE id = ${id}
        RETURNING order_code, total_cfa
      `) as Array<{ order_code: string; total_cfa: number }>;
      if (deletedRows[0]) {
        await recordAdminAuditLog(
          'order_deleted',
          id,
          `Suppression commande ${deletedRows[0].order_code} (${deletedRows[0].total_cfa} FCFA)`,
          getClientIp(request)
        );
      }
      return NextResponse.json(
        {
          ok: true,
          orders: await readAllOrders(sql)
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const memoryOrders = getMemoryOrders();
    const index = memoryOrders.findIndex(order => order.id === id);
    if (index !== -1) memoryOrders.splice(index, 1);
    return NextResponse.json(
      { ok: true, orders: memoryOrders },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('DELETE /api/orders error:', error);
    return jsonError('Impossible de supprimer la commande.', 500);
  }
}
