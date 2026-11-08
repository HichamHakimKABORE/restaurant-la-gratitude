'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { useCart } from '@/components/CartContext';

export default function AdminParametresPage() {
  const router = useRouter();
  const [restName, setRestName] = useState('Restaurant La Gratitude');
  const [restSlogan, setRestSlogan] = useState(
    'Une cuisine savoureuse, un service de qualité !'
  );
  const [restPhone, setRestPhone] = useState('+226 02 80 99 06');
  const [restAddress, setRestAddress] = useState(
    'Zagtouli, route de Bobo, Ouagadougou - Burkina Faso'
  );
  const [restHours, setRestHours] = useState(
    'Lundi - Dimanche de 07h00 à 23h00'
  );
  const [saving, setSaving] = useState(false);
  const { showToast, setSettings } = useCart();

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.settings) {
          setRestName(data.settings.restaurant_name || 'Restaurant La Gratitude');
          setRestSlogan(
            data.settings.slogan || 'Une cuisine savoureuse, un service de qualité !'
          );
          setRestPhone(data.settings.phone || '+226 02 80 99 06');
          setRestAddress(
            data.settings.address ||
              'Zagtouli, route de Bobo, Ouagadougou - Burkina Faso'
          );
          setRestHours(
            data.settings.opening_hours || 'Lundi - Dimanche de 07h00 à 23h00'
          );
        }
      });
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: restName,
          slogan: restSlogan,
          phone: restPhone,
          whatsapp: restPhone.replace(/[^0-9]/g, ''),
          address: restAddress,
          opening_hours: restHours
        })
      });
      if (res.status === 401) {
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.ok) {
        if (data.settings) setSettings(data.settings);
        showToast(
          'Paramètres enregistrés et mis à jour sur tout le site !'
        );
      } else {
        showToast('Erreur lors de la sauvegarde.');
      }
    } catch {
      showToast('Erreur réseau lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Paramètres du Restaurant"
      subtitle="Informations générales, coordonnées et horaires d’ouverture sauvegardés dans Neon PostgreSQL"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-8 space-y-4 text-xs sm:text-sm">
          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Nom du restaurant
            </label>
            <input
              type="text"
              value={restName}
              onChange={e => setRestName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Slogan principal
            </label>
            <input
              type="text"
              value={restSlogan}
              onChange={e => setRestSlogan(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Téléphone &amp; WhatsApp
            </label>
            <input
              type="text"
              value={restPhone}
              onChange={e => setRestPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Adresse &amp; Coordonnées GPS
            </label>
            <input
              type="text"
              value={restAddress}
              onChange={e => setRestAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Horaires d’ouverture
            </label>
            <input
              type="text"
              value={restHours}
              onChange={e => setRestHours(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold"
            />
          </div>
        </div>

        <div className="md:col-span-4 bg-[#fdf5e8] rounded-2xl border-2 border-[#eab308] p-6 flex flex-col items-center text-center space-y-4">
          <img
            src="/images/logo_gratitude.jpg"
            alt="Logo Officiel"
            className="w-32 h-32 rounded-full object-cover border-4 border-[#d99b26] shadow-xl bg-white"
          />
          <div className="text-xs text-stone-600">
            Logo officiel Version 1 — Restaurant La Gratitude
          </div>
          <button
            disabled={saving}
            onClick={handleSaveSettings}
            className="w-full py-3 px-4 rounded-xl bg-[#881313] hover:bg-[#a81c1c] text-white font-extrabold text-xs shadow-lg transition"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
