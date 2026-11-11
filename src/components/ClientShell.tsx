'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChefHatIcon, StarIcon, ThumbUpIcon, HeartIcon, WhatsAppIcon, MapPinIcon, PhoneIcon, CompassIcon, CloseIcon } from './Icons';
import RestaurantGallerySlider from './RestaurantGallerySlider';
import { useCart } from './CartContext';
import { formatPhoneList, toTelHref } from '@/lib/phone';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings } = useCart();
  const [callMenuOpen, setCallMenuOpen] = useState(false);
  const phoneList = formatPhoneList(settings.phone, settings.phone_2);
  const whatsappNum = (settings.whatsapp || '22602809906').replace(/[^0-9]/g, '') || '22602809906';

  return (
    <div className="min-h-screen flex flex-col bg-[#f7efe4] text-[#2b1810] relative overflow-x-hidden pb-16 print:pb-0">
      {/* FILIGRANE DU LOGO EN ARRIÈRE-PLAN */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none print:hidden"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-[220px] h-[220px] sm:w-[480px] sm:h-[480px] lg:w-[620px] lg:h-[620px] rounded-full border-4 border-[#d99b26]/60 p-2 shadow-2xl">
            <img
              src="/images/logo_gratitude.jpg"
              alt=""
              className="w-full h-full rounded-full object-cover opacity-55 saturate-125 contrast-125 mix-blend-multiply"
            />
          </div>
        </div>
      </div>

      {/* 1. EN-TÊTE OFFICIEL EN HAUT (Sans barre de navigation en haut — toute la navigation est en bas) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#fffcf7] via-[#f9edd9] to-[#f3dfc1] border-b-2 border-[#801313] shadow-md print:static">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Gauche : Logo + Nom */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <img
              src="/images/logo_gratitude.jpg"
              alt="Logo Officiel Restaurant La Gratitude"
              className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#d99b26] shadow bg-white shrink-0"
            />
            <div>
              <span className="block text-[9px] sm:text-xs font-bold text-[#2b1810] tracking-tight leading-none">
                Restaurant
              </span>
              <h1 className="font-script text-base sm:text-2xl text-[#991b1b] leading-tight">
                La Gratitude
              </h1>
              <p className="hidden sm:block font-script text-[10px] sm:text-xs text-[#3f2314] leading-none">
                Bon goût, bonne humeur !
              </p>
            </div>
          </Link>

          {/* Centre : Slogan */}
          <div className="hidden lg:flex flex-col items-center text-center">
            <p className="font-script text-base text-[#3b1c0e] leading-snug">
              {settings.slogan || 'Une cuisine savoureuse, un service de qualité !'}
            </p>
          </div>

          {/* Droite : Zagtouli, Téléphone, Monument */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            <div className="text-[10px] sm:text-xs border-l border-[#801313]/25 sm:border-l-2 pl-1.5 sm:pl-3 space-y-0.5 min-w-0">
              <div className="hidden sm:flex items-center gap-1 leading-tight">
                <span className="w-3.5 h-3.5 rounded-full bg-[#991b1b] text-white flex items-center justify-center shrink-0">
                  <MapPinIcon className="w-2.5 h-2.5" />
                </span>
                <span className="font-bold text-[#2b1810]">
                  Zagtouli, route de Bobo
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 font-extrabold text-[#2b1810]">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5 leading-tight">
                  {phoneList.map((num, idx) => (
                    <React.Fragment key={num}>
                      {idx > 0 && <span className="hidden sm:inline text-stone-400 text-[10px]">/</span>}
                      <a
                        href={toTelHref(num)}
                        className="hover:text-[#991b1b] text-[10px] sm:text-xs whitespace-nowrap"
                      >
                        {num}
                      </a>
                    </React.Fragment>
                  ))}
                </div>
                <a
                  href={`https://wa.me/${whatsappNum}`}
                  target="_blank"
                  rel="noopener,noreferrer"
                  className="w-5 h-5 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white flex items-center justify-center shadow transition shrink-0"
                  title="WhatsApp"
                >
                  <WhatsAppIcon className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Vraie Photo du Monument des Martyrs & Drapeau du Burkina Faso */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-[#f3dcb9]/80 px-1 py-0.5 sm:px-2 sm:py-1 rounded-xl border border-[#d99b26] shadow-sm shrink-0">
              <img
                src="/images/monument_exact.jpg"
                alt="Monument des Martyrs — Ouagadougou"
                className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg object-cover object-top border border-[#b47b22] shadow-sm bg-white"
              />
              <svg
                className="w-5 h-3.5 sm:w-8 sm:h-5 rounded shadow-sm border border-black/20 shrink-0"
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
      </header>

      {/* 2. CONTENU DE LA PAGE */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-2 sm:p-6 pt-[60px] sm:pt-[74px] print:pt-4 space-y-3 sm:space-y-5">
        {children}
      </main>

      {/* GALERIE DÉFILANTE DES PHOTOS DU RESTAURANT */}
      <div className="print:hidden">
        <RestaurantGallerySlider />
      </div>

      {/* 3. FOOTER PROMISE BAR */}
      <footer className="relative z-10 bg-gradient-to-r from-[#431407] via-[#5c190b] to-[#431407] text-white border-t-2 sm:border-t-4 border-[#eab308] mt-2 sm:mt-4 print:hidden">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-6">
            <div className="flex items-center gap-1 font-bold">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center shrink-0">
                <ChefHatIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </span>
              <span>Cuisine de qualité</span>
            </div>
            <div className="flex items-center gap-1 font-bold">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center shrink-0">
                <StarIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </span>
              <span>Service rapide</span>
            </div>
            <div className="flex items-center gap-1 font-bold">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center shrink-0">
                <ThumbUpIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </span>
              <span>Des prix abordables</span>
            </div>
            <div className="flex items-center gap-1 font-bold">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#eab308] text-[#2b1810] flex items-center justify-center shrink-0">
                <HeartIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </span>
              <span>Votre satisfaction, notre priorité</span>
            </div>
          </div>

          <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-gradient-to-r from-[#facc15] via-[#eab308] to-[#ca8a04] text-[#2b1810] font-script text-[11px] sm:text-sm shadow-sm">
            Restaurant La Gratitude... Toujours avec vous !
          </div>
        </div>
      </footer>

      {/* 4. BARRE DE NAVIGATION FIXE EN BAS (Seule barre de navigation : Accueil, La Carte, Menu Jour, Contact & GPS, Appeler) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#680e0e] via-[#881313] to-[#5a0b0b] text-white border-t-2 border-[#eab308] px-1.5 sm:px-6 py-1 sm:py-1.5 shadow-2xl print:hidden touch-manipulation">
        <div className="max-w-4xl mx-auto grid grid-cols-5 gap-1 sm:gap-2">
          <Link
            href="/"
            prefetch={true}
            className={`touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap active:scale-95 ${
              pathname === '/' ? 'bg-[#eab308] text-[#2b1810] shadow' : 'text-amber-100 sm:hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3" />
            </svg>
            <span>Accueil</span>
          </Link>

          <Link
            href="/menu"
            prefetch={true}
            className={`touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap active:scale-95 ${
              pathname === '/menu' ? 'bg-[#eab308] text-[#2b1810] shadow' : 'text-amber-100 sm:hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>La Carte</span>
          </Link>

          <Link
            href="/menu-du-jour"
            prefetch={true}
            className={`touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap active:scale-95 ${
              pathname === '/menu-du-jour' ? 'bg-[#eab308] text-[#2b1810] shadow' : 'text-amber-100 sm:hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Menu Jour</span>
          </Link>

          <Link
            href="/contact"
            prefetch={true}
            className={`touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap active:scale-95 ${
              pathname === '/contact' ? 'bg-[#eab308] text-[#2b1810] shadow' : 'text-amber-100 sm:hover:bg-white/10'
            }`}
          >
            <CompassIcon className="w-4 h-4 shrink-0" />
            <span>Contact &amp; GPS</span>
          </Link>

          {phoneList.length > 1 ? (
            <button
              type="button"
              onClick={() => setCallMenuOpen(prev => !prev)}
              aria-expanded={callMenuOpen}
              aria-haspopup="dialog"
              className="touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg bg-[#16a34a] sm:hover:bg-[#15803d] text-white text-[10px] sm:text-xs font-extrabold whitespace-nowrap shadow transition active:scale-95"
            >
              <PhoneIcon className="w-4 h-4 shrink-0" />
              <span>Appeler</span>
            </button>
          ) : (
            <a
              href={toTelHref(phoneList[0])}
              className="touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg bg-[#16a34a] sm:hover:bg-[#15803d] text-white text-[10px] sm:text-xs font-extrabold whitespace-nowrap shadow transition active:scale-95"
            >
              <PhoneIcon className="w-4 h-4 shrink-0" />
              <span>Appeler</span>
            </a>
          )}
        </div>
      </nav>

      {/* SÉLECTEUR DE NUMÉRO SI 2 NUMÉROS SONT CONFIGURÉS */}
      {callMenuOpen && phoneList.length > 1 && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4 print:hidden"
          onClick={() => setCallMenuOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Choisir un numéro à appeler"
        >
          <div
            className="w-full max-w-sm bg-[#fffaf2] border-2 border-[#d99b26] rounded-2xl shadow-2xl p-4 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#ead8be] pb-2">
              <div className="flex items-center gap-2 text-[#881313] font-extrabold text-sm">
                <PhoneIcon className="w-4 h-4 shrink-0" />
                <span>Choisir le numéro à appeler</span>
              </div>
              <button
                type="button"
                onClick={() => setCallMenuOpen(false)}
                aria-label="Fermer"
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {phoneList.map((num, idx) => (
                <a
                  key={num}
                  href={toTelHref(num)}
                  onClick={() => setCallMenuOpen(false)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-extrabold text-sm shadow flex items-center justify-between gap-3 transition"
                >
                  <span className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 shrink-0" />
                    <span>{num}</span>
                  </span>
                  <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
                    {idx === 0 ? 'Principal' : 'Secondaire'}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
