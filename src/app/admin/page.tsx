'use client';

import React from 'react';
import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { formatCFA, useCart } from '@/components/CartContext';
import { sortDailyMenuDishes } from '@/lib/db';
import { CheckIcon, PhoneIcon } from '@/components/Icons';

export default function AdminDashboardOverviewPage() {
  const { dishes } = useCart();

  const dailyCatalogDishes = dishes.filter(d => d.availability_mode === 'daily');
  const activeDailyDishes = sortDailyMenuDishes(
    dailyCatalogDishes.filter(d => d.is_available_today)
  );
  const onOrderDishes = dishes.filter(d => d.availability_mode !== 'daily');

  return (
    <AdminShell
      title="Tableau de bord"
      subtitle="Vue d’ensemble du Menu du Jour et des Plats sur Commande — Restaurant La Gratitude"
    >
      {/* 3 KPI Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-extrabold text-base">
            {activeDailyDishes.length}
          </div>
          <div>
            <span className="font-extrabold text-xl text-emerald-800 block">
              {activeDailyDishes.length} / {dailyCatalogDishes.length}
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Plats cochés au Menu du Jour
            </span>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#eab308] text-[#2b1810] flex items-center justify-center shrink-0 font-extrabold text-base">
            {onOrderDishes.length}
          </div>
          <div>
            <span className="font-extrabold text-xl text-amber-900 block">
              {onOrderDishes.length} plats
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Spécialités uniquement sur commande
            </span>
          </div>
        </div>

        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#991b1b] text-white flex items-center justify-center shrink-0 font-extrabold text-base">
            <PhoneIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base text-[#991b1b] block whitespace-nowrap">
              +226 02 80 99 06
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Numéro de commande directe
            </span>
          </div>
        </div>
      </div>

      {/* Aperçu du Menu du Jour actif + Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
        <div className="md:col-span-7 bg-[#fdfaf5] p-5 rounded-2xl border border-stone-200 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="text-sm font-extrabold text-[#2b1810]">
              Menu du Jour actif (classé : Riz, Soupes, Plats...)
            </span>
            <Link href="/admin/menu-du-jour" className="text-xs font-extrabold text-[#881313] hover:underline">
              Modifier →
            </Link>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {activeDailyDishes.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                Aucun plat n’est coché pour le Menu du Jour aujourd’hui.
              </p>
            ) : (
              activeDailyDishes.map(d => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 text-xs"
                >
                  <div className="flex items-center gap-2 font-bold text-[#2b1810]">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <CheckIcon className="w-2.5 h-2.5" />
                    </span>
                    <span>{d.name}</span>
                  </div>
                  <span className="font-extrabold text-[#881313] whitespace-nowrap">
                    {formatCFA(d.price)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-5 bg-[#fdfaf5] p-5 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-extrabold text-[#2b1810] block">
              Actions rapides Administrateur
            </span>
            <p className="text-xs text-stone-600 leading-relaxed">
              Gérez les plats cochés au Menu du Jour (Riz d’abord, ensuite les Soupes), les plats préparés uniquement sur commande et vos rapports PDF officiels.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            <Link
              href="/admin/menu-du-jour"
              className="py-2.5 px-3 rounded-xl bg-[#881313] hover:bg-[#680e0e] text-white font-extrabold text-xs text-center shadow transition"
            >
              1. Cocher le Menu du Jour
            </Link>
            <Link
              href="/admin/plats"
              className="py-2.5 px-3 rounded-xl bg-[#eab308] hover:brightness-105 text-[#2b1810] font-extrabold text-xs text-center shadow transition"
            >
              2. Gérer les Plats &amp; Plats sur Commande
            </Link>
            <Link
              href="/admin/rapport-menus"
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-stone-100 text-[#2b1810] border border-stone-300 font-extrabold text-xs text-center shadow-sm transition"
            >
              3. Rapports &amp; Export PDF des Menus
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
