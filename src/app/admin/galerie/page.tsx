'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { CameraIcon, CloseIcon, PencilIcon, CheckIcon, StarIcon } from '@/components/Icons';
import { useCart } from '@/components/CartContext';
import { type GalleryImage } from '@/lib/db';
import { compressImageFileToBase64 } from '@/lib/client-image';
import { safeCssImageUrl } from '@/lib/validation';
import { invalidateClientGalleryCache } from '@/components/RestaurantGallerySlider';

const SUGGESTIONS = [
  'Restaurant La Gratitude — Zagtouli',
  'Notre terrasse ombragée & fleurie',
  'Nos délicieuses grillades & brochettes au feu de bois',
  'Ambiance conviviale & accueil chaleureux',
  'Salle climatisée moderne et confortable',
  'Espace et aire de jeux pour enfants',
  'L’équipe chaleureuse du Restaurant La Gratitude',
  'Monument des Martyrs & Fierté burkinabè'
];

export default function AdminGaleriePage() {
  const router = useRouter();
  // Initialisé à vide [] pour ne JAMAIS afficher les anciennes photos supprimées avant le chargement de la base
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [previewData, setPreviewData] = useState<string>('');

  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [busyImageId, setBusyImageId] = useState<number | null>(null);

  const { showToast } = useCart();

  const syncGalleryCache = (list: GalleryImage[]) => {
    invalidateClientGalleryCache();
    setImages(list);
    try {
      const serialized = JSON.stringify(list);
      if (serialized.length < 2_500_000) {
        sessionStorage.setItem('gratitude_gallery_cache_v2', serialized);
      } else {
        sessionStorage.removeItem('gratitude_gallery_cache_v2');
      }
    } catch {
      try {
        sessionStorage.removeItem('gratitude_gallery_cache_v2');
      } catch {}
    }
  };

  const loadGallery = async () => {
    try {
      const cached = sessionStorage.getItem('gratitude_gallery_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setImages(parsed);
          setLoadingGallery(false);
        }
      }
    } catch {}

    try {
      const res = await fetch('/api/gallery', { cache: 'no-store' });
      if (!res.ok) {
        showToast('Impossible de charger la galerie.');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      }
    } catch {
      showToast('Erreur réseau lors du chargement de la galerie.');
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  useEffect(() => {
    if (!editingImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingImage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      showToast('Traitement de la photo...');
      const b64 = await compressImageFileToBase64(file, 760);
      setPreviewData(b64);
      showToast('Photo prête à être publiée !');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors du traitement de la photo');
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewData) {
      showToast('Veuillez sélectionner une photo.');
      return;
    }

    setUploading(true);
    try {
      const titleToSave = newTitle.trim() || 'Restaurant La Gratitude — Zagtouli';
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleToSave,
          image_url: previewData,
          display_order: 10
        })
      });
      if (res.status === 401) {
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Impossible d’ajouter cette photo.');
        return;
      }
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      } else {
        const next = [
          {
            id: Date.now(),
            title: titleToSave,
            image_url: previewData,
            display_order: 10
          },
          ...images
        ];
        syncGalleryCache(next);
      }
      setPreviewData('');
      setNewTitle('');
      showToast('Photo ajoutée avec succès au carrousel du restaurant !');
    } catch {
      showToast('Erreur lors de l’envoi de la photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (busyImageId !== null) return;
    if (!confirm(`Supprimer définitivement cette photo ("${title}") ?`)) return;
    setBusyImageId(id);
    const prevImages = images;
    const optimistic = images.filter(img => img.id !== id);
    syncGalleryCache(optimistic);
    try {
      const res = await fetch(`/api/gallery?id=${id}`, { method: 'DELETE' });
      if (res.status === 401) {
        syncGalleryCache(prevImages);
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        syncGalleryCache(prevImages);
        showToast(data.error || 'Suppression impossible.');
        return;
      }
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      }
      showToast('Photo retirée définitivement de la galerie');
    } catch {
      syncGalleryCache(prevImages);
      showToast('Erreur lors de la suppression');
    } finally {
      setBusyImageId(null);
    }
  };

  const openEditModal = (img: GalleryImage) => {
    setEditingImage(img);
    setEditTitle(img.title || '');
  };

  const handlePutFirst = async (img: GalleryImage) => {
    if (busyImageId !== null) return;
    setBusyImageId(img.id);
    const prevImages = images;
    const reordered = [
      { ...img, display_order: 1 },
      ...images.filter(i => i.id !== img.id).map((item, idx) => ({ ...item, display_order: idx + 2 }))
    ];
    syncGalleryCache(reordered);

    try {
      const res = await fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: img.id,
          title: img.title,
          display_order: 1
        })
      });
      if (res.status === 401) {
        syncGalleryCache(prevImages);
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        syncGalleryCache(prevImages);
        showToast(data.error || 'Impossible de modifier l’ordre.');
        return;
      }
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      }
      showToast(`"${img.title || 'Photo'}" placée en 1re position !`);
    } catch (err) {
      syncGalleryCache(prevImages);
      console.error('Erreur ordre galerie:', err);
      showToast('Erreur lors de la mise à jour de l’ordre.');
    } finally {
      setBusyImageId(null);
    }
  };

  const handleMoveImage = async (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (busyImageId !== null || targetIdx < 0 || targetIdx >= images.length) return;
    const current = images[idx];
    const target = images[targetIdx];
    setBusyImageId(current.id);
    const prevImages = images;
    const swapped = [...images];
    swapped[idx] = target;
    swapped[targetIdx] = current;
    syncGalleryCache(swapped.map((item, i) => ({ ...item, display_order: i + 1 })));

    try {
      const res = await fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: current.id,
          swap_with_id: target.id
        })
      });
      if (res.status === 401) {
        syncGalleryCache(prevImages);
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        syncGalleryCache(prevImages);
        showToast(data.error || 'Impossible de déplacer cette photo.');
        return;
      }
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      }
      showToast('Ordre des photos mis à jour !');
    } catch {
      syncGalleryCache(prevImages);
      showToast('Erreur réseau lors du déplacement.');
    } finally {
      setBusyImageId(null);
    }
  };

  const handleUpdateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImage) return;

    const updatedTitle = editTitle.trim() || 'Restaurant La Gratitude — Zagtouli';
    const targetId = editingImage.id;
    const prevImages = images;

    const optimistic = images.map(item =>
      item.id === targetId ? { ...item, title: updatedTitle } : item
    );
    syncGalleryCache(optimistic);
    setEditingImage(null);

    setIsUpdating(true);
    try {
      const res = await fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetId,
          title: updatedTitle
        })
      });
      if (res.status === 401) {
        syncGalleryCache(prevImages);
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        syncGalleryCache(prevImages);
        showToast(data.error || 'Modification impossible.');
        return;
      }
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      }
      showToast(`Description enregistrée : "${updatedTitle}" !`);
    } catch (err) {
      syncGalleryCache(prevImages);
      console.error('Erreur PATCH gallery:', err);
      showToast('Erreur lors de la modification.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AdminShell
      title="Galerie Photos du Restaurant"
      subtitle="Ajoutez vos photos et modifiez facilement leur description en un clic"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulaire d'ajout rapide */}
        <div className="lg:col-span-5 bg-[#fdfaf5] p-5 rounded-2xl border-2 border-[#eab308] shadow-md space-y-4">
          <h3 className="font-extrabold text-base text-[#2b1810] flex items-center gap-2">
            <CameraIcon className="w-5 h-5 text-[#881313]" />
            <span>Ajouter une nouvelle photo</span>
          </h3>

          <form onSubmit={handleAddImage} className="space-y-3.5 text-xs sm:text-sm">
            <div>
              <label className="font-bold block mb-1 text-stone-700">
                Titre ou description courte (optionnel) :
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Ex: Notre terrasse ombragée, Nos brochettes..."
                maxLength={180}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white font-medium"
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-stone-700">
                Sélectionnez une photo (Appareil photo ou Galerie) :
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#881313]/40 hover:border-[#881313] rounded-2xl p-4 cursor-pointer bg-white transition text-center group">
                <CameraIcon className="w-8 h-8 text-[#881313] group-hover:scale-110 transition shrink-0" />
                <span className="font-extrabold text-xs text-[#881313] mt-2 block">
                  Cliquer pour prendre ou choisir une photo
                </span>
                <span className="text-[11px] text-stone-500 mt-0.5">
                  Prend en charge tous les formats JPG, PNG...
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {previewData && (
              <div className="relative rounded-xl overflow-hidden border-2 border-[#881313] shadow-md">
                <img
                  src={previewData}
                  alt="Aperçu"
                  className="w-full h-44 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPreviewData('')}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center font-bold"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !previewData}
              className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 ${
                !previewData || uploading
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white'
              }`}
            >
              {uploading ? 'Enregistrement en cours...' : '+ Publier dans la galerie'}
            </button>
          </form>
        </div>

        {/* Liste des photos actuellement publiées */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-base text-[#2b1810]">
                Photos publiées ({images.length})
              </h3>
              <p className="text-xs text-[#881313] font-bold">
                Cliquez sur « Modifier » sous une photo pour changer sa légende
              </p>
            </div>
          </div>

          {loadingGallery ? (
            <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
              Chargement de vos photos...
            </div>
          ) : images.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
              Aucune photo dans la galerie. Ajoutez votre première photo à gauche !
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className={`bg-white rounded-2xl overflow-hidden border-2 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                    idx === 0 ? 'border-[#eab308]' : 'border-stone-200 hover:border-[#881313]'
                  }`}
                >
                  <div
                    onClick={() => openEditModal(img)}
                    className="h-32 sm:h-36 w-full overflow-hidden bg-stone-100 relative cursor-pointer group"
                    title="Cliquer pour changer la description"
                  >
                    <img
                      src={safeCssImageUrl(img.image_url)}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-extrabold shadow z-10 ${
                        idx === 0
                          ? 'bg-[#eab308] text-[#2b1810]'
                          : 'bg-black/75 text-white'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <button
                      type="button"
                      disabled={busyImageId === img.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img.id, img.title);
                      }}
                      className="touch-manipulation absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white flex items-center justify-center shadow transition z-10"
                      title="Supprimer cette photo"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-2.5 bg-gradient-to-b from-white to-[#fffcf7] space-y-2 border-t border-stone-100">
                    <p
                      onClick={() => openEditModal(img)}
                      className="font-extrabold text-xs text-[#2b1810] line-clamp-2 cursor-pointer hover:text-[#881313] transition"
                      title="Cliquer pour modifier"
                    >
                      {img.title || 'Photo du Restaurant'}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(img)}
                        className="touch-manipulation py-1.5 px-2 bg-gradient-to-r from-[#881313] to-[#6e0f0f] hover:brightness-110 active:scale-95 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-sm transition"
                      >
                        <PencilIcon className="w-3 h-3 shrink-0" />
                        <span>Modifier</span>
                      </button>
                      {idx === 0 ? (
                        <span className="py-1.5 px-2 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 select-none">
                          <StarIcon className="w-3 h-3 text-emerald-700 shrink-0" />
                          <span>1re photo</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyImageId === img.id}
                          onClick={() => handlePutFirst(img)}
                          className="touch-manipulation py-1.5 px-2 bg-amber-100 hover:bg-amber-200 active:scale-95 disabled:opacity-50 text-[#2b1810] border border-amber-300 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 transition"
                          title="Placer cette photo en 1re position du carrousel"
                        >
                          <StarIcon className="w-3 h-3 text-[#881313] shrink-0" />
                          <span>Mettre 1er</span>
                        </button>
                      )}
                    </div>

                    {images.length > 1 && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0 || busyImageId !== null}
                          onClick={() => handleMoveImage(idx, -1)}
                          className="touch-manipulation py-1 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 disabled:opacity-40 text-stone-700 font-bold text-[11px] transition"
                          title="Avancer d'une place vers le début"
                        >
                          ← Avancer
                        </button>
                        <button
                          type="button"
                          disabled={idx === images.length - 1 || busyImageId !== null}
                          onClick={() => handleMoveImage(idx, 1)}
                          className="touch-manipulation py-1 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 disabled:opacity-40 text-stone-700 font-bold text-[11px] transition"
                          title="Décaler d'une place vers la fin"
                        >
                          Reculer →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL POUR MODIFIER LA DESCRIPTION D'UNE PHOTO (Rendu directement dans document.body au centre de l'écran) */}
      {editingImage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in"
            onClick={() => setEditingImage(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-4 border-[#eab308] space-y-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-[#2b1810] flex items-center gap-2">
                  <PencilIcon className="w-5 h-5 text-[#881313] shrink-0" />
                  <span>Modifier la description de la photo</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingImage(null)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold shrink-0"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="h-36 sm:h-48 w-full rounded-xl overflow-hidden border-2 border-[#d99b26] shadow-inner bg-stone-100">
                <img
                  src={safeCssImageUrl(editingImage.image_url)}
                  alt={editingImage.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <form onSubmit={handleUpdateTitle} className="space-y-4">
                <div>
                  <label className="font-extrabold text-xs text-stone-700 block mb-1.5">
                    Texte ou description de la photo :
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Ex: Restaurant La Gratitude — Zagtouli"
                    maxLength={180}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#dec6a7] focus:border-[#881313] bg-[#fffcf7] font-bold text-sm text-[#2b1810] outline-none shadow-sm"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-500 block">
                    Suggestions prêtes à l’emploi (cliquez pour choisir) :
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {SUGGESTIONS.map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setEditTitle(sug)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#2b1810] font-bold text-[11px] border border-amber-300 transition text-left"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setEditingImage(null)}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>Enregistrer la description</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </AdminShell>
  );
}
