'use client';

import React, { useEffect, useState, useRef } from 'react';
import { INITIAL_GALLERY_IMAGES, type GalleryImage } from '@/lib/db';
import { CameraIcon } from './Icons';

export default function RestaurantGallerySlider() {
  const [images, setImages] = useState<GalleryImage[]>(INITIAL_GALLERY_IMAGES);
  const [isPaused, setIsPaused] = useState(false);
  const [activeImage, setActiveImage] = useState<GalleryImage | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/gallery', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.images) && d.images.length > 0) {
          setImages(d.images);
        }
      })
      .catch(() => {});
  }, []);

  // Nettoyage du timer lors du démontage
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  // Mettre en pause le défilement pendant quelques secondes au clic
  const handleImageClick = (img: GalleryImage) => {
    setIsPaused(true);
    setActiveImage(img);

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }

    // Repart automatiquement après 4,5 secondes
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
      setActiveImage(null);
    }, 4500);
  };

  if (images.length === 0) return null;

  // Duplicate items for continuous seamless marquee loop
  const displayList = [...images, ...images, ...images];

  return (
    <section className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 my-6 space-y-3">
      <div className="flex items-center justify-between border-b border-[#dec6a7] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#881313] text-white flex items-center justify-center shadow-sm">
            <CameraIcon className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#2b1810] leading-none">
              Ambiance &amp; Cadre de Notre Restaurant
            </h3>
            <span className="text-[11px] text-[#6b4c3b]">
              Zagtouli, Route de Bobo — Venez partager un moment convivial
            </span>
          </div>
        </div>

        {isPaused ? (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-[#2b1810] font-extrabold text-[11px] shrink-0 animate-pulse shadow-sm flex items-center gap-1">
            <span>En pause</span>
            <span className="hidden sm:inline text-[10px] font-bold">• Reprise dans quelques secondes...</span>
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full bg-[#eab308]/30 border border-[#b47b22]/40 text-[#2b1810] font-extrabold text-[11px] shrink-0">
            En direct de La Gratitude
          </span>
        )}
      </div>

      {/* Défilement continu horizontal / Carousel avec pause au clic */}
      <div className="overflow-hidden rounded-2xl border-2 border-[#dec6a7] bg-[#fffcf7] p-2.5 shadow-sm group">
        <div
          className="flex items-center gap-3 animate-marquee hover:[animation-play-state:paused] overflow-x-auto scrollbar-none py-1"
          style={{ animationPlayState: isPaused ? 'paused' : undefined }}
        >
          {displayList.map((img, idx) => (
            <div
              key={`${img.id}-${idx}`}
              onClick={() => handleImageClick(img)}
              className={`w-48 sm:w-60 h-32 sm:h-40 rounded-xl overflow-hidden shrink-0 border-2 shadow-sm relative group/card bg-stone-100 cursor-pointer transition-all duration-300 ${
                activeImage?.id === img.id
                  ? 'border-[#881313] scale-[1.03] shadow-lg ring-2 ring-amber-400'
                  : 'border-[#eab308]/60 hover:scale-[1.02]'
              }`}
              title="Cliquer pour figer le défilement quelques secondes"
            >
              <img
                src={img.image_url}
                alt={img.title || 'Restaurant La Gratitude'}
                className="w-full h-full object-cover group-hover/card:scale-105 transition duration-300"
                loading="lazy"
              />
              {img.title && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2 text-white">
                  <p className="text-[11px] font-bold truncate drop-shadow">
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
