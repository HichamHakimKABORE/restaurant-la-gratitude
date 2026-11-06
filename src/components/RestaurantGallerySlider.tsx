'use client';

import React, { useEffect, useState, useRef } from 'react';
import { INITIAL_GALLERY_IMAGES, type GalleryImage } from '@/lib/db';
import { CameraIcon } from './Icons';

export default function RestaurantGallerySlider() {
  const [images, setImages] = useState<GalleryImage[]>(INITIAL_GALLERY_IMAGES);
  const [isPaused, setIsPaused] = useState(false);
  const [activeImageId, setActiveImageId] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Nettoyage des timers lors du démontage
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Mettre en pause le défilement pendant 5 secondes puis reprendre automatiquement
  const triggerPause = (imgId?: number) => {
    setIsPaused(true);
    if (imgId) setActiveImageId(imgId);
    setSecondsRemaining(5);

    // Réinitialiser les timers précédents
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Décompte de secondes
    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Reprise automatique après 5 secondes
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
      setActiveImageId(null);
      setSecondsRemaining(0);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, 5000);
  };

  // Basculer manuellement pause / lecture
  const togglePlayPause = () => {
    if (isPaused) {
      setIsPaused(false);
      setActiveImageId(null);
      setSecondsRemaining(0);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    } else {
      triggerPause();
    }
  };

  if (images.length === 0) return null;

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
              Zagtouli, Route de Bobo — Touchez une photo pour figer
            </span>
          </div>
        </div>

        {/* Boutons d'état et contrôle Pause / Reprise tactile */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={togglePlayPause}
            className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition ${
              isPaused
                ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300'
                : 'bg-white hover:bg-stone-100 text-[#881313] border border-[#dec6a7]'
            }`}
          >
            {isPaused ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                <span>En pause ({secondsRemaining}s)</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Défilement actif</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Défilement continu horizontal / Carousel */}
      <div
        className="overflow-hidden rounded-2xl border-2 border-[#dec6a7] bg-[#fffcf7] p-2.5 shadow-sm select-none"
        onTouchStart={() => triggerPause()}
      >
        <div
          className={`flex items-center gap-3 overflow-x-auto scrollbar-none py-1 animate-marquee ${
            isPaused ? 'marquee-paused is-paused' : ''
          }`}
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
            WebkitAnimationPlayState: isPaused ? 'paused' : 'running'
          }}
        >
          {displayList.map((img, idx) => {
            const isSelected = activeImageId === img.id;
            return (
              <div
                key={`${img.id}-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerPause(img.id);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  triggerPause(img.id);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  triggerPause(img.id);
                }}
                className={`w-48 sm:w-60 h-32 sm:h-40 rounded-xl overflow-hidden shrink-0 border-2 shadow-sm relative group/card bg-stone-100 cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'border-[#881313] scale-[1.04] shadow-xl ring-4 ring-amber-400 z-10'
                    : 'border-[#eab308]/60 hover:scale-[1.02]'
                }`}
                title="Touchez pour mettre en pause 5 secondes"
              >
                <img
                  src={img.image_url}
                  alt={img.title || 'Restaurant La Gratitude'}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition duration-300 pointer-events-none"
                  loading="lazy"
                />

                {/* Badge d'arrêt temporaire au-dessus de l'image sélectionnée */}
                {isSelected && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#881313] text-white text-[10px] font-extrabold shadow animate-pulse">
                    Photo figée ({secondsRemaining}s)
                  </div>
                )}

                {img.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-white">
                    <p className="text-[11px] font-extrabold truncate drop-shadow">
                      {img.title}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
