'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { CameraIcon, CloseIcon, PencilIcon, CheckIcon } from '@/components/Icons';
import { useCart } from '@/components/CartContext';
import { INITIAL_GALLERY_IMAGES, type GalleryImage } from '@/lib/db';

const SUGGESTIONS = [
  'Restaurant La Gratitude — Zagtouli',
  'Notre terrasse ombragée',
  'Nos délicieuses grillades & brochettes',
  'Ambiance conviviale & chaleureuse',
  'Salle climatisée moderne',
  'Aire de jeux pour enfants',
  'Équipe du Restaurant La Gratitude',
  'Monument des Martyrs & Fierté nationale'
];

function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
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
  const [images, setImages] = useState<GalleryImage[]>(INITIAL_GALLERY_IMAGES);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [previewData, setPreviewData] = useState<string>('');
  
  // State for editing image description
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { showToast } = useCart();

  const loadGallery = async () => {
    try {
      const res = await fetch('/api/gallery', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.images)) {
        setImages(data.images);
      }
    } catch {}
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
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim() || 'Restaurant La Gratitude — Zagtouli',
          image_url: previewData,
          display_order: 10
        })
      });
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
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
    if (!confirm(`Supprimer cette photo ("${title}") du carrousel ?`)) return;
    try {
      const res = await fetch(`/api/gallery?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
      }
      showToast('Photo retirée du carrousel');
    } catch {
      showToast('Erreur lors de la suppression');
    }
  };

  // Open modal to change description
  const openEditModal = (img: GalleryImage) => {
    setEditingImage(img);
    setEditTitle(img.title || '');
  };

  // Save updated description
  const handleUpdateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImage) return;

    setIsUpdating(true);
    try {
      const res = await fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingImage.id,
          title: editTitle.trim() || 'Restaurant La Gratitude — Zagtouli'
        })
      });
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
      }
      showToast('Description mise à jour avec succès !');
      setEditingImage(null);
    } catch {
      showToast('Erreur lors de la mise à jour de la description.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AdminShell
      title="Galerie Photos du Restaurant"
      subtitle="Ajoutez des photos et cliquez sur n’importe quelle photo pour modifier sa description en direct"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulaire d'ajout rapide (depuis téléphone ou PC) */}
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
              {uploading ? 'Enregistrement en cours...' : '+ Publier dans le carrousel défilant'}
            </button>
          </form>
        </div>

        {/* Liste des photos actuellement publiées */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-base text-[#2b1810]">
                Photos du défilement ({images.length})
              </h3>
              <p className="text-xs text-[#881313] font-bold">
                Astuce : Cliquez sur une photo pour modifier sa description !
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-[#2b1810] font-extrabold border border-amber-300">
              Défilement actif
            </span>
          </div>

          {images.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
              Aucune photo dans la galerie. Ajoutez votre première photo à gauche !
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {images.map(img => (
                <div
                  key={img.id}
                  onClick={() => openEditModal(img)}
                  className="group relative bg-white rounded-2xl overflow-hidden border-2 border-stone-200 hover:border-[#881313] shadow-sm hover:shadow-lg transition flex flex-col justify-between cursor-pointer select-none"
                  title="Cliquer pour changer la description"
                >
                  <div className="h-32 sm:h-36 w-full overflow-hidden bg-stone-100 relative">
                    <img
                      src={img.image_url}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Badge / Overlay au survol */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 text-white p-2 text-center pointer-events-none">
                      <span className="w-8 h-8 rounded-full bg-white text-[#881313] flex items-center justify-center shadow">
                        <PencilIcon className="w-4 h-4" />
                      </span>
                      <span className="text-[11px] font-extrabold text-amber-200">
                        Changer la description
                      </span>
                    </div>

                    {/* Bouton supprimer */}
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

                  {/* Description au bas de la carte avec crayon */}
                  <div className="p-2.5 bg-gradient-to-b from-white to-[#fffcf7] flex items-center justify-between gap-1.5 border-t border-stone-100">
                    <p className="font-extrabold text-xs text-[#2b1810] truncate flex-1">
                      {img.title || 'Photo du Restaurant'}
                    </p>
                    <span className="text-[#881313] shrink-0 opacity-70 group-hover:opacity-100 transition">
                      <PencilIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL POUR MODIFIER LA DESCRIPTION D'UNE PHOTO (AU CLIC SUR L'IMAGE) */}
      {/* ========================================================================= */}
      {editingImage && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in"
          onClick={() => setEditingImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-[#eab308] space-y-4 p-5 sm:p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Entête Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-extrabold text-base text-[#2b1810] flex items-center gap-2">
                <PencilIcon className="w-5 h-5 text-[#881313]" />
                <span>Modifier la description de la photo</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Aperçu de la photo */}
            <div className="h-44 sm:h-52 w-full rounded-xl overflow-hidden border-2 border-[#d99b26] shadow-inner bg-stone-100">
              <img
                src={editingImage.image_url}
                alt={editingImage.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Formulaire de modification */}
            <form onSubmit={handleUpdateTitle} className="space-y-4">
              <div>
                <label className="font-extrabold text-xs text-stone-700 block mb-1.5">
                  Nouvelle description ou légende de la photo :
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Ex: Restaurant La Gratitude — Zagtouli"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#dec6a7] focus:border-[#881313] bg-[#fffcf7] font-bold text-sm text-[#2b1810] outline-none"
                  autoFocus
                />
              </div>

              {/* Suggestions rapides en 1 clic */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-stone-500 block">
                  Suggestions rapides en 1 clic :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setEditTitle(sug)}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#2b1810] font-bold text-[11px] border border-amber-200 transition"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Boutons d'action */}
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white font-extrabold text-xs shadow flex items-center gap-1.5 transition"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>{isUpdating ? 'Enregistrement...' : 'Enregistrer la description'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
