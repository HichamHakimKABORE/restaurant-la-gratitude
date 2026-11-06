/**
 * Validation et normalisation côté serveur.
 * Ne JAMAIS faire confiance aux données envoyées par le navigateur :
 * prix, total, type de commande et téléphone sont tous revérifiés ici.
 */

export const ORDER_TYPES = ['Sur place', 'À emporter', 'Livraison'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const PAYMENT_METHODS = ['Espèces', 'Orange Money', 'Moov Money'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ORDER_STATUSES = ['En cours', 'Préparée', 'Livrée', 'Annulée'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

function normalizeLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function normalizeOrderType(value: unknown): OrderType | null {
  const v = normalizeLabel(value);
  if (['sur place', 'dine in', 'surplace'].includes(v)) return 'Sur place';
  if (['a emporter', 'take away', 'takeaway', 'emporter'].includes(v)) return 'À emporter';
  if (['livraison', 'delivery'].includes(v)) return 'Livraison';
  return null;
}

export function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  const v = normalizeLabel(value);
  if (['especes', 'espece', 'cash'].includes(v)) return 'Espèces';
  if (['orange money', 'orange', 'om'].includes(v)) return 'Orange Money';
  if (['moov money', 'moov', 'moovmoney'].includes(v)) return 'Moov Money';
  return null;
}

export function normalizeOrderStatus(value: unknown): OrderStatus | null {
  const v = normalizeLabel(value);
  if (['en cours', 'encours', 'pending', 'nouvelle'].includes(v)) return 'En cours';
  if (['preparee', 'prete', 'ready', 'preparing'].includes(v)) return 'Préparée';
  if (['livree', 'servie', 'delivered'].includes(v)) return 'Livrée';
  if (['annulee', 'cancelled', 'canceled'].includes(v)) return 'Annulée';
  return null;
}

/**
 * Normalise un numéro burkinabè vers le format E.164 (+226XXXXXXXX).
 * Accepte : "+226 70 00 00 00", "00226 70...", "22670000000", "70 00 00 00".
 */
export function normalizeBurkinaPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  let phone = cleaned;
  if (phone.startsWith('00226')) {
    phone = '+226' + phone.slice(5);
  } else if (phone.startsWith('+226')) {
    // déjà au bon format
  } else if (phone.startsWith('226')) {
    phone = '+' + phone;
  } else if (phone.startsWith('0') && phone.length === 9) {
    phone = '+226' + phone.slice(1);
  } else if (phone.length === 8) {
    phone = '+226' + phone;
  }

  if (!/^\+226[0-7]\d{7}$/.test(phone)) return null;
  return phone;
}

/** Supprime les caractères de contrôle et borne la longueur. */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Les notes peuvent contenir des retours à la ligne, mais pas de caractères de contrôle. */
export function sanitizeNotes(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export interface ValidatedOrderItem {
  id: number;
  qty: number;
  selectedOption?: string;
}

export interface ValidatedOrderInput {
  idempotency_key?: string;
  customer_name: string;
  customer_phone: string;
  order_type: OrderType;
  order_detail: string;
  payment_method: PaymentMethod;
  payment_ref?: string;
  items: ValidatedOrderItem[];
  notes: string;
  client_total_cfa?: number;
}

export type ValidationResult =
  | { ok: true; value: ValidatedOrderInput }
  | { ok: false; error: string; field?: string };

export function validateOrderPayload(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Corps de commande invalide.' };
  }
  const data = body as Record<string, unknown>;

  const customerName = sanitizeText(data.customer_name, 80);
  if (customerName.length < 2) {
    return { ok: false, error: 'Le nom du client est obligatoire (2 caractères minimum).', field: 'customer_name' };
  }
  if (!/^[\p{L}\p{M}\p{N} .'’\-]+$/u.test(customerName)) {
    return { ok: false, error: 'Le nom contient des caractères invalides.', field: 'customer_name' };
  }

  const customerPhone = normalizeBurkinaPhone(data.customer_phone);
  if (!customerPhone) {
    return {
      ok: false,
      error: 'Numéro de téléphone invalide. Utilisez un numéro burkinabè, ex. 70 00 00 00.',
      field: 'customer_phone'
    };
  }

  const orderType = normalizeOrderType(data.order_type);
  if (!orderType) {
    return { ok: false, error: 'Mode de réception invalide.', field: 'order_type' };
  }

  const orderDetail = sanitizeText(data.order_detail, 160);
  if (orderDetail.length < 2) {
    return {
      ok: false,
      error: 'La précision (table, heure de retrait ou adresse) est obligatoire.',
      field: 'order_detail'
    };
  }

  const paymentMethod = normalizePaymentMethod(data.payment_method);
  if (!paymentMethod) {
    return { ok: false, error: 'Mode de paiement invalide.', field: 'payment_method' };
  }

  const paymentRef = sanitizeText(data.payment_ref, 60);
  if (paymentMethod !== 'Espèces' && paymentRef.length < 4) {
    return {
      ok: false,
      error: `La référence de la transaction ${paymentMethod} est obligatoire (numéro reçu par SMS après le transfert).`,
      field: 'payment_ref'
    };
  }

  const notes = sanitizeNotes(data.notes, 300);

  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { ok: false, error: 'Le panier ne peut pas être vide.', field: 'items' };
  }
  if (data.items.length > 30) {
    return { ok: false, error: 'Trop d’articles dans la commande (30 maximum).', field: 'items' };
  }

  const items: ValidatedOrderItem[] = [];
  for (const rawItem of data.items) {
    if (!rawItem || typeof rawItem !== 'object') {
      return { ok: false, error: 'Article de commande invalide.', field: 'items' };
    }
    const item = rawItem as Record<string, unknown>;
    const id = Number(item.id);
    const qty = Number(item.qty);

    if (!Number.isInteger(id) || id <= 0 || id > 1_000_000) {
      return { ok: false, error: 'Identifiant de plat invalide.', field: 'items' };
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return { ok: false, error: 'Quantité invalide (1 à 20 par plat).', field: 'items' };
    }

    const selectedOption = sanitizeText(item.selectedOption, 60) || undefined;
    items.push({ id, qty, selectedOption });
  }

  let idempotencyKey: string | undefined;
  if (data.idempotency_key !== undefined) {
    const key = sanitizeText(data.idempotency_key, 100);
    if (key.length < 8) {
      return { ok: false, error: 'Clé d’idempotence invalide.', field: 'idempotency_key' };
    }
    idempotencyKey = key;
  }

  let clientTotal: number | undefined;
  if (data.total_cfa !== undefined) {
    const total = Number(data.total_cfa);
    if (!Number.isInteger(total) || total < 0 || total > 10_000_000) {
      return { ok: false, error: 'Total invalide.', field: 'total_cfa' };
    }
    clientTotal = total;
  }

  return {
    ok: true,
    value: {
      idempotency_key: idempotencyKey,
      customer_name: customerName,
      customer_phone: customerPhone,
      order_type: orderType,
      order_detail: orderDetail,
      payment_method: paymentMethod,
      payment_ref: paymentRef || undefined,
      items,
      notes,
      client_total_cfa: clientTotal
    }
  };
}
