'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { type GalleryImage } from '@/lib/db';
import { safeCssImageUrl } from '@/lib/validation';
import { CameraIcon, CloseIcon } from './Icons';

const GALLERY_MEMORY_TTL_MS = 60_000;
let moduleGalleryCache: { images: GalleryImage[]; ts: number } | null = null;

export default function RestaurantGallerySlider() {
  const [images, setImages] = useState<GalleryImage[]>(
    () => moduleGalleryCache?.images || []
  );
  const [loaded, setLoaded] = useState<boolean>(
    () => Boolean(moduleGalleryCache)
  );
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    if (
      moduleGalleryCache &&
      Date.now() - moduleGalleryCache.ts < GALLERY_MEMORY_TTL_MS
    ) {
      setImages(moduleGalleryCache.images);
      setLoaded(true);
      return;
    }

    try {
      const cached = sessionStorage.getItem('gratitude_gallery_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          moduleGalleryCache = { images: parsed, ts: Date.now() };
          setImages(parsed);
          setLoaded(true);
        }
      }
    } catch {}

    fetch('/api/gallery', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.images)) {
          moduleGalleryCache = { images: d.images, ts: Date.now() };
          setImages(d.images);
          try {
            sessionStorage.setItem('gratitude_gallery_cache_v2', JSON.stringify(d.images));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!selectedImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedImage]);

  if (!loaded || images.length === 0) return null;

  // On construit une piste de base d'au moins 6 éléments puis on la duplique exactement en 2 moitiés identiques
  // pour que la translation CSS de -50% boucle au pixel près sans aucun saut visuel.
  const baseTrack: GalleryImage[] = [];
  while (baseTrack.length < Math.max(6, images.length)) {
    baseTrack.push(...images);
  }
  const displayList = [...baseTrack, ...baseTrack];

  return (
    <section className="relative z-10 max-w-7xl w-full mx-auto px-2 sm:px-6 my-2.5 sm:my-6 space-y-1.5 sm:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dec6a7] pb-1.5 sm:pb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#881313] text-white flex items-center justify-center shadow-sm">
            <CameraIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
          <div>
            <h3 className="font-extrabold text-xs sm:text-base text-[#2b1810] leading-none">
              Ambiance &amp; Cadre de Notre Restaurant
            </h3>
            <span className="text-[10px] sm:text-[11px] text-[#6b4c3b]">
              Zagtouli, Route de Bobo — Ouagadougou
            </span>
          </div>
        </div>
      </div>

      {/* Défilement continu horizontal sans bouton Défilement actif ni texte Photo figée */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border-2 border-[#dec6a7] bg-[#fffcf7] p-1.5 sm:p-2.5 shadow-sm select-none">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-0.5 sm:py-1 animate-marquee">
          {displayList.map((img, idx) => (
            <div
              key={`${img.id}-${idx}`}
              onClick={() => setSelectedImage(img)}
              className="cursor-pointer w-36 h-24 sm:w-60 sm:h-40 rounded-lg sm:rounded-xl overflow-hidden shrink-0 border-2 border-[#eab308]/60 sm:hover:border-[#881313] shadow-sm relative group/card bg-stone-100 transition-all duration-300"
            >
              <img
                src={safeCssImageUrl(img.image_url)}
                alt={img.title || 'Restaurant La Gratitude'}
                className="w-full h-full object-cover group-hover/card:scale-105 transition duration-300"
                loading="lazy"
              />

              {img.title && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-white">
                  <p className="text-[11px] font-extrabold truncate drop-shadow">
                    {img.title}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Visionneuse plein écran propre (sans aucun texte "Photo figée") */}
      {selectedImage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-2xl w-full bg-[#fffcf7] rounded-2xl overflow-hidden border-2 border-[#eab308] shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center shadow"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
              <img
                src={selectedImage.image_url}
                alt={selectedImage.title || 'Restaurant La Gratitude'}
                className="w-full max-h-[75vh] object-contain bg-black"
              />
              {selectedImage.title && (
                <div className="p-3.5 text-center bg-[#fffcf7] border-t border-[#dec6a7]">
                  <p className="font-extrabold text-sm text-[#2b1810]">
                    {selectedImage.title}
                  </p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
