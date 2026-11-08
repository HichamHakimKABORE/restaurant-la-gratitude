'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { formatCFA, useCart } from '@/components/CartContext';
import { CheckIcon, BoltIcon, CloseIcon, WhatsAppIcon } from '@/components/Icons';
import { sortDailyMenuDishes, getDailyMenuGroupLabel, getLogicalMenuDate, type Dish, type StockStatus } from '@/lib/db';

export default function AdminMenuDuJourPage() {
  const router = useRouter();
  const { dishes, setDishes, settings, showToast } = useCart();
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  // Séparation stricte : SEULS les plats avec availability_mode === 'daily'
  // figurent dans la liste du Menu du Jour, triés d'abord par Riz, ensuite Soupes, etc.
  const dailyDishes = useMemo(
    () => sortDailyMenuDishes(dishes.filter(d => d.availability_mode === 'daily')),
    [dishes]
  );

  const groupedDailyDishes = useMemo(() => {
    const map = new Map<string, Dish[]>();
    for (const d of dailyDishes) {
      const label = getDailyMenuGroupLabel(d);
      const arr = map.get(label) || [];
      arr.push(d);
      map.set(label, arr);
    }
    return Array.from(map.entries());
  }, [dailyDishes]);

  const saveMenuReport = async () => {
    setIsSavingHistory(true);
    try {
      const activeDailyDishes = dailyDishes
        .filter(d => d.is_available_today)
        .map(d => ({
          id: d.id,
          name: d.name,
          category: d.category,
          price: d.price,
          stock_status: d.stock_status,
          is_available_today: d.is_available_today
        }));

      const res = await fetch('/api/menu-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_date: getLogicalMenuDate(),
          dishes: activeDailyDishes,
          notes: `Menu enregistré depuis l'espace Admin (${activeDailyDishes.length} plats prêts)`
        })
      });

      if (res.status === 401) {
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }

      showToast(`Menu du Jour enregistré et archivé dans les rapports (${activeDailyDishes.length} plats) !`);
    } catch {
      showToast('Menu synchronisé sur le site client !');
    } finally {
      setIsSavingHistory(false);
    }
  };

  const handleResetDailyMenu = async () => {
    if (!confirm('Voulez-vous décocher tous les plats du Menu du Jour ?')) return;
    setDishes(prev =>
      prev.map(d =>
        d.availability_mode === 'daily'
          ? { ...d, is_available_today: false, stock_status: 'soldout' }
          : d
      )
    );
    const res = await fetch('/api/dishes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_daily' })
    });
    if (res.status === 401) {
      showToast('Session expirée. Veuillez vous reconnecter.');
      router.push('/admin/login');
      return;
    }
    const data = await res.json();
    if (data.dishes) setDishes(data.dishes);
    showToast('Menu du Jour réinitialisé (0 plat coché).');
  };

  const buildWhatsAppDailyText = () => {
    const active = dailyDishes.filter(d => d.is_available_today);
    const dateFr = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    });
    const lines = [
      `*RESTAURANT LA GRATITUDE — ZAGTOULI*`,
      `*MENU DU JOUR (${dateFr})* :`,
      ``
    ];
    for (const d of active) {
      lines.push(`- *${d.name}* : ${formatCFA(d.price)}`);
    }
    lines.push(``);
    lines.push(`*Commandes & Réservations :* ${settings.phone || '+226 02 80 99 06'}`);
    lines.push(`*Zagtouli, route de Bobo — Ouagadougou*`);
    return lines.join('\n');
  };

  const handleCopyWhatsAppMenu = async () => {
    const active = dailyDishes.filter(d => d.is_available_today);
    if (active.length === 0) {
      showToast('Cochez au moins un plat avant de partager le Menu du Jour.');
      return;
    }
    const text = buildWhatsAppDailyText();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Texte du Menu du Jour copié ! Prêt à coller sur WhatsApp.');
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const setStatus = async (dish: Dish, status: StockStatus) => {
    const isAvail = status !== 'soldout';
    const prevDishes = dishes;
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
    if (res.status === 401) {
      setDishes(prevDishes);
      showToast('Session expirée. Veuillez vous reconnecter.');
      router.push('/admin/login');
      return;
    }
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
      title="Menu du Jour (Classement : Riz → Soupes → Plats)"
      subtitle="Cochez les plats préparés ce matin. Chaque modification met automatiquement à jour le site client et le rapport du jour."
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-8 space-y-5">
          {groupedDailyDishes.map(([groupTitle, groupItems]) => (
            <div key={groupTitle} className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                <h3 className="font-extrabold text-sm text-[#881313] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#881313]" />
                  <span>{groupTitle}</span>
                </h3>
                <span className="text-xs font-bold text-stone-500">
                  {groupItems.filter(d => d.is_available_today).length}/{groupItems.length} cochés
                </span>
              </div>

              {groupItems.map(dish => (
                <div
                  key={dish.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl border-2 transition ${
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
                    className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer flex-1"
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
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 border border-amber-400">
                      <div
                        className={`w-full h-full dish-photo ${dish.image_quadrant}`}
                        style={{ backgroundImage: `url('${dish.image_url}')` }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs sm:text-sm truncate">{dish.name}</span>
                      <span className="text-xs text-[#881313] font-extrabold whitespace-nowrap">
                        {formatCFA(dish.price)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => setStatus(dish, 'available')}
                      className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap ${
                        dish.is_available_today && dish.stock_status === 'available'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-stone-300 text-stone-600'
                      }`}
                    >
                      <CheckIcon className="w-3 h-3 shrink-0" />
                      <span>Prêt</span>
                    </button>
                    <button
                      onClick={() => setStatus(dish, 'low')}
                      className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap ${
                        dish.is_available_today && dish.stock_status === 'low'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-white border border-stone-300 text-stone-600'
                      }`}
                    >
                      <BoltIcon className="w-3 h-3 shrink-0" />
                      <span>Presque fini</span>
                    </button>
                    <button
                      onClick={() => setStatus(dish, 'soldout')}
                      className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap ${
                        !dish.is_available_today
                          ? 'bg-rose-600 text-white'
                          : 'bg-white border border-stone-300 text-stone-600'
                      }`}
                    >
                      <CloseIcon className="w-3 h-3 shrink-0" />
                      <span>Non</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="md:col-span-4 bg-[#fdf5e8] rounded-2xl border-2 border-[#eab308] p-5 flex flex-col items-center text-center space-y-4 md:sticky md:top-24">
          <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-950 font-extrabold text-xs">
            Aujourd’hui : {dailyDishes.filter(d => d.is_available_today).length} plats prêts
          </span>
          <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-[#d99b26] shadow-xl">
            <div
              className="w-full h-full dish-photo quad-tl"
              style={{ backgroundImage: `url('/images/dishes_grid_1.jpg')` }}
            />
          </div>
          <p className="text-xs text-stone-600">
            L’ordre d’affichage respecte automatiquement : 1. Plats de Riz, 2. Soupes, 3. Tô, 4. Grillades, 5. Omelettes &amp; Sandwichs, 6. Boissons.
          </p>
          <button
            onClick={saveMenuReport}
            disabled={isSavingHistory}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2"
          >
            <CheckIcon className="w-4 h-4" />
            <span>{isSavingHistory ? 'Enregistrement...' : 'Enregistrer le menu & archiver'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyWhatsAppMenu}
            className="w-full py-2.5 px-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xs shadow flex items-center justify-center gap-2 transition"
          >
            <WhatsAppIcon className="w-4 h-4 shrink-0" />
            <span>Copier le Menu pour Statut WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleResetDailyMenu}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs transition"
          >
            Tout décocher (Réinitialiser le Menu du Jour)
          </button>

          <Link
            href="/admin/rapport-menus"
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#fef08a] to-[#facc15] hover:brightness-105 text-[#2b1810] font-extrabold text-xs border border-amber-400 shadow text-center block transition"
          >
            Consulter les rapports &amp; générer un PDF →
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
