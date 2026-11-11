import { INITIAL_SETTINGS, type Dish } from './db';
import type { OrderStatus, ValidatedOrderItem } from './validation';

/**
 * Règles métier des commandes : transitions de statut, calcul des prix,
 * génération du message WhatsApp canonique et coordonnées du restaurant.
 */

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'En cours': ['Préparée', 'Annulée'],
  'Préparée': ['Livrée', 'Annulée'],
  'Livrée': [],
  'Annulée': []
};

export function canTransition(from: string, to: OrderStatus): boolean {
  if (from === to) return true;
  const allowed = STATUS_TRANSITIONS[from as OrderStatus];
  return Array.isArray(allowed) && allowed.includes(to);
}

export function formatCfa(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

export interface PricedItem {
  id: number;
  name: string;
  selectedOption?: string;
  /** Prix unitaire calculé par le serveur (FCFA). */
  price: number;
  qty: number;
}

export type PricingResult =
  | { ok: true; items: PricedItem[]; total_cfa: number }
  | { ok: false; error: string };

/**
 * Recalcule intégralement le panier à partir du catalogue serveur.
 * Le prix envoyé par le navigateur est ignoré.
 */
export function computeOrderPricing(
  menu: Dish[],
  items: ValidatedOrderItem[]
): PricingResult {
  const byId = new Map<number, Dish>();
  for (const dish of menu) byId.set(Number(dish.id), dish);

  const pricedItems: PricedItem[] = [];
  let total = 0;

  for (const item of items) {
    const dish = byId.get(item.id);
    if (!dish) {
      return { ok: false, error: `Plat introuvable dans le menu (réf. ${item.id}).` };
    }
    if (!dish.is_available_today || dish.stock_status === 'soldout') {
      return { ok: false, error: `${dish.name} est en rupture aujourd'hui.` };
    }

    const options = Array.isArray(dish.options_json) ? dish.options_json : [];
    let selectedOption: string | undefined;
    if (options.length > 0) {
      if (!item.selectedOption || !options.includes(item.selectedOption)) {
        return {
          ok: false,
          error: `L'option choisie pour ${dish.name} n'est pas valide.`
        };
      }
      selectedOption = item.selectedOption;
    }

    const unitPrice = Math.round(Number(dish.price));
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return { ok: false, error: `Le prix de ${dish.name} est mal configuré.` };
    }

    pricedItems.push({
      id: dish.id,
      name: dish.name,
      selectedOption,
      price: unitPrice,
      qty: item.qty
    });
    total += unitPrice * item.qty;
  }

  return { ok: true, items: pricedItems, total_cfa: total };
}

export interface WhatsAppOrderInput {
  order_code: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  order_type: string;
  order_detail: string;
  payment_method: string;
  payment_ref?: string | null;
  items_json: Array<{
    name: string;
    selectedOption?: string;
    price: number;
    qty: number;
  }>;
  total_cfa: number;
  notes?: string | null;
}

function formatOrderDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Ouagadougou',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Message WhatsApp généré par le SERVEUR à partir de la commande validée.
 * Le client ne peut donc pas modifier le contenu ni le montant.
 */
export function buildOrderWhatsAppText(order: WhatsAppOrderInput): string {
  const detailLabel =
    order.order_type === 'Sur place'
      ? 'Numéro de table'
      : order.order_type === 'À emporter'
      ? 'Heure de retrait'
      : 'Quartier / Adresse';

  const lines = order.items_json.map(
    (item, index) =>
      `${index + 1}. *${item.name}*${
        item.selectedOption ? ` (${item.selectedOption})` : ''
      } — ${item.qty} x ${formatCfa(item.price)} = *${formatCfa(
        item.price * item.qty
      )}*`
  );

  return [
    '*NOUVELLE COMMANDE — RESTAURANT LA GRATITUDE*',
    '----------------------------------------',
    `*N° Commande :* ${order.order_code}`,
    `*Date & Heure :* ${formatOrderDate(order.created_at)}`,
    `*Nom du Client :* ${order.customer_name}`,
    `*Téléphone Client :* ${order.customer_phone}`,
    '----------------------------------------',
    `*MODE DE RÉCEPTION :* ${order.order_type}`,
    `*${detailLabel} :* ${order.order_detail}`,
    `*MODE DE PAIEMENT :* ${order.payment_method}`,
    order.payment_ref ? `*Référence transaction :* ${order.payment_ref}` : '',
    '----------------------------------------',
    '*DÉTAIL COMPLET DES PLATS :*',
    ...lines,
    '----------------------------------------',
    `*MONTANT TOTAL À PAYER : ${formatCfa(order.total_cfa)}*`,
    `*Instructions / Note cuisine :* ${order.notes?.trim() || 'Aucune instruction particulière'}`,
    '----------------------------------------',
    'Merci de confirmer la réception de ma commande.'
  ]
    .filter(line => line !== '')
    .join('\n');
}

export interface RestaurantInfo {
  name: string;
  phone: string;
  phone_2: string;
  whatsapp: string;
}

function normalizeWhatsAppNumber(value: string | null | undefined): string {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 8 ? digits : '22602809906';
}

export async function getRestaurantInfo(sql: unknown): Promise<RestaurantInfo> {
  const fallback: RestaurantInfo = {
    name: INITIAL_SETTINGS.restaurant_name,
    phone: INITIAL_SETTINGS.phone,
    phone_2: INITIAL_SETTINGS.phone_2 || '',
    whatsapp: INITIAL_SETTINGS.whatsapp
  };

  if (!sql) return fallback;

  try {
    // neon() renvoie une fonction de template tag : on la type localement.
    const query = sql as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Array<Record<string, unknown>>>;
    const rows = await query`SELECT restaurant_name, phone, COALESCE(phone_2, '') AS phone_2, whatsapp FROM restaurant_settings WHERE id = 1`;
    const row = rows[0];
    if (!row) return fallback;
    return {
      name: String(row.restaurant_name || fallback.name),
      phone: String(row.phone || fallback.phone),
      phone_2: String(row.phone_2 || ''),
      whatsapp: normalizeWhatsAppNumber(String(row.whatsapp || fallback.whatsapp))
    };
  } catch {
    return fallback;
  }
}

export async function getRestaurantWhatsApp(sql: unknown): Promise<string> {
  const info = await getRestaurantInfo(sql);
  return normalizeWhatsAppNumber(info.whatsapp);
}
