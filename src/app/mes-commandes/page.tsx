'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import { formatCFA } from '@/components/CartContext';
import {
  CheckIcon,
  ClockIcon,
  PhoneIcon,
  WhatsAppIcon,
  MapPinIcon
} from '@/components/Icons';
import type { Order } from '@/lib/db';

const STATUS_STEPS: Array<{
  key: Order['status'];
  label: string;
  desc: string;
}> = [
  {
    key: 'En cours',
    label: 'Reçue en cuisine',
    desc: 'Votre commande a été transmise au Chef'
  },
  {
    key: 'Préparée',
    label: 'Prête / En préparation finale',
    desc: 'Vos plats sont prêts à être servis ou récupérés'
  },
  {
    key: 'Livrée',
    label: 'Servie / Livrée',
    desc: 'Bon appétit au Restaurant La Gratitude !'
  }
];

export default function MesCommandesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrderCodes, setMyOrderCodes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch {}
  };

  useEffect(() => {
    try {
      const savedCodes = localStorage.getItem('gratitude_my_orders');
      if (savedCodes) {
        setMyOrderCodes(JSON.parse(savedCodes));
      }
    } catch {}

    fetchOrders();
    const timer = setInterval(fetchOrders, 5000);
    return () => clearInterval(timer);
  }, []);

  // Show orders placed on this device OR matching the user's phone/order_code search
  const displayedOrders = orders.filter(o => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      return (
        o.order_code.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q)
      );
    }
    if (myOrderCodes.length > 0) {
      return myOrderCodes.includes(o.order_code);
    }
    return false;
  });

  const buildDetailedWhatsAppUrl = (order: Order) => {
    const itemsLines = Array.isArray(order.items_json)
      ? order.items_json
          .map(
            (it, idx) =>
              `${idx + 1}. *${it.name}*${
                it.selectedOption ? ` (${it.selectedOption})` : ''
              } — ${it.qty} x ${formatCFA(it.price)} = *${formatCFA(
                it.price * it.qty
              )}*`
          )
          .join('\n')
      : '';

    const msg = [
      `*NOUVELLE COMMANDE — RESTAURANT LA GRATITUDE*`,
      `----------------------------------------`,
      `*N° Commande :* ${order.order_code}`,
      `*Date & Heure :* ${new Date(order.created_at).toLocaleString('fr-FR')}`,
      `*Client :* ${order.customer_name}`,
      `*Téléphone :* ${order.customer_phone}`,
      `*Mode de réception :* ${order.order_type}`,
      `*Détail (Table / Adresse / Heure) :* ${order.order_detail || 'Non précisé'}`,
      `*Mode de paiement :* ${order.payment_method}`,
      `----------------------------------------`,
      `*DÉTAIL DES PLATS COMMANDÉS :*`,
      itemsLines,
      `----------------------------------------`,
      `*MONTANT TOTAL : ${formatCFA(order.total_cfa)}*`,
      `*Note cuisine :* ${order.notes && order.notes.trim() !== '' ? order.notes : 'Aucune note particulière'}`
    ].join('\n');

    return `https://wa.me/22660186525?text=${encodeURIComponent(msg)}`;
  };

  return (
    <ClientShell>
      <div className="bg-white/90 backdrop-blur-[2px] rounded-2xl border-2 border-[#e6d5c3] shadow-lg p-5 sm:p-6 space-y-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-[#881313] font-extrabold text-xs">
              Suivi en Temps Réel
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2b1810] mt-1">
              Mes Commandes &amp; Statut en Direct
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Suivez l’avancement de votre commande en cuisine (actualisation automatique toutes les 5 secondes).
            </p>
          </div>

          <div className="w-full sm:w-80">
            <label className="block text-xs font-bold text-stone-600 mb-1">
              Rechercher par N° de commande ou Téléphone :
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ex: #CMD-2026 ou votre numéro..."
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs sm:text-sm font-semibold"
            />
          </div>
        </div>

        {displayedOrders.length === 0 ? (
          <div className="py-12 text-center space-y-4 bg-[#fdf5e8] rounded-2xl border border-[#dec6a7] p-6">
            <div className="w-12 h-12 rounded-full bg-amber-200/80 text-[#881313] flex items-center justify-center mx-auto">
              <ClockIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-extrabold text-base text-[#2b1810]">
                Aucune commande trouvée sur cet appareil
              </h3>
              <p className="text-xs text-stone-600">
                Dès que vous validez une commande, elle s’affiche automatiquement ici avec son suivi en direct. Vous pouvez aussi saisir votre numéro de téléphone ci-dessus.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/menu"
                className="px-5 py-2.5 rounded-xl bg-[#881313] text-white font-extrabold text-xs shadow"
              >
                Découvrir le Menu &amp; Commander
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {displayedOrders.map(order => {
              const stepIdx =
                order.status === 'En cours'
                  ? 0
                  : order.status === 'Préparée'
                  ? 1
                  : order.status === 'Livrée'
                  ? 2
                  : -1;

              return (
                <div
                  key={order.id}
                  className="bg-[#fffcf7] rounded-2xl border-2 border-[#dec6a7] shadow-md overflow-hidden"
                >
                  {/* Order Top Header */}
                  <div className="bg-gradient-to-r from-[#7a1212] via-[#881313] to-[#680e0e] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-lg bg-[#eab308] text-[#2b1810] font-extrabold text-xs sm:text-sm">
                        {order.order_code}
                      </span>
                      <div>
                        <span className="font-extrabold text-sm block">
                          {order.customer_name} ({order.customer_phone})
                        </span>
                        <span className="text-xs text-amber-200">
                          {new Date(order.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full font-extrabold text-xs ${
                          order.status === 'Livrée'
                            ? 'bg-emerald-500 text-white'
                            : order.status === 'Préparée'
                            ? 'bg-[#eab308] text-[#2b1810]'
                            : order.status === 'Annulée'
                            ? 'bg-rose-600 text-white'
                            : 'bg-sky-500 text-white'
                        }`}
                      >
                        Statut : {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Live Progress Bar */}
                    {order.status === 'Annulée' ? (
                      <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-extrabold text-center">
                        Cette commande a été annulée. Contactez le +226 60 18 65 25 pour toute question.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {STATUS_STEPS.map((st, idx) => {
                          const isDone = idx <= stepIdx;
                          const isCurrent = idx === stepIdx;
                          return (
                            <div
                              key={st.key}
                              className={`p-3 rounded-xl border-2 transition flex items-start gap-3 ${
                                isCurrent
                                  ? 'bg-amber-50 border-[#881313] shadow-sm'
                                  : isDone
                                  ? 'bg-emerald-50/70 border-emerald-400'
                                  : 'bg-stone-50 border-stone-200 opacity-60'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 ${
                                  isDone
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-stone-300 text-stone-700'
                                }`}
                              >
                                {isDone ? (
                                  <CheckIcon className="w-3.5 h-3.5" />
                                ) : (
                                  idx + 1
                                )}
                              </span>
                              <div>
                                <strong className="text-xs sm:text-sm font-extrabold text-[#2b1810] block">
                                  {st.label}
                                </strong>
                                <span className="text-xs text-stone-600">
                                  {st.desc}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-stone-200 text-xs sm:text-sm">
                      <div className="md:col-span-7 space-y-2">
                        <h4 className="font-extrabold text-[#881313] uppercase text-xs">
                          Plats commandés :
                        </h4>
                        <div className="space-y-1.5 bg-[#fdf5e8] p-3.5 rounded-xl border border-[#dec6a7]">
                          {Array.isArray(order.items_json) &&
                            order.items_json.map((it, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between border-b border-[#ead8be] last:border-0 pb-1.5 last:pb-0"
                              >
                                <div>
                                  <strong className="text-[#2b1810]">
                                    {it.qty}x {it.name}
                                  </strong>
                                  {it.selectedOption && (
                                    <span className="ml-1.5 px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 font-bold text-xs">
                                      {it.selectedOption}
                                    </span>
                                  )}
                                </div>
                                <span className="font-extrabold text-[#881313] whitespace-nowrap">
                                  {formatCFA(it.price * it.qty)}
                                </span>
                              </div>
                            ))}
                        </div>
                        {order.notes && order.notes.trim() !== '' && (
                          <p className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-lg">
                            Note cuisine : {order.notes}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-5 bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-stone-500 font-semibold">
                              Mode de réception :
                            </span>
                            <strong className="text-[#2b1810]">
                              {order.order_type}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500 font-semibold">
                              Table / Lieu / Heure :
                            </span>
                            <strong className="text-[#2b1810]">
                              {order.order_detail || 'Standard'}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500 font-semibold">
                              Mode de paiement :
                            </span>
                            <strong className="text-[#881313]">
                              {order.payment_method}
                            </strong>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-stone-200 text-sm">
                            <span className="font-extrabold text-[#2b1810]">
                              Total :
                            </span>
                            <strong className="font-extrabold text-base text-[#881313] whitespace-nowrap">
                              {formatCFA(order.total_cfa)}
                            </strong>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          <a
                            href={buildDetailedWhatsAppUrl(order)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2 px-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow"
                          >
                            <WhatsAppIcon className="w-4 h-4 shrink-0" />
                            <span>Renvoyer sur WhatsApp</span>
                          </a>
                          <a
                            href="tel:+22660186525"
                            className="py-2 px-3 rounded-xl bg-[#881313] text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow"
                          >
                            <PhoneIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>Appeler</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ClientShell>
  );
}
