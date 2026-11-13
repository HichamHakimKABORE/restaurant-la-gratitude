'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import { useCart, formatCFA } from '@/components/CartContext';
import { CheckIcon, BoltIcon, MapPinIcon, PhoneIcon, CompassIcon, WhatsAppIcon, ChefHatIcon, CloseIcon } from '@/components/Icons';
import { sortDailyMenuDishes, matchesDishSearch } from '@/lib/db';
import { safeCssImageUrl } from '@/lib/validation';
import { formatPhoneList, toTelHref } from '@/lib/phone';

const CATEGORY_TABS = [
  { key: 'Tous', label: 'Tous', img: '/images/dishes_grid_2.jpg', quad: 'quad-bl' },
  { key: 'Pizzas', label: 'Pizzas', img: '/images/dishes_grid_2.jpg', quad: 'quad-bl' },
  { key: 'Poulets', label: 'Poulets', img: '/images/dishes_grid_2.jpg', quad: 'quad-br' },
  { key: 'Grillades', label: 'Grillades', img: '/images/dishes_grid_2.jpg', quad: 'quad-tl' },
  { key: 'Salades', label: 'Salades', img: '/images/dishes_grid_3.jpg', quad: 'quad-tr' },
  { key: 'Soupes', label: 'Soupes', img: '/images/dishes_grid_1.jpg', quad: 'quad-br' },
  { key: 'Plats', label: 'Plats', img: '/images/dishes_grid_1.jpg', quad: 'quad-tr' },
  { key: 'Boissons', label: 'Boissons', img: '/images/dishes_grid_4.jpg', quad: 'quad-tr' }
];

