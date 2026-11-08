'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import { useCart, formatCFA } from '@/components/CartContext';
import { PhoneIcon, BoltIcon, CheckIcon, ChefHatIcon } from '@/components/Icons';
import { sortDailyMenuDishes, getDailyMenuGroupLabel, type Dish } from '@/lib/db';

export default function MenuDuJourPage() {
  const { dishes, openDishSelector } = useCart();

  // Séparation stricte : SEULS les plats avec availability_mode === 'daily' et cochés (is_available_today)
  // apparaissent dans le Menu du Jour. Les plats uniquement sur commande n'y figurent jamais.
  const dailyPrepared = useMemo(
    () =>
      sortDailyMenuDishes(
        dishes.filter(d => d.availability_mode === 'daily' && d.is_available_today)
      ),
    [dishes]
  );

  // Regroupement ordonné : 1. Plats de Riz -> 2. Soupes -> 3. Tô -> 4. Grillades -> 5. Omelettes/Sandwichs -> 6. Boissons
  const groupedSections = useMemo(() => {
    const map = new Map<string, Dish[]>();
    for (const d of dailyPrepared) {
      const label = getDailyMenuGroupLabel(d);
      const arr = map.get(label) || [];
      arr.push(d);
      map.set(label, arr);
    }
    return Array.from(map.entries());
  }, [dailyPrepared]);

  return (
    <ClientShell>
      <div className="bg-white/90 backdrop-blur-[2px] rounded-2xl border-2 border-[#eab308] shadow-lg overflow-hidden relative">
        <div className="bg-gradient-to-r from-[#7c1d12] via-[#991b1b] to-[#680e0e] text-white p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#eab308]">
          <div>
            <span className="px-3 py-1 rounded-full bg-[#eab308] text-[#2b1810] font-extrabold text-xs">
              Ardoise du Jour en Direct
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">
              Menu du Jour — Préparé Aujourd’hui
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 mt-1">
              Classé par spécialités : d’abord nos plats de Riz, ensuite nos Soupes, puis nos accompagnements et grillades.
            </p>
          </div>

          <a
            href="tel:+22602809906"
            className="px-4 py-2.5 rounded-xl bg-[#eab308] hover:brightness-110 text-[#2b1810] font-extrabold text-xs sm:text-sm shadow inline-flex items-center gap-2 whitespace-nowrap transition"
          >
            <PhoneIcon className="w-4 h-4 shrink-0" />
            <span>Commander au +226 02 80 99 06</span>
          </a>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {dailyPrepared.length === 0 ? (
            <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 text-[#2b1810] text-center space-y-3">
              <ChefHatIcon className="w-8 h-8 text-[#881313] mx-auto" />
              <h3 className="font-extrabold text-base sm:text-lg">
                Le Menu du Jour est en cours de mise à jour par le Chef
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                Appelez directement le restaurant pour connaître les plats prêts en cuisine ou découvrir nos plats sur commande.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-1">
                <a
                  href="tel:+22602809906"
                  className="px-4 py-2.5 rounded-xl bg-[#881313] text-white font-extrabold text-xs inline-flex items-center gap-2 shadow whitespace-nowrap"
                >
                  <PhoneIcon className="w-4 h-4 shrink-0" />
                  <span>Appeler le +226 02 80 99 06</span>
                </a>
                <Link
                  href="/menu"
                  className="px-4 py-2.5 rounded-xl bg-[#eab308] text-[#2b1810] font-extrabold text-xs shadow whitespace-nowrap"
                >
                  Voir les Plats sur Commande →
                </Link>
              </div>
            </div>
          ) : (
            groupedSections.map(([groupTitle, groupDishes]) => (
              <section key={groupTitle} className="space-y-3">
                <div className="flex items-center justify-between border-b-2 border-[#ead8be] pb-1.5">
                  <h3 className="font-extrabold text-base sm:text-lg text-[#881313] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#881313]" />
                    <span>{groupTitle}</span>
                  </h3>
                  <span className="text-xs font-bold text-stone-500 whitespace-nowrap">
                    {groupDishes.length} {groupDishes.length > 1 ? 'plats disponibles' : 'plat disponible'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupDishes.map(dish => (
                    <div
                      key={dish.id}
                      onClick={() => openDishSelector(dish)}
                      className="cursor-pointer bg-[#fdf5e8] hover:bg-amber-50 rounded-2xl border-2 border-[#dec6a7] hover:border-[#881313] p-4 flex items-center gap-4 shadow-sm transition"
                    >
                      <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border-2 border-[#d99b26] shadow">
                        <div
                          className={`w-full h-full dish-photo ${dish.image_quadrant}`}
                          style={{ backgroundImage: `url('${dish.image_url}')` }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        {dish.stock_status === 'low' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-extrabold text-xs whitespace-nowrap">
                            <BoltIcon className="w-3 h-3" />
                            <span>Presque fini !</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs whitespace-nowrap">
                            <CheckIcon className="w-3 h-3" />
                            <span>Prêt aujourd’hui</span>
                          </span>
                        )}
                        <h4 className="font-extrabold text-sm sm:text-base text-[#2b1810] truncate">
                          {dish.name}
                        </h4>
                        <p className="text-xs text-stone-600 line-clamp-2">
                          {dish.description}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-[#991b1b] text-white font-extrabold text-xs whitespace-nowrap shrink-0">
                            {formatCFA(dish.price)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#881313]/10 hover:bg-[#881313] text-[#881313] hover:text-white font-extrabold text-xs whitespace-nowrap shrink-0 transition">
                            <span>+ Commander</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}

          {/* Encart vers les Plats uniquement sur commande */}
          <div className="mt-6 p-4 rounded-2xl bg-[#fdf5e8] border-2 border-[#dec6a7] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-[#2b1810]">
                Envie d’une Pizza, d’un Poulet Spécial, d’un Mouton au four ou d’une Salade ?
              </h4>
              <p className="text-xs text-stone-600">
                Ces plats sont préparés uniquement sur commande et ne figurent pas dans le Menu du Jour.
              </p>
            </div>
            <Link
              href="/menu"
              className="px-4 py-2.5 rounded-xl bg-[#881313] hover:bg-[#680e0e] text-white font-extrabold text-xs shadow whitespace-nowrap transition"
            >
              Voir les Plats sur Commande →
            </Link>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
