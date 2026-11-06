'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { CameraIcon, CloseIcon } from '@/components/Icons';
import { useCart } from '@/components/CartContext';
import { INITIAL_GALLERY_IMAGES, type GalleryImage } from '@/lib/db';

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
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [previewData, setPreviewData] = useState<string>('');
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

  return (
    <AdminShell
      title="Galerie Photos du Restaurant"
      subtitle="Ajoutez des photos de votre restaurant (terrasse, salle, grillades, clients, équipe) qui défileront en bas de la page client"
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
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-[#2b1810]">
              Photos actuellement dans le défilement ({images.length})
            </h3>
            <span className="text-xs text-stone-500">
              Défilement continu automatique sur le site client
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
                  className="group relative bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="h-32 sm:h-36 w-full overflow-hidden bg-stone-100 relative">
                    <img
                      src={img.image_url}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <button
                      onClick={() => handleDelete(img.id, img.title)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow transition"
                      title="Supprimer cette photo"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2.5">
                    <p className="font-bold text-xs text-[#2b1810] truncate">
                      {img.title || 'Photo du Restaurant'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
