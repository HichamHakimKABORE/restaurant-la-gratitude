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
  const [restPhone2, setRestPhone2] = useState('');
  const [restAddress, setRestAddress] = useState(
    'Zagtouli, route de Bobo, Ouagadougou - Burkina Faso'
  );
  const [restHours, setRestHours] = useState(
    'Lundi - Dimanche de 07h00 à 23h00'
  );
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast, setSettings } = useCart();

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) return null;
        return r.json();
      })
      .then(data => {
        if (data?.settings) {
          setRestName(data.settings.restaurant_name || 'Restaurant La Gratitude');
          setRestSlogan(
            data.settings.slogan || 'Une cuisine savoureuse, un service de qualité !'
          );
          setRestPhone(data.settings.phone || '+226 02 80 99 06');
          setRestPhone2(data.settings.phone_2 || '');
          setRestAddress(
            data.settings.address ||
              'Zagtouli, route de Bobo, Ouagadougou - Burkina Faso'
          );
          setRestHours(
            data.settings.opening_hours || 'Lundi - Dimanche de 07h00 à 23h00'
          );
        }
      })
      .catch(() => {});
  }, []);

  const normalizeBurkinaWhatsApp = (rawPhone: string) => {
    let digits = rawPhone.replace(/[^0-9]/g, '');
    if (digits.startsWith('00226')) {
      digits = digits.slice(2);
    } else if (digits.length === 8) {
      digits = `226${digits}`;
    }
    return digits || '22602809906';
  };

  const handleSaveSettings = async () => {
    const hasEmail = newAdminEmail.trim().length > 0;
    const hasPwd = newAdminPassword.trim().length > 0;

    if (hasEmail || hasPwd) {
      if (!currentAdminPassword.trim()) {
        showToast(
          'Pour modifier vos accès, vous devez saisir votre mot de passe Admin actuel.'
        );
        return;
      }
      if (!hasEmail || !hasPwd) {
        showToast(
          'Pour modifier vos accès Admin, remplissez à la fois le nouvel identifiant et le nouveau mot de passe.'
        );
        return;
      }
      if (newAdminPassword.trim().length < 8) {
        showToast('Le nouveau mot de passe doit comporter au moins 8 caractères.');
        return;
      }
    }

    if (!restPhone.trim()) {
      showToast('Le numéro de téléphone principal est obligatoire.');
      return;
    }

    setSaving(true);
    try {

      const normalizedWa = normalizeBurkinaWhatsApp(restPhone);
      const payload: Record<string, unknown> = {
        restaurant_name: restName.trim(),
        slogan: restSlogan.trim(),
        phone: restPhone.trim(),
        phone_2: restPhone2.trim(),
        whatsapp: normalizedWa,
        address: restAddress.trim(),
        opening_hours: restHours.trim()
      };

      if (hasEmail && hasPwd) {
        payload.current_admin_password = currentAdminPassword.trim();
        payload.new_admin_email = newAdminEmail.trim();
        payload.new_admin_password = newAdminPassword.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        showToast('Session expirée. Veuillez vous reconnecter.');
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.settings) setSettings(data.settings);
        setCurrentAdminPassword('');
        setNewAdminPassword('');
        showToast(
          hasEmail && hasPwd
            ? 'Paramètres et nouveaux identifiants enregistrés avec succès !'
            : 'Paramètres enregistrés et mis à jour sur tout le site !'
        );
      } else {
        showToast(data.error || 'Erreur lors de la sauvegarde.');
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
      subtitle="Informations générales, coordonnées, horaires et identifiants d’accès Administrateur"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-8 space-y-5 text-xs sm:text-sm">
          <div className="space-y-4">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Nom du restaurant
              </label>
              <input
                type="text"
                value={restName}
                onChange={e => setRestName(e.target.value)}
                maxLength={140}
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
                maxLength={240}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold"
              />
            </div>

            <div>
              <span className="font-bold text-stone-700 block mb-2">
                Téléphones &amp; WhatsApp
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">
                    Numéro 1 (Principal &amp; WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={restPhone}
                    onChange={e => setRestPhone(e.target.value)}
                    placeholder="+226 02 80 99 06"
                    maxLength={55}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">
                    Numéro 2 (Secondaire, optionnel)
                  </label>
                  <input
                    type="text"
                    value={restPhone2}
                    onChange={e => setRestPhone2(e.target.value)}
                    placeholder="+226 XX XX XX XX"
                    maxLength={55}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold"
                  />
                </div>
              </div>
              <p className="text-xs text-stone-500 mt-1.5">
                Les deux numéros renseignés seront affichés sur le site, les reçus et les menus. Le numéro 1 reste le lien WhatsApp principal.
              </p>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Adresse &amp; Coordonnées GPS
              </label>
              <input
                type="text"
                value={restAddress}
                onChange={e => setRestAddress(e.target.value)}
                maxLength={240}
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
                maxLength={140}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold"
              />
            </div>
          </div>

          {/* Section modification des accès Administrateur protégée */}
          <div className="p-4 rounded-2xl bg-[#fdf5e8] border-2 border-[#dec6a7] space-y-3">
            <h3 className="font-extrabold text-sm text-[#881313]">
              Modifier l’identifiant et le mot de passe Administrateur (optionnel)
            </h3>
            <p className="text-xs text-stone-600">
              Laissez ces champs vides si vous ne souhaitez pas modifier vos accès. Pour des raisons de sécurité, le mot de passe actuel est obligatoirement vérifié avant toute modification, et toutes les autres sessions ouvertes seront automatiquement fermées.
            </p>

            <div className="p-3 bg-white rounded-xl border border-amber-300/80 space-y-2">
              <label className="font-bold text-stone-700 block text-xs">
                Mot de passe Admin ACTUEL (obligatoire pour modifier vos accès)
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentAdminPassword}
                  onChange={e => setCurrentAdminPassword(e.target.value)}
                  placeholder="Saisissez votre mot de passe actuel..."
                  autoComplete="current-password"
                  maxLength={200}
                  className="w-full px-3 py-2 pr-16 rounded-xl border border-stone-300 bg-amber-50/40 font-semibold text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-extrabold text-stone-700"
                >
                  {showCurrentPassword ? 'Masquer' : 'Voir'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-xs">
                  Nouvel identifiant Admin
                </label>
                <input
                  type="text"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  placeholder="Ex: admin@lagratitude.bf"
                  autoComplete="username"
                  maxLength={180}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-xs">
                  Nouveau mot de passe Admin (min. 8 caractères)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newAdminPassword}
                    onChange={e => setNewAdminPassword(e.target.value)}
                    placeholder="Au moins 8 caractères..."
                    autoComplete="new-password"
                    maxLength={200}
                    className="w-full px-3 py-2 pr-16 rounded-xl border border-stone-300 bg-white font-semibold text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-extrabold text-stone-700"
                  >
                    {showNewPassword ? 'Masquer' : 'Voir'}
                  </button>
                </div>
              </div>
            </div>
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
            className="w-full py-3 px-4 rounded-xl bg-[#881313] hover:bg-[#a81c1c] text-white font-extrabold text-xs shadow-lg transition disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
