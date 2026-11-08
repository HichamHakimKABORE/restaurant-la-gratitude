'use client';

import React, { useState } from 'react';
import ClientShell from '@/components/ClientShell';
import { useCart, formatCFA } from '@/components/CartContext';
import { PhoneIcon } from '@/components/Icons';
import { sortDailyMenuDishes } from '@/lib/db';

const CATEGORY_TABS = [
  { key: 'Tous', label: 'Toute la Carte', img: '/images/dishes_grid_2.jpg', quad: 'quad-bl' },
  { key: 'SurCommande', label: 'Plats sur Commande', img: '/images/dishes_grid_2.jpg', quad: 'quad-bl' },
  { key: 'MenuDuJour', label: 'Menu du Jour', img: '/images/dishes_grid_1.jpg', quad: 'quad-tr' },
  { key: 'Pizzas', label: 'Pizzas', img: '/images/dishes_grid_2.jpg', quad: 'quad-bl' },
  { key: 'Poulets', label: 'Poulets', img: '/images/dishes_grid_2.jpg', quad: 'quad-br' },
  { key: 'Grillades', label: 'Grillades', img: '/images/dishes_grid_2.jpg', quad: 'quad-tl' },
  { key: 'Salades', label: 'Salades', img: '/images/dishes_grid_3.jpg', quad: 'quad-tr' },
  { key: 'Soupes', label: 'Soupes', img: '/images/dishes_grid_1.jpg', quad: 'quad-br' },
  { key: 'Plats', label: 'Plats', img: '/images/dishes_grid_1.jpg', quad: 'quad-tr' },
  { key: 'Boissons', label: 'Boissons', img: '/images/dishes_grid_4.jpg', quad: 'quad-tr' }
];

export default function NotreMenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [search, setSearch] = useState('');
  const { dishes, settings, openDishSelector } = useCart();

  const phoneDisplay = settings.phone || '+226 02 80 99 06';
  const phoneTel = phoneDisplay.replace(/\s+/g, '');

  const onOrderDishes = dishes.filter(d => d.availability_mode !== 'daily');
  const activeDailyDishes = sortDailyMenuDishes(
    dishes.filter(d => d.availability_mode === 'daily' && d.is_available_today)
  );

  // Sur 'Toute la Carte' : on affiche les Plats sur Commande en premier, suivis des plats du Menu du Jour préparés aujourd'hui.
  // Sur 'MenuDuJour' : on affiche uniquement les plats du jour préparés aujourd'hui.
  const baseList = (() => {
    if (selectedCategory === 'SurCommande') return onOrderDishes;
    if (selectedCategory === 'MenuDuJour') return activeDailyDishes;
    if (selectedCategory === 'Tous') return [...onOrderDishes, ...activeDailyDishes];
    return dishes.filter(
      d =>
        d.category === selectedCategory &&
        (d.availability_mode !== 'daily' || d.is_available_today)
    );
  })();

  const visibleDishes = baseList.filter(d => {
    if (search.trim() !== '' && !d.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <ClientShell>
      <div className="bg-white/95 rounded-2xl border-2 border-[#e6d5c3] shadow-lg p-4 sm:p-6 space-y-4 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2b1810]">
              Notre Carte — Plats sur Commande &amp; Spécialités
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Pour commander un plat, cliquez dessus ou appelez directement le{' '}
              <a href={`tel:${phoneTel}`} className="font-extrabold text-[#881313] underline whitespace-nowrap">
                {phoneDisplay}
              </a>.
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un plat, pizza, poulet..."
            className="w-full sm:w-72 px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs sm:text-sm"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
          {CATEGORY_TABS.map(tab => {
            const isActive = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#fef08a] to-[#eab308] border-[#b45309] text-[#2b1810] font-extrabold shadow-sm'
                    : 'bg-[#fdf5e8] border-[#e6d5c3] text-stone-700 hover:border-[#eab308]'
                }`}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border border-white shadow-sm">
                  <div
                    className={`w-full h-full dish-photo ${tab.quad}`}
                    style={{ backgroundImage: `url('${tab.img}')` }}
                  />
                </div>
                <span className="text-xs whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grille stricte à 2 plats sur la même ligne (grid-cols-2) et sans aucun badge Disponible / Non disponible */}
        {visibleDishes.length === 0 ? (
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
            <p className="font-extrabold text-sm text-[#881313]">
              {selectedCategory === 'MenuDuJour'
                ? 'Le Menu du Jour est actuellement en préparation en cuisine.'
                : 'Aucun plat ne correspond à votre recherche.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('SurCommande');
                setSearch('');
              }}
              className="px-4 py-2 rounded-xl bg-[#881313] text-white font-extrabold text-xs shadow"
            >
              Afficher les Plats sur Commande
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {visibleDishes.map(dish => (
              <article
                key={dish.id}
                onClick={() => openDishSelector(dish)}
                className="group cursor-pointer bg-[#fffcf7] rounded-2xl border border-[#e6d5c3] hover:border-[#881313] overflow-hidden shadow-sm hover:shadow-xl transition flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 sm:h-44 overflow-hidden relative bg-stone-100">
                    <div
                      className={`w-full h-full dish-photo ${dish.image_quadrant}`}
                      style={{ backgroundImage: `url('${dish.image_url}')` }}
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-amber-300 font-bold text-[10px] sm:text-xs whitespace-nowrap">
                      {dish.category}
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-3.5 space-y-1">
                    <h3 className="font-extrabold text-xs sm:text-base text-[#2b1810] line-clamp-1">
                      {dish.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-stone-600 line-clamp-2">
                      {dish.description}
                    </p>
                    {Array.isArray(dish.options_json) && dish.options_json.length > 0 && (
                      <p className="text-[10px] sm:text-[11px] font-bold text-[#881313] pt-0.5 truncate">
                        Choix : {dish.options_json.join(' • ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-2.5 sm:p-3.5 pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
                  <span className="font-extrabold text-xs sm:text-base text-[#991b1b] whitespace-nowrap shrink-0">
                    {formatCFA(dish.price)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg bg-[#881313] group-hover:bg-[#16a34a] text-white font-extrabold text-[11px] sm:text-xs transition whitespace-nowrap shrink-0">
                    <PhoneIcon className="w-3 h-3 shrink-0 hidden xs:inline" />
                    <span>+ Commander</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </ClientShell>
  );
}
