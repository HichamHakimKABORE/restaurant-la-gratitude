'use client';

import React from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import { useCart } from '@/components/CartContext';
import { PhoneIcon, WhatsAppIcon, MapPinIcon, CompassIcon } from '@/components/Icons';
import { formatPhoneList, toTelHref } from '@/lib/phone';

export default function CommanderParTelephonePage() {
  const { settings } = useCart();
  const phoneList = formatPhoneList(settings.phone, settings.phone_2);
  const whatsappNum = (settings.whatsapp || '22602809906').replace(/[^0-9]/g, '') || '22602809906';

  return (
    <ClientShell>
      <div className="bg-white/95 backdrop-blur-[2px] rounded-2xl border-2 border-[#881313] shadow-lg p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-[#eab308] text-[#881313] flex items-center justify-center mx-auto shadow">
          <PhoneIcon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-[#eab308] text-[#2b1810] font-extrabold text-xs">
            Commande Directe par Téléphone
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2b1810]">
            Appelez le {settings.restaurant_name || 'Restaurant La Gratitude'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            Pour commander un plat du Menu du Jour ou un Plat sur Commande (Pizzas, Poulets, Mouton au four, Salades...), contactez directement notre équipe :
          </p>
        </div>

        <div className="bg-[#fdf5e8] rounded-2xl border-2 border-[#dec6a7] p-5 space-y-3">
          <p className="text-xs font-bold uppercase text-stone-500">
            {phoneList.length > 1 ? 'Numéros officiels de commande' : 'Numéro officiel de commande'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {phoneList.map(num => (
              <a
                key={num}
                href={toTelHref(num)}
                className="text-2xl sm:text-3xl font-extrabold text-[#881313] hover:underline whitespace-nowrap"
              >
                {num}
              </a>
            ))}
          </div>
          <p className="text-xs text-stone-600 flex items-center justify-center gap-1.5">
            <MapPinIcon className="w-4 h-4 text-[#881313] shrink-0" />
            <span>{settings.address || 'Zagtouli, route de Bobo — Ouagadougou'} ({settings.opening_hours || '07h00 à 23h00'})</span>
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-1">
          {phoneList.map(num => (
            <a
              key={num}
              href={toTelHref(num)}
              className="py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white font-extrabold text-xs sm:text-sm shadow-lg inline-flex items-center justify-center gap-2 whitespace-nowrap transition"
            >
              <PhoneIcon className="w-4 h-4 shrink-0" />
              <span>Appeler le {num}</span>
            </a>
          ))}

          <a
            href={`https://wa.me/${whatsappNum}`}
            target="_blank"
            rel="noopener,noreferrer"
            className="py-3.5 px-5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xs sm:text-sm shadow-lg inline-flex items-center justify-center gap-2 whitespace-nowrap transition"
          >
            <WhatsAppIcon className="w-4 h-4 shrink-0" />
            <span>Contacter sur WhatsApp</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-stone-200 text-xs font-extrabold">
          <Link href="/menu-du-jour" className="text-[#881313] hover:underline">
            Voir le Menu du Jour →
          </Link>
          <span className="text-stone-300">•</span>
          <Link href="/menu" className="text-[#881313] hover:underline">
            Voir les Plats sur Commande →
          </Link>
          <span className="text-stone-300">•</span>
          <Link href="/contact" className="text-[#881313] hover:underline inline-flex items-center gap-1">
            <CompassIcon className="w-3.5 h-3.5" />
            <span>Itinéraire GPS</span>
          </Link>
        </div>
      </div>
    </ClientShell>
  );
}
