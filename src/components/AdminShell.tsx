'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from './CartContext';
import { PhoneIcon } from './Icons';

export default function AdminShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useCart();
  const [dbConnected, setDbConnected] = useState(true);

  // Isolation stricte de l'espace Admin : vérification de la session authentifiée
  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { authenticated: false }))
      .then(d => {
        if (d.authenticated === false) {
          router.push('/admin/login');
        } else {
          setDbConnected(d.database_connected !== false);
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = async () => {
    localStorage.setItem('admin_logged_out', 'true');
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    router.push('/admin/login');
  };

  const navLinks = [
    {
      href: '/admin',
      label: 'Tableau de bord',
      shortLabel: 'Accueil',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3'
    },
    {
      href: '/admin/menu-du-jour',
      label: 'Menu du jour (Riz, Soupes...)',
      shortLabel: 'Menu Jour',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    {
      href: '/admin/plats',
      label: 'Plats & Sur Commande',
      shortLabel: 'Plats',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
    },
    {
      href: '/admin/rapport-menus',
      label: 'Rapports & PDF Menus',
      shortLabel: 'Rapports PDF',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      href: '/admin/galerie',
      label: 'Galerie Photos',
      shortLabel: 'Galerie',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    {
      href: '/admin/qr-code',
      label: 'QR Code Tables',
      shortLabel: 'QR Code',
      icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h3v3h-3v-3zm3-3h3v3h-3v-3z'
    },
    {
      href: '/admin/parametres',
      label: 'Paramètres',
      shortLabel: 'Paramètres',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f3e7d7] text-[#2b1810] relative overflow-x-hidden pb-20 lg:pb-6">
      {/* FILIGRANE ARTISTIQUE DU LOGO EN ARRIÈRE-PLAN */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none print:hidden"
      >
        <div className="w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] lg:w-[580px] lg:h-[580px] rounded-full border-4 border-[#d99b26]/20 p-4">
          <img
            src="/images/logo_gratitude.jpg"
            alt=""
            className="w-full h-full rounded-full object-cover opacity-[0.10] saturate-125 mix-blend-multiply"
          />
        </div>
      </div>

      {/* TOP BANNER FIXE EN HAUT */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#7a1212] via-[#941919] to-[#680e0e] text-white border-b-2 border-[#eab308] shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/images/logo_gratitude.jpg"
              alt="Logo"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-[#eab308] bg-white shadow shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-extrabold text-xs sm:text-base lg:text-lg leading-tight truncate">
                Espace Administrateur — La Gratitude
              </h1>
              <p className="hidden sm:block text-[11px] text-amber-100/90 truncate">
                Gestion du Menu du Jour, des Plats sur Commande et des Rapports PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="hidden md:inline-flex px-3 py-1.5 rounded-xl bg-white/15 border border-white/25 text-amber-100 text-xs font-bold items-center gap-1.5 whitespace-nowrap">
              <PhoneIcon className="w-3.5 h-3.5 text-[#facc15]" />
              <span>{settings.phone || '+226 02 80 99 06'}</span>
            </span>
            <Link
              href="/"
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#eab308] hover:brightness-110 text-[#2b1810] text-[11px] sm:text-xs font-extrabold shadow transition whitespace-nowrap"
            >
              Site client →
            </Link>
            <button
              onClick={handleLogout}
              className="lg:hidden px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-rose-100 border border-white/20 text-[11px] font-bold whitespace-nowrap"
              title="Déconnexion sécurisée"
            >
              Sortir
            </button>
          </div>
        </div>

        {/* BARRE DE NAVIGATION MOBILE & TABLETTE (< lg) : Cohérente, compacte et déroulante horizontalement */}
        <div className="lg:hidden bg-[#590b0b] border-t border-white/15 px-2 py-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">
            {navLinks.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition ${
                    isActive
                      ? 'bg-[#eab308] text-[#2b1810] font-extrabold shadow'
                      : 'text-amber-100/90 hover:bg-white/10 font-semibold'
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                  </svg>
                  <span>{link.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {!dbConnected && (
        <div className="relative z-20 bg-amber-700 text-amber-50 px-4 py-2 text-xs font-bold text-center border-b border-amber-900 shadow-inner print:hidden">
          Attention : la base de donnees distante Neon (DATABASE_URL) n est pas connectee. Les donnees actuelles sont conservees en memoire temporaire et seront reinitialisees au prochain redemarrage du serveur.
        </div>
      )}

      {/* MAIN LAYOUT : Sur ordinateur (lg+), la carte bordeaux à gauche est verrouillée (fixed) et ne bouge jamais au scroll */}
      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-5 lg:p-6">
        {/* SIDEBAR BORDEAUX ORDINATEUR (lg+) : 100% fixe à l'écran, ne bouge jamais quand on scrolle */}
        <aside className="hidden lg:flex lg:flex-col lg:justify-between lg:fixed lg:top-[84px] lg:w-[270px] xl:w-[285px] lg:max-h-[calc(100vh-104px)] bg-gradient-to-b from-[#6e0f0f] to-[#4c0909] text-white rounded-2xl border-2 border-[#eab308]/50 p-4 shadow-xl z-20 print:hidden">
          <div className="space-y-4 overflow-y-auto pr-0.5">
            <div className="flex items-center gap-3 pb-3 border-b border-white/15">
              <img
                src="/images/logo_gratitude.jpg"
                alt="Logo"
                className="w-11 h-11 rounded-full object-cover border-2 border-[#eab308] shrink-0 bg-white"
              />
              <div>
                <span className="text-xs block text-amber-200">Restaurant</span>
                <span className="font-script text-lg text-white">La Gratitude</span>
              </div>
            </div>

            <nav className="space-y-1.5 text-xs xl:text-sm">
              {navLinks.map(link => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition ${
                      isActive
                        ? 'bg-[#eab308] text-[#2b1810] font-extrabold shadow-md'
                        : 'text-amber-50 hover:bg-white/10 font-medium'
                    }`}
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                    </svg>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 mt-4 border-t border-white/15 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-xs text-rose-200 font-semibold text-left transition"
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Déconnexion sécurisée</span>
            </button>
          </div>
        </aside>

        {/* CONTENU DE LA PAGE ACTIVE (Décalé à droite sur ordinateur pour laisser la place à la sidebar fixe)
            NB : Aucun backdrop-blur ni transform ici afin que toutes les fenêtres modales (Ajouter/Modifier un plat)
            s'ouvrent toujours exactement au centre de l'écran ! */}
        <section className="lg:ml-[290px] xl:ml-[305px] bg-white/95 rounded-2xl border-2 border-[#d6c3ae] shadow-xl p-3.5 sm:p-6 space-y-4 sm:space-y-5 relative print:ml-0 print:border-none print:shadow-none print:bg-transparent print:p-0">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0 overflow-hidden rounded-2xl print:hidden"
          >
            <img
              src="/images/logo_gratitude.jpg"
              alt=""
              className="w-64 h-64 sm:w-96 sm:h-96 rounded-full object-cover opacity-[0.06] mix-blend-multiply"
            />
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3 sm:pb-4 print:hidden">
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-[#2b1810] leading-snug">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-full shrink-0">
              <span className="w-5 h-5 rounded-full bg-[#991b1b] text-white flex items-center justify-center text-xs">
                A
              </span>
              <span>Session Admin</span>
            </div>
          </div>

          <div className="relative z-10 space-y-4 sm:space-y-5">{children}</div>
        </section>
      </div>

      {/* BARRE D'ACCÈS RAPIDE FIXE EN BAS SUR TÉLÉPHONE (< lg) */}
      <nav
        aria-label="Navigation rapide administrateur sur mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-r from-[#590b0b] via-[#7a1212] to-[#4c0909] text-white border-t-2 border-[#eab308] shadow-[0_-6px_20px_rgba(0,0,0,0.3)] print:hidden"
      >
        <div className="grid grid-cols-5 gap-0.5 px-1 py-1.5 max-w-md mx-auto">
          {[
            navLinks[0], // Accueil
            navLinks[1], // Menu Jour
            navLinks[2], // Plats
            navLinks[3], // Rapports PDF
            navLinks[4]  // Galerie
          ].map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl text-[10px] leading-tight transition ${
                  isActive
                    ? 'bg-[#eab308] text-[#2b1810] font-extrabold shadow'
                    : 'text-amber-100/90 hover:bg-white/10 font-semibold'
                }`}
              >
                <svg
                  className="w-4 h-4 mb-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="truncate max-w-full">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
