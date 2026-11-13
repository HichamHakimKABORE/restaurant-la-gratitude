'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { formatCFA, useCart } from '@/components/CartContext';
import { CameraIcon, CloseIcon, PencilIcon } from '@/components/Icons';
import { matchesDishSearch, type Dish } from '@/lib/db';
import { compressImageFileToBase64 } from '@/lib/client-image';
import { safeCssImageUrl } from '@/lib/validation';

export default function AdminPlatsPage() {
  const router = useRouter();
  const { dishes, setDishes, showToast } = useCart();
  const [filter, setFilter] = useState<string>('Tous');
  const [search, setSearch] = useState<string>('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<Dish['category']>('Plats');
  const [newPrice, setNewPrice] = useState('1000');
  const [newMode, setNewMode] = useState<Dish['availability_mode']>('daily');
  const [newOptions, setNewOptions] = useState('Simple, Avec piment');
  const [newDescription, setNewDescription] = useState('');
  const [newDisplayOrder, setNewDisplayOrder] = useState('10');
  const [newPhotoData, setNewPhotoData] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [savingDish, setSavingDish] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingDishId, setUploadingDishId] = useState<number | null>(null);
  const [togglingModeId, setTogglingModeId] = useState<number | null>(null);

  const handleToggleAvailabilityMode = async (dish: Dish) => {
    if (togglingModeId !== null) return;
    const nextMode: Dish['availability_mode'] =
      dish.availability_mode === 'daily' ? 'always' : 'daily';
    const nextAvail = nextMode === 'always';
    const nextStock = nextMode === 'always' ? 'available' : 'soldout';
    const prevDishes = dishes;

    setTogglingModeId(dish.id);
    setDishes(prev =>
      prev.map(d =>
        d.id === dish.id
          ? { ...d, availability_mode: nextMode, is_available_today: nextAvail, stock_status: nextStock }
          : d
      )
    );

    try {
      const res = await fetch('/api/dishes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dish.id,
          availability_mode: nextMode,
          is_available_today: nextAvail,
          stock_status: nextStock
        })
      });
      if (res.status === 401) {
        setDishes(prevDishes);
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDishes(prevDishes);
        showToast(data.error || 'Changement de liste impossible.');
        return;
      }
      if (data.dishes) setDishes(data.dishes);
      showToast(
        nextMode === 'daily'
          ? `"${dish.name}" ajouté au Menu du Jour.`
          : `"${dish.name}" déplacé dans La Carte uniquement.`
      );
    } catch {
      setDishes(prevDishes);
      showToast('Erreur réseau lors du changement de liste.');
    } finally {
      setTogglingModeId(null);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!addModalOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [addModalOpen]);

  const handlePhotoUploadForDish = async (dish: Dish, file?: File) => {
    if (!file || uploadingDishId !== null) return;
    setUploadingDishId(dish.id);
    try {
      showToast('Compression et envoi de la photo...');
      const base64 = await compressImageFileToBase64(file, 560);
      const res = await fetch('/api/dishes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dish.id,
          image_url: base64,
          image_quadrant: 'quad-full'
        })
      });
      if (res.status === 401) {
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Impossible de mettre à jour la photo.');
        return;
      }
      if (data.dishes) setDishes(data.dishes);
      showToast(`Photo de "${dish.name}" mise à jour !`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors du chargement de la photo';
      showToast(msg);
    } finally {
      setUploadingDishId(null);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (deletingId !== null) return;
    if (!confirm(`Supprimer le plat "${name}" ?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/dishes?id=${id}`, { method: 'DELETE' });
      if (res.status === 401) {
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Suppression impossible.');
        return;
      }
      if (data.dishes) setDishes(data.dishes);
      showToast(`${name} supprimé`);
    } catch {
      showToast('Erreur réseau lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingDish(null);
    setNewName('');
    setNewCategory('Plats');
    setNewPrice('1000');
    setNewMode('daily');
    setNewOptions('Simple, Avec piment');
    setNewDescription('');
    setNewDisplayOrder('10');
    setNewPhotoData('');
    setAddModalOpen(true);
  };

  const openEditModal = (dish: Dish) => {
    setEditingDish(dish);
    setNewName(dish.name);
    setNewCategory(dish.category);
    setNewPrice(String(dish.price));
    setNewMode(dish.availability_mode);
    setNewOptions(
      Array.isArray(dish.options_json) ? dish.options_json.join(', ') : ''
    );
    setNewDescription(dish.description || '');
    setNewDisplayOrder(String(dish.display_order ?? 10));
    setNewPhotoData('');
    setAddModalOpen(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingDish || !newName.trim()) return;
    const optsArray = newOptions
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    setSavingDish(true);
    try {
      if (editingDish) {
        const res = await fetch('/api/dishes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingDish.id,
            name: newName,
            category: newCategory,
            price: Number(newPrice),
            availability_mode: newMode,
            display_order: Number(newDisplayOrder || 10),
            options_json: optsArray,
            description: newDescription,
            ...(newPhotoData
              ? { image_url: newPhotoData, image_quadrant: 'quad-full' }
              : {})
          })
        });
        if (res.status === 401) {
          showToast('Session expirée. Veuillez vous reconnecter.');
          router.push('/admin/login');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data.error || 'Modification impossible.');
          return;
        }
        if (data.dishes) setDishes(data.dishes);
        setAddModalOpen(false);
        setEditingDish(null);
        showToast(`Plat "${newName}" modifié avec succès !`);
        return;
      }

      const res = await fetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          category: newCategory,
          price: Number(newPrice),
          availability_mode: newMode,
          display_order: Number(newDisplayOrder || 10),
          options_json: optsArray,
          description: newDescription,
          image_url: newPhotoData || '/images/dishes_grid_1.jpg',
          image_quadrant: newPhotoData ? 'quad-full' : 'quad-tl'
        })
      });
      if (res.status === 401) {
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Ajout impossible.');
        return;
      }
      if (data.dishes) setDishes(data.dishes);
      setNewName('');
      setNewPhotoData('');
      setAddModalOpen(false);
      showToast('Nouveau plat ajouté !');
    } catch {
      showToast('Erreur réseau lors de l’enregistrement.');
    } finally {
      setSavingDish(false);
    }
  };

  const filtered = dishes.filter(d => {
    if (search.trim() && !matchesDishSearch(d, search)) return false;
    if (filter === 'Tous') return true;
    if (filter === 'Menu du Jour') return d.availability_mode === 'daily';
    if (filter === 'Sur Commande') return d.availability_mode !== 'daily';
    return d.category === filter;
  });

  const modalContent = addModalOpen ? (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4"
      onClick={() => setAddModalOpen(false)}
    >
      <form
        onSubmit={handleSaveDish}
        onClick={e => e.stopPropagation()}
        className="bg-white text-[#2b1810] border-2 border-[#881313] rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
          <h3 className="font-extrabold text-sm sm:text-base pr-2">
            {editingDish
              ? `Modifier : ${editingDish.name}`
              : 'Ajouter un plat ou une boisson'}
          </h3>
          <button
            type="button"
            onClick={() => setAddModalOpen(false)}
            className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold inline-flex items-center justify-center shrink-0"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Nom du plat</label>
            <input
              type="text"
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ex: Riz gras au poulet"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 font-semibold"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold block mb-1">Catégorie</label>
              <select
                value={newCategory}
                onChange={e =>
                  setNewCategory(e.target.value as Dish['category'])
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-semibold bg-white"
              >
                <option value="Plats">Plats</option>
                <option value="Soupes">Soupes</option>
                <option value="Pizzas">Pizzas</option>
                <option value="Poulets">Poulets</option>
                <option value="Grillades">Grillades</option>
                <option value="Salades">Salades</option>
                <option value="Boissons">Boissons</option>
              </select>
            </div>

            <div>
              <label className="font-bold block mb-1">Prix (FCFA)</label>
              <input
                type="number"
                required
                min={100}
                step={50}
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1">
              Options au choix (séparées par une virgule)
            </label>
            <input
              type="text"
              value={newOptions}
              onChange={e => setNewOptions(e.target.value)}
              placeholder="Ex: Flambé, Rabilé, Sauté, Pané"
              className="w-full px-3 py-2 rounded-xl border border-stone-300"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">
              Description du plat
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="Ex: Servi chaud avec accompagnement..."
              className="w-full px-3 py-2 rounded-xl border border-stone-300"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">
              Photo du plat (depuis téléphone ou ordinateur)
            </label>
            <div className="flex items-center gap-3">
              {/* Aperçu de la nouvelle photo ou de la photo actuelle du plat */}
              {newPhotoData ? (
                <div className="relative shrink-0">
                  <img
                    src={newPhotoData}
                    alt="Nouvel aperçu"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-[#16a34a]"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPhotoData('')}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow"
                    title="Retirer la nouvelle photo"
                  >
                    <CloseIcon className="w-3 h-3" />
                  </button>
                </div>
              ) : editingDish ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-amber-400 shrink-0">
                  <div
                    className={`w-full h-full dish-photo ${editingDish.image_quadrant}`}
                    style={{ backgroundImage: `url('${safeCssImageUrl(editingDish.image_url)}')` }}
                  />
                </div>
              ) : null}

              <input
                type="file"
                accept="image/*"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) {
                    try {
                      showToast('Compression de la photo...');
                      const b64 = await compressImageFileToBase64(file, 560);
                      setNewPhotoData(b64);
                      showToast('Photo prête à être enregistrée !');
                    } catch (err: unknown) {
                      showToast(err instanceof Error ? err.message : 'Format de photo non supporté.');
                    }
                  }
                }}
                className="w-full text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-8">
              <label className="font-bold block mb-1">Type de liste (Menu du Jour ou Sur Commande)</label>
              <select
                value={newMode}
                onChange={e =>
                  setNewMode(e.target.value as Dish['availability_mode'])
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold bg-white"
              >
                <option value="daily">Liste du Menu du Jour (À cocher chaque matin)</option>
                <option value="order">Uniquement sur commande (Hors Menu du Jour)</option>
                <option value="always">Sur commande / Carte permanente (Hors Menu du Jour)</option>
              </select>
            </div>
            <div className="sm:col-span-4">
              <label className="font-bold block mb-1">Ordre (1 = en haut)</label>
              <input
                type="number"
                value={newDisplayOrder}
                onChange={e => setNewDisplayOrder(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={() => setAddModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={savingDish}
            className="px-4 py-2 rounded-xl bg-[#881313] hover:bg-[#680e0e] disabled:opacity-60 text-white font-extrabold text-xs shadow"
          >
            {savingDish ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return (
    <AdminShell
      title="Plats & Plats sur Commande"
      subtitle="Affichage compact sans défilement gauche/droite : tout est lisible d’un seul coup d’œil"
    >
      {/* Barre de filtres et bouton d'ajout compacts */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 sm:flex-none sm:w-64 min-w-[160px]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un plat..."
              className="w-full pl-3 pr-7 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="touch-manipulation absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center"
                title="Effacer la recherche"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={openCreateModal}
            className="touch-manipulation px-3.5 py-2 rounded-xl bg-[#881313] hover:bg-[#a81c1c] active:scale-95 text-white font-extrabold text-xs shadow whitespace-nowrap shrink-0 transition"
          >
            + Ajouter un plat
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar pb-1">
          {['Tous', 'Menu du Jour', 'Sur Commande', 'Plats', 'Soupes', 'Pizzas', 'Poulets', 'Grillades', 'Salades', 'Boissons'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                filter === cat
                  ? 'bg-[#881313] text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grille compacte (2 colonnes sur écran moyen/large, 1 colonne ultra-compacte sur téléphone) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map(dish => {
          const isDaily = dish.availability_mode === 'daily';
          return (
            <div
              key={dish.id}
              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#fffcf7] border border-stone-200 hover:border-[#881313] shadow-sm transition"
            >
              {/* Gauche : Miniature Photo cliquable + Infos Plat */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <label
                  className="cursor-pointer relative w-11 h-11 rounded-lg overflow-hidden border border-amber-400 shrink-0 group"
                  title="Cliquer pour changer la photo"
                >
                  <div
                    className={`w-full h-full dish-photo ${dish.image_quadrant}`}
                    style={{ backgroundImage: `url('${safeCssImageUrl(dish.image_url)}')` }}
                  />
                  <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                    <CameraIcon className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      handlePhotoUploadForDish(dish, file);
                    }}
                  />
                </label>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-xs sm:text-sm text-[#2b1810] truncate">
                      {dish.name}
                    </span>
                    <span className="font-extrabold text-xs text-[#881313] whitespace-nowrap">
                      {formatCFA(dish.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <button
                      type="button"
                      disabled={togglingModeId === dish.id}
                      onClick={() => handleToggleAvailabilityMode(dish)}
                      className={`touch-manipulation px-1.5 py-0.5 rounded text-[10px] font-extrabold whitespace-nowrap active:scale-95 disabled:opacity-50 transition ${
                        isDaily
                          ? 'bg-amber-100 hover:bg-amber-200 text-[#881313] border border-amber-300'
                          : 'bg-stone-800 hover:bg-stone-700 text-white'
                      }`}
                      title={isDaily ? 'Cliquer pour passer en Carte uniquement' : 'Cliquer pour ajouter au Menu du Jour'}
                    >
                      {isDaily ? 'Menu du Jour ⇄' : 'Sur commande ⇄'}
                    </button>
                    <span className="text-[11px] text-stone-500 font-semibold">
                      • {dish.category}
                    </span>
                    {Array.isArray(dish.options_json) && dish.options_json.length > 0 && (
                      <span className="text-[10px] text-stone-400 truncate max-w-[140px] sm:max-w-[160px]">
                        ({dish.options_json.join(', ')})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Droite : Actions directes */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(dish)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-[#2b1810] font-extrabold text-[11px] inline-flex items-center gap-1 transition"
                  title="Modifier ce plat"
                >
                  <PencilIcon className="w-3 h-3 text-[#881313]" />
                  <span>Modifier</span>
                </button>
                <button
                  type="button"
                  disabled={deletingId === dish.id}
                  onClick={() => handleDelete(dish.id, dish.name)}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 font-bold text-[11px] transition"
                  title="Supprimer ce plat"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rendu de la fenêtre modale dans document.body pour qu'elle s'affiche toujours au centre exact de l'écran */}
      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </AdminShell>
  );
}
