'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { formatCFA, useCart } from '@/components/CartContext';
import { PrinterIcon, CheckIcon, ChefHatIcon, BoltIcon, CloseIcon } from '@/components/Icons';
import { sortDailyMenuDishes, getLogicalMenuDate, type DailyMenuRecord } from '@/lib/db';

export default function AdminRapportMenusPage() {
  const router = useRouter();
  const { dishes, settings, showToast } = useCart();
  const [reports, setReports] = useState<DailyMenuRecord[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [isArchivingNow, setIsArchivingNow] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/menu-reports', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.reports)) {
        setReports(data.reports);
        if (selectedDates.length === 0) {
          setSelectedDates(data.reports.map((r: DailyMenuRecord) => r.menu_date));
        }
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const displayedReports = useMemo(() => {
    return reports.filter(r => {
      if (filterStartDate && r.menu_date < filterStartDate) return false;
      if (filterEndDate && r.menu_date > filterEndDate) return false;
      return selectedDates.includes(r.menu_date);
    });
  }, [reports, selectedDates, filterStartDate, filterEndDate]);

  const toggleDate = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const selectAll = () => {
    setSelectedDates(reports.map(r => r.menu_date));
  };

  const selectNone = () => {
    setSelectedDates([]);
  };

  const selectTodayOnly = () => {
    const todayStr = getLogicalMenuDate();
    setSelectedDates([todayStr]);
  };

  const handleDeleteReport = async (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Supprimer définitivement le rapport du ${dateStr} ?`)) return;
    const res = await fetch(`/api/menu-reports?date=${encodeURIComponent(dateStr)}`, {
      method: 'DELETE'
    });
    if (res.status === 401) {
      showToast('Session expirée. Veuillez vous reconnecter.');
      router.push('/admin/login');
      return;
    }
    setReports(prev => prev.filter(r => r.menu_date !== dateStr));
    setSelectedDates(prev => prev.filter(d => d !== dateStr));
    showToast(`Rapport du ${dateStr} supprimé.`);
  };

  const stats = useMemo(() => {
    const daysCount = displayedReports.length;
    let totalDishesCount = 0;

    for (const rep of displayedReports) {
      totalDishesCount += rep.dishes_json?.length || 0;
    }

    return {
      daysCount,
      totalDishesCount,
      avgDishesPerDay: daysCount > 0 ? (totalDishesCount / daysCount).toFixed(1) : '0'
    };
  }, [displayedReports]);

  const handleArchiveToday = async () => {
    setIsArchivingNow(true);
    try {
      const activeDaily = sortDailyMenuDishes(
        dishes.filter(d => d.availability_mode === 'daily' && d.is_available_today)
      ).map(d => ({
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
          dishes: activeDaily,
          notes: `Enregistrement manuel (${activeDaily.length} plats cochés)`
        })
      });

      if (res.status === 401) {
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }

      showToast('Menu d’aujourd’hui archivé dans les rapports !');
      await fetchReports();
    } catch {
      showToast('Erreur lors de l’archivage.');
    } finally {
      setIsArchivingNow(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (displayedReports.length === 0) return;
    const rows: string[] = [
      'Date;Plat;Categorie;Prix FCFA;Statut'
    ];
    for (const rep of displayedReports) {
      const sorted = sortDailyMenuDishes(rep.dishes_json || []);
      for (const d of sorted) {
        const st =
          d.stock_status === 'low'
            ? 'Presque fini'
            : d.is_available_today
            ? 'Disponible'
            : 'Non disponible';
        const safeName = (d.name || '').replace(/;/g, ',');
        const safeCat = (d.category || '').replace(/;/g, ',');
        rows.push(`${rep.menu_date};${safeName};${safeCat};${d.price};${st}`);
      }
    }
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-menus-la-gratitude-${getLogicalMenuDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Fichier Excel (.csv) téléchargé !');
  };

  const formatDateFr = (isoStr: string) => {
    try {
      const parts = isoStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      }
      return isoStr;
    } catch {
      return isoStr;
    }
  };

  return (
    <AdminShell
      title="Rapports des Menus du Jour"
      subtitle="Historique des menus enregistrés (classés : Riz, Soupes, Plats...), sélection des journées et export PDF officiel"
    >
      {/* 1. SECTION CONTRÔLES & FILTRES (Cachée à l'impression) */}
      <div className="space-y-4 print:hidden">
        <div className="bg-white rounded-2xl border-2 border-[#dec6a7] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-[#2b1810] font-bold text-xs transition"
            >
              Tout cocher
            </button>
            <button
              onClick={selectNone}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition"
            >
              Tout décocher
            </button>
            <button
              onClick={selectTodayOnly}
              className="px-3 py-1.5 rounded-lg bg-[#facc15] hover:brightness-105 text-[#2b1810] font-extrabold text-xs transition"
            >
              Aujourd’hui uniquement
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleArchiveToday}
              disabled={isArchivingNow}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-extrabold text-xs shadow flex items-center gap-1.5 transition"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              <span>{isArchivingNow ? 'Archivage...' : 'Archiver le menu actuel'}</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={displayedReports.length === 0}
              className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#2b1810] border border-amber-400 font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <span>Exporter Excel (.csv)</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={displayedReports.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white font-extrabold text-xs shadow-md flex items-center gap-2 transition disabled:opacity-50"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Générer le PDF / Imprimer le rapport</span>
            </button>
          </div>
        </div>

        <div className="bg-[#fdf5e8] rounded-2xl border-2 border-[#dec6a7] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ead8be] pb-2">
            <h3 className="font-extrabold text-sm text-[#2b1810] flex items-center gap-2">
              <ChefHatIcon className="w-4 h-4 text-[#881313]" />
              <span>Choisissez les journées à inclure dans votre rapport ({selectedDates.length}/{reports.length} cochées)</span>
            </h3>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-stone-600">Du :</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#dec6a7] bg-white text-xs font-bold"
              />
              <span className="font-bold text-stone-600">Au :</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#dec6a7] bg-white text-xs font-bold"
              />
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="text-xs text-rose-700 font-bold hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
            {reports.map(rep => {
              const isSelected = selectedDates.includes(rep.menu_date);
              return (
                <div
                  key={rep.menu_date}
                  onClick={() => toggleDate(rep.menu_date)}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                    isSelected
                      ? 'bg-amber-100 border-[#b45309] font-extrabold text-[#2b1810] shadow-sm'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 rounded text-[#881313] focus:ring-amber-500 shrink-0 pointer-events-none"
                    />
                    <div className="min-w-0">
                      <span className="text-xs capitalize block truncate">
                        {formatDateFr(rep.menu_date)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-medium block">
                        {rep.dishes_json?.length || 0} plats enregistrés
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-stone-300 text-stone-700 font-bold">
                      {rep.menu_date}
                    </span>
                    <button
                      type="button"
                      onClick={e => handleDeleteReport(rep.menu_date, e)}
                      className="p-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition"
                      title="Supprimer ce rapport"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARTES STATISTIQUES DES MENUS SÉLECTIONNÉS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border-2 border-stone-200 p-3 text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Jours sélectionnés</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#2b1810]">{stats.daysCount}</span>
          </div>
          <div className="bg-white rounded-xl border-2 border-stone-200 p-3 text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Total plats proposés</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#881313]">{stats.totalDishesCount}</span>
          </div>
          <div className="bg-white rounded-xl border-2 border-stone-200 p-3 text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Moyenne par jour</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#16a34a]">{stats.avgDishesPerDay} plats</span>
          </div>
        </div>
      </div>

      {/* 2. RAPPORT STRUCTURÉ (Écran & Impression PDF) */}
      <div className="bg-white rounded-2xl border-2 border-[#dec6a7] shadow-md p-4 sm:p-8 mt-4 print:p-0 print:border-none print:shadow-none">
        <div className="border-b-2 border-[#801313] pb-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo_gratitude.jpg"
              alt="Logo Restaurant La Gratitude"
              className="w-16 h-16 rounded-full object-cover border-2 border-[#d99b26] shrink-0"
            />
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#801313] block">
                {settings.restaurant_name || 'Restaurant La Gratitude'}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2b1810]">
                Rapport Officiel des Menus du Jour
              </h2>
              <p className="text-xs text-stone-600">
                {settings.address || 'Zagtouli, route de Bobo — Ouagadougou, Burkina Faso'} • Tél : {settings.phone || '+226 02 80 99 06'}
              </p>
            </div>
          </div>

          <div className="text-right text-xs space-y-1">
            <p className="font-extrabold text-[#801313]">
              {displayedReports.length} {displayedReports.length > 1 ? 'journées incluses' : 'journée incluse'}
            </p>
            <p className="text-stone-500">
              Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {displayedReports.length === 0 ? (
          <div className="py-12 text-center text-stone-500 space-y-2">
            <p className="text-base font-bold">Aucune journée sélectionnée pour ce rapport.</p>
            <p className="text-xs text-stone-400">
              Veuillez cocher au moins une date ci-dessus pour afficher et imprimer le rapport.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedReports.map(report => {
              const sortedReportDishes = sortDailyMenuDishes(report.dishes_json || []);
              return (
                <section
                  key={report.menu_date}
                  className="border border-[#dec6a7] rounded-xl p-4 bg-[#fffcf7] space-y-3 break-inside-avoid shadow-sm print:shadow-none"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ead8be] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#881313]" />
                      <h4 className="font-extrabold text-sm sm:text-base capitalize text-[#2b1810]">
                        {formatDateFr(report.menu_date)} ({report.menu_date})
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-amber-100 text-[#2b1810] font-extrabold text-xs">
                      {sortedReportDishes.length} plats au menu du jour
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f5ebe0] text-[#2b1810] border-b border-[#dec6a7]">
                          <th className="py-2 px-3 font-extrabold">N°</th>
                          <th className="py-2 px-3 font-extrabold">Plat (Classé : Riz, Soupes...)</th>
                          <th className="py-2 px-3 font-extrabold">Catégorie</th>
                          <th className="py-2 px-3 font-extrabold">Prix FCFA</th>
                          <th className="py-2 px-3 font-extrabold">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ead8be]">
                        {sortedReportDishes.length > 0 ? (
                          sortedReportDishes.map((dish, idx) => (
                            <tr key={dish.id || idx} className="hover:bg-amber-50/50">
                              <td className="py-2 px-3 text-stone-500 font-mono">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-[#2b1810]">{dish.name}</td>
                              <td className="py-2 px-3 text-stone-600">{dish.category}</td>
                              <td className="py-2 px-3 font-extrabold text-[#881313] whitespace-nowrap">
                                {formatCFA(dish.price)}
                              </td>
                              <td className="py-2 px-3">
                                {dish.stock_status === 'low' ? (
                                  <span className="inline-flex items-center gap-1 text-amber-800 font-bold">
                                    <BoltIcon className="w-3 h-3 text-amber-600" />
                                    <span>Presque fini</span>
                                  </span>
                                ) : dish.is_available_today ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                                    <CheckIcon className="w-3 h-3 text-emerald-600" />
                                    <span>Disponible</span>
                                  </span>
                                ) : (
                                  <span className="text-stone-400">Non disponible</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-stone-400">
                              Aucun plat enregistré pour cette date.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {report.notes && (
                    <p className="text-[11px] text-stone-500 italic pt-1 border-t border-[#ead8be]/60">
                      Note : {report.notes}
                    </p>
                  )}
                </section>
              );
            })}

            <div className="bg-[#f5ebe0] rounded-xl border-2 border-[#dec6a7] p-4 flex flex-wrap items-center justify-between gap-4 mt-6 break-inside-avoid">
              <div>
                <span className="font-extrabold text-sm text-[#2b1810] block">
                  Synthèse Totale du Rapport des Menus du Jour
                </span>
                <span className="text-xs text-stone-600">
                  {stats.daysCount} journées sélectionnées • Moyenne de {stats.avgDishesPerDay} plats par jour
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Total plats proposés</span>
                <span className="text-lg font-extrabold text-[#881313] whitespace-nowrap">
                  {stats.totalDishesCount} plats
                </span>
              </div>
            </div>

            <div className="pt-8 border-t border-stone-300 grid grid-cols-2 gap-8 text-xs print:grid">
              <div>
                <p className="font-bold text-stone-700">Le Responsable de Cuisine :</p>
                <div className="h-16 border-b border-dashed border-stone-400 mt-2" />
                <p className="text-[10px] text-stone-500 mt-1">Visa &amp; Date</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-stone-700">La Direction — Restaurant La Gratitude :</p>
                <div className="h-16 border-b border-dashed border-stone-400 mt-2" />
                <p className="text-[10px] text-stone-500 mt-1">Cachet &amp; Signature</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
