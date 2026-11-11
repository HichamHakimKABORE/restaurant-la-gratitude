import { NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  INITIAL_SETTINGS,
  ensureNeonSchema,
  getMemoryDishes,
  getMemoryOrders,
  recordAdminAuditLog,
  type Dish,
  type Order,
  type OrderItem
} from '@/lib/db';
import { isAdminRequest } from '@/lib/auth-server';
import { isAllowedOrigin } from '@/lib/csrf';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import {
  normalizeOrderStatus,
  sanitizeText,
  validateOrderPayload,
  type ValidatedOrderInput
} from '@/lib/validation';
import {
  buildOrderWhatsAppText,
  canTransition,
  computeOrderPricing,
  getRestaurantWhatsApp
} from '@/lib/order-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function formatOrderCode(id: number): string {
  const now = new Date();
  const year = String(now.getUTCFullYear()).slice(-2);
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `#CMD-${year}${month}-${String(id).padStart(5, '0')}`;
}

function publicOrder(order: Order) {
  return {
    id: order.id,
    order_code: order.order_code,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    order_type: order.order_type,
    order_detail: order.order_detail,
    payment_method: order.payment_method,
    payment_ref: order.payment_ref ?? null,
    items_json: order.items_json,
    total_cfa: order.total_cfa,
    status: order.status,
    notes: order.notes ?? '',
    created_at: order.created_at
  };
}

function toOrderItems(
  items: Array<{
    id: number;
    name: string;
    selectedOption?: string;
    price: number;
    qty: number;
  }>
): OrderItem[] {
  return items.map(item => ({
    id: item.id,
    name: item.name,
    selectedOption: item.selectedOption,
    price: item.price,
    qty: item.qty
  }));
}

async function buildResponse(
  order: Order,
  duplicate: boolean,
  sql: unknown,
  clientTotal?: number
) {
  const whatsapp = await getRestaurantWhatsApp(sql);
  const whatsappText = buildOrderWhatsAppText(order);
  const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    whatsappText
  )}`;

  return NextResponse.json(
    {
      ok: true,
      duplicate,
      order_code: order.order_code,
      track_token: order.track_token,
      order: publicOrder(order),
      whatsapp_url: whatsappUrl,
      whatsapp_text: whatsappText,
      server_total_cfa: order.total_cfa,
      price_adjusted:
        typeof clientTotal === 'number' && clientTotal !== order.total_cfa
    },
    {
      status: duplicate ? 200 : 201,
      headers: { 'Cache-Control': 'no-store' }
    }
  );
}

function createMemoryOrder(
  input: ValidatedOrderInput,
  idempotencyKey: string
): NextResponse {
  const memoryOrders = getMemoryOrders();

  const existing = memoryOrders.find(
    order => order.idempotency_key === idempotencyKey
  );
  if (existing) {
    const text = buildOrderWhatsAppText(existing);
    return NextResponse.json(
      {
        ok: true,
        duplicate: true,
        order_code: existing.order_code,
        track_token: existing.track_token,
        order: publicOrder(existing),
        whatsapp_url: `https://wa.me/${INITIAL_SETTINGS.whatsapp}?text=${encodeURIComponent(text)}`,
        whatsapp_text: text,
        server_total_cfa: existing.total_cfa,
        price_adjusted: false
      },
      { status: 200 }
    );
  }

  const pricing = computeOrderPricing(getMemoryDishes(), input.items);
  if (!pricing.ok) return jsonError(pricing.error, 400);

  const openOrders = memoryOrders.filter(
    order =>
      order.customer_phone === input.customer_phone &&
      (order.status === 'En cours' || order.status === 'Préparée')
  );
  if (openOrders.length >= 4) {
    return jsonError(
      'Trop de commandes en cours pour ce numéro. Contactez le restaurant.',
      429
    );
  }

  const id =
    memoryOrders.length > 0
      ? Math.max(...memoryOrders.map(order => Number(order.id) || 0)) + 1
      : 1;

  const order: Order = {
    id,
    order_code: formatOrderCode(id),
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    order_type: input.order_type,
    order_detail: input.order_detail,
    payment_method: input.payment_method,
    payment_ref: input.payment_ref ?? null,
    items_json: toOrderItems(pricing.items),
    total_cfa: pricing.total_cfa,
    status: 'En cours',
    notes: input.notes,
    status_version: 1,
    track_token: randomBytes(24).toString('hex'),
    idempotency_key: idempotencyKey,
    created_at: new Date().toISOString()
  };

  memoryOrders.unshift(order);

  const text = buildOrderWhatsAppText(order);
  const response = {
    ok: true,
    duplicate: false,
    order_code: order.order_code,
    track_token: order.track_token,
    order: publicOrder(order),
    whatsapp_url: `https://wa.me/${INITIAL_SETTINGS.whatsapp}?text=${encodeURIComponent(text)}`,
    whatsapp_text: text,
    server_total_cfa: order.total_cfa,
    price_adjusted:
      typeof input.client_total_cfa === 'number' &&
      input.client_total_cfa !== order.total_cfa
  };
  return NextResponse.json(response, { status: 201 });
}

