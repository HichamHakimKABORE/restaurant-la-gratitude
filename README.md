# Restaurant La Gratitude — Application Web & Base Neon PostgreSQL

Bienvenue dans le code source complet du site web officiel du **Restaurant La Gratitude** (Zagtouli, route de Bobo, Ouagadougou — `+226 02 80 99 06`).

---

## 1. Structure du Projet

- [src/app/page.tsx](file:///h:/Appli/Restaurant/src/app/page.tsx) : **Espace Client** fidèle à la maquette validée (Bannière avec le vrai Logo Version 1, colonne *Menu du Jour — Aujourd'hui* à gauche, grille centrale *Nos Plats Disponibles* avec onglets illustrés, colonne *Mon panier / Nos coordonnées / Horaires* à droite, commande WhatsApp et appel direct).
- [src/app/admin/page.tsx](file:///h:/Appli/Restaurant/src/app/admin/page.tsx) : **Espace Administrateur** complet (Connexion, Tableau de bord avec statistiques et commandes sur 7 jours, Gestion des Plats, cochage du *Menu du Jour*, Gestion des Commandes, Statistiques & Rapports, Gestion du Menu et Paramètres).
- [src/app/api/dishes/route.ts](file:///h:/Appli/Restaurant/src/app/api/dishes/route.ts) & [src/app/api/orders/route.ts](file:///h:/Appli/Restaurant/src/app/api/orders/route.ts) : Routes API Next.js connectées à **Neon PostgreSQL** via `@neondatabase/serverless`.
- [neon_schema.sql](file:///h:/Appli/Restaurant/neon_schema.sql) : Script SQL complet contenant les tables (`dishes`, `orders`, `restaurant_settings`) et les **38 plats et boissons** extraits de l'ardoise du restaurant.
- [scripts/init-db.mjs](file:///h:/Appli/Restaurant/scripts/init-db.mjs) : Script automatique pour initialiser votre base Neon en une seule commande.

---

## 2. Comment brancher votre nouveau projet Neon PostgreSQL

1. Connectez-vous sur [console.neon.tech](https://console.neon.tech) et cliquez sur **New Project** (nommez-le par exemple `restaurant-la-gratitude`).
2. Copiez la chaîne de connexion (**Connection string** PostgreSQL) fournie par Neon.
3. Ouvrez le fichier [.env.local](file:///h:/Appli/Restaurant/.env.local) à la racine du projet et collez votre lien dans `DATABASE_URL` :
   ```env
   DATABASE_URL="postgresql://neondb_owner:VOTRE_MOT_DE_PASSE@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
   ```
4. Initialisez les tables et insérez tous les plats de l'ardoise :
   - **Option A (automatique via terminal) :**
     ```bash
     npm install
     npm run db:init
     ```
   - **Option B (via l'interface web Neon) :**
     Copiez-collez simplement le contenu du fichier [neon_schema.sql](file:///h:/Appli/Restaurant/neon_schema.sql) dans l'onglet **SQL Editor** de votre console Neon et cliquez sur **Run**.

---

## 3. Lancer le site en local

1. Copiez les images générées (logo et photos des plats) dans le dossier `public/images/` :
   - `public/images/logo_gratitude.jpg`
   - `public/images/dishes_grid_1.jpg`
   - `public/images/dishes_grid_2.jpg`
   - `public/images/dishes_grid_3.jpg`
   - `public/images/dishes_grid_4.jpg`
2. Démarrez le serveur de développement :
   ```bash
   npm install
   npm run dev
   ```
3. Ouvrez :
   - **Site Client :** `http://localhost:3000`
   - **Espace Administrateur :** `http://localhost:3000/admin`
