'use client';

import React from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import { PhoneIcon, WhatsAppIcon } from '@/components/Icons';
import { RESTAURANT_PHONE_DISPLAY, RESTAURANT_PHONE_TEL, RESTAURANT_WHATSAPP } from '@/lib/constants';

export default function MesCommandesRedirectPage() {
  return (
    <ClientShell>
      <div className="bg-white/95 backdrop-blur-[2px] rounded-2xl border-2 border-[#dec6a7] shadow-lg p-6 sm:p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-[#881313] flex items-center justify-center mx-auto">
          <PhoneIcon className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#2b1810]">
          Commandes uniquement par téléphone
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Chaque visiteur dispose d’un espace personnel totalement isolé. Pour passer ou suivre une commande auprès du Restaurant La Gratitude, appelez directement notre numéro officiel :
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href={`tel:${RESTAURANT_PHONE_TEL}`}
            className="px-5 py-3 rounded-xl bg-[#881313] hover:bg-[#680e0e] text-white font-extrabold text-xs sm:text-sm shadow inline-flex items-center gap-2 whitespace-nowrap transition"
          >
            <PhoneIcon className="w-4 h-4 shrink-0" />
            <span>Appeler le {RESTAURANT_PHONE_DISPLAY}</span>
          </a>
          <a
            href={`https://wa.me/${RESTAURANT_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xs sm:text-sm shadow inline-flex items-center gap-2 whitespace-nowrap transition"
          >
            <WhatsAppIcon className="w-4 h-4 shrink-0" />
            <span>WhatsApp ({RESTAURANT_PHONE_DISPLAY})</span>
          </a>
        </div>
        <div className="pt-2">
          <Link href="/menu-du-jour" className="text-xs font-extrabold text-[#881313] underline">
            Retourner au Menu du Jour →
          </Link>
        </div>
      </div>
    </ClientShell>
  );
}