export async function POST() {
  return jsonError(
    'Les commandes se font directement par appel téléphonique ou WhatsApp au +226 02 80 99 06.',
    403
  );
}

async function _DISABLED_ONLINE_ORDER_POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 32 * 1024) {
      return jsonError('Requête trop volumineuse.', 413);
    }

    const clientIp = getClientIp(request);
    const limit = rateLimit(`order:${clientIp}`, 10, 10 * 60_000);
    if (!limit.allowed) {
      return jsonError(
        'Trop de commandes envoyées depuis cet appareil. Réessayez dans quelques minutes.',
        429,
        { retry_after: limit.retryAfter }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Corps de requête invalide.', 400);
    }

    const parsed = validateOrderPayload(body);
    if (!parsed.ok) {
      return jsonError(parsed.error, 400, { field: parsed.field });
    }
    const input = parsed.value;

    // Clé stable fournie par le client : un double-clic / retry ne crée pas
    // une deuxième commande.
    const idempotencyKey = input.idempotency_key || `srv-${randomUUID()}`;

    const sql = await ensureNeonSchema();
    if (!sql) return createMemoryOrder(input, idempotencyKey);

    // 1) Idempotence : renvoyer la commande existante si la clé est connue.
    const existingRows = (await sql`
      SELECT id, order_code, customer_name, customer_phone, order_type,
             order_detail, payment_method, payment_ref, items_json, total_cfa,
             status, status_version, notes, track_token, created_at, updated_at
      FROM orders
      WHERE idempotency_key = ${idempotencyKey}
      LIMIT 1
    `) as Order[];

    if (existingRows[0]) {
      return buildResponse(
        existingRows[0],
        true,
        sql,
        input.client_total_cfa
      );
    }

    // 2) Recalcul serveur des prix à partir du catalogue (source de vérité).
    const ids = [...new Set(input.items.map(item => item.id))];
    const menuRows = (await sql`
      SELECT id, name, price, options_json, is_available_today, stock_status
      FROM dishes
      WHERE id IN (
        SELECT value::int FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)
      )
    `) as Dish[];

    const pricing = computeOrderPricing(menuRows, input.items);
    if (!pricing.ok) return jsonError(pricing.error, 400);

    // 3) Limite anti-spam par numéro de téléphone.
    const openRows = (await sql`
      SELECT COUNT(*)::int AS cnt
      FROM orders
      WHERE customer_phone = ${input.customer_phone}
        AND status IN ('En cours', 'Préparée')
        AND created_at > NOW() - INTERVAL '6 hours'
    `) as Array<{ cnt: number }>;
    if ((openRows[0]?.cnt ?? 0) >= 4) {
      return jsonError(
        'Trop de commandes en cours pour ce numéro. Contactez le restaurant.',
        429
      );
    }

    // 4) Anti-rejeu de la preuve de paiement.
    if (input.payment_ref) {
      const refRows = (await sql`
        SELECT id FROM orders
        WHERE payment_method = ${input.payment_method}
          AND payment_ref = ${input.payment_ref}
        LIMIT 1
      `) as Array<{ id: number }>;
      if (refRows[0]) {
        return jsonError(
          'Cette référence de transaction a déjà été utilisée pour une autre commande.',
          409,
          { field: 'payment_ref' }
        );
      }
    }

    const trackToken = randomBytes(24).toString('hex');
    const tempCode = `TMP-${randomUUID()}`;

    let insertedRows: Array<{ id: number }>;
    try {
      insertedRows = (await sql`
        INSERT INTO orders (
          order_code, idempotency_key, track_token, customer_name, customer_phone,
          order_type, order_detail, payment_method, payment_ref, items_json,
          total_cfa, status, notes
        ) VALUES (
          ${tempCode}, ${idempotencyKey}, ${trackToken}, ${input.customer_name},
          ${input.customer_phone}, ${input.order_type}, ${input.order_detail},
          ${input.payment_method}, ${input.payment_ref ?? null},
          ${JSON.stringify(pricing.items)}::jsonb, ${pricing.total_cfa},
          'En cours', ${input.notes}
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      `) as Array<{ id: number }>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('payment_ref') || message.includes('23505')) {
        return jsonError(
          'Cette référence de transaction a déjà été utilisée pour une autre commande.',
          409,
          { field: 'payment_ref' }
        );
      }
      throw error;
    }

    if (!insertedRows[0]) {
      const duplicateRows = (await sql`
        SELECT id, order_code, customer_name, customer_phone, order_type,
               order_detail, payment_method, payment_ref, items_json, total_cfa,
               status, status_version, notes, track_token, created_at, updated_at
        FROM orders
        WHERE idempotency_key = ${idempotencyKey}
        LIMIT 1
      `) as Order[];
      if (duplicateRows[0]) {
        return buildResponse(
          duplicateRows[0],
          true,
          sql,
          input.client_total_cfa
        );
      }
      return jsonError('Conflit lors de l’enregistrement, réessayez.', 409);
    }

    const id = Number(insertedRows[0].id);
    const orderCode = formatOrderCode(id);

    // 5) Code lisible dérivé de l'ID : unicité garantie par la base.
    const finalRows = (await sql`
      UPDATE orders
      SET order_code = ${orderCode}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, order_code, customer_name, customer_phone, order_type,
                order_detail, payment_method, payment_ref, items_json, total_cfa,
                status, status_version, notes, track_token, created_at, updated_at
    `) as Order[];

    const order = finalRows[0];

    // 6) Insertion normalisée dans order_items pour statistiques & réconciliation (P1-5)
    try {
      for (const it of pricing.items) {
        await sql`
          INSERT INTO order_items (order_id, dish_id, item_name, option_name, unit_price_cfa, qty, total_cfa)
          VALUES (
            ${id},
            ${it.id},
            ${it.name},
            ${it.selectedOption || null},
            ${it.price},
            ${it.qty},
            ${it.price * it.qty}
          )
        `;
      }
    } catch (itemErr) {
      console.error('order_items insert error:', itemErr);
    }

    // 7) Journal d'audit (ne bloque jamais la commande).
    try {
      await sql`
        INSERT INTO order_events (order_id, from_status, to_status, action, actor, ip)
        VALUES (${id}, NULL, 'En cours', 'created', 'client', ${clientIp})
      `;
    } catch (auditError) {
      console.error('order_events insert error:', auditError);
    }

    return buildResponse(order, false, sql, input.client_total_cfa);
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return jsonError(
      'La commande n’a pas pu être enregistrée. Réessayez ou contactez le restaurant.',
      500
    );
  }
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
        return NextResponse.json({ ok: true, order: memoryOrder, orders: getMemoryOrders() });
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

      return NextResponse.json({
        ok: true,
        order: paidRows[0],
        orders: await readAllOrders(sql)
      });
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
      return NextResponse.json({ ok: true, order, orders: memoryOrders });
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

    return NextResponse.json({
      ok: true,
      order: updatedRows[0],
      orders: await readAllOrders(sql)
    });
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
      return NextResponse.json({
        ok: true,
        orders: await readAllOrders(sql)
      });
    }

    const memoryOrders = getMemoryOrders();
    const index = memoryOrders.findIndex(order => order.id === id);
    if (index !== -1) memoryOrders.splice(index, 1);
    return NextResponse.json({ ok: true, orders: memoryOrders });
  } catch (error) {
    console.error('DELETE /api/orders error:', error);
    return jsonError('Impossible de supprimer la commande.', 500);
  }
}
