'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BellIcon, CloseIcon } from './Icons';
import { useCart } from './CartContext';

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext) sharedAudioContext = new AudioCtx();
  return sharedAudioContext;
}

function playOrderChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const notes = [587.33, 880, 1174.66]; // D5, A5, D6 bell chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.14);
      osc.stop(ctx.currentTime + idx * 0.14 + 0.48);
    });
  } catch {}
}

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
  const { showToast } = useCart();
  const lastMaxIdRef = useRef<number | null>(null);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Vérifie la session + surveille l'ID max (et non le nombre de commandes :
  // un COUNT peut stagner si la liste est limitée → plus aucune alerte).
  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { authenticated: false }))
      .then(d => {
        if (d.authenticated === false) router.push('/admin/login');
      })
      .catch(() => {});

    const checkOrders = async () => {
      try {
        const res = await fetch('/api/orders', { cache: 'no-store' });
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data.orders)) return;

        const maxId = data.orders.reduce(
          (max: number, order: { id?: number | string }) =>
            Math.max(max, Number(order.id) || 0),
          0
        );

        if (lastMaxIdRef.current !== null && maxId > lastMaxIdRef.current) {
          const newest =
            data.orders.find(
              (order: { id?: number | string }) => Number(order.id) === maxId
            ) || data.orders[0];
          playOrderChime();
          const msg = `Nouvelle commande ${newest?.order_code || ''} de ${
            newest?.customer_name || 'Client'
          } (${newest?.total_cfa || ''} F) !`;
          setLiveAlert(msg);
          showToast(msg);
        }

        lastMaxIdRef.current = maxId;
      } catch {}
    };

    checkOrders();
    const timer = setInterval(checkOrders, 7000);
    return () => clearInterval(timer);
  }, [router, showToast]);

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
    { href: '/admin', label: 'Tableau de bord', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3' },
    { href: '/admin/plats', label: 'Plats & Photos', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { href: '/admin/menu-du-jour', label: 'Menu du jour', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { href: '/admin/rapport-menus', label: 'Rapports & PDF Menus', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/admin/commandes', label: 'Commandes (Live)', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    { href: '/admin/galerie', label: 'Galerie Photos', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { href: '/admin/qr-code', label: 'QR Code Tables', icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h3v3h-3v-3zm3-3h3v3h-3v-3z' },
    { href: '/admin/statistiques', label: 'Statistiques', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { href: '/admin/parametres', label: 'Paramètres', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f3e7d7] text-[#2b1810] relative overflow-x-hidden">
      {/* FILIGRANE ARTISTIQUE DU LOGO EN ARRIÈRE-PLAN (ESPACE ADMIN GLOBAL) */}
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

      {/* TOP BANNER */}
      <header className="relative z-10 bg-gradient-to-r from-[#7a1212] via-[#941919] to-[#680e0e] text-white px-4 sm:px-8 py-3 border-b-2 border-[#eab308] shadow-md print:hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo_gratitude.jpg"
              alt="Logo"
              className="w-12 h-12 rounded-full object-cover border-2 border-[#eab308] bg-white shadow"
            />
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight">
                Espace Administrateur — Restaurant La Gratitude
              </h1>
              <p className="text-xs text-amber-100/90">
                Gestion en temps réel • Alertes sonores de commandes actives
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playOrderChime();
              setSoundEnabled(true);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border-2 shadow transition ${
              soundEnabled
                ? 'bg-emerald-600 border-emerald-300 text-white'
                : 'bg-[#eab308] border-amber-200 text-[#2b1810] hover:brightness-110'
            }`}
            title="À activer une fois par session : les navigateurs bloquent le son sans interaction."
          >
            {soundEnabled ? '🔔 Alerte sonore active' : '🔔 Activer l’alerte sonore'}
          </button>
        </div>
      </header>

      {/* LIVE ORDER BANNER ALERT */}
      {liveAlert && (
        <div className="bg-[#16a34a] text-white px-4 py-2.5 text-center font-extrabold text-xs sm:text-sm flex items-center justify-center gap-4 shadow-md print:hidden">
          <span className="inline-flex items-center gap-1.5">
            <BellIcon className="w-4 h-4 shrink-0" />
            <span>{liveAlert}</span>
          </span>
          <Link
            href="/admin/commandes"
            onClick={() => setLiveAlert(null)}
            className="px-3 py-1 rounded-lg bg-white text-[#16a34a] font-extrabold text-xs"
          >
            Ouvrir la commande
          </Link>
          <button onClick={() => setLiveAlert(null)} className="text-white/80 font-bold inline-flex items-center justify-center">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sidebar Bordeaux */}
        <aside className="lg:col-span-3 bg-gradient-to-b from-[#6e0f0f] to-[#4c0909] text-white rounded-2xl border-2 border-[#eab308]/50 p-4 shadow-xl flex flex-col justify-between print:hidden">
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/15">
              <img
                src="/images/logo_gratitude.jpg"
                alt="Logo"
                className="w-11 h-11 rounded-full object-cover border-2 border-[#eab308] shrink-0"
              />
              <div>
                <span className="text-xs block text-amber-200">Restaurant</span>
                <span className="font-script text-lg text-white">La Gratitude</span>
              </div>
            </div>

            <nav className="space-y-1.5 text-xs sm:text-sm">
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
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                    </svg>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 mt-6 border-t border-white/15">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-xs text-rose-200 font-semibold text-left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Déconnexion sécurisée</span>
            </button>
          </div>
        </aside>

        {/* Active Page Content */}
        <section className="lg:col-span-9 bg-white/90 backdrop-blur-[2px] rounded-2xl border-2 border-[#d6c3ae] shadow-xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
          {/* Filigrane du Logo centré à l'intérieur du panneau Admin */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0 print:hidden"
          >
            <img
              src="/images/logo_gratitude.jpg"
              alt=""
              className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover opacity-[0.07] mix-blend-multiply"
            />
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-4 print:hidden">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2b1810]">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-full">
              <span className="w-5 h-5 rounded-full bg-[#991b1b] text-white flex items-center justify-center text-xs">
                A
              </span>
              <span>Administrateur</span>
            </div>
          </div>

          <div className="relative z-10 space-y-5">{children}</div>
        </section>
      </div>
    </div>
  );
}
