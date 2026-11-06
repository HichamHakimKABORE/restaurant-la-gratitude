'use client';

import React, { useEffect, useState } from 'react';
import ClientShell from '@/components/ClientShell';
import { useCart, formatCFA } from '@/components/CartContext';
import { PhoneIcon, BoltIcon, CheckIcon } from '@/components/Icons';
import type { Dish } from '@/lib/db';

export default function MenuDuJourPage() {
  const { dishes, openDishSelector } = useCart();

  const dailyPrepared = dishes.filter(
    d => d.availability_mode === 'daily' && d.is_available_today
  );

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
              Voici les plats que le Chef a préparés et cochés ce matin à Zagtouli.
            </p>
          </div>

          <a
            href="tel:+22660186525"
            className="px-4 py-2.5 rounded-xl bg-[#eab308] text-[#2b1810] font-extrabold text-xs sm:text-sm shadow inline-flex items-center gap-2"
          >
            <PhoneIcon className="w-4 h-4 shrink-0" />
            <span>Appeler pour vérifier (+226 60 18 65 25)</span>
          </a>
        </div>

        <div className="p-5 sm:p-6">
          {dailyPrepared.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-500">
              Aucun plat du jour n’est coché pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dailyPrepared.map(dish => (
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-extrabold text-xs">
                        <BoltIcon className="w-3 h-3" />
                        <span>Presque fini !</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                        <CheckIcon className="w-3 h-3" />
                        <span>Prêt aujourd’hui</span>
                      </span>
                    )}
                    <h3 className="font-extrabold text-sm sm:text-base text-[#2b1810] truncate">
                      {dish.name}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2">
                      {dish.description}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="px-2.5 py-0.5 rounded bg-[#991b1b] text-white font-extrabold text-xs">
                        {formatCFA(dish.price)}
                      </span>
                      <span className="text-xs font-extrabold text-[#881313] underline">
                        + Commander
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientShell>
  );
}
