/**
 * Coordonnées officielles — une seule source de vérité côté client.
 * Les routes serveur lisent `restaurant_settings` en base (modifiable depuis
 * l'admin) et retombent sur ces valeurs si la base est indisponible.
 */
export const RESTAURANT_WHATSAPP = '22602809906';
export const RESTAURANT_PHONE_DISPLAY = '+226 02 80 99 06';
export const RESTAURANT_PHONE_TEL = '+22602809906';
export const RESTAURANT_NAME = 'Restaurant La Gratitude';
export const TIMEZONE_OUAGA = 'Africa/Ouagadougou';

export interface RestaurantTable {
  id: string;
  name: string;
  zone: 'Terrasse' | 'Salle Climatisée' | 'Bar';
}

export const RESTAURANT_TABLES: RestaurantTable[] = [
  { id: 'T1', name: 'Table 1 (Terrasse ombragée)', zone: 'Terrasse' },
  { id: 'T2', name: 'Table 2 (Terrasse ombragée)', zone: 'Terrasse' },
  { id: 'T3', name: 'Table 3 (Terrasse ombragée)', zone: 'Terrasse' },
  { id: 'T4', name: 'Table 4 (Terrasse centrale)', zone: 'Terrasse' },
  { id: 'T5', name: 'Table 5 (Terrasse centrale)', zone: 'Terrasse' },
  { id: 'T6', name: 'Table 6 (Terrasse jardin)', zone: 'Terrasse' },
  { id: 'T7', name: 'Table 7 (Terrasse jardin)', zone: 'Terrasse' },
  { id: 'T8', name: 'Table 8 (Terrasse VIP)', zone: 'Terrasse' },
  { id: 'C1', name: 'Table C1 (Salle climatisée)', zone: 'Salle Climatisée' },
  { id: 'C2', name: 'Table C2 (Salle climatisée)', zone: 'Salle Climatisée' },
  { id: 'C3', name: 'Table C3 (Salle climatisée)', zone: 'Salle Climatisée' },
  { id: 'C4', name: 'Table C4 (Salle climatisée VIP)', zone: 'Salle Climatisée' },
  { id: 'BAR', name: 'Comptoir / Bar', zone: 'Bar' },
];

export interface DeliveryZone {
  id: string;
  name: string;
  fee_cfa: number;
  min_order_cfa: number;
  eta: string;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: 'zagtouli_centre', name: 'Zagtouli — Centre / Route de Bobo (500 F)', fee_cfa: 500, min_order_cfa: 1500, eta: '20-35 min' },
  { id: 'zagtouli_peage', name: 'Zagtouli — Côté Péage / Rimkiéta (800 F)', fee_cfa: 800, min_order_cfa: 2000, eta: '25-40 min' },
  { id: 'pissy', name: 'Pissy / Boulmiougou (1 000 F)', fee_cfa: 1000, min_order_cfa: 2500, eta: '30-45 min' },
  { id: 'bonheur_ville', name: 'Bonheur-Ville / Belle-Ville (1 200 F)', fee_cfa: 1200, min_order_cfa: 3000, eta: '35-50 min' },
  { id: 'autre', name: 'Autre quartier de Ouagadougou (1 500 F)', fee_cfa: 1500, min_order_cfa: 3500, eta: '40-60 min' },
];
