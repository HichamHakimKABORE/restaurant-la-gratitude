import { neon } from '@neondatabase/serverless';

export type StockStatus = 'available' | 'low' | 'soldout';

export interface Dish {
  id: number;
  slug: string;
  name: string;
  category: 'Plats' | 'Pizzas' | 'Salades' | 'Poulets' | 'Soupes' | 'Grillades' | 'Boissons';
  price: number;
  availability_mode: 'daily' | 'always' | 'order';
  is_available_today: boolean;
  stock_status: StockStatus; // 'available' (Disponible) | 'low' (Presque fini) | 'soldout' (Rupture)
  options_json: string[];    // Ex: ['Flambé', 'Rabilé', 'Sauté', 'Pané', 'À l’ail']
  image_url: string;
  image_quadrant: 'quad-tl' | 'quad-tr' | 'quad-bl' | 'quad-br' | 'quad-full' | 'full';
  description: string;
  display_order: number;
}

export interface RestaurantSettings {
  id: number;
  restaurant_name: string;
  slogan: string;
  sub_slogan: string;
  phone: string;
  whatsapp: string;
  address: string;
  opening_hours: string;
}

export const INITIAL_SETTINGS: RestaurantSettings = {
  id: 1,
  restaurant_name: 'Restaurant La Gratitude',
  slogan: 'Une cuisine savoureuse, un service de qualité !',
  sub_slogan: 'Bon goût, bonne humeur !',
  phone: '+226 60 18 65 25',
  whatsapp: '22660186525',
  address: 'Zagtouli, route de Bobo, Ouagadougou - Burkina Faso',
  opening_hours: 'Lundi - Dimanche de 07h00 à 23h00'
};

export interface OrderItem {
  id: number;
  name: string;
  selectedOption?: string;
  price: number;
  qty: number;
}

export interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  order_type: 'Sur place' | 'À emporter' | 'Livraison';
  order_detail: string;      // N° de table, heure de retrait, ou quartier de livraison
  payment_method: 'Espèces' | 'Orange Money' | 'Moov Money';
  items_json: OrderItem[];
  total_cfa: number;
  status: 'En cours' | 'Préparée' | 'Livrée' | 'Annulée';
  notes?: string;
  created_at: string;
}

