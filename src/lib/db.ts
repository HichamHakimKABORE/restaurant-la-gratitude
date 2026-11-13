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
  phone_2?: string;
  whatsapp: string;
  address: string;
  opening_hours: string;
}

export interface GalleryImage {
  id: number;
  title: string;
  image_url: string;
  display_order: number;
  created_at?: string;
}

export interface DailyMenuDishItem {
  id: number;
  name: string;
  category: string;
  price: number;
  stock_status: StockStatus;
  is_available_today: boolean;
}

export interface DailyMenuRecord {
  id: number;
  menu_date: string; // YYYY-MM-DD
  dishes_json: DailyMenuDishItem[];
  total_dishes: number;
  notes?: string;
  created_at?: string;
  orders_count?: number;
  revenue_cfa?: number;
}

export const INITIAL_MENU_HISTORY: DailyMenuRecord[] = [];

/**
 * Retourne la date logique du service du restaurant (format YYYY-MM-DD).
 * Le basculement d'une journée à l'autre se fait à 04h00 UTC (04h00 heure de Ouagadougou),
 * ce qui permet à l'équipe de préparer le Menu du Jour la veille tard le soir sans qu'il
 * soit effacé à minuit pile, et au service du soir (jusqu'à 23h00-02h00) de rester actif.
 */
