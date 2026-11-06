'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import { useCart, formatCFA } from '@/components/CartContext';
import { CheckIcon, CloseIcon, BoltIcon, MapPinIcon, PhoneIcon, CompassIcon, WhatsAppIcon, ChefHatIcon } from '@/components/Icons';
import type { Dish } from '@/lib/db';

const CATEGORY_TABS = [
  { key: 'Tous', label: 'Tous', img: '/images/dishes_grid_1.jpg', quad: 'quad-tl' },
  { key: 'Plats', label: 'Plats', img: '/images/dishes_grid_1.jpg', quad: 'quad-tr' },
  { key: 'Pizzas', label: 'Pizzas', img: '/images/dishes_grid_2.jpg', quad: 'quad-bl' },
  { key: 'Salades', label: 'Salades', img: '/images/dishes_grid_3.jpg', quad: 'quad-tr' },
  { key: 'Poulets', label: 'Poulets', img: '/images/dishes_grid_2.jpg', quad: 'quad-br' },
  { key: 'Soupes', label: 'Soupes', img: '/images/dishes_grid_1.jpg', quad: 'quad-br' },
  { key: 'Grillades', label: 'Grillades', img: '/images/dishes_grid_2.jpg', quad: 'quad-tl' },
  { key: 'Boissons', label: 'Boissons', img: '/images/dishes_grid_4.jpg', quad: 'quad-tr' }
];