export const INITIAL_DISHES: Dish[] = [
  // MENUS DU JOUR (À COCHER CHAQUE MATIN)
  { id: 1, slug: 'riz-gras', name: 'Riz gras', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Simple', 'Avec piment', 'Sans piment'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-tl', description: 'Riz gras traditionnel parfumé aux épices douces, légumes et viande.', display_order: 1 },
  { id: 2, slug: 'riz-sauce-arachide', name: 'Riz sauce d’arachide', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Bœuf', 'Poulet', 'Simple'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-bl', description: 'Riz blanc servi avec une sauce d’arachide onctueuse mijotée.', display_order: 2 },
  { id: 3, slug: 'riz-sauce-tomate', name: 'Riz sauce tomate', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Bœuf', 'Poisson', 'Simple'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-tl', description: 'Riz accompagné d’une sauce tomate maison bien relevée.', display_order: 3 },
  { id: 4, slug: 'to-sauce-boulvanka', name: 'Tô sauce boulvanka', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Sauce Boulvanka', 'Avec viande', 'Avec poisson'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-tr', description: 'Tô traditionnel servi chaud avec sa sauce boulvanka authentique.', display_order: 4 },
  { id: 5, slug: 'soupe-poulet', name: 'Soupe de poulet', category: 'Soupes', price: 1500, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Avec pain', 'Sans piment', 'Bien pimenté'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-br', description: 'Bouillon chaud et parfumé de poulet local aux herbes fraîches.', display_order: 5 },
  { id: 6, slug: 'soupe-poisson', name: 'Soupe de poisson', category: 'Soupes', price: 1500, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Avec pain', 'Citron & piment', 'Sans piment'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-br', description: 'Soupe de poisson frais au citron vert et aromates.', display_order: 6 },
  { id: 7, slug: 'soupe-jarret', name: 'Soupe de jarret', category: 'Soupes', price: 1500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Avec pain', 'Nature'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-br', description: 'Soupe traditionnelle au jarret tendre longuement mijotée.', display_order: 7 },
  { id: 8, slug: 'soupe-boyaux', name: 'Soupe de boyaux', category: 'Soupes', price: 1500, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Avec pain', 'Bien relevée'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-br', description: 'Soupe traditionnelle aux tripes bien assaisonnée.', display_order: 8 },
  { id: 9, slug: 'brochettes-kaya', name: 'Brochettes Kaya (x5)', category: 'Grillades', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Avec oignons & kankankan', 'Sans piment'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-tl', description: 'Portion de 5 brochettes Kaya grillées au feu de bois.', display_order: 9 },
  { id: 10, slug: 'brochette-filet', name: 'Brochette Filet (x1)', category: 'Grillades', price: 500, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Bien cuit', 'Saignant'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-tl', description: 'Brochette de filet de bœuf tendre marinée et grillée.', display_order: 10 },
  { id: 11, slug: 'brochettes-merguez', name: 'Brochettes Merguez (x4)', category: 'Grillades', price: 2000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Avec moutarde', 'Avec piment'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-bl', description: 'Portion de 4 merguez grillées bien dorées.', display_order: 11 },
  { id: 12, slug: 'alloco', name: 'Alloco doré', category: 'Grillades', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Avec sauce piment', 'Sans piment'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-tr', description: 'Bananes plantains mûres frites accompagnées de piment.', display_order: 12 },
  { id: 13, slug: 'pommes-sautees', name: 'Pommes sautées', category: 'Grillades', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['À l’ail & persil', 'Nature'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-bl', description: 'Pommes de terre sautées à l’ail et fines herbes.', display_order: 13 },
  { id: 14, slug: 'frites', name: 'Assiette de Frites', category: 'Grillades', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Ketchup / Mayonnaise', 'Nature'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-bl', description: 'Frites croustillantes dorées maison.', display_order: 14 },
  { id: 15, slug: 'omelette-gratitude', name: 'Omelette Gratitude', category: 'Plats', price: 2000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Baveuse', 'Bien cuite'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Omelette signature du Chef richement garnie.', display_order: 15 },
  { id: 16, slug: 'omelette-jambon-fromage', name: 'Omelette jambon fromage', category: 'Plats', price: 2000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Avec pain baguette', 'Bien cuite'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Omelette moelleuse garnie de jambon et fromage fondant.', display_order: 16 },
  { id: 17, slug: 'omelette-espagnole', name: 'Omelette espagnole chorizo', category: 'Plats', price: 2000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Au chorizo doux', 'Au chorizo fort'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Omelette généreuse au chorizo, poivrons et oignons.', display_order: 17 },
  { id: 18, slug: 'omelette-nature', name: 'Omelette nature', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Oignons & tomates', 'Nature simple'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Omelette classique aux œufs frais.', display_order: 18 },
  { id: 19, slug: 'sandwich-gratitude', name: 'Sandwich Gratitude', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Complet', 'Sans mayonnaise'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Sandwich complet spécial La Gratitude.', display_order: 19 },
  { id: 20, slug: 'sandwich-poisson-viande', name: 'Sandwich poisson / viande', category: 'Plats', price: 500, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Viande', 'Poisson'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Baguette garnie au choix de poisson ou de viande.', display_order: 20 },
  { id: 21, slug: 'sandwich-fromage-compose', name: 'Sandwich fromage / composé', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Sandwich Composé', 'Sandwich Fromage'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Sandwich frais au fromage ou crudités composées.', display_order: 21 },
  { id: 22, slug: 'cafe-espresso', name: 'Café Espresso', category: 'Boissons', price: 750, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Court', 'Allongé'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tl', description: 'Café espresso intense fraîchement extrait.', display_order: 22 },
  { id: 23, slug: 'cappuccino', name: 'Cappuccino', category: 'Boissons', price: 500, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Avec sucre', 'Sans sucre'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tl', description: 'Café espresso coiffé d’une mousse de lait onctueuse.', display_order: 23 },
  { id: 24, slug: 'lipton-nescafe', name: 'Thé Lipton / Nescafé', category: 'Boissons', price: 300, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Thé Lipton Citron/Menthe', 'Nescafé Simple', 'Nescafé au Lait'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tl', description: 'Thé chaud Lipton ou Nescafé.', display_order: 24 },
  { id: 25, slug: 'jus-naturel', name: 'Jus naturel (Bissap / Gingembre)', category: 'Boissons', price: 500, availability_mode: 'daily', is_available_today: true, stock_status: 'available', options_json: ['Bissap rouge glacé', 'Gingembre (Gnamakoudji)', 'Pain de singe (Tedo)'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tr', description: 'Jus locaux glacés préparés maison.', display_order: 25 },

  // MENUS DISPONIBLES (TOUJOURS DISPONIBLES PAR DÉFAUT)
  { id: 26, slug: 'pizza-gratitude', name: 'Pizza Gratitude', category: 'Pizzas', price: 6000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Supplément fromage', 'Avec huile piquante', 'Classique'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'La pizza royale signature du Chef, richement garnie et cuite au four.', display_order: 26 },
  { id: 27, slug: 'pizza-napolitaine', name: 'Pizza Napolitaine', category: 'Pizzas', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Classique', 'Avec huile piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Pizza artisanale Napolitaine cuite au four.', display_order: 27 },
  { id: 28, slug: 'pizza-fermiere', name: 'Pizza Fermière', category: 'Pizzas', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Classique', 'Avec huile piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Pizza Fermière généreuse au poulet/viande et fromage.', display_order: 28 },
  { id: 29, slug: 'pizza-piquante', name: 'Pizza Piquante', category: 'Pizzas', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Moyennement piquante', 'Très piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Pizza relevée aux épices, poivrons et viande.', display_order: 29 },
  { id: 30, slug: 'pizza-4-saisons', name: 'Pizza 4 Saisons', category: 'Pizzas', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Classique', 'Avec huile piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Pizza 4 Saisons aux ingrédients variés et mozzarella.', display_order: 30 },
  { id: 31, slug: 'pizza-margherita-jambon', name: 'Pizza Margherita / Jambon', category: 'Pizzas', price: 4000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Margherita (Fromage)', 'Jambon Fromage'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Classique Margherita ou Jambon-Fromage cuite au four.', display_order: 31 },
  { id: 32, slug: 'poulet-roti-flambe', name: 'Poulet Spécial (5 préparations)', category: 'Poulets', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Poulet Flambé', 'Poulet Rabilé', 'Poulet Sauté', 'Poulet Pané', 'Poulet à l’Ail'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-br', description: 'Poulet entier préparé au choix : flambé, rabilé, sauté, pané ou à l’ail.', display_order: 32 },
  { id: 33, slug: 'poulet-couscous', name: 'Poulet au couscous', category: 'Poulets', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Couscous fin & légumes', 'Avec piment à part'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-br', description: 'Poulet entier servi avec semoule de couscous parfumée.', display_order: 33 },
  { id: 34, slug: 'mouton-au-four', name: 'Mouton au four', category: 'Grillades', price: 5000, availability_mode: 'order', is_available_today: true, stock_status: 'available', options_json: ['Avec Alloco', 'Avec Frites', 'Avec Pommes sautées', 'Viande seule'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-tl', description: 'Viande de mouton tendre rôtie au four aux herbes.', display_order: 34 },
  { id: 35, slug: 'salade-composee', name: 'Salade (Gratitude / Niçoise / Thon)', category: 'Salades', price: 2000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Salade Gratitude', 'Salade Composée', 'Salade Niçoise', 'Salade Tomate au Thon'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-tr', description: 'Assiette fraîcheur : Gratitude, Composée, Niçoise ou Tomate au thon.', display_order: 35 },
  { id: 36, slug: 'salade-verte', name: 'Salade verte', category: 'Salades', price: 1500, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Vinaigrette maison', 'Citron & huile d’olive'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-tr', description: 'Salade verte croquante et vinaigrette maison.', display_order: 36 },
  { id: 37, slug: 'hamburger', name: 'Hamburger', category: 'Plats', price: 1500, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Complet Fromage', 'Sans oignons'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-bl', description: 'Hamburger maison au steak grillé, fromage fondant et crudités.', display_order: 37 },
  { id: 38, slug: 'chawarma-pain-anglais', name: 'Chawarma / Pain anglais', category: 'Plats', price: 1000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Chawarma', 'Pain Anglais'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-bl', description: 'Chawarma savoureux ou Pain anglais garni minute.', display_order: 38 }
];

export const INITIAL_ORDERS: Order[] = [];

declare global {
  // eslint-disable-next-line no-var
  var _gratitudeDishes: Dish[] | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeOrders: Order[] | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeSettings: RestaurantSettings | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeSchemaReady: boolean | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeSchemaPromise: Promise<ReturnType<typeof getNeonClient>> | undefined;
  // eslint-disable-next-line no-var
  var _dishesCache: { data: Dish[]; ts: number } | undefined;
  // eslint-disable-next-line no-var
  var _ordersCache: { data: Order[]; ts: number } | undefined;
  // eslint-disable-next-line no-var
  var _settingsCache: { data: RestaurantSettings; ts: number } | undefined;
}

export function getMemoryDishes(): Dish[] {
  if (!global._gratitudeDishes) {
    global._gratitudeDishes = INITIAL_DISHES.map(d => ({ ...d }));
  }
  return global._gratitudeDishes;
}

export function getMemoryOrders(): Order[] {
  if (!global._gratitudeOrders) {
    global._gratitudeOrders = INITIAL_ORDERS.map(o => ({ ...o }));
  }
  return global._gratitudeOrders;
}

export function getMemorySettings(): RestaurantSettings {
  if (!global._gratitudeSettings) {
    global._gratitudeSettings = { ...INITIAL_SETTINGS };
  }
  return global._gratitudeSettings;
}

export function getNeonClient() {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') return null;
  const cleanUrl = url.replace('&channel_binding=require', '');
  return neon(cleanUrl);
}

export function invalidateDishesCache() {
  global._dishesCache = undefined;
}

export function invalidateOrdersCache() {
  global._ordersCache = undefined;
}

export function invalidateSettingsCache() {
  global._settingsCache = undefined;
}

export async function ensureNeonSchema() {
  const sql = getNeonClient();
  if (!sql) return null;
  if (global._gratitudeSchemaReady) return sql;
  if (global._gratitudeSchemaPromise) return global._gratitudeSchemaPromise;

  global._gratitudeSchemaPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS dishes (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(120) UNIQUE NOT NULL,
          name VARCHAR(180) NOT NULL,
          category VARCHAR(80) NOT NULL,
          price INTEGER NOT NULL,
          availability_mode VARCHAR(30) NOT NULL DEFAULT 'daily',
          is_available_today BOOLEAN NOT NULL DEFAULT true,
          stock_status VARCHAR(30) NOT NULL DEFAULT 'available',
          options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          image_url TEXT NOT NULL,
          image_quadrant VARCHAR(20) NOT NULL DEFAULT 'quad-tl',
          description TEXT,
          display_order INTEGER NOT NULL DEFAULT 100,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_code VARCHAR(40) UNIQUE NOT NULL,
          customer_name VARCHAR(120) NOT NULL,
          customer_phone VARCHAR(60) NOT NULL,
          order_type VARCHAR(40) NOT NULL DEFAULT 'Sur place',
          order_detail VARCHAR(160) NOT NULL DEFAULT '',
          payment_method VARCHAR(40) NOT NULL DEFAULT 'Espèces',
          items_json JSONB NOT NULL,
          total_cfa INTEGER NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'En cours',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS restaurant_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          restaurant_name VARCHAR(150) NOT NULL DEFAULT 'Restaurant La Gratitude',
          slogan VARCHAR(255) NOT NULL DEFAULT 'Une cuisine savoureuse, un service de qualité !',
          sub_slogan VARCHAR(255) NOT NULL DEFAULT 'Bon goût, bonne humeur !',
          phone VARCHAR(60) NOT NULL DEFAULT '+226 60 18 65 25',
          whatsapp VARCHAR(60) NOT NULL DEFAULT '22660186525',
          address VARCHAR(255) NOT NULL DEFAULT 'Zagtouli, route de Bobo, Ouagadougou - Burkina Faso',
          opening_hours VARCHAR(150) NOT NULL DEFAULT 'Lundi - Dimanche de 07h00 à 23h00',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM dishes`;
      const count = countRows[0]?.cnt ?? 0;

      // Remove old demo orders if present
      await sql`
        DELETE FROM orders
        WHERE order_code IN ('#CMD-2026-061', '#CMD-2026-060', '#CMD-2026-059')
      `;

      if (count === 0) {
        for (const d of INITIAL_DISHES) {
          await sql`
            INSERT INTO dishes (slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order)
            VALUES (${d.slug}, ${d.name}, ${d.category}, ${d.price}, ${d.availability_mode}, ${d.is_available_today}, ${d.stock_status}, ${JSON.stringify(d.options_json)}::jsonb, ${d.image_url}, ${d.image_quadrant}, ${d.description}, ${d.display_order})
            ON CONFLICT (slug) DO NOTHING
          `;
        }
        await sql`
          INSERT INTO restaurant_settings (id, restaurant_name, slogan, sub_slogan, phone, whatsapp, address, opening_hours)
          VALUES (
            1,
            ${INITIAL_SETTINGS.restaurant_name},
            ${INITIAL_SETTINGS.slogan},
            ${INITIAL_SETTINGS.sub_slogan},
            ${INITIAL_SETTINGS.phone},
            ${INITIAL_SETTINGS.whatsapp},
            ${INITIAL_SETTINGS.address},
            ${INITIAL_SETTINGS.opening_hours}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }

      global._gratitudeSchemaReady = true;
    } catch (err) {
      console.error('Auto-init Neon schema error:', err);
    } finally {
      global._gratitudeSchemaPromise = undefined;
    }
    return sql;
  })();

  return global._gratitudeSchemaPromise;
}
