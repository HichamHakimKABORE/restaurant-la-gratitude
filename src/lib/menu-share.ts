import {
  getDailyMenuGroupLabel,
  sortDailyMenuDishes,
  type Dish,
  type RestaurantSettings
} from '@/lib/db';
import { joinPhoneNumbers } from '@/lib/phone';

function formatPriceCFA(price: number): string {
  if (price === undefined || price === null || isNaN(price)) return '0\u00A0F';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0F';
}

/**
 * Construit le message texte structuré du Menu du Jour prêt à coller sur WhatsApp.
 */
export function buildDailyMenuWhatsAppText(
  dishes: Dish[],
  settings: Pick<RestaurantSettings, 'phone' | 'phone_2'>
): string {
  const active = sortDailyMenuDishes(
    dishes.filter(d => d.availability_mode === 'daily' && d.is_available_today)
  );
  const dateFr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });

  const grouped = new Map<string, Dish[]>();
  for (const d of active) {
    const label = getDailyMenuGroupLabel(d);
    const arr = grouped.get(label) || [];
    arr.push(d);
    grouped.set(label, arr);
  }

  const lines = [
    '*RESTAURANT LA GRATITUDE — ZAGTOULI*',
    `*MENU DU JOUR (${dateFr})* :`,
    ''
  ];

  for (const [groupTitle, items] of grouped.entries()) {
    lines.push(`*${groupTitle}*`);
    for (const d of items) {
      const lowNote = d.stock_status === 'low' ? ' _(presque fini)_' : '';
      lines.push(`- ${d.name} : ${formatPriceCFA(d.price)}${lowNote}`);
    }
    lines.push('');
  }

  lines.push(`*Commandes & Réservations :* ${joinPhoneNumbers(settings.phone, settings.phone_2)}`);
  lines.push('*Zagtouli, route de Bobo — Ouagadougou*');
  return lines.join('\n');
}
