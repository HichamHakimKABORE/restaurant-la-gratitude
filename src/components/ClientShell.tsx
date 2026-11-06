'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart, formatCFA } from './CartContext';
import { ChefHatIcon, StarIcon, ThumbUpIcon, HeartIcon, WhatsAppIcon } from './Icons';

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
      {/* FILIGRANE ARTISTIQUE DU LOGO EN ARRIÈRE-PLAN (ESPACE CLIENT) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] lg:w-[620px] lg:h-[620px] rounded-full border-4 border-[#d99b26]/20 p-4 shadow-2xl bg-gradient-to-b from-[#fffcf7]/30 to-[#f3dfc1]/30 backdrop-blur-[1px]">
            <img
              src="/images/logo_gratitude.jpg"
              alt=""
              className="w-full h-full rounded-full object-cover opacity-[0.11] saturate-125 contrast-110 mix-blend-multiply"
            />
          </div>
        </div>
      </div>

      {/* 1. TOP OFFICIAL HEADER BANNER */}
      <header className="relative z-10 bg-gradient-to-r from-[#fffcf7] via-[#f9edd9] to-[#f3dfc1] border-b-4 border-[#801313] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Vrai Logo Version 1 + Nom */}
          <Link href="/" className="flex items-center gap-4">
            <img
              src="/images/logo_gratitude.jpg"
              alt="Logo Officiel Restaurant La Gratitude"
              className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-[#d99b26] shadow-xl bg-white shrink-0"
            />
            <div>
              <span className="block text-base sm:text-xl font-bold text-[#2b1810] tracking-tight leading-none">
                Restaurant
              </span>
              <h1 className="font-script text-3xl sm:text-5xl text-[#991b1b] leading-tight drop-shadow-sm">
                La Gratitude
              </h1>
              <p className="font-script text-xs sm:text-base text-[#3f2314]">
                Bon goût, bonne humeur !
              </p>
            </div>
          </Link>

          {/* Center: Slogan */}
          <div className="hidden lg:flex flex-col items-center text-center">
            <p className="font-script text-2xl text-[#3b1c0e] leading-snug">
              Une cuisine savoureuse,
              <br />
              un service de qualité !
            </p>
            <div className="w-44 h-1.5 rounded-full bg-gradient-to-r from-transparent via-[#eab308] to-transparent mt-1" />
          </div>

          {/* Right: Zagtouli, Téléphone, WhatsApp */}
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 text-xs sm:text-sm border-l-2 border-[#801313]/25 pl-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#991b1b] text-white flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <div>
                  <strong className="block leading-tight">Zagtouli, route de Bobo</strong>
                  <span className="text-xs text-[#6b4c3b]">Ouagadougou - Burkina Faso</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#991b1b] text-white flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <a href="tel:+22660186525" className="font-extrabold text-sm sm:text-base text-[#2b1810] hover:text-[#991b1b]">
                  +226 60 18 65 25
                </a>
                <a
                  href="https://wa.me/22660186525"
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white flex items-center justify-center shadow transition"
                  title="WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Vraie Photo du Monument des Martyrs & Drapeau du Burkina Faso */}
            <div className="hidden sm:flex items-center gap-2.5 bg-[#f3dcb9]/75 px-3 py-2 rounded-2xl border-2 border-[#d99b26] shadow-md shrink-0">
              <img
                src="/images/monument_exact.jpg"
                alt="Monument des Martyrs — Ouagadougou"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover object-top border border-[#b47b22] shadow-sm bg-white"
              />
              <svg
                className="w-12 h-8 rounded shadow-sm border border-black/20 shrink-0"
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

        {/* Navigation Bar (Separate Dedicated Pages) */}
        <nav className="bg-gradient-to-r from-[#680e0e] via-[#881313] to-[#5a0b0b] px-4 sm:px-8 py-2.5 border-t border-white/15">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-xs sm:text-sm">
              {navItems.map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3.5 py-1.5 rounded-lg font-extrabold transition shrink-0 ${
                      isActive
                        ? 'bg-[#eab308] text-[#2b1810] shadow'
                        : 'text-amber-100 hover:bg-white/10 font-semibold'
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
                  className="px-3 py-1.5 rounded-lg bg-[#16a34a] text-white font-extrabold text-xs shadow"
                >
                  Panier : {formatCFA(totalPrice)}
                </Link>
              )}
              <Link
                href="/admin"
                className="px-3.5 py-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-amber-300 border border-amber-400/40 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Espace Admin</span>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* 2. PAGE CONTENT */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {children}
      </main>

      {/* 3. FOOTER PROMISE BAR */}
      <footer className="relative z-10 bg-gradient-to-r from-[#431407] via-[#5c190b] to-[#431407] text-white border-t-4 border-[#eab308] mt-8 pb-20 sm:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 font-bold">
              <span className="w-7 h-7 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center">
                <ChefHatIcon className="w-4 h-4" />
              </span>
              <span>Cuisine de qualité</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              <span className="w-7 h-7 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center">
                <StarIcon className="w-4 h-4" />
              </span>
              <span>Service rapide</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              <span className="w-7 h-7 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center">
                <ThumbUpIcon className="w-4 h-4" />
              </span>
              <span>Des prix abordables</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              <span className="w-7 h-7 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center">
                <HeartIcon className="w-4 h-4" />
              </span>
              <span>Votre satisfaction, notre priorité</span>
            </div>
          </div>

          <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#facc15] via-[#eab308] to-[#ca8a04] text-[#2b1810] font-script text-base sm:text-lg shadow-md">
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
          href="tel:+22660186525"
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
