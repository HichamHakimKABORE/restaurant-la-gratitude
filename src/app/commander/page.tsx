'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClientShell from '@/components/ClientShell';
import { useCart, formatCFA } from '@/components/CartContext';
import { WhatsAppIcon, CheckIcon, ClockIcon } from '@/components/Icons';
import {
  RESTAURANT_PHONE_DISPLAY,
  RESTAURANT_TABLES,
  DELIVERY_ZONES,
  type DeliveryZone
} from '@/lib/constants';

export default function CommanderPage() {
  const router = useRouter();
  const { cart, updateQty, clearCart, totalPrice, showToast } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Mode de réception : Sur place | À emporter | Livraison
  const [orderType, setOrderType] = useState<'Sur place' | 'À emporter' | 'Livraison'>('Sur place');
  const [selectedTable, setSelectedTable] = useState<string>(RESTAURANT_TABLES[0].name);
  const [customTable, setCustomTable] = useState<string>('');
  const [pickupPreset, setPickupPreset] = useState<string>('Au plus vite (~15-25 min)');
  const [customPickupTime, setCustomPickupTime] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zagtouli_centre');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [orderDetail, setOrderDetail] = useState('');

  const currentZone = DELIVERY_ZONES.find(z => z.id === selectedZoneId) || DELIVERY_ZONES[0];
  const deliveryFee = orderType === 'Livraison' ? currentZone.fee_cfa : 0;
  const finalTotal = totalPrice + deliveryFee;

  // Mode de paiement : Espèces | Orange Money | Moov Money
  const [paymentMethod, setPaymentMethod] = useState<'Espèces' | 'Orange Money' | 'Moov Money'>('Espèces');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const idempotencyKeyRef = useRef<string | null>(null);

  const handleConfirmOrder = async () => {
    if (submitting) return;

    if (cart.length === 0) {
      setFormError('Votre panier est vide. Ajoutez d’abord des plats.');
      showToast('Votre panier est vide.');
      return;
    }

    if (!customerName.trim()) {
      setFormError('Veuillez renseigner votre nom pour valider la commande.');
      showToast('Votre nom est obligatoire.');
      return;
    }

    const cleanPhoneDigits = customerPhone.replace(/\D/g, '');
    if (!customerPhone.trim() || cleanPhoneDigits.length < 8) {
      setFormError('Veuillez renseigner un numéro de téléphone valide (au moins 8 chiffres).');
      showToast('Numéro de téléphone obligatoire.');
      return;
    }

    let resolvedDetail = '';
    if (orderType === 'Sur place') {
      resolvedDetail =
        selectedTable === 'Autre emplacement'
          ? customTable.trim()
          : selectedTable;
      if (!resolvedDetail) {
        setFormError('Veuillez préciser votre numéro de table ou votre emplacement.');
        showToast('Numéro de table requis.');
        return;
      }
    } else if (orderType === 'À emporter') {
      resolvedDetail =
        pickupPreset === 'Heure précise'
          ? (customPickupTime.trim() ? `Retrait à ${customPickupTime.trim()}` : '')
          : pickupPreset;
      if (!resolvedDetail) {
        setFormError('Veuillez préciser l’heure de retrait souhaitée.');
        showToast('Heure de retrait requise.');
        return;
      }
    } else {
      if (totalPrice < currentZone.min_order_cfa) {
        setFormError(
          `Montant minimum de commande pour cette zone : ${formatCFA(currentZone.min_order_cfa)} (votre panier : ${formatCFA(totalPrice)}).`
        );
        showToast('Montant minimum non atteint pour cette zone.');
        return;
      }
      if (!deliveryAddress.trim()) {
        setFormError('Veuillez renseigner votre quartier et un repère précis (porte, rue, repère).');
        showToast('Adresse de livraison obligatoire.');
        return;
      }
      resolvedDetail = `${currentZone.name} — ${deliveryAddress.trim()}`;
    }

    if (paymentMethod !== 'Espèces' && paymentRef.trim().length < 4) {
      setFormError(
        `Indiquez la référence de votre transfert ${paymentMethod} (reçue par SMS après le dépôt).`
      );
      showToast('Référence de transaction obligatoire.');
      return;
    }

    setFormError('');
    setSubmitting(true);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    // Ouvre l'onglet AVANT l'appel réseau : après un await, les navigateurs
    // bloquent window.open et la commande n'arriverait jamais sur WhatsApp.
    const popup = window.open('', '_blank');
    try {
      if (popup) popup.opener = null;
    } catch {}

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: idempotencyKeyRef.current,
          customer_name: customerName,
          customer_phone: customerPhone,
          order_type: orderType,
          order_detail: resolvedDetail,
          payment_method: paymentMethod,
          payment_ref: paymentRef.trim() || undefined,
          items: cart.map(c => ({
            id: c.id,
            selectedOption: c.selectedOption,
            qty: c.qty
          })),
          total_cfa: finalTotal,
          notes
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.order_code) {
        try {
          popup?.close();
        } catch {}
        const message =
          typeof data?.error === 'string'
            ? data.error
            : 'La commande n’a pas pu être enregistrée. Réessayez.';
        setFormError(message);
        showToast('Commande non enregistrée.');
        return;
      }

      const code = String(data.order_code);
      const token = typeof data.track_token === 'string' ? data.track_token : '';
      const whatsappUrl =
        typeof data.whatsapp_url === 'string' ? data.whatsapp_url : '';

      // Le serveur renvoie un jeton secret : on ne stocke plus le code court
      // (devinable) pour le suivi.
      if (token) {
        try {
          const raw = localStorage.getItem('gratitude_my_orders_v2');
          const existing = raw ? JSON.parse(raw) : [];
          const next = [
            { token, code, created_at: new Date().toISOString() },
            ...(Array.isArray(existing)
              ? existing.filter((entry: { token?: string }) => entry?.token !== token)
              : [])
          ].slice(0, 20);
          localStorage.setItem('gratitude_my_orders_v2', JSON.stringify(next));
        } catch {}
      }

      clearCart();
      idempotencyKeyRef.current = null;
      setPaymentRef('');
      showToast(`Commande ${code} enregistrée en cuisine !`);

      if (whatsappUrl) {
        try {
          if (popup) {
            popup.location.href = whatsappUrl;
          } else {
            window.location.href = whatsappUrl;
            return;
          }
        } catch {
          window.location.href = whatsappUrl;
          return;
        }
      } else {
        try {
          popup?.close();
        } catch {}
      }

      router.push('/mes-commandes');
    } catch (error) {
      console.error(error);
      try {
        popup?.close();
      } catch {}
      setFormError(
        'Connexion impossible. Vérifiez votre réseau puis réessayez : votre panier est conservé.'
      );
      showToast('Commande non enregistrée.');
    } finally {
      setSubmitting(false);
    }
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
                      <span className="block text-xs text-[#881313] font-bold mt-0.5 whitespace-nowrap">
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
                    <span className="font-extrabold text-sm text-[#2b1810] min-w-16 text-right whitespace-nowrap">
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
                      setOrderDetail('');
                      setFormError('');
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
            {orderType === 'Sur place' && (
              <div className="space-y-2">
                <label className="font-bold block text-stone-700">
                  Choisissez votre table ou zone : <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <select
                  value={selectedTable}
                  onChange={e => {
                    setSelectedTable(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs sm:text-sm text-[#2b1810]"
                >
                  <optgroup label="Terrasse Ombragée & Jardin">
                    {RESTAURANT_TABLES.filter(t => t.zone === 'Terrasse').map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Salle Climatisée">
                    {RESTAURANT_TABLES.filter(t => t.zone === 'Salle Climatisée').map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Bar & Autre">
                    {RESTAURANT_TABLES.filter(t => t.zone === 'Bar').map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                    <option value="Autre emplacement">Autre emplacement (préciser ci-dessous)</option>
                  </optgroup>
                </select>

                {selectedTable === 'Autre emplacement' && (
                  <input
                    type="text"
                    value={customTable}
                    onChange={e => setCustomTable(e.target.value)}
                    placeholder="Précisez votre emplacement (ex: À côté de la pergola...)"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white font-semibold text-xs mt-1"
                  />
                )}
              </div>
            )}

            {orderType === 'À emporter' && (
              <div className="space-y-2">
                <label className="font-bold block text-stone-700">
                  Délai souhaité pour le retrait : <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <select
                  value={pickupPreset}
                  onChange={e => {
                    setPickupPreset(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs sm:text-sm text-[#2b1810]"
                >
                  <option value="Au plus vite (~15-25 min)">Au plus vite (~15 à 25 minutes)</option>
                  <option value="Dans 30 minutes">Dans 30 minutes</option>
                  <option value="Dans 45 minutes">Dans 45 minutes</option>
                  <option value="Dans 1 heure">Dans 1 heure</option>
                  <option value="Heure précise">Indiquer une heure précise...</option>
                </select>

                {pickupPreset === 'Heure précise' && (
                  <input
                    type="text"
                    value={customPickupTime}
                    onChange={e => setCustomPickupTime(e.target.value)}
                    placeholder="Ex: 12h45 ou 19h30"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white font-semibold text-xs mt-1"
                  />
                )}
              </div>
            )}

            {orderType === 'Livraison' && (
              <div className="space-y-2.5">
                <div>
                  <label className="font-bold block text-stone-700 mb-1">
                    Zone de livraison : <span className="text-rose-600 font-extrabold">*</span>
                  </label>
                  <select
                    value={selectedZoneId}
                    onChange={e => {
                      setSelectedZoneId(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs sm:text-sm text-[#2b1810]"
                  >
                    {DELIVERY_ZONES.map(z => (
                      <option key={z.id} value={z.id}>
                        {z.name} — Délai : {z.eta}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-stone-700 text-xs flex justify-between items-center">
                  <span>Frais : <strong>{formatCFA(currentZone.fee_cfa)}</strong></span>
                  <span>Minimum : <strong>{formatCFA(currentZone.min_order_cfa)}</strong></span>
                </div>

                <div>
                  <label className="font-bold block text-stone-700 mb-1">
                    Adresse ou repère précis de livraison : <span className="text-rose-600 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={e => {
                      setDeliveryAddress(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="Ex: Zagtouli vers la station Shell, portail bleu..."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white font-semibold text-xs"
                  />
                </div>
              </div>
            )}

            {/* 2. Coordonnées client */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold block mb-1">
                  Votre Nom <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="Ex: Ouédraogo Salif"
                  className={`w-full px-3 py-2 rounded-xl border transition ${
                    formError && !customerName.trim()
                      ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                      : 'border-stone-300 bg-white'
                  }`}
                />
              </div>
              <div>
                <label className="font-bold block mb-1">
                  Votre Téléphone <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={20}
                  value={customerPhone}
                  onChange={e => {
                    setCustomerPhone(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="Ex: 70 00 00 00"
                  className={`w-full px-3 py-2 rounded-xl border transition ${
                    formError && (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 8)
                      ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                      : 'border-stone-300 bg-white'
                  }`}
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
                <div className="mt-2 p-3 rounded-xl bg-amber-100/90 border border-amber-400 text-xs space-y-2">
                  <strong className="block text-[#881313]">
                    Paiement {paymentMethod} :
                  </strong>
                  <p className="text-[#2b1810]">
                    Numéro dépôt / transfert :{' '}
                    <strong className="underline">{RESTAURANT_PHONE_DISPLAY}</strong> (Restaurant La Gratitude).
                  </p>
                  <p className="text-stone-600">
                    Montant : <strong>{formatCFA(totalPrice)}</strong>. Effectuez le transfert, puis saisissez la référence reçue par SMS.
                  </p>
                  <div>
                    <label className="font-bold block mb-1 text-[#2b1810]">
                      Référence de la transaction <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={e => {
                        setPaymentRef(e.target.value);
                        if (formError) setFormError('');
                      }}
                      maxLength={60}
                      placeholder="Ex: MP250506.1234.A56789"
                      className="w-full px-3 py-2 rounded-lg border border-amber-400 bg-white font-semibold"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      Cette référence permet au restaurant de vérifier votre paiement et évite les litiges.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="font-bold block mb-1">Note pour la cuisine (optionnel)</label>
              <input
                type="text"
                maxLength={300}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Piment à part, bien chaud..."
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#dec6a7] text-xs">
            <div className="flex justify-between items-center text-stone-600 font-semibold">
              <span>Sous-total plats :</span>
              <span>{formatCFA(totalPrice)}</span>
            </div>
            {orderType === 'Livraison' && (
              <div className="flex justify-between items-center text-stone-600 font-semibold">
                <span>Frais de livraison ({currentZone.name.split('(')[0].trim()}) :</span>
                <span>{formatCFA(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t border-[#dec6a7]/60 font-extrabold text-base text-[#2b1810]">
              <span>Total à régler :</span>
              <span className="text-xl text-[#881313] whitespace-nowrap">{formatCFA(finalTotal)}</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-100 border-2 border-rose-400 text-rose-900 text-xs font-bold text-center flex items-center justify-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{formError}</span>
              </div>
            )}

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
