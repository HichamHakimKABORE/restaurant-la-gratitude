'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { CameraIcon, CloseIcon, PencilIcon, CheckIcon, StarIcon } from '@/components/Icons';
import { useCart } from '@/components/CartContext';
import { type GalleryImage } from '@/lib/db';

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

function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 760;
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
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        } else {
          reject(new Error('Erreur canvas'));
        }
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

  const { showToast } = useCart();

  const syncGalleryCache = (list: GalleryImage[]) => {
    setImages(list);
    try {
      sessionStorage.setItem('gratitude_gallery_cache_v2', JSON.stringify(list));
    } catch {}
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
      const data = await res.json();
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      }
    } catch {} finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('Traitement de la photo...');
      const b64 = await compressImageToBase64(file);
      setPreviewData(b64);
    } catch {
      showToast('Erreur lors du traitement de la photo');
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
      const data = await res.json();
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
    if (!confirm(`Supprimer définitivement cette photo ("${title}") ?`)) return;
    const optimistic = images.filter(img => img.id !== id);
    syncGalleryCache(optimistic);
    try {
      const res = await fetch(`/api/gallery?id=${id}`, { method: 'DELETE' });
      if (res.status === 401) {
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      }
      showToast('Photo retirée définitivement de la galerie');
    } catch {
      showToast('Erreur lors de la suppression');
    }
  };

  const openEditModal = (img: GalleryImage) => {
    setEditingImage(img);
    setEditTitle(img.title || '');
  };

  const handlePutFirst = async (img: GalleryImage) => {
    const reordered = [
      { ...img, display_order: 1 },
      ...images.filter(i => i.id !== img.id).map((item, idx) => ({ ...item, display_order: idx + 2 }))
    ];
    syncGalleryCache(reordered);
    showToast(`"${img.title || 'Photo'}" placée en 1re position !`);

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
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      }
    } catch (err) {
      console.error('Erreur ordre galerie:', err);
    }
  };

  const handleUpdateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImage) return;

    const updatedTitle = editTitle.trim() || 'Restaurant La Gratitude — Zagtouli';
    const targetId = editingImage.id;

    const optimistic = images.map(item =>
      item.id === targetId ? { ...item, title: updatedTitle } : item
    );
    syncGalleryCache(optimistic);
    setEditingImage(null);
    showToast(`Description enregistrée : "${updatedTitle}" !`);

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
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.images)) {
        syncGalleryCache(data.images);
      }
    } catch (err) {
      console.error('Erreur PATCH gallery:', err);
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
              {images.map(img => (
                <div
                  key={img.id}
                  className="bg-white rounded-2xl overflow-hidden border-2 border-stone-200 hover:border-[#881313] shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div
                    onClick={() => openEditModal(img)}
                    className="h-32 sm:h-36 w-full overflow-hidden bg-stone-100 relative cursor-pointer group"
                    title="Cliquer pour changer la description"
                  >
                    <img
                      src={img.image_url}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img.id, img.title);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow transition z-10"
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
                        className="py-1.5 px-2 bg-gradient-to-r from-[#881313] to-[#6e0f0f] hover:brightness-110 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-sm transition"
                      >
                        <PencilIcon className="w-3 h-3 shrink-0" />
                        <span>Modifier</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePutFirst(img)}
                        className="py-1.5 px-2 bg-amber-100 hover:bg-amber-200 text-[#2b1810] border border-amber-300 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 transition"
                        title="Placer cette photo en 1re position du carrousel"
                      >
                        <StarIcon className="w-3 h-3 text-[#881313] shrink-0" />
                        <span>En 1er</span>
                      </button>
                    </div>
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
                  src={editingImage.image_url}
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
