'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { PrinterIcon, QrCodeIcon, MapPinIcon, PhoneIcon } from '@/components/Icons';

export default function AdminQrCodePage() {
  const [siteUrl, setSiteUrl] = useState('https://restaurant-la-gratitude.vercel.app/menu-du-jour');
  const [tableNumber, setTableNumber] = useState('Table 1');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(`${window.location.origin}/menu-du-jour`);
    }
  }, []);

  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    siteUrl
  )}`;

  return (
    <AdminShell
      title="QR Code Officiel — Menu du Jour sur Table"
      subtitle="Imprimez cette fiche et posez-la sur les tables du restaurant à Zagtouli pour que vos clients scannent le Menu du Jour."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Settings (Hidden on Print) */}
        <div className="lg:col-span-5 space-y-4 print:hidden bg-stone-50 p-5 rounded-2xl border border-stone-200 text-xs sm:text-sm">
          <h3 className="font-extrabold text-base text-[#2b1810]">
            Personnaliser l’affiche QR Code
          </h3>
          <div>
            <label className="font-bold block mb-1">
              Lien du Menu du Jour encodé dans le QR Code :
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={e => setSiteUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">
              Indication Table / Espace (optionnel) :
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="Ex: Table 1, Terrasse, VIP..."
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white font-extrabold text-sm shadow-lg inline-flex items-center justify-center gap-2"
          >
            <PrinterIcon className="w-4 h-4 shrink-0" />
            <span>Imprimer l’affiche QR Code</span>
          </button>
        </div>

        {/* Right Printable Card */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="bg-gradient-to-b from-[#fffcf7] to-[#f9edd9] border-4 border-[#881313] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-5">
            <div className="flex flex-col items-center space-y-2">
              <img
                src="/images/logo_gratitude.jpg"
                alt="Logo Restaurant La Gratitude"
                className="w-24 h-24 rounded-full object-cover border-4 border-[#d99b26] shadow-lg bg-white"
              />
              <span className="text-sm font-bold text-[#2b1810] uppercase tracking-wider">
                Restaurant
              </span>
              <h2 className="font-script text-4xl text-[#991b1b]">
                La Gratitude
              </h2>
              <p className="font-script text-base text-[#3b1c0e]">
                Une cuisine savoureuse, un service de qualité !
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border-2 border-[#eab308] shadow-inner inline-block">
              <img
                src={qrImageSrc}
                alt="QR Code Menu du Jour"
                className="w-52 h-52 mx-auto"
              />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-4 py-1 rounded-full bg-[#881313] text-white font-extrabold text-xs uppercase tracking-wider">
                {tableNumber}
              </span>
              <h3 className="font-extrabold text-lg text-[#2b1810] pt-1 flex items-center justify-center gap-2">
                <QrCodeIcon className="w-5 h-5 text-[#881313] shrink-0" />
                <span>Scannez pour voir le Menu du Jour</span>
              </h3>
              <p className="text-xs text-stone-600">
                Découvrez en direct les plats préparés aujourd’hui, nos Pizzas, Poulets, Grillades et Boissons, et commandez depuis votre table !
              </p>
            </div>

            <div className="pt-3 border-t border-[#dec6a7] text-xs font-bold text-[#2b1810] flex items-center justify-between">
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="w-3.5 h-3.5 text-[#881313] shrink-0" />
                <span>Zagtouli, route de Bobo</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <PhoneIcon className="w-3.5 h-3.5 text-[#881313] shrink-0" />
                <span>+226 02 80 99 06</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