export default function AccueilClientPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [homeSearch, setHomeSearch] = useState<string>('');
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [isOpenNow, setIsOpenNow] = useState<boolean>(true);
  const { dishes, loadingDishes, settings, openDishSelector } = useCart();

  // Vérification de l'ouverture actuelle selon l'heure de Ouagadougou (UTC/GMT+0 : 07h00 à 23h00)
  // Calculée côté client dans useEffect pour éviter tout écart d'hydratation SSR/Client à la bascule d'heure.
  useEffect(() => {
    const updateOpenStatus = () => {
      const currentUtcHour = new Date().getUTCHours();
      setIsOpenNow(currentUtcHour >= 7 && currentUtcHour < 23);
    };
    updateOpenStatus();
    const timer = setInterval(updateOpenStatus, 60_000);
    return () => clearInterval(timer);
  }, []);

  const phoneList = formatPhoneList(settings.phone, settings.phone_2);
  const whatsappNum = (settings.whatsapp || '22602809906').replace(/[^0-9]/g, '') || '22602809906';

  // Menu du Jour : uniquement les plats du jour cochés aujourd'hui.
  const displayedDailyDishes = sortDailyMenuDishes(
    dishes.filter(d => d.availability_mode === 'daily' && d.is_available_today)
  );

  // Plats sur commande (Pizzas, Poulets, Grillades, Salades, etc.)
  const onOrderDishes = dishes.filter(d => d.availability_mode !== 'daily');
  const rotatingDishes = displayedDailyDishes.length > 0 ? displayedDailyDishes : onOrderDishes;

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

  // Plats affichés dans la section "Notre Carte" :
  // affiche tous les produits du catalogue par catégorie sans dépendre du Menu du Jour
  // (le Menu du Jour reste affiché dans l'encart dédié à droite).
  const visibleGridDishes = (() => {
    const list =
      selectedCategory === 'Tous'
        ? dishes
        : dishes.filter(d => d.category === selectedCategory);
    if (homeSearch.trim() !== '') {
      return list.filter(d => matchesDishSearch(d, homeSearch));
    }
    return list;
  })();

  return (
    <ClientShell>
      {/* Hero Banner */}
      <section className="relative rounded-xl overflow-hidden border border-[#801313] shadow-md bg-gradient-to-r from-[#2a1208] via-[#3a150a] to-[#2a1208] text-white p-2.5 sm:p-4 grid grid-cols-12 gap-2 sm:gap-4 items-center">
        {/* Filigrane discret du logo dans la bannière */}
        <div className="absolute -right-4 -bottom-4 w-32 h-32 sm:w-48 sm:h-48 opacity-15 pointer-events-none rounded-full overflow-hidden select-none">
          <img src="/images/logo_gratitude.jpg" alt="" className="w-full h-full object-cover" />
        </div>

        {/* Partie Gauche: Textes & Boutons (Notre Carte en premier, puis Menu du Jour) */}
        <div className="col-span-7 space-y-1 z-10">
          <div className="leading-tight">
            <span className="font-script text-[11px] sm:text-sm text-amber-200 block">
              Bienvenue au
            </span>
            <h2 className="font-script text-base sm:text-2xl md:text-3xl text-[#facc15] drop-shadow leading-tight">
              {settings.restaurant_name || 'Restaurant La Gratitude'}
            </h2>
          </div>
          <p className="font-script text-[10px] sm:text-xs text-amber-100 leading-tight">
            {settings.slogan || 'Une cuisine savoureuse, un service de qualité !'}
          </p>
          <p className="hidden md:block text-[11px] text-amber-100/80 max-w-lg leading-relaxed">
            Découvrez notre Carte &amp; Plats sur Commande ainsi que notre Menu du Jour à Zagtouli (route de Bobo).
          </p>
          <div className="pt-0.5 flex flex-wrap gap-1.5">
            <Link
              href="/menu"
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-[#facc15] to-[#eab308] hover:brightness-110 text-[#2b1810] font-extrabold text-[9px] sm:text-xs shadow inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Notre Carte &amp; Sur Commande</span>
            </Link>
            <Link
              href="/menu-du-jour"
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/25 font-bold text-[9px] sm:text-xs inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Menu du Jour ({displayedDailyDishes.length})</span>
            </Link>
            {phoneList.map(num => (
              <a
                key={num}
                href={toTelHref(num)}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-[9px] sm:text-xs shadow inline-flex items-center gap-1 whitespace-nowrap"
              >
                <PhoneIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                <span>Appeler : {num.replace('+226 ', '')}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Partie Droite: Cadre repas */}
        <div className="col-span-5 flex flex-col items-center justify-center z-10">
          {currentDish ? (
            <div className="w-full max-w-[210px] sm:max-w-[260px] flex flex-col items-center gap-1">
              <div
                onClick={() => openDishSelector(currentDish)}
                className="w-full h-24 sm:h-32 md:h-36 rounded-lg overflow-hidden border border-[#eab308] shadow-md relative cursor-pointer group bg-black/40"
                title="Cliquer pour commander ce plat par téléphone"
              >
                <div
                  key={currentDish.id}
                  className={`w-full h-full dish-photo transition-all duration-700 group-hover:scale-105 ${currentDish.image_quadrant}`}
                  style={{ backgroundImage: `url('${safeCssImageUrl(currentDish.image_url)}')` }}
                />

                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-[#801313]/95 text-white font-extrabold text-[9px] sm:text-[10px] border border-amber-300 shadow whitespace-nowrap">
                  {formatCFA(currentDish.price)}
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-1 sm:p-1.5 flex items-end justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-white font-extrabold text-[10px] sm:text-xs truncate drop-shadow leading-tight">
                      {currentDish.name}
                    </p>
                    <p className="text-[#facc15] font-bold text-[8px] sm:text-[9px] flex items-center gap-0.5 whitespace-nowrap">
                      <span>+ Commander</span>
                    </p>
                  </div>
                </div>

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

      {/* CORPS DE PAGE : 1. NOTRE CARTE & PLATS SUR COMMANDE EN PREMIER, 2. MENU DU JOUR ENSUITE, 3. COORDONNÉES */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 1. PREMIÈRE PARTIE (6 cols) : NOTRE CARTE & PLATS SUR COMMANDE */}
        <div className="lg:col-span-6 bg-white/95 rounded-2xl border-2 border-[#e6d5c3] shadow-md p-4 sm:p-5 space-y-4 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <h3 className="font-extrabold text-base sm:text-lg text-[#2b1810] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#881313] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Notre Carte &amp; Tous nos Plats</span>
              </h3>
              <Link href="/menu" className="sm:hidden text-xs font-extrabold text-[#881313] hover:underline whitespace-nowrap">
                Toute la carte →
              </Link>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  value={homeSearch}
                  onChange={e => setHomeSearch(e.target.value)}
                  placeholder="Rechercher un plat, pizza..."
                  className="w-full pl-3 pr-7 py-1.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-medium"
                />
                {homeSearch && (
                  <button
                    type="button"
                    onClick={() => setHomeSearch('')}
                    className="touch-manipulation absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center"
                    title="Effacer la recherche"
                  >
                    <CloseIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Link href="/menu" className="hidden sm:inline text-xs font-extrabold text-[#881313] hover:underline whitespace-nowrap">
                Ouvrir toute la carte →
              </Link>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORY_TABS.map(tab => {
              const isActive = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-b from-[#fef08a] to-[#eab308] border-[#b45309] text-[#2b1810] font-extrabold shadow-sm'
                      : 'bg-[#fdf5e8] border-[#e6d5c3] text-stone-700 hover:border-[#eab308]'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-white shadow-sm shrink-0">
                    <div
                      className={`w-full h-full dish-photo ${tab.quad}`}
                      style={{ backgroundImage: `url('${tab.img}')` }}
                    />
                  </div>
                  <span className="text-[11px] sm:text-xs whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Grille 2 plats par ligne, sans aucun badge Disponible / Non disponible */}
          {visibleGridDishes.length === 0 ? (
            <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center text-xs text-stone-700 space-y-2">
              <p className="font-extrabold text-[#881313]">
                Aucun plat ne correspond à votre recherche dans cette catégorie.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Tous');
                  setHomeSearch('');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#881313] text-white font-extrabold text-xs shadow"
              >
                Afficher toute la carte
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                {(homeSearch.trim() !== '' || selectedCategory !== 'Tous'
                  ? visibleGridDishes
                  : visibleGridDishes.slice(0, 12)
                ).map(dish => (
                  <article
                    key={dish.id}
                    onClick={() => openDishSelector(dish)}
                    className="group min-w-0 cursor-pointer bg-[#fffcf7] rounded-xl border border-[#e6d5c3] hover:border-[#881313] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between text-center"
                  >
                    <div className="h-20 sm:h-24 overflow-hidden relative bg-stone-100">
                      <div
                        className={`w-full h-full dish-photo ${dish.image_quadrant}`}
                        style={{ backgroundImage: `url('${safeCssImageUrl(dish.image_url)}')` }}
                      />
                      {dish.availability_mode === 'daily' && (
                        <span
                          className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-full font-extrabold text-[9px] shadow-sm whitespace-nowrap ${
                            dish.is_available_today
                              ? dish.stock_status === 'low'
                                ? 'bg-amber-400 text-[#2b1810]'
                                : 'bg-emerald-600 text-white'
                              : 'bg-stone-800/85 text-stone-200'
                          }`}
                        >
                          {dish.is_available_today
                            ? dish.stock_status === 'low'
                              ? 'Presque fini'
                              : 'Prêt'
                            : 'Non préparé'}
                        </span>
                      )}
                    </div>

                    <div className="p-1.5 sm:p-2 space-y-0.5">
                      <h4 className="font-extrabold text-[11px] sm:text-xs text-[#2b1810] line-clamp-1">
                        {dish.name}
                      </h4>
                      <div className="font-extrabold text-[11px] sm:text-xs text-[#991b1b] whitespace-nowrap">
                        {formatCFA(dish.price)}
                      </div>
                      <div className="pt-0.5 flex items-center justify-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#881313]/10 text-[#881313] font-extrabold text-[10px] sm:text-[11px] group-hover:bg-[#881313] group-hover:text-white transition whitespace-nowrap">
                          <PhoneIcon className="w-2.5 h-2.5 shrink-0" />
                          <span>+ Commander</span>
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {selectedCategory === 'Tous' &&
                homeSearch.trim() === '' &&
                visibleGridDishes.length > 12 && (
                  <div className="pt-1 text-center">
                    <Link
                      href="/menu"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#881313] hover:bg-[#680e0e] text-white font-extrabold text-xs shadow transition"
                    >
                      <span>Voir toute la carte ({visibleGridDishes.length} plats) →</span>
                    </Link>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* 2. DEUXIÈME PARTIE (3 cols) : MENU DU JOUR AUJOURD'HUI */}
        <aside className="lg:col-span-3 bg-[#fdf5e8] rounded-2xl border-2 border-[#dec6a7] shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#7c1d12] to-[#9a2c1d] text-white px-4 py-3 flex items-center justify-between border-b border-[#eab308]">
            <span className="font-extrabold text-sm">Menu du Jour</span>
            <span className="px-2.5 py-0.5 rounded bg-[#eab308] text-[#2b1810] font-extrabold text-xs whitespace-nowrap">
              Riz • Soupes • Plats
            </span>
          </div>

          <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
            {loadingDishes ? (
              <div className="p-4 text-center text-xs text-stone-500">
                Chargement du Menu du Jour...
              </div>
            ) : displayedDailyDishes.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-100/90 border border-amber-300 text-[#2b1810] text-xs space-y-2 text-center">
                <p className="font-extrabold flex items-center justify-center gap-1 text-[#801313]">
                  <ChefHatIcon className="w-4 h-4 shrink-0" />
                  <span>Menu du jour en préparation en cuisine</span>
                </p>
                <p className="text-stone-700 leading-snug">
                  Les plats du jour s’afficheront ici dès qu’ils seront prêts. Vous pouvez appeler le restaurant ou choisir parmi nos Plats sur Commande :
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {phoneList.map(num => (
                    <a
                      key={num}
                      href={toTelHref(num)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#881313] text-white font-extrabold text-xs whitespace-nowrap shadow"
                    >
                      <PhoneIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{num}</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              displayedDailyDishes.slice(0, 12).map(dish => (
                <div
                  key={dish.id}
                  onClick={() => openDishSelector(dish)}
                  className="cursor-pointer flex items-center justify-between gap-2 py-2 px-2.5 rounded-xl bg-white hover:bg-amber-50 border border-[#ead8be] shadow-sm transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {dish.stock_status === 'low' ? (
                      <span
                        className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shrink-0"
                        title="Presque fini"
                      >
                        <BoltIcon className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        <CheckIcon className="w-3 h-3" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[#2b1810] truncate block">
                        {dish.name}
                      </span>
                      {dish.stock_status === 'low' && (
                        <span className="text-[10px] font-extrabold text-amber-700 block">
                          Presque fini
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#991b1b] text-white font-extrabold text-xs shrink-0 whitespace-nowrap">
                    {formatCFA(dish.price)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-[#ead8be] text-center">
            <Link
              href="/menu-du-jour"
              className="block w-full py-2 rounded-xl bg-[#7c2d12] hover:bg-[#9a3412] text-white font-bold text-xs shadow transition whitespace-nowrap"
            >
              Voir tout le Menu du Jour →
            </Link>
          </div>
        </aside>

        {/* 3. TROISIÈME PARTIE (3 cols) : COMMANDER PAR TÉLÉPHONE + COORDONNÉES + HORAIRES */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-gradient-to-b from-[#881313] to-[#680e0e] text-white rounded-2xl p-4 shadow-lg space-y-3 border-2 border-[#eab308]/50">
            <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <PhoneIcon className="w-5 h-5 text-[#facc15] shrink-0" />
                <span>Commander par appel</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#eab308] text-[#2b1810] font-extrabold text-[11px] whitespace-nowrap">
                Direct Cuisine
              </span>
            </div>

            <p className="text-xs text-amber-100 leading-relaxed">
              Pour passer commande (Plats sur Commande ou Menu du Jour), appelez directement le restaurant :
            </p>

            {phoneList.map(num => (
              <a
                key={num}
                href={toTelHref(num)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#facc15] to-[#eab308] hover:brightness-110 text-[#2b1810] font-extrabold text-xs sm:text-sm text-center shadow-md flex items-center justify-center gap-2 whitespace-nowrap transition"
              >
                <PhoneIcon className="w-4 h-4 shrink-0" />
                <span>{num}</span>
              </a>
            ))}

            <a
              href={`https://wa.me/${whatsappNum}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold text-xs shadow flex items-center justify-center gap-2 whitespace-nowrap transition"
            >
              <WhatsAppIcon className="w-4 h-4 shrink-0" />
              <span>Écrire sur WhatsApp</span>
            </a>
          </div>

          <div className="bg-[#fdf5e8] rounded-2xl border-2 border-[#dec6a7] p-4 space-y-3 shadow-sm">
            <h4 className="font-extrabold text-sm text-[#2b1810] flex items-center gap-2 border-b border-[#e6d5c3] pb-2">
              <span>Nos coordonnées</span>
            </h4>
            <div className="text-xs sm:text-sm space-y-1.5 text-stone-700">
              <p className="font-semibold flex items-center gap-1.5">
                <MapPinIcon className="w-4 h-4 text-[#881313] shrink-0" />
                <span>{settings.address || 'Zagtouli, route de Bobo'}</span>
              </p>
              <p className="text-xs font-mono text-stone-500 pl-5">12°19&apos;57.62&quot;N 1°37&apos;52.36&quot;O</p>
              <div className="font-extrabold text-[#2b1810] flex items-start gap-1.5">
                <PhoneIcon className="w-4 h-4 text-[#881313] shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {phoneList.map((num, idx) => (
                    <React.Fragment key={num}>
                      {idx > 0 && <span className="text-stone-400 font-bold">/</span>}
                      <a href={toTelHref(num)} className="hover:text-[#881313] whitespace-nowrap">
                        {num}
                      </a>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/contact"
              className="w-full py-2 px-3 rounded-xl bg-[#eab308] hover:bg-[#facc15] text-[#2b1810] font-extrabold text-xs shadow flex items-center justify-center gap-2 transition whitespace-nowrap"
            >
              <CompassIcon className="w-4 h-4 shrink-0" />
              <span>Suivre l’itinéraire GPS en direct</span>
            </Link>
          </div>

          <div className="bg-[#fdf5e8] rounded-2xl border-2 border-[#dec6a7] p-3 sm:p-4 space-y-1.5 sm:space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e6d5c3] pb-1.5 sm:pb-2">
              <h4 className="font-extrabold text-xs sm:text-sm text-[#2b1810]">
                Horaires
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isOpenNow
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {isOpenNow ? 'Ouvert actuellement' : 'Ouvre à 07h00'}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-stone-800 pt-0.5">
              {settings.opening_hours || 'Lundi - Dimanche de 07h00 à 23h00'}
            </p>
          </div>
        </aside>
      </section>

      {/* BOTTOM CTA ROW */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2.5 pt-0.5">
        <a
          href={`https://wa.me/${whatsappNum}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#f3e5d0] sm:hover:bg-[#ebd5b3] active:scale-95 border border-[#d6be9c] rounded-xl p-1.5 sm:p-2.5 flex flex-col items-center justify-center text-center gap-1 shadow-sm transition"
        >
          <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow shrink-0">
            <WhatsAppIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
          <span className="font-extrabold text-[10px] sm:text-xs text-[#2b1810] leading-tight">
            Contacter sur WhatsApp
          </span>
        </a>

        <div className="bg-gradient-to-b from-[#8b261d] to-[#681811] text-white rounded-xl p-1.5 sm:p-2.5 flex flex-col items-center text-center justify-center gap-1 shadow-sm">
          <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/15 text-[#facc15] flex items-center justify-center shrink-0">
            <PhoneIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            {phoneList.map(num => (
              <a
                key={num}
                href={toTelHref(num)}
                className="font-extrabold text-[10px] sm:text-xs sm:hover:text-[#facc15] underline-offset-2 hover:underline leading-tight transition"
              >
                Appeler le {num}
              </a>
            ))}
          </div>
        </div>

        <Link
          href="/menu"
          prefetch={true}
          className="bg-gradient-to-b from-[#7a1212] to-[#540b0b] sm:hover:brightness-110 active:scale-95 text-white rounded-xl p-1.5 sm:p-2.5 flex flex-col items-center text-center justify-center gap-1 shadow-sm transition"
        >
          <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/15 text-[#facc15] flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-3.866 0-7 2.686-7 6h14c0-3.314-3.134-6-7-6zm-9 8h18M12 5v3" />
            </svg>
          </span>
          <span className="font-extrabold text-[10px] sm:text-xs leading-tight">
            Découvrir nos Plats sur Commande
          </span>
        </Link>

        <div className="bg-[#fdf5e8] border border-[#dec6a7] rounded-xl p-1.5 sm:p-2.5 flex flex-col items-center justify-center text-center">
          <p className="font-script text-sm sm:text-lg text-[#3b1c0e] leading-tight">
            Merci de votre confiance !
          </p>
          <div className="w-16 sm:w-24 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#eab308] to-transparent mt-1" />
        </div>
      </section>
    </ClientShell>
  );
}
