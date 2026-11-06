'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart, formatCFA } from './CartContext';
import { ChefHatIcon, StarIcon, ThumbUpIcon, HeartIcon, WhatsAppIcon, MapPinIcon } from './Icons';
import RestaurantGallerySlider from './RestaurantGallerySlider';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { totalItems, totalPrice } = useCart();

  const navItems = [
    { href: '/', label: 'Accueil' },
    { href: '/menu', label: 'Notre Menu' },
    { href: '/menu-du-jour', label: 'Menu du Jour' },
    { href: '/commander', label: `Commander (${totalItems})` },
    { href: '/mes-commandes', label: 'Mes Commandes' },
    { href: '/contact', label: 'Contact' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f7efe4] text-[#2b1810] relative overflow-x-hidden">
      {/* FILIGRANE DU LOGO EN ARRIÈRE-PLAN (Parfaitement visible) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-[300px] h-[300px] sm:w-[480px] sm:h-[480px] lg:w-[620px] lg:h-[620px] rounded-full border-4 border-[#d99b26]/60 p-2 shadow-2xl">
            <img
              src="/images/logo_gratitude.jpg"
              alt=""
              className="w-full h-full rounded-full object-cover opacity-55 saturate-125 contrast-125 mix-blend-multiply"
            />
          </div>
        </div>
      </div>

      {/* 1. TOP OFFICIAL HEADER BANNER (100% Figé en haut quand on scrolle & taille diminuée) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#fffcf7] via-[#f9edd9] to-[#f3dfc1] border-b-2 border-[#801313] shadow-md">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-1 sm:py-1.5 flex items-center justify-between gap-2">
          {/* Left: Vrai Logo Version 1 + Nom (format compact) */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/images/logo_gratitude.jpg"
              alt="Logo Officiel Restaurant La Gratitude"
              className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#d99b26] shadow bg-white shrink-0"
            />
            <div>
              <span className="block text-[9px] sm:text-xs font-bold text-[#2b1810] tracking-tight leading-none">
                Restaurant
              </span>
              <h1 className="font-script text-lg sm:text-2xl text-[#991b1b] leading-tight">
                La Gratitude
              </h1>
              <p className="hidden sm:block font-script text-[10px] sm:text-xs text-[#3f2314] leading-none">
                Bon goût, bonne humeur !
              </p>
            </div>
          </Link>

          {/* Center: Slogan (desktop only) */}
          <div className="hidden xl:flex flex-col items-center text-center">
            <p className="font-script text-base text-[#3b1c0e] leading-snug">
              Une cuisine savoureuse, un service de qualité !
            </p>
          </div>

          {/* Right: Zagtouli, Téléphone, Monument (taille réduite et compacte) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-[10px] sm:text-xs border-l-2 border-[#801313]/25 pl-2 sm:pl-3 space-y-0.5">
              <div className="hidden sm:flex items-center gap-1 leading-tight">
                <span className="w-3.5 h-3.5 rounded-full bg-[#991b1b] text-white flex items-center justify-center shrink-0">
                  <MapPinIcon className="w-2.5 h-2.5" />
                </span>
                <span className="font-bold text-[#2b1810]">
                  Zagtouli, route de Bobo
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-extrabold text-[#2b1810]">
                <a href="tel:+22602809906" className="hover:text-[#991b1b] text-[11px] sm:text-xs">
                  +226 02 80 99 06
                </a>
                <a
                  href="https://wa.me/22602809906"
                  target="_blank"
                  rel="noreferrer"
                  className="w-5 h-5 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white flex items-center justify-center shadow transition"
                  title="WhatsApp"
                >
                  <WhatsAppIcon className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Vraie Photo du Monument des Martyrs & Drapeau du Burkina Faso (Compact) */}
            <div className="flex items-center gap-1.5 bg-[#f3dcb9]/80 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-xl border border-[#d99b26] shadow-sm shrink-0">
              <img
                src="/images/monument_exact.jpg"
                alt="Monument des Martyrs — Ouagadougou"
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg object-cover object-top border border-[#b47b22] shadow-sm bg-white"
              />
              <svg
                className="w-6 h-4 sm:w-8 sm:h-5 rounded shadow-sm border border-black/20 shrink-0"
                viewBox="0 0 60 40"
                aria-label="Drapeau du Burkina Faso"
              >
                <rect width="60" height="20" fill="#ef2b2d" />
                <rect y="20" width="60" height="20" fill="#009e49" />
                <polygon
                  points="30,11 32.2,17.5 39,17.5 33.5,21.5 35.6,28 30,24 24.4,28 26.5,21.5 21,17.5 27.8,17.5"
                  fill="#fcd116"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Navigation Bar (Compacte, fine & scrollable sans barre apparente) */}
        <nav className="bg-gradient-to-r from-[#680e0e] via-[#881313] to-[#5a0b0b] px-2 sm:px-6 py-1 border-t border-white/15">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none text-[11px] sm:text-xs py-0.5">
              {navItems.map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg font-bold transition shrink-0 ${
                      isActive
                        ? 'bg-[#eab308] text-[#2b1810] shadow'
                        : 'text-amber-100 hover:bg-white/10 font-medium'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {totalItems > 0 && (
                <Link
                  href="/commander"
                  className="px-2.5 py-0.5 rounded-lg bg-[#16a34a] text-white font-extrabold text-[11px] shadow whitespace-nowrap shrink-0"
                >
                  Panier : {formatCFA(totalPrice)}
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* 2. PAGE CONTENT (Décalé pour ne pas être caché sous l'en-tête figé) */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pt-[86px] sm:pt-[96px] space-y-5">
        {children}
      </main>

      {/* GALERIE DÉFILANTE DES PHOTOS DU RESTAURANT */}
      <RestaurantGallerySlider />

      {/* 3. FOOTER PROMISE BAR (Format compact et allégé en hauteur) */}
      <footer className="relative z-10 bg-gradient-to-r from-[#431407] via-[#5c190b] to-[#431407] text-white border-t-2 sm:border-t-4 border-[#eab308] mt-4 pb-16 sm:pb-2">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-[11px] sm:text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-5 h-5 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center shrink-0">
                <ChefHatIcon className="w-3 h-3" />
              </span>
              <span>Cuisine de qualité</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-5 h-5 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center shrink-0">
                <StarIcon className="w-3 h-3" />
              </span>
              <span>Service rapide</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-5 h-5 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center shrink-0">
                <ThumbUpIcon className="w-3 h-3" />
              </span>
              <span>Des prix abordables</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-5 h-5 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center shrink-0">
                <HeartIcon className="w-3 h-3" />
              </span>
              <span>Votre satisfaction, notre priorité</span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[#facc15] via-[#eab308] to-[#ca8a04] text-[#2b1810] font-script text-xs sm:text-sm shadow-sm">
            Restaurant La Gratitude... Toujours avec vous !
          </div>
        </div>
      </footer>

      {/* 4. MOBILE BOTTOM APP BAR (Fixe en bas sur téléphone) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-[#680e0e] via-[#881313] to-[#5a0b0b] text-white border-t-2 border-[#eab308] px-1.5 py-1.5 shadow-2xl grid grid-cols-5 gap-1">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-bold ${
            pathname === '/' ? 'bg-[#eab308] text-[#2b1810]' : 'text-amber-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3" />
          </svg>
          <span>Accueil</span>
        </Link>

        <Link
          href="/menu-du-jour"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-bold ${
            pathname === '/menu-du-jour' ? 'bg-[#eab308] text-[#2b1810]' : 'text-amber-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Menu Jour</span>
        </Link>

        <Link
          href="/commander"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-bold relative ${
            pathname === '/commander' ? 'bg-[#eab308] text-[#2b1810]' : 'text-amber-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />
          </svg>
          <span>Panier ({totalItems})</span>
        </Link>

        <Link
          href="/mes-commandes"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-bold ${
            pathname === '/mes-commandes' ? 'bg-[#eab308] text-[#2b1810]' : 'text-amber-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Suivi</span>
        </Link>

        <a
          href="tel:+22602809906"
          className="flex flex-col items-center justify-center py-1 rounded-lg bg-[#16a34a] text-white text-[11px] font-extrabold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>Appeler</span>
        </a>
      </div>
    </div>
  );
}
