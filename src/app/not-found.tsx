'use client';

import React from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import { PhoneIcon, CompassIcon } from '@/components/Icons';

export default function NotFoundPage() {
  return (
    <ClientShell>
      <div className="bg-white/95 rounded-2xl border-2 border-[#881313] shadow-lg p-6 sm:p-10 max-w-xl mx-auto text-center space-y-4 my-6">
        <img
          src="/images/logo_gratitude.jpg"
          alt="Logo Restaurant La Gratitude"
          className="w-20 h-20 rounded-full object-cover border-2 border-[#eab308] mx-auto shadow"
        />
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#2b1810]">
          Page introuvable — Restaurant La Gratitude
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          La page que vous recherchez n’existe pas ou a été déplacée. Retrouvez immédiatement notre Carte, notre Menu du Jour ou nos coordonnées :
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-[#eab308] hover:brightness-105 text-[#2b1810] font-extrabold text-xs shadow transition"
          >
            Retour à l’Accueil
          </Link>
          <Link
            href="/menu"
            className="px-4 py-2.5 rounded-xl bg-[#881313] hover:bg-[#680e0e] text-white font-extrabold text-xs shadow transition"
          >
            Notre Carte &amp; Sur Commande
          </Link>
          <Link
            href="/menu-du-jour"
            className="px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#2b1810] font-extrabold text-xs transition"
          >
            Menu du Jour
          </Link>
          <Link
            href="/contact"
            className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs inline-flex items-center gap-1 transition"
          >
            <CompassIcon className="w-3.5 h-3.5" />
            <span>Contact &amp; GPS</span>
          </Link>
        </div>
        <div className="pt-3 border-t border-stone-200">
          <a
            href="tel:+22602809906"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#881313] hover:underline"
          >
            <PhoneIcon className="w-3.5 h-3.5" />
            <span>Appeler le +226 02 80 99 06</span>
          </a>
        </div>
      </div>
    </ClientShell>
  );
}
