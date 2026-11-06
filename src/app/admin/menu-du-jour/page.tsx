'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { formatCFA, useCart } from '@/components/CartContext';
import { CheckIcon, BoltIcon, CloseIcon } from '@/components/Icons';
import type { Dish, StockStatus } from '@/lib/db';

export default function AdminMenuDuJourPage() {
  const { dishes, setDishes, showToast } = useCart();

  const dailyDishes = dishes.filter(d => d.availability_mode === 'daily');

  const setStatus = async (dish: Dish, status: StockStatus) => {
    const isAvail = status !== 'soldout';
    setDishes(prev =>
      prev.map(d =>
        d.id === dish.id
          ? { ...d, stock_status: status, is_available_today: isAvail }
          : d
      )
    );
    const res = await fetch('/api/dishes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: dish.id,
        stock_status: status,
        is_available_today: isAvail
      })
    });
    const data = await res.json();
    if (data.dishes) setDishes(data.dishes);
    showToast(
      `${dish.name} : ${
        status === 'available'
          ? 'Coché (Disponible)'
          : status === 'low'
          ? 'Marqué Presque fini'
          : 'Retiré du menu du jour'
      }`
    );
  };

  return (
    <AdminShell
      title="Menu du Jour"
      subtitle="Cochez les plats préparés ce matin ou signalez quand un plat est presque fini"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-8 space-y-2.5">
          {dailyDishes.map(dish => (
            <div
              key={dish.id}
              className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border-2 transition ${
                dish.is_available_today
                  ? dish.stock_status === 'low'
                    ? 'bg-amber-50 border-amber-400 font-bold text-[#2b1810]'
                    : 'bg-emerald-50/80 border-emerald-400 font-bold text-[#2b1810]'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}
            >
              <div
                onClick={() =>
                  setStatus(
                    dish,
                    dish.is_available_today ? 'soldout' : 'available'
                  )
                }
                className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                    dish.is_available_today
                      ? 'bg-emerald-600 text-white'
                      : 'border border-stone-300 bg-white'
                  }`}
                >
                  {dish.is_available_today ? <CheckIcon className="w-3.5 h-3.5" /> : null}
                </span>
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-amber-400">
                  <div
                    className={`w-full h-full dish-photo ${dish.image_quadrant}`}
                    style={{ backgroundImage: `url('${dish.image_url}')` }}
                  />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm truncate">{dish.name}</span>
                  <span className="text-xs text-[#881313] font-extrabold whitespace-nowrap">
                    {formatCFA(dish.price)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setStatus(dish, 'available')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                    dish.is_available_today && dish.stock_status === 'available'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-stone-300 text-stone-600'
                  }`}
                >
                  <CheckIcon className="w-3 h-3" />
                  <span>Prêt</span>
                </button>
                <button
                  onClick={() => setStatus(dish, 'low')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                    dish.is_available_today && dish.stock_status === 'low'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-white border border-stone-300 text-stone-600'
                  }`}
                >
                  <BoltIcon className="w-3 h-3" />
                  <span>Presque fini</span>
                </button>
                <button
                  onClick={() => setStatus(dish, 'soldout')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                    !dish.is_available_today
                      ? 'bg-rose-600 text-white'
                      : 'bg-white border border-stone-300 text-stone-600'
                  }`}
                >
                  <CloseIcon className="w-3 h-3" />
                  <span>Non</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-4 bg-[#fdf5e8] rounded-2xl border-2 border-[#eab308] p-5 flex flex-col items-center text-center space-y-4 sticky top-6">
          <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-950 font-extrabold text-xs">
            Aujourd’hui : {dailyDishes.filter(d => d.is_available_today).length} plats prêts
          </span>
          <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-[#d99b26] shadow-xl">
            <div
              className="w-full h-full dish-photo quad-tl"
              style={{ backgroundImage: `url('/images/dishes_grid_1.jpg')` }}
            />
          </div>
          <p className="text-xs text-stone-600">
            Astuce : Cliquez sur « Presque fini » lorsqu’il ne reste que quelques assiettes d’un plat.
          </p>
          <button
            onClick={() =>
              showToast('Menu du jour synchronisé avec le site Client !')
            }
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white font-extrabold text-xs shadow-lg"
          >
            Enregistrer le menu du jour
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