export function getLogicalMenuDate(): string {
  const shifted = new Date(Date.now() - 4 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export const INITIAL_GALLERY_IMAGES: GalleryImage[] = [
  { id: 1, title: 'Ambiance chaleureuse à Zagtouli', image_url: '/images/dishes_grid_1.jpg', display_order: 1 },
  { id: 2, title: 'Nos grillades & pizzas au four', image_url: '/images/dishes_grid_2.jpg', display_order: 2 },
  { id: 3, title: 'Fraîcheur des ingrédients', image_url: '/images/dishes_grid_3.jpg', display_order: 3 },
  { id: 4, title: 'Boissons fraîches & accueil convivial', image_url: '/images/dishes_grid_4.jpg', display_order: 4 },
  { id: 5, title: 'Monument des Martyrs & Fierté', image_url: '/images/monument_exact.jpg', display_order: 5 }
];

export const INITIAL_SETTINGS: RestaurantSettings = {
  id: 1,
  restaurant_name: 'Restaurant La Gratitude',
  slogan: 'Une cuisine savoureuse, un service de qualité !',
  sub_slogan: 'Bon goût, bonne humeur !',
  phone: '+226 02 80 99 06',
  phone_2: '',
  whatsapp: '22602809906',
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
  payment_ref?: string | null;
  items_json: OrderItem[];
  total_cfa: number;
  status: 'En cours' | 'Préparée' | 'Livrée' | 'Annulée';
  notes?: string;
  /** Verrou optimiste : empêche deux postes admin de s'écraser mutuellement. */
  status_version?: number;
  paid_at?: string | null;
  paid_by?: string | null;
  needs_review?: boolean;
  /** Jeton secret de suivi client (jamais exposé dans les listes admin). */
  track_token?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at?: string;
}

export const INITIAL_DISHES: Dish[] = [
  // MENUS DU JOUR (À COCHER PAR L'ADMIN CHAQUE MATIN — AUCUN PLAT COCHÉ PAR DÉFAUT TANT QUE L'ADMIN N'ACTUALISE PAS)
  { id: 1, slug: 'riz-gras', name: 'Riz gras', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Simple', 'Avec piment', 'Sans piment'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-tl', description: 'Riz gras traditionnel parfumé aux épices douces, légumes et viande.', display_order: 1 },
  { id: 2, slug: 'riz-sauce-arachide', name: 'Riz sauce d’arachide', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Bœuf', 'Poulet', 'Simple'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-bl', description: 'Riz blanc servi avec une sauce d’arachide onctueuse mijotée.', display_order: 2 },
  { id: 3, slug: 'riz-sauce-tomate', name: 'Riz sauce tomate', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Bœuf', 'Poisson', 'Simple'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-tl', description: 'Riz accompagné d’une sauce tomate maison bien relevée.', display_order: 3 },
  { id: 5, slug: 'soupe-poulet', name: 'Soupe de poulet', category: 'Soupes', price: 1500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Avec pain', 'Sans piment', 'Bien pimenté'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-br', description: 'Bouillon chaud et parfumé de poulet local aux herbes fraîches.', display_order: 4 },
  { id: 6, slug: 'soupe-poisson', name: 'Soupe de poisson', category: 'Soupes', price: 1500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Avec pain', 'Citron & piment', 'Sans piment'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-br', description: 'Soupe de poisson frais au citron vert et aromates.', display_order: 5 },
  { id: 7, slug: 'soupe-jarret', name: 'Soupe de jarret', category: 'Soupes', price: 1500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Avec pain', 'Nature'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-br', description: 'Soupe traditionnelle au jarret tendre longuement mijotée.', display_order: 6 },
  { id: 8, slug: 'soupe-boyaux', name: 'Soupe de boyaux', category: 'Soupes', price: 1500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Avec pain', 'Bien relevée'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-br', description: 'Soupe traditionnelle aux tripes bien assaisonnée.', display_order: 7 },
  { id: 4, slug: 'to-sauce-boulvanka', name: 'Tô sauce boulvanka', category: 'Plats', price: 1000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Sauce Boulvanka', 'Avec viande', 'Avec poisson'], image_url: '/images/dishes_grid_1.jpg', image_quadrant: 'quad-tr', description: 'Tô traditionnel servi chaud avec sa sauce boulvanka authentique.', display_order: 8 },
  { id: 9, slug: 'brochettes-kaya', name: 'Brochettes Kaya (x5)', category: 'Grillades', price: 1000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Avec oignons & kankankan', 'Sans piment'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-tl', description: 'Portion de 5 brochettes Kaya grillées au feu de bois.', display_order: 9 },
  { id: 10, slug: 'brochette-filet', name: 'Brochette Filet (x1)', category: 'Grillades', price: 500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Bien cuit', 'Saignant'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-tl', description: 'Brochette de filet de bœuf tendre marinée et grillée.', display_order: 10 },
  { id: 11, slug: 'brochettes-merguez', name: 'Brochettes Merguez (x4)', category: 'Grillades', price: 2000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Avec moutarde', 'Avec piment'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-bl', description: 'Portion de 4 merguez grillées bien dorées.', display_order: 11 },
  { id: 12, slug: 'alloco', name: 'Alloco doré', category: 'Grillades', price: 1000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Avec sauce piment', 'Sans piment'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-tr', description: 'Bananes plantains mûres frites accompagnées de piment.', display_order: 12 },
  { id: 13, slug: 'pommes-sautees', name: 'Pommes sautées', category: 'Grillades', price: 1000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['À l’ail & persil', 'Nature'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-bl', description: 'Pommes de terre sautées à l’ail et fines herbes.', display_order: 13 },
  { id: 14, slug: 'frites', name: 'Assiette de Frites', category: 'Grillades', price: 1000, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Ketchup / Mayonnaise', 'Nature'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-bl', description: 'Frites croustillantes dorées maison.', display_order: 14 },
  { id: 15, slug: 'omelette-gratitude', name: 'Omelette Gratitude', category: 'Plats', price: 2000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Baveuse', 'Bien cuite'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Omelette signature du Chef richement garnie.', display_order: 15 },
  { id: 16, slug: 'omelette-jambon-fromage', name: 'Omelette jambon fromage', category: 'Plats', price: 2000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Avec pain baguette', 'Bien cuite'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Omelette moelleuse garnie de jambon et fromage fondant.', display_order: 16 },
  { id: 17, slug: 'omelette-espagnole', name: 'Omelette espagnole chorizo', category: 'Plats', price: 2000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Au chorizo doux', 'Au chorizo fort'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Omelette généreuse au chorizo, poivrons et oignons.', display_order: 17 },
  { id: 18, slug: 'omelette-nature', name: 'Omelette nature', category: 'Plats', price: 1000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Oignons & tomates', 'Nature simple'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Omelette classique aux œufs frais.', display_order: 18 },
  { id: 19, slug: 'sandwich-gratitude', name: 'Sandwich Gratitude', category: 'Plats', price: 1000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Complet', 'Sans mayonnaise'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Sandwich complet spécial La Gratitude.', display_order: 19 },
  { id: 20, slug: 'sandwich-poisson', name: 'Sandwich Poisson', category: 'Plats', price: 500, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Avec piment', 'Sans piment'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Baguette garnie au poisson savoureux.', display_order: 20 },
  { id: 21, slug: 'sandwich-viande', name: 'Sandwich Viande', category: 'Plats', price: 500, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Avec piment', 'Sans piment'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Baguette garnie à la viande grillée.', display_order: 21 },
  { id: 39, slug: 'sandwich-compose', name: 'Sandwich Composé', category: 'Plats', price: 1000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Complet', 'Sans mayonnaise'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Sandwich frais aux crudités composées et œuf.', display_order: 22 },
  { id: 40, slug: 'sandwich-fromage', name: 'Sandwich Fromage', category: 'Plats', price: 1000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Avec crudités', 'Simple'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-br', description: 'Sandwich généreux au fromage fondant.', display_order: 23 },
  { id: 22, slug: 'cafe-espresso', name: 'Café Espresso', category: 'Boissons', price: 750, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Court', 'Allongé'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tl', description: 'Café espresso intense fraîchement extrait.', display_order: 24 },
  { id: 23, slug: 'cappuccino', name: 'Cappuccino', category: 'Boissons', price: 500, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Avec sucre', 'Sans sucre'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tl', description: 'Café espresso coiffé d’une mousse de lait onctueuse.', display_order: 25 },
  { id: 24, slug: 'the-lipton', name: 'Thé Lipton', category: 'Boissons', price: 300, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Citron', 'Menthe', 'Nature'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tl', description: 'Thé chaud Lipton servi au choix citron, menthe ou nature.', display_order: 26 },
  { id: 41, slug: 'nescafe', name: 'Nescafé', category: 'Boissons', price: 300, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Nescafé Simple', 'Nescafé au Lait'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tl', description: 'Nescafé chaud préparé à la demande, simple ou au lait.', display_order: 27 },
  { id: 25, slug: 'jus-bissap', name: 'Jus de Bissap', category: 'Boissons', price: 500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Glacé', 'À température'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tr', description: 'Jus de bissap rouge maison bien frais.', display_order: 28 },
  { id: 42, slug: 'jus-gingembre', name: 'Jus de Gingembre', category: 'Boissons', price: 500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Bien relevé', 'Doux'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tr', description: 'Gnamakoudji maison au gingembre frais.', display_order: 29 },
  { id: 43, slug: 'jus-pain-de-singe', name: 'Jus de Pain de singe (Tedo)', category: 'Boissons', price: 500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Glacé', 'À température'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tr', description: 'Jus onctueux de fruit de baobab (Tedo) préparé maison.', display_order: 30 },
  { id: 53, slug: 'gapal', name: 'Gapal', category: 'Boissons', price: 500, availability_mode: 'daily', is_available_today: false, stock_status: 'soldout', options_json: ['Glacé', 'À température'], image_url: '/images/dishes_grid_4.jpg', image_quadrant: 'quad-tr', description: 'Gapal traditionnel frais au petit mil et lait caillé.', display_order: 31 },

  // MENUS DISPONIBLES (TOUJOURS DISPONIBLES PAR DÉFAUT)
  { id: 26, slug: 'pizza-gratitude', name: 'Pizza Gratitude', category: 'Pizzas', price: 6000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Supplément fromage', 'Avec huile piquante', 'Classique'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'La pizza royale signature du Chef, richement garnie et cuite au four.', display_order: 31 },
  { id: 27, slug: 'pizza-napolitaine', name: 'Pizza Napolitaine', category: 'Pizzas', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Classique', 'Avec huile piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Pizza artisanale Napolitaine cuite au four.', display_order: 32 },
  { id: 28, slug: 'pizza-fermiere', name: 'Pizza Fermière', category: 'Pizzas', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Classique', 'Avec huile piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Pizza Fermière généreuse au poulet/viande et fromage.', display_order: 33 },
  { id: 29, slug: 'pizza-piquante', name: 'Pizza Piquante', category: 'Pizzas', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Moyennement piquante', 'Très piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Pizza relevée aux épices, poivrons et viande.', display_order: 34 },
  { id: 30, slug: 'pizza-4-saisons', name: 'Pizza 4 Saisons', category: 'Pizzas', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Classique', 'Avec huile piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Pizza 4 Saisons aux ingrédients variés et mozzarella.', display_order: 35 },
  { id: 31, slug: 'pizza-margherita', name: 'Pizza Margherita', category: 'Pizzas', price: 4000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Classique', 'Avec huile piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Classique Pizza Margherita sauce tomate, mozzarella et origan.', display_order: 36 },
  { id: 44, slug: 'pizza-jambon-fromage', name: 'Pizza Jambon Fromage', category: 'Pizzas', price: 4000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Classique', 'Avec huile piquante'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-bl', description: 'Pizza Jambon-Fromage dorée au four avec mozzarella fondante.', display_order: 37 },
  { id: 32, slug: 'poulet-flambe', name: 'Poulet Flambé', category: 'Poulets', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Avec piment à part', 'Bien grillé'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-br', description: 'Poulet entier flambé aux épices maison, servi chaud et doré.', display_order: 38 },
  { id: 45, slug: 'poulet-rabile', name: 'Poulet Rabilé', category: 'Poulets', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Avec piment à part', 'Bien grillé'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-br', description: 'Poulet entier mariné et braisé façon rabilé authentique.', display_order: 39 },
  { id: 46, slug: 'poulet-saute', name: 'Poulet Sauté', category: 'Poulets', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Aux oignons & poivrons', 'Bien relevé'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-br', description: 'Poulet entier sauté à la poêle avec légumes et épices.', display_order: 40 },
  { id: 47, slug: 'poulet-pane', name: 'Poulet Pané', category: 'Poulets', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Croustillant', 'Avec sauce'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-br', description: 'Poulet entier pané bien croustillant et doré.', display_order: 41 },
  { id: 48, slug: 'poulet-ail', name: 'Poulet à l’Ail', category: 'Poulets', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Bien parfumé', 'Avec piment à part'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-br', description: 'Poulet entier rôti et parfumé à l’ail frais et fines herbes.', display_order: 42 },
  { id: 33, slug: 'poulet-couscous', name: 'Poulet au couscous', category: 'Poulets', price: 5000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Couscous fin & légumes', 'Avec piment à part'], image_url: '/images/dishes_grid_2.jpg', image_quadrant: 'quad-br', description: 'Poulet entier servi avec semoule de couscous parfumée.', display_order: 43 },
  { id: 34, slug: 'mouton-au-four', name: 'Mouton au four', category: 'Grillades', price: 5000, availability_mode: 'order', is_available_today: true, stock_status: 'available', options_json: ['Avec Alloco', 'Avec Frites', 'Avec Pommes sautées', 'Viande seule'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-tl', description: 'Viande de mouton tendre rôtie au four aux herbes.', display_order: 44 },
  { id: 35, slug: 'salade-gratitude', name: 'Salade Gratitude', category: 'Salades', price: 2000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Vinaigrette maison', 'Sans oignons'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-tr', description: 'Assiette fraîcheur signature La Gratitude richement garnie.', display_order: 45 },
  { id: 49, slug: 'salade-composee-speciale', name: 'Salade Composée', category: 'Salades', price: 2000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Vinaigrette maison', 'Sans mayonnaise'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-tr', description: 'Salade composée fraîche aux crudités, œufs et assaisonnement.', display_order: 46 },
  { id: 50, slug: 'salade-nicoise', name: 'Salade Niçoise', category: 'Salades', price: 2000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Vinaigrette maison', 'Citron & huile d’olive'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-tr', description: 'Salade Niçoise traditionnelle aux légumes croquants, thon et olives.', display_order: 47 },
  { id: 51, slug: 'salade-tomate-thon', name: 'Salade Tomate au Thon', category: 'Salades', price: 2000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Vinaigrette maison', 'Citron & huile d’olive'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-tr', description: 'Tomates fraîches garnies au thon et fines herbes.', display_order: 48 },
  { id: 36, slug: 'salade-verte', name: 'Salade verte', category: 'Salades', price: 1500, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Vinaigrette maison', 'Citron & huile d’olive'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-tr', description: 'Salade verte croquante et vinaigrette maison.', display_order: 49 },
  { id: 37, slug: 'hamburger', name: 'Hamburger', category: 'Plats', price: 1500, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Complet Fromage', 'Sans oignons'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-bl', description: 'Hamburger maison au steak grillé, fromage fondant et crudités.', display_order: 50 },
  { id: 38, slug: 'chawarma', name: 'Chawarma', category: 'Plats', price: 1000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Avec piment', 'Sans piment'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-bl', description: 'Chawarma savoureux garni minute avec viande marinée et crudités.', display_order: 51 },
  { id: 52, slug: 'pain-anglais', name: 'Pain Anglais', category: 'Plats', price: 1000, availability_mode: 'always', is_available_today: true, stock_status: 'available', options_json: ['Avec piment', 'Sans piment'], image_url: '/images/dishes_grid_3.jpg', image_quadrant: 'quad-bl', description: 'Pain anglais chaud généreusement garni minute.', display_order: 52 }
];

export const INITIAL_ORDERS: Order[] = [];

/**
 * Retourne la famille de classement pour le Menu du Jour :
 * 1. Plats de Riz
 * 2. Soupes
 * 3. Tô & Plats Traditionnels
 * 4. Grillades & Accompagnements
 * 5. Boissons & Jus Naturels
 * 6. Autres Plats du Jour
 */
function isTraditionalDishName(name: string): boolean {
  const n = (name || '').toLowerCase();
  const norm = stripAccents(name || '');
  return (
    n.includes('tô') ||
    norm.startsWith('to ') ||
    norm === 'to' ||
    norm.includes('boulvanka') ||
    norm.includes('attieke') ||
    norm.includes('athieke') ||
    norm.includes('atthieke')
  );
}

export function getDailyMenuGroupLabel(dish: { name: string; category?: string }): string {
  const n = (dish.name || '').toLowerCase();
  const c = (dish.category || '').toLowerCase();
  if (n.includes('riz')) return '1. Plats de Riz';
  if (c === 'soupes' || n.includes('soupe')) return '2. Soupes';
  if (isTraditionalDishName(dish.name)) return '3. Tô & Plats Traditionnels';
  if (c === 'grillades' || n.includes('brochette') || n.includes('alloco') || n.includes('frite') || n.includes('pomme')) {
    return '4. Grillades & Accompagnements';
  }
  if (c === 'boissons' || n.includes('jus') || n.includes('gapal')) {
    return '5. Boissons & Jus Naturels';
  }
  return '6. Autres Plats du Jour';
}

export function getDailyMenuSortRank(dish: { name: string; category?: string; display_order?: number; id?: number }): number {
  const n = (dish.name || '').toLowerCase();
  const c = (dish.category || '').toLowerCase();
  if (n.includes('riz')) return 10;
  if (c === 'soupes' || n.includes('soupe')) return 20;
  if (isTraditionalDishName(dish.name)) return 30;
  if (c === 'grillades' || n.includes('brochette') || n.includes('alloco') || n.includes('frite') || n.includes('pomme')) return 40;
  if (c === 'boissons' || n.includes('jus') || n.includes('gapal')) return 50;
  return 60;
}

export function sortDailyMenuDishes<T extends { name: string; category?: string; display_order?: number; id?: number }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const rankDiff = getDailyMenuSortRank(a) - getDailyMenuSortRank(b);
    if (rankDiff !== 0) return rankDiff;
    const orderDiff = (a.display_order ?? 999) - (b.display_order ?? 999);
    if (orderDiff !== 0) return orderDiff;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

function stripAccents(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Recherche insensible aux accents (ex: "to" trouve "Tô", "rabile" trouve "Rabilé")
 * dans le nom, la catégorie, la description et les options d'un plat.
 */
export function matchesDishSearch(
  dish: { name: string; category?: string; description?: string; options_json?: string[] },
  query: string
): boolean {
  const q = stripAccents(query.trim());
  if (!q) return true;
  const haystack = stripAccents(
    [
      dish.name,
      dish.category || '',
      dish.description || '',
      Array.isArray(dish.options_json) ? dish.options_json.join(' ') : ''
    ].join(' ')
  );
  return haystack.includes(q);
}

declare global {
  // eslint-disable-next-line no-var
  var _gratitudeDishes: Dish[] | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeMemoryMenuDate: string | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeOrders: Order[] | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeSettings: RestaurantSettings | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeGallery: GalleryImage[] | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeMenuHistory: DailyMenuRecord[] | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeSchemaReady: boolean | undefined;
  // eslint-disable-next-line no-var
  var _gratitudeSchemaPromise: Promise<ReturnType<typeof getNeonClient>> | undefined;
  // eslint-disable-next-line no-var
  var _dishesCache: { data: Dish[]; ts: number; date?: string } | undefined;
  // eslint-disable-next-line no-var
  var _ordersCache: { data: Order[]; ts: number } | undefined;
  // eslint-disable-next-line no-var
  var _settingsCache: { data: RestaurantSettings; ts: number } | undefined;
  // eslint-disable-next-line no-var
  var _galleryCache: { data: GalleryImage[]; ts: number } | undefined;
  // eslint-disable-next-line no-var
  var _menuHistoryCache: { data: DailyMenuRecord[]; ts: number } | undefined;
}

export function getMemoryDishes(): Dish[] {
  const todayStr = getLogicalMenuDate();
  if (!global._gratitudeDishes) {
    global._gratitudeDishes = INITIAL_DISHES.map(d => ({ ...d }));
    global._gratitudeMemoryMenuDate = todayStr;
  } else if (global._gratitudeMemoryMenuDate !== todayStr) {
    for (const d of global._gratitudeDishes) {
      if (d.availability_mode === 'daily') {
        d.is_available_today = false;
        d.stock_status = 'soldout';
      }
    }
    global._gratitudeMemoryMenuDate = todayStr;
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

export function getMemoryGallery(): GalleryImage[] {
  if (!global._gratitudeGallery) {
    global._gratitudeGallery = INITIAL_GALLERY_IMAGES.map(g => ({ ...g }));
  }
  return global._gratitudeGallery;
}

export function getMemoryMenuHistory(): DailyMenuRecord[] {
  if (!global._gratitudeMenuHistory) {
    global._gratitudeMenuHistory = INITIAL_MENU_HISTORY.map(m => ({
      ...m,
      dishes_json: [...m.dishes_json]
    }));
  }
  return global._gratitudeMenuHistory;
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

export function invalidateGalleryCache() {
  global._galleryCache = undefined;
}

export function invalidateMenuHistoryCache() {
  global._menuHistoryCache = undefined;
}

const CURRENT_SCHEMA_VERSION = 4;

export async function ensureNeonSchema() {
  const sql = getNeonClient();
  if (!sql) return null;
  if (global._gratitudeSchemaReady) return sql;
  if (global._gratitudeSchemaPromise) return global._gratitudeSchemaPromise;

  global._gratitudeSchemaPromise = (async () => {
    try {
      // Vérification ultra-rapide : si le schéma est déjà à jour, on évite les 25 requêtes DDL
      // et les verrous AccessExclusiveLock à chaque démarrage de fonction serverless.
      try {
        const verRows = await sql`
          SELECT schema_version
          FROM restaurant_settings
          WHERE id = 1
          LIMIT 1
        `;
        if (Number(verRows[0]?.schema_version || 0) >= CURRENT_SCHEMA_VERSION) {
          global._gratitudeSchemaReady = true;
          return sql;
        }
      } catch {
        // Table ou colonne absente : on poursuit avec l'initialisation complète
      }

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

      // ---------------------------------------------------------------------
      // MIGRATIONS ANTI-FRAUDE (idempotentes) — ajoutées en P0
      // ---------------------------------------------------------------------
      await sql`ALTER TABLE dishes ADD COLUMN IF NOT EXISTS stock_status VARCHAR(30) NOT NULL DEFAULT 'available'`;
      await sql`ALTER TABLE dishes ADD COLUMN IF NOT EXISTS options_json JSONB NOT NULL DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE dishes ALTER COLUMN image_url TYPE TEXT`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS track_token TEXT`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_ref TEXT`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_version INTEGER NOT NULL DEFAULT 1`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMP WITH TIME ZONE`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_by VARCHAR(120)`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE`;

      // Les anciennes commandes n'avaient pas de jeton de suivi : on en génère un (aléa cryptographique via gen_random_uuid).
      await sql`
        UPDATE orders
        SET track_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
        WHERE track_token IS NULL
      `;

      // Unicité : idempotence, suivi client, preuve de paiement.
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_uniq ON orders(idempotency_key)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS orders_track_token_uniq ON orders(track_token)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_ref_uniq ON orders(payment_method, payment_ref)`;
      await sql`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)`;

      // Journal d'audit : qui a changé quel statut, quand, depuis quelle IP.
      await sql`
        CREATE TABLE IF NOT EXISTS order_events (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          from_status VARCHAR(30),
          to_status VARCHAR(30),
          action VARCHAR(30) NOT NULL DEFAULT 'status_change',
          actor VARCHAR(120) NOT NULL DEFAULT 'system',
          ip VARCHAR(80),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS order_events_order_id_idx ON order_events(order_id)`;

      // P1-5 : Table normalisée des articles commandés pour inventaire et stats fiables
      await sql`
        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          dish_id INTEGER,
          item_name VARCHAR(150) NOT NULL,
          option_name VARCHAR(100),
          unit_price_cfa INTEGER NOT NULL,
          qty INTEGER NOT NULL CHECK (qty > 0),
          total_cfa INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)`;
      await sql`CREATE INDEX IF NOT EXISTS order_items_dish_id_idx ON order_items(dish_id)`;

      await sql`
        CREATE TABLE IF NOT EXISTS restaurant_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          restaurant_name VARCHAR(150) NOT NULL DEFAULT 'Restaurant La Gratitude',
          slogan VARCHAR(255) NOT NULL DEFAULT 'Une cuisine savoureuse, un service de qualité !',
          sub_slogan VARCHAR(255) NOT NULL DEFAULT 'Bon goût, bonne humeur !',
          phone VARCHAR(60) NOT NULL DEFAULT '+226 02 80 99 06',
          whatsapp VARCHAR(60) NOT NULL DEFAULT '22602809906',
          address VARCHAR(255) NOT NULL DEFAULT 'Zagtouli, route de Bobo, Ouagadougou - Burkina Faso',
          opening_hours VARCHAR(150) NOT NULL DEFAULT 'Lundi - Dimanche de 07h00 à 23h00',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS restaurant_gallery (
          id SERIAL PRIMARY KEY,
          title VARCHAR(180) NOT NULL DEFAULT 'Photo du Restaurant',
          image_url TEXT NOT NULL,
          display_order INTEGER NOT NULL DEFAULT 100,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS daily_menu_history (
          id SERIAL PRIMARY KEY,
          menu_date DATE UNIQUE NOT NULL,
          dishes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          total_dishes INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Seed daily menu history if empty
      const historyCountRows = await sql`SELECT COUNT(*)::int AS cnt FROM daily_menu_history`;
      const histCount = historyCountRows[0]?.cnt ?? 0;
      if (histCount === 0) {
        for (const h of INITIAL_MENU_HISTORY) {
          await sql`
            INSERT INTO daily_menu_history (menu_date, dishes_json, total_dishes, notes, created_at)
            VALUES (${h.menu_date}, ${JSON.stringify(h.dishes_json)}::jsonb, ${h.total_dishes}, ${h.notes || ''}, ${h.created_at || 'NOW()'})
            ON CONFLICT (menu_date) DO NOTHING
          `;
        }
      }

      const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM dishes`;
      const count = countRows[0]?.cnt ?? 0;

      if (count === 0) {
        for (const d of INITIAL_DISHES) {
          await sql`
            INSERT INTO dishes (slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order)
            VALUES (${d.slug}, ${d.name}, ${d.category}, ${d.price}, ${d.availability_mode}, ${d.is_available_today}, ${d.stock_status}, ${JSON.stringify(d.options_json)}::jsonb, ${d.image_url}, ${d.image_quadrant}, ${d.description}, ${d.display_order})
            ON CONFLICT (slug) DO NOTHING
          `;
        }
      }

      // Toujours garantir que la ligne id = 1 existe dans restaurant_settings
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

      // Ajout des colonnes de suivi dans restaurant_settings
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS daily_menu_date VARCHAR(20) DEFAULT ''`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS admin_custom_email VARCHAR(150) DEFAULT ''`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS admin_custom_password_hash VARCHAR(255) DEFAULT ''`;
      await sql`ALTER TABLE restaurant_settings ALTER COLUMN admin_custom_password_hash TYPE TEXT`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS gallery_initialized BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS session_valid_after BIGINT DEFAULT 0`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS phone_2 VARCHAR(60) DEFAULT ''`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS daily_menu_cleanup_v1 BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS menu_split_v1 BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS daily_menu_cleanup_v2 BOOLEAN DEFAULT FALSE`;

      // Journal des échecs de connexion Admin (limitation des essais partagée entre serveurs)
      await sql`
        CREATE TABLE IF NOT EXISTS admin_login_failures (
          id SERIAL PRIMARY KEY,
          ip VARCHAR(80) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS admin_login_failures_created_idx ON admin_login_failures(created_at)`;

      // Journal d'audit des actions administrateur (créations, modifications, suppressions)
      await sql`
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id SERIAL PRIMARY KEY,
          action VARCHAR(40) NOT NULL,
          target_id VARCHAR(60),
          details TEXT,
          ip VARCHAR(80),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx ON admin_audit_logs(action, created_at DESC)`;

      // Initialisation unique de la galerie photos (ne réinsère jamais les photos si l'admin les supprime ensuite)
      const settingsInitRows = await sql`SELECT daily_menu_date, gallery_initialized, daily_menu_cleanup_v1, menu_split_v1, daily_menu_cleanup_v2 FROM restaurant_settings WHERE id = 1`;
      const isGalleryInit = Boolean(settingsInitRows[0]?.gallery_initialized);
      const isDailyCleanupDone = Boolean(settingsInitRows[0]?.daily_menu_cleanup_v1);
      const isMenuSplitDone = Boolean(settingsInitRows[0]?.menu_split_v1);
      const isDailyCleanupV2Done = Boolean(settingsInitRows[0]?.daily_menu_cleanup_v2);
      if (!isDailyCleanupDone) {
        await sql`
          UPDATE dishes
          SET availability_mode = 'always',
              is_available_today = true,
              stock_status = 'available'
          WHERE slug IN (
            'omelette-gratitude',
            'omelette-jambon-fromage',
            'omelette-espagnole',
            'omelette-nature',
            'cafe-espresso',
            'cappuccino',
            'lipton-nescafe'
          )
          OR LOWER(name) LIKE '%omelette%'
          OR LOWER(name) LIKE '%café%'
          OR LOWER(name) LIKE '%cafe%'
          OR LOWER(name) LIKE '%cappuccino%'
          OR LOWER(name) LIKE '%lipton%'
        `;
        await sql`UPDATE restaurant_settings SET daily_menu_cleanup_v1 = TRUE WHERE id = 1`;
        global._dishesCache = undefined;
      }
      if (!isMenuSplitDone) {
        await sql`
          DELETE FROM dishes
          WHERE slug IN (
            'poulet-roti-flambe',
            'pizza-margherita-jambon',
            'salade-composee',
            'sandwich-poisson-viande',
            'sandwich-fromage-compose',
            'chawarma-pain-anglais',
            'lipton-nescafe',
            'jus-naturel'
          )
        `;
        for (const d of INITIAL_DISHES) {
          await sql`
            INSERT INTO dishes (slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order)
            VALUES (${d.slug}, ${d.name}, ${d.category}, ${d.price}, ${d.availability_mode}, ${d.is_available_today}, ${d.stock_status}, ${JSON.stringify(d.options_json)}::jsonb, ${d.image_url}, ${d.image_quadrant}, ${d.description}, ${d.display_order})
            ON CONFLICT (slug) DO NOTHING
          `;
        }
        await sql`UPDATE restaurant_settings SET menu_split_v1 = TRUE WHERE id = 1`;
        global._dishesCache = undefined;
      }
      if (!isDailyCleanupV2Done) {
        await sql`
          UPDATE dishes
          SET availability_mode = 'always',
              is_available_today = true,
              stock_status = 'available'
          WHERE LOWER(name) LIKE '%omelette%'
             OR LOWER(name) LIKE '%sandwich%'
             OR LOWER(name) LIKE '%café%'
             OR LOWER(name) LIKE '%cafe%'
             OR LOWER(name) LIKE '%cappuccino%'
             OR LOWER(name) LIKE '%lipton%'
             OR LOWER(name) LIKE '%nescaf%'
             OR LOWER(name) LIKE 'thé%'
        `;
        const gapalDish = INITIAL_DISHES.find(d => d.slug === 'gapal');
        if (gapalDish) {
          await sql`
            INSERT INTO dishes (slug, name, category, price, availability_mode, is_available_today, stock_status, options_json, image_url, image_quadrant, description, display_order)
            VALUES (${gapalDish.slug}, ${gapalDish.name}, ${gapalDish.category}, ${gapalDish.price}, ${gapalDish.availability_mode}, ${gapalDish.is_available_today}, ${gapalDish.stock_status}, ${JSON.stringify(gapalDish.options_json)}::jsonb, ${gapalDish.image_url}, ${gapalDish.image_quadrant}, ${gapalDish.description}, ${gapalDish.display_order})
            ON CONFLICT (slug) DO NOTHING
          `;
        }
        await sql`UPDATE restaurant_settings SET daily_menu_cleanup_v2 = TRUE WHERE id = 1`;
        global._dishesCache = undefined;
      }
      if (!isGalleryInit) {
        const galCountRows = await sql`SELECT COUNT(*)::int AS cnt FROM restaurant_gallery`;
        const galCount = galCountRows[0]?.cnt ?? 0;
        if (galCount === 0) {
          for (const g of INITIAL_GALLERY_IMAGES) {
            await sql`
              INSERT INTO restaurant_gallery (title, image_url, display_order)
              VALUES (${g.title}, ${g.image_url}, ${g.display_order})
            `;
          }
        }
        await sql`UPDATE restaurant_settings SET gallery_initialized = TRUE WHERE id = 1`;
      }

      const todayStr = getLogicalMenuDate();
      const rolloverRows = await sql`
        UPDATE restaurant_settings
        SET daily_menu_date = ${todayStr}
        WHERE id = 1
          AND COALESCE(daily_menu_date, '') <> ${todayStr}
        RETURNING id
      `;
      if (rolloverRows.length > 0) {
        await sql`
          UPDATE dishes
          SET is_available_today = false, stock_status = 'soldout'
          WHERE availability_mode = 'daily'
        `;
      }

      // Correction unique de l'ancien numéro incohérent (60 18 65 25).
      // Ne touche jamais à un numéro modifié volontairement depuis l'admin.
      await sql`
        UPDATE restaurant_settings
        SET phone = '+226 02 80 99 06', whatsapp = '22602809906'
        WHERE id = 1
          AND (
            phone IS NULL
            OR phone LIKE '%60%18%'
            OR whatsapp IS NULL
            OR whatsapp LIKE '%6018%'
          )
      `;

      await sql`ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 0`;
      await sql`UPDATE restaurant_settings SET schema_version = ${CURRENT_SCHEMA_VERSION} WHERE id = 1`;

      global._gratitudeSchemaReady = true;
      return sql;
    } catch (err) {
      global._gratitudeSchemaReady = false;
      console.error('Auto-init Neon schema error:', err);
      return null;
    } finally {
      global._gratitudeSchemaPromise = undefined;
    }
  })();

  return global._gratitudeSchemaPromise;
}

export async function recordAdminAuditLog(
  action: string,
  targetId?: string | number | null,
  details?: string | null,
  ip?: string | null
): Promise<void> {
  try {
    const sql = await ensureNeonSchema();
    if (sql) {
      await sql`
        INSERT INTO admin_audit_logs (action, target_id, details, ip)
        VALUES (${action}, ${targetId ? String(targetId) : null}, ${details || null}, ${ip || null})
      `;
    }
  } catch (err) {
    console.warn('[AUDIT] Impossible d’enregistrer le log :', err);
  }
}
