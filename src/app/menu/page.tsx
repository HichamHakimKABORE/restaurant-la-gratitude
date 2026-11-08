'use client';

import React, { useState } from 'react';
import ClientShell from '@/components/ClientShell';
import { useCart, formatCFA } from '@/components/CartContext';
import { BoltIcon, CheckIcon, CloseIcon, PhoneIcon } from '@/components/Icons';
import { sortDailyMenuDishes } from '@/lib/db';

const CATEGORY_TABS = [
  { key: 'Tous', label: 'Toute la Carte', img: '/images/dishes_grid_1.jpg', quad: 'quad-tl' },
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
  const { dishes, openDishSelector } = useCart();

  const filteredDishes = dishes.filter(d => {
    if (selectedCategory === 'SurCommande' && d.availability_mode === 'daily') return false;
    if (selectedCategory === 'MenuDuJour' && d.availability_mode !== 'daily') return false;
    if (
      selectedCategory !== 'Tous' &&
      selectedCategory !== 'SurCommande' &&
      selectedCategory !== 'MenuDuJour' &&
      d.category !== selectedCategory
    ) {
      return false;
    }
    if (search.trim() !== '' && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Si on affiche le Menu du Jour, on trie d'abord le Riz, ensuite les Soupes, etc.
  const visibleDishes =
    selectedCategory === 'MenuDuJour'
      ? sortDailyMenuDishes(filteredDishes)
      : filteredDishes;

  return (
    <ClientShell>
      <div className="bg-white/90 backdrop-blur-[2px] rounded-2xl border-2 border-[#e6d5c3] shadow-lg p-5 sm:p-6 space-y-5 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2b1810]">
              Notre Carte — Plats sur Commande &amp; Menu du Jour
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Pour commander un plat, cliquez sur « + Commander » ou appelez directement le restaurant au{' '}
              <a href="tel:+22602809906" className="font-extrabold text-[#881313] underline whitespace-nowrap">
                +226 02 80 99 06
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
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {CATEGORY_TABS.map(tab => {
            const isActive = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`flex flex-col items-center gap-1.5 px-3.5 py-2 rounded-xl border transition shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#fef08a] to-[#eab308] border-[#b45309] text-[#2b1810] font-extrabold shadow-sm'
                    : 'bg-[#fdf5e8] border-[#e6d5c3] text-stone-700 hover:border-[#eab308]'
                }`}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white shadow-sm">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleDishes.map(dish => {
            const isSoldout = !dish.is_available_today || dish.stock_status === 'soldout';
            const isDaily = dish.availability_mode === 'daily';
            return (
              <article
                key={dish.id}
                onClick={() => openDishSelector(dish)}
                className={`group cursor-pointer bg-[#fffcf7] rounded-2xl border overflow-hidden shadow-sm transition flex flex-col justify-between ${
                  isSoldout
                    ? 'border-stone-200 opacity-75'
                    : 'border-[#e6d5c3] hover:border-[#881313] hover:shadow-xl'
                }`}
              >
                <div>
                  <div className="h-40 overflow-hidden relative bg-stone-100">
                    <div
                      className={`w-full h-full dish-photo ${dish.image_quadrant}`}
                      style={{ backgroundImage: `url('${dish.image_url}')` }}
                    />
                    <span
                      className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full font-extrabold text-xs shadow whitespace-nowrap ${
                        isDaily
                          ? 'bg-[#eab308] text-[#2b1810]'
                          : 'bg-[#881313] text-white'
                      }`}
                    >
                      {isDaily ? 'Menu du Jour' : 'Sur commande'}
                    </span>
                    {isSoldout ? (
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-xs shadow whitespace-nowrap">
                        <CloseIcon className="w-3 h-3" />
                        <span>Non disponible</span>
                      </span>
                    ) : dish.stock_status === 'low' ? (
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs shadow whitespace-nowrap">
                        <BoltIcon className="w-3 h-3" />
                        <span>Presque fini</span>
                      </span>
                    ) : (
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow whitespace-nowrap">
                        <CheckIcon className="w-3 h-3" />
                        <span>Disponible</span>
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 space-y-1">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#2b1810]">
                      {dish.name}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2">
                      {dish.description}
                    </p>
                    {Array.isArray(dish.options_json) && dish.options_json.length > 0 && (
                      <p className="text-[11px] font-bold text-[#881313] pt-0.5 truncate">
                        Choix : {dish.options_json.join(' • ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3.5 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-[#991b1b] whitespace-nowrap shrink-0">
                    {formatCFA(dish.price)}
                  </span>
                  {isSoldout ? (
                    <span className="px-3 py-1 rounded-lg bg-stone-200 text-stone-500 font-bold text-xs whitespace-nowrap shrink-0">
                      Épuisé
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#881313] group-hover:bg-[#16a34a] text-white font-extrabold text-xs transition whitespace-nowrap shrink-0">
                      <PhoneIcon className="w-3 h-3 shrink-0" />
                      <span>+ Commander</span>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </ClientShell>
  );
}
