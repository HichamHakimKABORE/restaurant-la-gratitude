'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { formatCFA, useCart } from '@/components/CartContext';
import { CameraIcon, CheckIcon, BoltIcon, CloseIcon } from '@/components/Icons';
import type { Dish, StockStatus } from '@/lib/db';

function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 640;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          reject(new Error('Canvas context error'));
        }
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminPlatsPage() {
  const { dishes, setDishes, showToast } = useCart();
  const [filter, setFilter] = useState<string>('Tous');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<Dish['category']>('Plats');
  const [newPrice, setNewPrice] = useState('1000');
  const [newMode, setNewMode] = useState<Dish['availability_mode']>('daily');
  const [newOptions, setNewOptions] = useState('Simple, Avec piment');
  const [newDescription, setNewDescription] = useState('');
  const [newPhotoData, setNewPhotoData] = useState<string>('');

  const updateStockStatus = async (dish: Dish, nextStatus: StockStatus) => {
    const isAvail = nextStatus !== 'soldout';
    setDishes(prev =>
      prev.map(d =>
        d.id === dish.id
          ? { ...d, stock_status: nextStatus, is_available_today: isAvail }
          : d
      )
    );
    const res = await fetch('/api/dishes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: dish.id,
        stock_status: nextStatus,
        is_available_today: isAvail
      })
    });
    const data = await res.json();
    if (data.dishes) setDishes(data.dishes);
    showToast(
      `${dish.name} : ${
        nextStatus === 'available'
          ? 'Disponible'
          : nextStatus === 'low'
          ? 'Presque fini'
          : 'En rupture'
      }`
    );
  };

  const handlePhotoUploadForDish = async (dish: Dish, file?: File) => {
    if (!file) return;
    try {
      showToast('Compression et envoi de la photo...');
      const base64 = await compressImageToBase64(file);
      const res = await fetch('/api/dishes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dish.id,
          image_url: base64,
          image_quadrant: 'quad-full'
        })
      });
      const data = await res.json();
      if (data.dishes) setDishes(data.dishes);
      showToast(`Photo de "${dish.name}" mise à jour !`);
    } catch (e) {
      console.error(e);
      showToast('Erreur lors du chargement de la photo');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const res = await fetch(`/api/dishes?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.dishes) setDishes(data.dishes);
    showToast(`${name} supprimé`);
  };

  const openCreateModal = () => {
    setEditingDish(null);
    setNewName('');
    setNewCategory('Plats');
    setNewPrice('1000');
    setNewMode('daily');
    setNewOptions('Simple, Avec piment');
    setNewDescription('');
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
    setNewPhotoData('');
    setAddModalOpen(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const optsArray = newOptions
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

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
          options_json: optsArray,
          description: newDescription,
          ...(newPhotoData
            ? { image_url: newPhotoData, image_quadrant: 'quad-full' }
            : {})
        })
      });
      const data = await res.json();
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
        options_json: optsArray,
        description: newDescription,
        image_url: newPhotoData || '/images/dishes_grid_1.jpg',
        image_quadrant: newPhotoData ? 'quad-full' : 'quad-tl'
      })
    });
    const data = await res.json();
    if (data.dishes) setDishes(data.dishes);
    setNewName('');
    setNewPhotoData('');
    setAddModalOpen(false);
    showToast('Nouveau plat ajouté dans Neon PostgreSQL !');
  };

  const filtered = dishes.filter(d => {
    if (filter === 'Tous') return true;
    return d.category === filter;
  });

  return (
    <AdminShell
      title="Gestion des Plats, Photos & Stocks"
      subtitle="Changez les photos depuis votre téléphone et gérez l’état Disponible / Presque fini / Rupture"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['Tous', 'Plats', 'Pizzas', 'Salades', 'Poulets', 'Soupes', 'Grillades', 'Boissons'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                filter === cat
                  ? 'bg-[#881313] text-white shadow'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-[#881313] hover:bg-[#a81c1c] text-white font-extrabold text-xs shadow"
        >
          + Ajouter un plat (avec photo)
        </button>
      </div>

      {/* Table of Dishes */}
      <div className="overflow-x-auto border border-stone-200 rounded-2xl">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-stone-100 border-b border-stone-200 text-stone-600">
              <th className="p-3">Photo (Cliquer pour changer)</th>
              <th className="p-3">Nom du plat</th>
              <th className="p-3">Catégorie</th>
              <th className="p-3">Prix</th>
              <th className="p-3">État du Stock</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map(dish => (
              <tr key={dish.id} className="hover:bg-stone-50">
                <td className="p-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 group" title="Prendre ou choisir une photo">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400 relative">
                      <div
                        className={`w-full h-full dish-photo ${dish.image_quadrant}`}
                        style={{ backgroundImage: `url('${dish.image_url}')` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#881313] group-hover:underline inline-flex items-center gap-1">
                      <CameraIcon className="w-3.5 h-3.5" />
                      <span>Photo</span>
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e =>
                        handlePhotoUploadForDish(dish, e.target.files?.[0])
                      }
                    />
                  </label>
                </td>
                <td className="p-3">
                  <div className="font-extrabold text-[#2b1810]">{dish.name}</div>
                  {Array.isArray(dish.options_json) && dish.options_json.length > 0 && (
                    <div className="text-xs text-stone-500">
                      Options : {dish.options_json.join(', ')}
                    </div>
                  )}
                </td>
                <td className="p-3 text-stone-600">{dish.category}</td>
                <td className="p-3 font-extrabold text-[#881313]">
                  {formatCFA(dish.price)}
                </td>
                <td className="p-3">
                  <div className="inline-flex rounded-xl bg-stone-100 p-1 gap-1">
                    <button
                      onClick={() => updateStockStatus(dish, 'available')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                        dish.stock_status === 'available' && dish.is_available_today
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <CheckIcon className="w-3 h-3" />
                      <span>Dispo</span>
                    </button>
                    <button
                      onClick={() => updateStockStatus(dish, 'low')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                        dish.stock_status === 'low' && dish.is_available_today
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <BoltIcon className="w-3 h-3" />
                      <span>Presque fini</span>
                    </button>
                    <button
                      onClick={() => updateStockStatus(dish, 'soldout')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                        !dish.is_available_today || dish.stock_status === 'soldout'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <CloseIcon className="w-3 h-3" />
                      <span>Rupture</span>
                    </button>
                  </div>
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => openEditModal(dish)}
                    className="text-amber-700 hover:underline font-bold text-xs px-1.5"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(dish.id, dish.name)}
                    className="text-rose-600 hover:underline font-bold text-xs px-1.5"
                  >
                    Suppr.
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dish Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveDish}
            className="bg-white text-[#2b1810] border-2 border-[#881313] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-extrabold text-base">
                {editingDish
                  ? `Modifier : ${editingDish.name}`
                  : 'Ajouter un plat ou une boisson'}
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-stone-500 font-bold inline-flex items-center justify-center"
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
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Catégorie</label>
                  <select
                    value={newCategory}
                    onChange={e =>
                      setNewCategory(e.target.value as Dish['category'])
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300"
                  >
                    <option value="Plats">Plats</option>
                    <option value="Pizzas">Pizzas</option>
                    <option value="Salades">Salades</option>
                    <option value="Poulets">Poulets</option>
                    <option value="Soupes">Soupes</option>
                    <option value="Grillades">Grillades</option>
                    <option value="Boissons">Boissons</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300"
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const b64 = await compressImageToBase64(file);
                      setNewPhotoData(b64);
                    }
                  }}
                  className="w-full text-xs"
                />
                {newPhotoData && (
                  <img
                    src={newPhotoData}
                    alt="Aperçu"
                    className="mt-2 w-20 h-20 rounded-xl object-cover border border-amber-400"
                  />
                )}
              </div>

              <div>
                <label className="font-bold block mb-1">Type de disponibilité</label>
                <select
                  value={newMode}
                  onChange={e =>
                    setNewMode(e.target.value as Dish['availability_mode'])
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                >
                  <option value="daily">Menu du jour (À cocher chaque matin)</option>
                  <option value="always">Toujours disponible</option>
                  <option value="order">Sur commande</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#881313] text-white font-bold text-xs shadow"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}
