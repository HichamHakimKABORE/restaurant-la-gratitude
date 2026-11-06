'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { formatCFA, useCart } from '@/components/CartContext';
import { INITIAL_ORDERS, type Order } from '@/lib/db';

export default function AdminDashboardOverviewPage() {
  const { dishes } = useCart();
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  useEffect(() => {
    fetch('/api/orders', { cache: 'no-store' })
      .then(r => r.json())
      .then(oData => {
        if (oData.orders) setOrders(oData.orders);
      });
  }, []);

  const activeDailyCount = dishes.filter(
    d => d.availability_mode === 'daily' && d.is_available_today
  ).length;

  const validRevenue = orders
    .filter(o => o.status !== 'Annulée')
    .reduce((acc, o) => acc + Number(o.total_cfa || 0), 0);

  return (
    <AdminShell
      title="Tableau de bord"
      subtitle="Vue d’ensemble de l’activité du Restaurant La Gratitude"
    >
      {/* 3 KPI Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#991b1b] text-white flex items-center justify-center shrink-0 font-extrabold text-base">
            {dishes.length}
          </div>
          <div>
            <span className="font-extrabold text-xl text-[#991b1b] block">
              {dishes.length}
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Plats au total ({activeDailyCount} plats du jour actifs)
            </span>
          </div>
        </div>

        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-extrabold text-base">
            {orders.length}
          </div>
          <div>
            <span className="font-extrabold text-xl text-emerald-700 block">
              {orders.length}
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Commandes enregistrées
            </span>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-extrabold text-xs">
            CFA
          </div>
          <div>
            <span className="font-extrabold text-xl text-amber-800 block whitespace-nowrap">
              {formatCFA(validRevenue)}
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Chiffre d’affaires cumulé
            </span>
          </div>
        </div>
      </div>

      {/* Chart + Dernières commandes */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
        <div className="md:col-span-7 bg-[#fdfaf5] p-5 rounded-2xl border border-stone-200 space-y-3">
          <span className="text-sm font-extrabold text-[#2b1810] block">
            Commandes sur 7 jours
          </span>
          <svg viewBox="0 0 220 75" className="w-full h-36 overflow-visible">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#991b1b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#991b1b" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polygon
              points="10,60 42,48 75,52 108,36 140,30 172,20 205,12 205,65 10,65"
              fill="url(#chartGrad)"
            />
            <polyline
              fill="none"
              stroke="#991b1b"
              strokeWidth="2.5"
              points="10,60 42,48 75,52 108,36 140,30 172,20 205,12"
            />
            <circle cx="10" cy="60" r="3" fill="#991b1b" />
            <circle cx="42" cy="48" r="3" fill="#991b1b" />
            <circle cx="75" cy="52" r="3" fill="#991b1b" />
            <circle cx="108" cy="36" r="3" fill="#991b1b" />
            <circle cx="140" cy="30" r="3" fill="#991b1b" />
            <circle cx="172" cy="20" r="3" fill="#991b1b" />
            <circle
              cx="205"
              cy="12"
              r="3.5"
              fill="#eab308"
              stroke="#991b1b"
              strokeWidth="1.5"
            />
          </svg>
          <div className="flex justify-between text-xs font-semibold text-stone-500 px-1">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mer</span>
            <span>Jeu</span>
            <span>Ven</span>
            <span>Sam</span>
            <span>Dim</span>
          </div>
        </div>

        <div className="md:col-span-5 bg-[#fdfaf5] p-5 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-sm font-extrabold text-[#2b1810] block">
              Dernières commandes
            </span>
            {orders.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500">
                Aucune commande enregistrée pour le moment.
              </div>
            ) : (
              orders.slice(0, 4).map(o => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-xs border-b border-stone-200 pb-2"
                >
                  <div>
                    <strong className="block text-sm">{o.order_code}</strong>
                    <span className="text-stone-500">
                      {o.customer_name} • {formatCFA(o.total_cfa)}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                    {o.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              href="/admin/menu-du-jour"
              className="py-2.5 px-3 rounded-xl bg-[#881313] text-white font-bold text-xs text-center shadow"
            >
              Cocher le Menu du Jour
            </Link>
            <Link
              href="/admin/commandes"
              className="py-2.5 px-3 rounded-xl bg-[#eab308] text-[#2b1810] font-extrabold text-xs text-center shadow"
            >
              Voir les Commandes
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