export default function AccueilClientPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const { dishes, cart, openDishSelector, totalItems, totalPrice } = useCart();

  const availableDailyDishes = dishes.filter(
    d => d.availability_mode === 'daily' && d.is_available_today
  );

  const isDailyCustomized = availableDailyDishes.length > 0;
  const availableGeneralDishes = dishes.filter(d => d.is_available_today);
  const displayedDailyDishes = isDailyCustomized
    ? availableDailyDishes
    : availableGeneralDishes.length > 0
      ? availableGeneralDishes
      : dishes;

  const rotatingDishes = displayedDailyDishes;

  useEffect(() => {
    if (rotatingDishes.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIdx(prev => (prev + 1) % rotatingDishes.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [rotatingDishes.length]);

  const nextSlide = () => {
    if (rotatingDishes.length > 0) {
      setCurrentSlideIdx(prev => (prev + 1) % rotatingDishes.length);
    }
  };

  const prevSlide = () => {
    if (rotatingDishes.length > 0) {
      setCurrentSlideIdx(prev => (prev - 1 + rotatingDishes.length) % rotatingDishes.length);
    }
  };

  const currentDish = rotatingDishes.length > 0 ? rotatingDishes[currentSlideIdx % rotatingDishes.length] : null;

  const visibleGridDishes = dishes.filter(d => {
    if (!d.is_available_today) return false;
    if (selectedCategory !== 'Tous' && d.category !== selectedCategory) return false;
    return true;
  });

  return (
    <ClientShell>
      {/* Hero Banner (Ultra Compact & Côte à côte même sur smartphone) */}
      <section className="relative rounded-xl overflow-hidden border border-[#801313] shadow-md bg-gradient-to-r from-[#2a1208] via-[#3a150a] to-[#2a1208] text-white p-2.5 sm:p-4 grid grid-cols-12 gap-2 sm:gap-4 items-center">
        {/* Filigrane discret du logo dans la bannière */}
        <div className="absolute -right-4 -bottom-4 w-32 h-32 sm:w-48 sm:h-48 opacity-15 pointer-events-none rounded-full overflow-hidden select-none">
          <img src="/images/logo_gratitude.jpg" alt="" className="w-full h-full object-cover" />
        </div>

        {/* Partie Gauche: Textes & Boutons (7 colonnes sur mobile et desktop) */}
        <div className="col-span-7 space-y-1 z-10">
          <div className="leading-tight">
            <span className="font-script text-[11px] sm:text-sm text-amber-200 block">
              Bienvenue au
            </span>
            <h2 className="font-script text-base sm:text-2xl md:text-3xl text-[#facc15] drop-shadow leading-tight">
              Restaurant La Gratitude
            </h2>
          </div>
          <p className="font-script text-[10px] sm:text-xs text-amber-100 leading-tight">
            Une cuisine savoureuse, un service de qualité !
          </p>
          <p className="hidden md:block text-[11px] text-amber-100/80 max-w-lg leading-relaxed">
            Découvrez en direct les plats préparés aujourd’hui par notre Chef à Zagtouli (route de Bobo).
          </p>
          <div className="pt-0.5 flex flex-wrap gap-1.5">
            <Link
              href="/menu"
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-[#facc15] to-[#eab308] hover:brightness-110 text-[#2b1810] font-extrabold text-[9px] sm:text-xs shadow inline-flex items-center gap-1"
            >
              <span>Menu</span>
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/menu-du-jour"
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/25 font-bold text-[9px] sm:text-xs inline-flex items-center gap-1"
            >
              <span>Menu du Jour ({availableDailyDishes.length})</span>
            </Link>
          </div>
        </div>

        {/* Partie Droite: Cadre repas du Menu du Jour (5 colonnes côte à côte) */}
        <div className="col-span-5 flex flex-col items-center justify-center z-10">
          {currentDish ? (
            <div className="w-full max-w-[210px] sm:max-w-[260px] flex flex-col items-center gap-1">
              <div
                onClick={() => openDishSelector(currentDish)}
                className="w-full h-24 sm:h-32 md:h-36 rounded-lg overflow-hidden border border-[#eab308] shadow-md relative cursor-pointer group bg-black/40"
                title="Cliquer pour voir et commander ce plat"
              >
                {/* Photo du plat actif */}
                <div
                  key={currentDish.id}
                  className={`w-full h-full dish-photo transition-all duration-700 group-hover:scale-105 ${currentDish.image_quadrant}`}
                  style={{ backgroundImage: `url('${currentDish.image_url}')` }}
                />

                {/* Badge Haut Gauche: Menu du Jour */}
                <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#eab308] text-[#2b1810] text-[8px] sm:text-[9px] font-extrabold shadow">
                  <ChefHatIcon className="w-2.5 h-2.5" />
                  <span className="hidden xs:inline">Jour</span>
                </div>

                {/* Badge Haut Droit: Prix CFA (non-sécable) */}
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-[#801313]/95 text-white font-extrabold text-[9px] sm:text-[10px] border border-amber-300 shadow whitespace-nowrap">
                  {formatCFA(currentDish.price)}
                </div>

                {/* Overlay Bas: Nom du plat et bouton commander */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-1 sm:p-1.5 flex items-end justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-white font-extrabold text-[10px] sm:text-xs truncate drop-shadow leading-tight">
                      {currentDish.name}
                    </p>
                    <p className="text-[#facc15] font-bold text-[8px] sm:text-[9px] flex items-center gap-0.5">
                      <span>Commander</span>
                      <svg className="w-2 h-2 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </p>
                  </div>
                </div>

                {/* Flèches de défilement (gauche / droite) */}
                {rotatingDishes.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Plat précédent"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevSlide();
                      }}
                      className="absolute left-0.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Plat suivant"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextSlide();
                      }}
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Indicateurs / Puces de pagination des plats */}
              {rotatingDishes.length > 1 && (
                <div className="flex items-center gap-1">
                  {rotatingDishes.slice(0, 6).map((d, idx) => (
                    <button
                      key={d.id}
                      type="button"
                      aria-label={`Aller au plat ${idx + 1}`}
                      onClick={() => setCurrentSlideIdx(idx)}
                      className={`h-1 rounded-full transition-all ${
                        (currentSlideIdx % rotatingDishes.length) === idx
                          ? 'w-2.5 bg-[#facc15]'
                          : 'w-1 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-36 h-20 rounded-lg overflow-hidden border border-[#eab308] shadow-md">
              <div
                className="w-full h-full dish-photo quad-tl"
                style={{ backgroundImage: `url('/images/dishes_grid_1.jpg')` }}
              />
            </div>
          )}
        </div>
      </section>

      {/* 3-COLUMN BODY */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (3 cols): MENU DU JOUR AUJOURD'HUI */}
        <aside className="lg:col-span-3 bg-[#fdf5e8] rounded-2xl border-2 border-[#dec6a7] shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#7c1d12] to-[#9a2c1d] text-white px-4 py-3 flex items-center justify-between border-b border-[#eab308]">
            <span className="font-extrabold text-sm">Menu du Jour</span>
            <span className="px-2.5 py-0.5 rounded bg-[#eab308] text-[#2b1810] font-extrabold text-xs">
              {isDailyCustomized ? 'Aujourd’hui' : 'Sélection du Chef'}
            </span>
          </div>

          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {!isDailyCustomized && (
              <div className="p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-[#2b1810] text-[11px] space-y-1 mb-2">
                <p className="font-extrabold flex items-center gap-1 text-[#801313]">
                  <ChefHatIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Menu du jour en préparation</span>
                </p>
                <p className="text-stone-700 leading-snug">
                  Voici nos spécialités immédiatement disponibles pour vous régaler aujourd’hui !
                </p>
              </div>
            )}

            {displayedDailyDishes.slice(0, 8).map(dish => (
              <div
                key={dish.id}
                onClick={() => openDishSelector(dish)}
                className="cursor-pointer flex items-center justify-between gap-2 py-2 px-2.5 rounded-xl bg-white hover:bg-amber-50 border border-[#ead8be] shadow-sm transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 ${
                      dish.stock_status === 'low' ? 'bg-amber-500' : 'bg-[#16a34a]'
                    }`}
                  >
                    <CheckIcon className="w-3 h-3" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-[#2b1810] truncate block">
                      {dish.name}
                    </span>
                    {dish.stock_status === 'low' && (
                      <span className="text-xs text-amber-700 font-bold">
                        Presque fini !
                      </span>
                    )}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#991b1b] text-white font-extrabold text-xs shrink-0 whitespace-nowrap">
                  {formatCFA(dish.price)}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#ead8be] text-center">
            <Link
              href="/menu-du-jour"
              className="block w-full py-2 rounded-xl bg-[#7c2d12] hover:bg-[#9a3412] text-white font-bold text-xs shadow transition"
            >
              Voir plus...
            </Link>
          </div>
        </aside>

        {/* CENTER COLUMN (6 cols): NOS PLATS DISPONIBLES */}
        <div className="lg:col-span-6 bg-white/90 backdrop-blur-[2px] rounded-2xl border-2 border-[#e6d5c3] shadow-md p-4 sm:p-5 space-y-4 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <h3 className="font-extrabold text-base sm:text-lg text-[#2b1810] flex items-center gap-2">
              <svg className="w-5 h-5 text-[#881313]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Nos Plats Disponibles</span>
            </h3>
            <Link href="/menu" className="text-xs font-extrabold text-[#881313] hover:underline">
              Ouvrir la page Menu →
            </Link>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
            {CATEGORY_TABS.map(tab => {
              const isActive = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-b from-[#fef08a] to-[#eab308] border-[#b45309] text-[#2b1810] font-extrabold shadow-sm'
                      : 'bg-[#fdf5e8] border-[#e6d5c3] text-stone-700 hover:border-[#eab308]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-sm">
                    <div
                      className={`w-full h-full dish-photo ${tab.quad}`}
                      style={{ backgroundImage: `url('${tab.img}')` }}
                    />
                  </div>
                  <span className="text-xs">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {visibleGridDishes.slice(0, 12).map(dish => (
                <article
                  key={dish.id}
                  onClick={() => openDishSelector(dish)}
                  className="group cursor-pointer bg-[#fffcf7] rounded-xl border border-[#e6d5c3] hover:border-[#881313] overflow-hidden shadow-sm hover:shadow-lg transition flex flex-col justify-between text-center"
                >
                  <div className="h-28 sm:h-32 overflow-hidden relative bg-stone-100">
                    <div
                      className={`w-full h-full dish-photo ${dish.image_quadrant}`}
                      style={{ backgroundImage: `url('${dish.image_url}')` }}
                    />
                    {dish.stock_status === 'low' && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs shadow">
                        Presque fini
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 space-y-1">
                    <h4 className="font-extrabold text-xs sm:text-sm text-[#2b1810] line-clamp-1">
                      {dish.name}
                    </h4>
                    <div className="font-extrabold text-xs sm:text-sm text-[#991b1b] whitespace-nowrap">
                      {formatCFA(dish.price)}
                    </div>
                    <div className="pt-1 flex items-center justify-center">
                      {dish.stock_status === 'soldout' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                          <CloseIcon className="w-3 h-3" />
                          <span>Rupture</span>
                        </span>
                      ) : dish.stock_status === 'low' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                          <BoltIcon className="w-3 h-3" />
                          <span>Presque fini</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs group-hover:bg-[#881313] group-hover:text-white transition">
                          <CheckIcon className="w-3 h-3" />
                          <span>Disponible</span>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </div>

        {/* RIGHT COLUMN (3 cols): MON PANIER + COORDONNÉES + HORAIRES */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-gradient-to-b from-[#881313] to-[#680e0e] text-white rounded-2xl p-4 shadow-lg space-y-3 border-2 border-[#eab308]/50">
            <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <svg className="w-5 h-5 text-[#facc15]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Mon panier</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#eab308] text-[#2b1810] font-extrabold text-xs">
                {totalItems} article(s)
              </span>
            </div>

            {cart.length > 0 && (
              <div className="text-xs text-amber-100 font-bold text-center whitespace-nowrap">
                Total : {formatCFA(totalPrice)}
              </div>
            )}

            <Link
              href="/commander"
              className="block w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#facc15] to-[#eab308] hover:brightness-110 text-[#2b1810] font-extrabold text-xs text-center shadow-md transition"
            >
              Voir mon panier
            </Link>
          </div>

          <div className="bg-[#fdf5e8] rounded-2xl border-2 border-[#dec6a7] p-4 space-y-3 shadow-sm">
            <h4 className="font-extrabold text-sm text-[#2b1810] flex items-center gap-2 border-b border-[#e6d5c3] pb-2">
              <span>Nos coordonnées</span>
            </h4>
            <div className="text-xs sm:text-sm space-y-1.5 text-stone-700">
              <p className="font-semibold flex items-center gap-1.5">
                <MapPinIcon className="w-4 h-4 text-[#881313] shrink-0" />
                <span>Zagtouli, route de Bobo</span>
              </p>
              <p className="text-xs font-mono text-stone-500 pl-5">12°19&apos;57.62&quot;N 1°37&apos;52.36&quot;O</p>
              <p className="font-extrabold text-[#2b1810] flex items-center gap-1.5">
                <PhoneIcon className="w-4 h-4 text-[#881313] shrink-0" />
                <span>+226 02 80 99 06</span>
              </p>
            </div>
            <Link
              href="/commander"
              className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition"
            >
              <WhatsAppIcon className="w-4 h-4 shrink-0" />
              <span>Commander sur WhatsApp</span>
            </Link>
            <Link
              href="/contact"
              className="w-full py-2 px-3 rounded-xl bg-[#eab308] hover:bg-[#facc15] text-[#2b1810] font-extrabold text-xs shadow flex items-center justify-center gap-2 transition"
            >
              <CompassIcon className="w-4 h-4 shrink-0" />
              <span>Suivre l’itinéraire GPS en direct</span>
            </Link>
          </div>

          <div className="bg-[#fdf5e8] rounded-2xl border-2 border-[#dec6a7] p-4 space-y-1.5 shadow-sm">
            <h4 className="font-extrabold text-sm text-[#2b1810] border-b border-[#e6d5c3] pb-2">
              Horaires
            </h4>
            <p className="text-xs sm:text-sm font-bold text-stone-800 pt-1">Lundi - Dimanche</p>
            <p className="text-xs sm:text-sm text-stone-600">de 07h00 à 23h00</p>
          </div>
        </aside>
      </section>

      {/* BOTTOM CTA ROW */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <Link
          href="/commander"
          className="bg-[#f3e5d0] hover:bg-[#ebd5b3] border-2 border-[#d6be9c] rounded-2xl p-4 flex flex-col items-center text-center gap-2 shadow-sm transition"
        >
          <span className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow">
            <WhatsAppIcon className="w-6 h-6" />
          </span>
          <span className="font-extrabold text-sm text-[#2b1810]">
            Commander par WhatsApp
          </span>
        </Link>

        <a
          href="tel:+22602809906"
          className="bg-gradient-to-b from-[#8b261d] to-[#681811] hover:brightness-110 text-white rounded-2xl p-4 flex flex-col items-center text-center justify-center gap-2 shadow-md transition"
        >
          <span className="w-12 h-12 rounded-full bg-white/15 text-[#facc15] flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </span>
          <span className="font-extrabold text-sm">Appeler maintenant</span>
        </a>

        <Link
          href="/menu"
          className="bg-gradient-to-b from-[#7a1212] to-[#540b0b] hover:brightness-110 text-white rounded-2xl p-4 flex flex-col items-center text-center justify-center gap-2 shadow-md transition"
        >
          <span className="w-12 h-12 rounded-full bg-white/15 text-[#facc15] flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-3.866 0-7 2.686-7 6h14c0-3.314-3.134-6-7-6zm-9 8h18M12 5v3" />
            </svg>
          </span>
          <span className="font-extrabold text-sm">Profiter de notre cuisine</span>
        </Link>

        <div className="bg-[#fdf5e8] border-2 border-[#dec6a7] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <p className="font-script text-2xl text-[#3b1c0e]">Merci de votre confiance !</p>
          <div className="w-32 h-1 rounded-full bg-gradient-to-r from-transparent via-[#eab308] to-transparent mt-1" />
        </div>
      </section>
    </ClientShell>
  );
}
