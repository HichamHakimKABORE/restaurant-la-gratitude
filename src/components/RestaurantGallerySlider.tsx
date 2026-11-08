'use client';

import React, { useEffect, useState } from 'react';
import { type GalleryImage } from '@/lib/db';
import { CameraIcon } from './Icons';

export default function RestaurantGallerySlider() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('gratitude_gallery_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setImages(parsed);
          setLoaded(true);
        }
      }
    } catch {}

    fetch('/api/gallery', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.images)) {
          setImages(d.images);
          try {
            sessionStorage.setItem('gratitude_gallery_cache_v2', JSON.stringify(d.images));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || images.length === 0) return null;

  // Duplicate items for continuous seamless marquee loop
  const displayList = [...images, ...images, ...images];

  return (
    <section className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 my-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dec6a7] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#881313] text-white flex items-center justify-center shadow-sm">
            <CameraIcon className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#2b1810] leading-none">
              Ambiance &amp; Cadre de Notre Restaurant
            </h3>
            <span className="text-[11px] text-[#6b4c3b]">
              Zagtouli, Route de Bobo — Ouagadougou
            </span>
          </div>
        </div>
      </div>

      {/* Défilement continu horizontal sans bouton Défilement actif ni texte Photo figée */}
      <div className="overflow-hidden rounded-2xl border-2 border-[#dec6a7] bg-[#fffcf7] p-2.5 shadow-sm select-none">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1 animate-marquee">
          {displayList.map((img, idx) => (
            <div
              key={`${img.id}-${idx}`}
              className="w-48 sm:w-60 h-32 sm:h-40 rounded-xl overflow-hidden shrink-0 border-2 border-[#eab308]/60 shadow-sm relative group/card bg-stone-100 transition-all duration-300"
            >
              <img
                src={img.image_url}
                alt={img.title || 'Restaurant La Gratitude'}
                className="w-full h-full object-cover group-hover/card:scale-105 transition duration-300 pointer-events-none"
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
    </section>
  );
}
