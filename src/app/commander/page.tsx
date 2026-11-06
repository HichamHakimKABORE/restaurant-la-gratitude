'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClientShell from '@/components/ClientShell';
import { useCart, formatCFA } from '@/components/CartContext';
import { WhatsAppIcon, CheckIcon, ClockIcon } from '@/components/Icons';

export default function CommanderPage() {
  const router = useRouter();
  const { cart, updateQty, clearCart, totalPrice, showToast } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Mode de réception : Sur place | À emporter | Livraison
  const [orderType, setOrderType] = useState<'Sur place' | 'À emporter' | 'Livraison'>('Sur place');
  const [orderDetail, setOrderDetail] = useState('Table 1');

  // Mode de paiement : Espèces | Orange Money | Moov Money
  const [paymentMethod, setPaymentMethod] = useState<'Espèces' | 'Orange Money' | 'Moov Money'>('Espèces');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmOrder = async () => {
    if (cart.length === 0) {
      showToast('Votre panier est vide. Ajoutez d’abord des plats.');
      return;
    }

    setSubmitting(true);
    let createdOrderCode = `#CMD-2026-${Math.floor(100 + Math.random() * 900)}`;
    const nowStr = new Date().toLocaleString('fr-FR');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName || 'Client Site Web',
          customer_phone: customerPhone || '+226',
          order_type: orderType,
          order_detail: orderDetail,
          payment_method: paymentMethod,
          items: cart.map(c => ({
            id: c.id,
            name: c.name,
            selectedOption: c.selectedOption,
            price: c.price,
            qty: c.qty
          })),
          total_cfa: totalPrice,
          notes
        })
      });
      const data = await res.json();
      if (data.order_code) {
        createdOrderCode = data.order_code;
      }

      try {
        const existing = JSON.parse(
          localStorage.getItem('gratitude_my_orders') || '[]'
        );
        const updated = [
          createdOrderCode,
          ...existing.filter((c: string) => c !== createdOrderCode)
        ];
        localStorage.setItem('gratitude_my_orders', JSON.stringify(updated));
      } catch {}

      showToast(
        `Commande ${createdOrderCode} enregistrée en cuisine et ouverte sur WhatsApp !`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }

    const detailedLines = cart
      .map(
        (c, index) =>
          `${index + 1}. *${c.name}*${
            c.selectedOption ? ` (Option : ${c.selectedOption})` : ''
          }\n   Qté : ${c.qty} x ${formatCFA(c.price)} = *${formatCFA(
            c.price * c.qty
          )}*`
      )
      .join('\n');

    const detailLabel =
      orderType === 'Sur place'
        ? 'Numéro de Table'
        : orderType === 'À emporter'
        ? 'Heure de retrait souhaitée'
        : 'Quartier / Adresse de livraison';

    const rawMessage = [
      `*NOUVELLE COMMANDE — RESTAURANT LA GRATITUDE*`,
      `----------------------------------------`,
      `*N° Commande :* ${createdOrderCode}`,
      `*Date & Heure :* ${nowStr}`,
      `*Nom du Client :* ${customerName || 'Client Site Web'}`,
      `*Téléphone Client :* ${customerPhone || 'Non renseigné'}`,
      `----------------------------------------`,
      `*MODE DE RÉCEPTION :* ${orderType}`,
      `*${detailLabel} :* ${orderDetail || 'Non précisé'}`,
      `*MODE DE PAIEMENT :* ${paymentMethod}`,
      `----------------------------------------`,
      `*DÉTAIL COMPLET DES PLATS :*`,
      detailedLines,
      `----------------------------------------`,
      `*MONTANT TOTAL À PAYER : ${formatCFA(totalPrice)}*`,
      `*Instructions / Note cuisine :* ${
        notes.trim() !== '' ? notes : 'Aucune instruction particulière'
      }`,
      `----------------------------------------`,
      `Merci de confirmer la réception de ma commande.`
    ].join('\n');

    window.open(
      `https://wa.me/22660186525?text=${encodeURIComponent(rawMessage)}`,
      '_blank'
    );

    clearCart();
    router.push('/mes-commandes');
  };

  return (
    <ClientShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cart Items */}
        <div className="lg:col-span-7 bg-white/90 backdrop-blur-[2px] rounded-2xl border-2 border-[#e6d5c3] shadow-lg p-5 sm:p-6 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h2 className="text-xl font-extrabold text-[#2b1810]">
              Mon Panier de Commande
            </h2>
            <Link
              href="/menu"
              className="text-xs font-extrabold text-[#881313] hover:underline"
            >
              + Ajouter d’autres plats
            </Link>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-stone-500">
                Votre panier est vide pour le moment.
              </p>
              <Link
                href="/menu"
                className="inline-block px-5 py-2.5 rounded-xl bg-[#881313] text-white font-bold text-xs shadow"
              >
                Parcourir le Menu
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div
                  key={item.cartKey}
                  className="flex items-center justify-between bg-[#fdf5e8] p-3 rounded-xl border border-[#dec6a7]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 border-[#d99b26]">
                      <div
                        className={`w-full h-full dish-photo ${item.image_quadrant}`}
                        style={{ backgroundImage: `url('${item.image_url}')` }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-[#2b1810] truncate">
                        {item.name}
                      </h4>
                      {item.selectedOption && (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 font-bold text-xs mt-0.5">
                          Option : {item.selectedOption}
                        </span>
                      )}
                      <span className="block text-xs text-[#881313] font-bold mt-0.5">
                        {formatCFA(item.price)} l’unité
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1 border border-stone-300 text-xs font-bold">
                      <button
                        onClick={() => updateQty(item.cartKey, -1)}
                        className="px-1.5 text-stone-600"
                      >
                        −
                      </button>
                      <span>{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.cartKey, 1)}
                        className="px-1.5 text-[#881313]"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-extrabold text-sm text-[#2b1810] w-20 text-right">
                      {formatCFA(item.price * item.qty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Mode de réception + Mobile Money + Validation */}
        <div className="lg:col-span-5 bg-[#fdf5e8] rounded-2xl border-2 border-[#881313] shadow-lg p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-[#2b1810] border-b border-[#dec6a7] pb-3">
            Options de Réception &amp; Paiement
          </h3>

          <div className="space-y-3.5 text-xs sm:text-sm">
            {/* 1. Mode de réception */}
            <div>
              <label className="font-extrabold block mb-1.5 text-[#2b1810]">
                1. Mode de réception :
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Sur place', 'À emporter', 'Livraison'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setOrderType(mode);
                      if (mode === 'Sur place') setOrderDetail('Table 1');
                      if (mode === 'À emporter') setOrderDetail('Dans 20 min');
                      if (mode === 'Livraison') setOrderDetail('Zagtouli');
                    }}
                    className={`py-2 px-2 rounded-xl font-extrabold text-xs border-2 transition ${
                      orderType === mode
                        ? 'bg-[#881313] text-white border-[#881313] shadow'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Détail selon le mode choisi */}
            <div>
              <label className="font-bold block mb-1">
                {orderType === 'Sur place'
                  ? 'Numéro de table ou emplacement :'
                  : orderType === 'À emporter'
                  ? 'Heure souhaitée de retrait :'
                  : 'Quartier / Adresse exacte de livraison :'}
              </label>
              <input
                type="text"
                value={orderDetail}
                onChange={e => setOrderDetail(e.target.value)}
                placeholder={
                  orderType === 'Sur place'
                    ? 'Ex: Table 3 (Terrasse)'
                    : orderType === 'À emporter'
                    ? 'Ex: Dans 30 minutes (13h15)'
                    : 'Ex: Zagtouli, côté pharmacie...'
                }
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white font-semibold"
              />
            </div>

            {/* 2. Coordonnées client */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold block mb-1">Votre Nom</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Ex: Ouédraogo Salif"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Votre Téléphone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Ex: +226 70 00 00 00"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                />
              </div>
            </div>

            {/* 3. Mode de paiement (Espèces / Orange Money / Moov Money) */}
            <div>
              <label className="font-extrabold block mb-1.5 text-[#2b1810]">
                2. Mode de paiement :
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Espèces', 'Orange Money', 'Moov Money'] as const).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`py-2 px-2 rounded-xl font-extrabold text-xs border-2 transition ${
                      paymentMethod === pm
                        ? 'bg-[#eab308] text-[#2b1810] border-[#b45309] shadow'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>

              {(paymentMethod === 'Orange Money' || paymentMethod === 'Moov Money') && (
                <div className="mt-2 p-3 rounded-xl bg-amber-100/90 border border-amber-400 text-xs space-y-1">
                  <strong className="block text-[#881313]">
                    Paiement {paymentMethod} :
                  </strong>
                  <p className="text-[#2b1810]">
                    Numéro dépôt / transfert :{' '}
                    <strong className="underline">+226 60 18 65 25</strong> (Restaurant La Gratitude).
                  </p>
                  <p className="text-stone-600">
                    Montant : <strong>{formatCFA(totalPrice)}</strong>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="font-bold block mb-1">Note pour la cuisine (optionnel)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Piment à part, bien chaud..."
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-[#dec6a7] font-extrabold text-base">
            <span>Total à payer :</span>
            <span className="text-xl text-[#881313]">{formatCFA(totalPrice)}</span>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              disabled={submitting}
              onClick={handleConfirmOrder}
              className="w-full py-3.5 px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xs sm:text-sm shadow-lg transition inline-flex items-center justify-center gap-2"
            >
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
              <span>
                {submitting
                  ? 'Enregistrement de la commande...'
                  : 'Valider la commande (Alerte Admin + Détails WhatsApp)'}
              </span>
            </button>

            <Link
              href="/mes-commandes"
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-amber-50 text-[#881313] border-2 border-[#881313] font-extrabold text-xs sm:text-sm transition inline-flex items-center justify-center gap-2"
            >
              <ClockIcon className="w-4 h-4 shrink-0" />
              <span>Suivre mes commandes en direct</span>
            </Link>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
