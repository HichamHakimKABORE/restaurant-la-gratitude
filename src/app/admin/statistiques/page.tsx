'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { formatCFA, useCart } from '@/components/CartContext';
import { INITIAL_ORDERS, type Order } from '@/lib/db';

export default function AdminStatistiquesPage() {
  const { dishes } = useCart();
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/orders', { cache: 'no-store' })
      .then(r => r.json())
      .then(oData => {
        if (oData.orders) setOrders(oData.orders);
      });
  }, []);

  const validOrders = orders.filter(o => o.status !== 'Annulée');
  const totalRevenue = validOrders.reduce((acc, o) => acc + Number(o.total_cfa || 0), 0);
  const deliveredOrdersCount = orders.filter(o => o.status === 'Livrée').length;
  const activeOrdersCount = orders.filter(o => o.status === 'En cours' || o.status === 'Préparée').length;

  // Compute real breakdown by payment method
  const countEspeces = validOrders.filter(o => o.payment_method === 'Espèces').length;
  const countOM = validOrders.filter(o => o.payment_method === 'Orange Money').length;
  const countMoov = validOrders.filter(o => o.payment_method === 'Moov Money').length;

  // Compute real breakdown by order mode
  const countSurPlace = validOrders.filter(o => o.order_type === 'Sur place').length;
  const countEmporter = validOrders.filter(o => o.order_type === 'À emporter').length;
  const countLivraison = validOrders.filter(o => o.order_type === 'Livraison').length;

  return (
    <AdminShell
      title="Statistiques & Rapports en Direct"
      subtitle="Analyse réelle calculée depuis vos commandes et votre catalogue Neon PostgreSQL"
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-stone-500">
          Calcul des statistiques en cours...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-stone-50 p-5 rounded-2xl border-2 border-stone-200">
              <span className="text-xs font-bold text-stone-500 block">
                Total Commandes
              </span>
              <strong className="text-2xl font-extrabold text-[#881313]">
                {orders.length}
              </strong>
              <span className="block text-[11px] text-stone-500 mt-1">
                {activeOrdersCount} en cours • {deliveredOrdersCount} livrée(s)
              </span>
            </div>

            <div className="bg-stone-50 p-5 rounded-2xl border-2 border-stone-200">
              <span className="text-xs font-bold text-stone-500 block">
                Chiffre d’affaires (Hors annulées)
              </span>
              <strong className="text-2xl font-extrabold text-emerald-700 whitespace-nowrap">
                {formatCFA(totalRevenue)}
              </strong>
              <span className="block text-[11px] text-stone-500 mt-1">
                Sur {validOrders.length} commande(s) validée(s)
              </span>
            </div>

            <div className="bg-stone-50 p-5 rounded-2xl border-2 border-stone-200">
              <span className="text-xs font-bold text-stone-500 block">
                Plats au Catalogue
              </span>
              <strong className="text-2xl font-extrabold text-amber-700">
                {dishes.length}
              </strong>
              <span className="block text-[11px] text-stone-500 mt-1">
                {dishes.filter(d => d.is_available_today && d.stock_status !== 'soldout').length} disponibles aujourd’hui
              </span>
            </div>

            <div className="bg-stone-50 p-5 rounded-2xl border-2 border-stone-200">
              <span className="text-xs font-bold text-stone-500 block">
                Panier Moyen
              </span>
              <strong className="text-2xl font-extrabold text-[#2b1810] whitespace-nowrap">
                {validOrders.length > 0
                  ? formatCFA(Math.round(totalRevenue / validOrders.length))
                  : '0\u00A0F'}
              </strong>
              <span className="block text-[11px] text-stone-500 mt-1">
                Moyenne par commande
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
            <div className="md:col-span-6 bg-[#fdfaf5] p-5 rounded-2xl border border-stone-200 space-y-4">
              <h4 className="font-extrabold text-sm text-[#2b1810]">
                Répartition par Mode de Réception
              </h4>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200">
                  <span>Sur place (À table)</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#881313] text-white">
                    {countSurPlace} commande(s)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200">
                  <span>À emporter</span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950">
                    {countEmporter} commande(s)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200">
                  <span>Livraison (Zagtouli &amp; environs)</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
                    {countLivraison} commande(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 bg-[#fdfaf5] p-5 rounded-2xl border border-stone-200 space-y-4">
              <h4 className="font-extrabold text-sm text-[#2b1810]">
                Répartition par Mode de Paiement
              </h4>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200">
                  <span>Espèces (Cash)</span>
                  <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-white">
                    {countEspeces} commande(s)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200">
                  <span>Orange Money (+226 02 80 99 06)</span>
                  <span className="px-2.5 py-1 rounded-lg bg-orange-500 text-white">
                    {countOM} commande(s)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200">
                  <span>Moov Money (+226 02 80 99 06)</span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-600 text-white">
                    {countMoov} commande(s)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
