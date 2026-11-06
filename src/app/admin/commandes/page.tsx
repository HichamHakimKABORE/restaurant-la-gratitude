'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { formatCFA, useCart } from '@/components/CartContext';
import { WhatsAppIcon } from '@/components/Icons';
import { INITIAL_ORDERS, type Order } from '@/lib/db';

export default function AdminCommandesPage() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [orderFilter, setOrderFilter] = useState<string>('Toutes');
  const { showToast } = useCart();

  const loadOrders = () => {
    fetch('/api/orders', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.orders) setOrders(d.orders);
      });
  };

  useEffect(() => {
    loadOrders();
    const t = setInterval(loadOrders, 6000);
    return () => clearInterval(t);
  }, []);

  const handleUpdateOrderStatus = async (
    id: number,
    status: Order['status']
  ) => {
    const res = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    const data = await res.json();
    if (data.orders) setOrders(data.orders);
    showToast(`Statut mis à jour : ${status}`);
  };

  const handleDeleteOrder = async (id: number, code: string) => {
    const res = await fetch(`/api/orders?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.orders) setOrders(data.orders);
    showToast(`Commande ${code} supprimée`);
  };

  const getClientWhatsAppUrl = (order: Order) => {
    const cleanPhone = order.customer_phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length >= 8 ? cleanPhone : '22660186525';
    const msg = `Bonjour ${order.customer_name}, ici le *Restaurant La Gratitude*.\nVotre commande *${order.order_code}* (${formatCFA(
      order.total_cfa
    )}) a actuellement le statut : *${order.status}*.`;
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'Toutes') return true;
    return o.status === orderFilter;
  });

  return (
    <AdminShell
      title="Gestion des Commandes (En Direct)"
      subtitle="Les nouvelles commandes déclenchent une alerte sonore et s’affichent automatiquement ici"
    >
      <div className="flex flex-wrap gap-2 text-xs">
        {['Toutes', 'En cours', 'Préparée', 'Livrée', 'Annulée'].map(st => (
          <button
            key={st}
            onClick={() => setOrderFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
              orderFilter === st
                ? 'bg-[#881313] text-white shadow'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-stone-200 rounded-2xl">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="bg-stone-100 text-stone-600 border-b border-stone-200">
              <th className="p-3">N° &amp; Client</th>
              <th className="p-3">Mode &amp; Détail</th>
              <th className="p-3">Plats commandés</th>
              <th className="p-3">Paiement &amp; Total</th>
              <th className="p-3">Statut</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs sm:text-sm text-stone-500">
                  Aucune commande dans cette catégorie pour le moment.
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
              <tr key={order.id} className="hover:bg-stone-50">
                <td className="p-3">
                  <div className="font-extrabold text-[#2b1810]">{order.order_code}</div>
                  <div className="font-bold text-stone-700">{order.customer_name}</div>
                  <div className="text-xs text-stone-500">{order.customer_phone}</div>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-xs">
                    {order.order_type || 'Sur place'}
                  </span>
                  {order.order_detail && (
                    <div className="text-xs font-bold text-stone-700 mt-1">
                      {order.order_detail}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="space-y-0.5 text-xs">
                    {Array.isArray(order.items_json) &&
                      order.items_json.map((it, idx) => (
                        <div key={idx}>
                          • <strong>{it.name}</strong>
                          {it.selectedOption ? ` (${it.selectedOption})` : ''} ×{it.qty}
                        </div>
                      ))}
                    {order.notes && order.notes.trim() !== '' && (
                      <div className="mt-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-[#881313] font-bold">
                        Note cuisine : {order.notes}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-extrabold text-[#881313]">
                    {formatCFA(order.total_cfa)}
                  </div>
                  <span className="text-xs text-stone-600 font-semibold">
                    {order.payment_method || 'Espèces'}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                      order.status === 'Livrée'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.status === 'Préparée'
                        ? 'bg-amber-100 text-amber-800'
                        : order.status === 'Annulée'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <select
                    value={order.status}
                    onChange={e =>
                      handleUpdateOrderStatus(
                        order.id,
                        e.target.value as Order['status']
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                  >
                    <option value="En cours">En cours</option>
                    <option value="Préparée">Préparée</option>
                    <option value="Livrée">Livrée</option>
                    <option value="Annulée">Annulée</option>
                  </select>
                  <a
                    href={getClientWhatsAppUrl(order)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#16a34a] text-white font-bold text-xs shadow"
                    title="Notifier le client sur WhatsApp"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <button
                    onClick={() => handleDeleteOrder(order.id, order.order_code)}
                    className="text-rose-600 hover:underline font-bold text-xs px-1"
                    title="Supprimer la commande"
                  >
                    Suppr.
                  </button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
