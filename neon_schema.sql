-- ============================================================================
-- SCHEMA SQL OFFICIEL — RESTAURANT LA GRATITUDE (NEON POSTGRESQL)
-- Vous pouvez coller ce script dans le "SQL Editor" de votre console Neon
-- ou lancer automatiquement `npm run db:init`
-- ============================================================================

CREATE TABLE IF NOT EXISTS dishes (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,       -- 'Plats' | 'Pizzas' | 'Salades' | 'Poulets' | 'Soupes' | 'Grillades' | 'Boissons'
  price INTEGER NOT NULL,              -- Prix en FCFA (ex: 1000, 1500, 5000, 6000)
  availability_mode VARCHAR(30) NOT NULL DEFAULT 'daily', -- 'daily' (Menu du jour à cocher) | 'always' (Toujours disponible) | 'order' (Sur commande)
  is_available_today BOOLEAN NOT NULL DEFAULT true,
  image_url VARCHAR(255) NOT NULL,
  image_quadrant VARCHAR(20) NOT NULL DEFAULT 'quad-tl',  -- 'quad-tl' | 'quad-tr' | 'quad-bl' | 'quad-br' | 'full'
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_code VARCHAR(40) UNIQUE NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(60) NOT NULL,
  items_json JSONB NOT NULL,
  total_cfa INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'En cours', -- 'En cours' | 'Préparée' | 'Livrée' | 'Annulée'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE TABLE IF NOT EXISTS restaurant_gallery (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL DEFAULT 'Photo du Restaurant',
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_menu_history (
  id SERIAL PRIMARY KEY,
  menu_date DATE UNIQUE NOT NULL,
  dishes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_dishes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO restaurant_settings (id, restaurant_name, slogan, sub_slogan, phone, whatsapp, address, opening_hours)
VALUES (
  1,
  'Restaurant La Gratitude',
  'Une cuisine savoureuse, un service de qualité !',
  'Bon goût, bonne humeur !',
  '+226 02 80 99 06',
  '22602809906',
  'Zagtouli, route de Bobo, Ouagadougou - Burkina Faso',
  'Lundi - Dimanche de 07h00 à 23h00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSERTION DU CATALOGUE COMPLET DE L'ARDOISE (PLATS, PIZZAS, BOISSONS...)
-- ============================================================================
INSERT INTO dishes (slug, name, category, price, availability_mode, is_available_today, image_url, image_quadrant, description, display_order)
VALUES
  -- COL 1 : MENUS DU JOUR (À COCHER CHAQUE MATIN)
  ('riz-gras', 'Riz gras', 'Plats', 1000, 'daily', true, '/images/dishes_grid_1.jpg', 'quad-tl', 'Riz gras traditionnel parfumé aux épices douces, légumes et viande.', 1),
  ('riz-sauce-arachide', 'Riz sauce d’arachide', 'Plats', 1000, 'daily', true, '/images/dishes_grid_1.jpg', 'quad-bl', 'Riz blanc servi avec une sauce d’arachide onctueuse mijotée.', 2),
  ('riz-sauce-tomate', 'Riz sauce tomate', 'Plats', 1000, 'daily', true, '/images/dishes_grid_1.jpg', 'quad-tl', 'Riz accompagné d’une sauce tomate maison bien relevée.', 3),
  ('to-sauce-boulvanka', 'Tô sauce boulvanka', 'Plats', 1000, 'daily', true, '/images/dishes_grid_1.jpg', 'quad-tr', 'Tô traditionnel servi chaud avec sa sauce boulvanka authentique.', 4),
  ('soupe-poulet', 'Soupe de poulet', 'Soupes', 1500, 'daily', true, '/images/dishes_grid_1.jpg', 'quad-br', 'Bouillon chaud et parfumé de poulet local aux herbes fraîches.', 5),
  ('soupe-poisson', 'Soupe de poisson', 'Soupes', 1500, 'daily', true, '/images/dishes_grid_4.jpg', 'quad-br', 'Soupe de poisson frais au citron vert et aromates.', 6),
  ('soupe-jarret', 'Soupe de jarret', 'Soupes', 1500, 'daily', false, '/images/dishes_grid_1.jpg', 'quad-br', 'Soupe traditionnelle au jarret tendre longuement mijotée.', 7),
  ('soupe-boyaux', 'Soupe de boyaux', 'Soupes', 1500, 'daily', true, '/images/dishes_grid_1.jpg', 'quad-br', 'Soupe traditionnelle aux tripes bien assaisonnée.', 8),
  ('brochettes-kaya', 'Brochettes Kaya (x5)', 'Grillades', 1000, 'daily', true, '/images/dishes_grid_2.jpg', 'quad-tl', 'Portion de 5 brochettes Kaya grillées au feu de bois.', 9),
  ('brochette-filet', 'Brochette Filet (x1)', 'Grillades', 500, 'daily', true, '/images/dishes_grid_2.jpg', 'quad-tl', 'Brochette de filet de bœuf tendre marinée et grillée.', 10),
  ('brochettes-merguez', 'Brochettes Merguez (x4)', 'Grillades', 2000, 'daily', true, '/images/dishes_grid_4.jpg', 'quad-bl', 'Portion de 4 merguez grillées bien dorées.', 11),
  ('alloco', 'Alloco doré', 'Grillades', 1000, 'daily', true, '/images/dishes_grid_2.jpg', 'quad-tr', 'Bananes plantains mûres frites accompagnées de piment.', 12),
  ('pommes-sautees', 'Pommes sautées', 'Grillades', 1000, 'daily', true, '/images/dishes_grid_4.jpg', 'quad-bl', 'Pommes de terre sautées à l’ail et fines herbes.', 13),
  ('frites', 'Assiette de Frites', 'Grillades', 1000, 'daily', true, '/images/dishes_grid_4.jpg', 'quad-bl', 'Frites croustillantes dorées maison.', 14),
  ('omelette-gratitude', 'Omelette Gratitude', 'Plats', 2000, 'daily', true, '/images/dishes_grid_3.jpg', 'quad-br', 'Omelette signature du Chef richement garnie.', 15),
  ('omelette-jambon-fromage', 'Omelette jambon fromage', 'Plats', 2000, 'daily', true, '/images/dishes_grid_3.jpg', 'quad-br', 'Omelette moelleuse garnie de jambon et fromage fondant.', 16),
  ('omelette-espagnole', 'Omelette espagnole chorizo', 'Plats', 2000, 'daily', false, '/images/dishes_grid_3.jpg', 'quad-br', 'Omelette généreuse au chorizo, poivrons et oignons.', 17),
  ('omelette-nature', 'Omelette nature', 'Plats', 1000, 'daily', true, '/images/dishes_grid_3.jpg', 'quad-br', 'Omelette classique aux œufs frais.', 18),
  ('sandwich-gratitude', 'Sandwich Gratitude', 'Plats', 1000, 'daily', true, '/images/dishes_grid_3.jpg', 'quad-br', 'Sandwich complet spécial La Gratitude.', 19),
  ('sandwich-poisson-viande', 'Sandwich poisson / viande', 'Plats', 500, 'daily', true, '/images/dishes_grid_3.jpg', 'quad-br', 'Baguette garnie au choix de poisson ou de viande.', 20),
  ('sandwich-fromage-compose', 'Sandwich fromage / composé', 'Plats', 1000, 'daily', true, '/images/dishes_grid_3.jpg', 'quad-br', 'Sandwich frais au fromage ou crudités composées.', 21),
  ('cafe-espresso', 'Café Espresso', 'Boissons', 750, 'daily', true, '/images/dishes_grid_4.jpg', 'quad-tl', 'Café espresso intense fraîchement extrait.', 22),
  ('cappuccino', 'Cappuccino', 'Boissons', 500, 'daily', true, '/images/dishes_grid_4.jpg', 'quad-tl', 'Café espresso coiffé d’une mousse de lait onctueuse.', 23),
  ('lipton-nescafe', 'Thé Lipton / Nescafé', 'Boissons', 300, 'daily', true, '/images/dishes_grid_4.jpg', 'quad-tl', 'Thé chaud Lipton ou Nescafé.', 24),
  ('jus-naturel', 'Jus naturel local (Bissap / Gingembre)', 'Boissons', 500, 'daily', true, '/images/dishes_grid_4.jpg', 'quad-tr', 'Jus locaux glacés préparés maison.', 25),

  -- COL 2 : MENUS DISPONIBLES (TOUJOURS ACTIFS PAR DÉFAUT)
  ('pizza-gratitude', 'Pizza Gratitude', 'Pizzas', 6000, 'always', true, '/images/dishes_grid_2.jpg', 'quad-bl', 'La pizza royale signature du Chef, richement garnie et cuite au four.', 26),
  ('pizza-napolitaine', 'Pizza Napolitaine', 'Pizzas', 5000, 'always', true, '/images/dishes_grid_2.jpg', 'quad-bl', 'Pizza artisanale Napolitaine cuite au four.', 27),
  ('pizza-fermiere', 'Pizza Fermière', 'Pizzas', 5000, 'always', true, '/images/dishes_grid_2.jpg', 'quad-bl', 'Pizza Fermière généreuse au poulet/viande et fromage.', 28),
  ('pizza-piquante', 'Pizza Piquante', 'Pizzas', 5000, 'always', true, '/images/dishes_grid_2.jpg', 'quad-bl', 'Pizza relevée aux épices, poivrons et viande.', 29),
  ('pizza-4-saisons', 'Pizza 4 Saisons', 'Pizzas', 5000, 'always', true, '/images/dishes_grid_2.jpg', 'quad-bl', 'Pizza 4 Saisons aux ingrédients variés et mozzarella.', 30),
  ('pizza-margherita-jambon', 'Pizza Margherita / Jambon', 'Pizzas', 4000, 'always', true, '/images/dishes_grid_2.jpg', 'quad-bl', 'Classique Margherita ou Jambon-Fromage cuite au four.', 31),
  ('poulet-roti-flambe', 'Poulet flambé / rabilé / sauté', 'Poulets', 5000, 'always', true, '/images/dishes_grid_2.jpg', 'quad-br', 'Poulet entier préparé au choix : flambé, rabilé, sauté, pané ou à l’ail.', 32),
  ('poulet-couscous', 'Poulet au couscous', 'Poulets', 5000, 'always', true, '/images/dishes_grid_2.jpg', 'quad-br', 'Poulet entier servi avec semoule de couscous parfumée.', 33),
  ('mouton-au-four', 'Mouton au four', 'Grillades', 5000, 'order', true, '/images/dishes_grid_3.jpg', 'quad-tl', 'Viande de mouton tendre rôtie au four aux herbes.', 34),
  ('salade-composee', 'Salade Gratitude / Composée / Niçoise', 'Salades', 2000, 'always', true, '/images/dishes_grid_3.jpg', 'quad-tr', 'Assiette fraîcheur : Gratitude, Composée, Niçoise ou Tomate au thon.', 35),
  ('salade-verte', 'Salade verte', 'Salades', 1500, 'always', true, '/images/dishes_grid_3.jpg', 'quad-tr', 'Salade verte croquante et vinaigrette maison.', 36),
  ('hamburger', 'Hamburger', 'Plats', 1500, 'always', true, '/images/dishes_grid_3.jpg', 'quad-bl', 'Hamburger maison au steak grillé, fromage fondant et crudités.', 37),
  ('chawarma-pain-anglais', 'Chawarma / Pain anglais', 'Plats', 1000, 'always', true, '/images/dishes_grid_3.jpg', 'quad-bl', 'Chawarma savoureux ou Pain anglais garni minute.', 38)
ON CONFLICT (slug) DO NOTHING;

