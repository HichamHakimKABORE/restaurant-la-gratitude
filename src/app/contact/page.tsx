'use client';

import React, { useEffect, useState } from 'react';
import ClientShell from '@/components/ClientShell';
import { CarIcon, WalkIcon, MapPinIcon, CompassIcon, PhoneIcon, ClockIcon } from '@/components/Icons';

// Exact GPS Coordinates of Restaurant La Gratitude (12°19'57.62"N, 1°37'52.36"O)
const RESTAURANT_LAT = 12.332672;
const RESTAURANT_LNG = -1.631211;
const RESTAURANT_DMS = `12°19'57.62"N  1°37'52.36"O`;

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ContactPage() {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [geoStatus, setGeoStatus] = useState<string>('');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [travelMode, setTravelMode] = useState<'driving' | 'walking'>('driving');

  // Watch device GPS position in real time when tracking is enabled
  useEffect(() => {
    if (!isTracking) return;
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatus(
        'La géolocalisation n’est pas disponible sur cet appareil.'
      );
      return;
    }

    setGeoStatus('Recherche du signal GPS de votre appareil en cours...');
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setUserPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGeoStatus('Position GPS verrouillée — Suivi en direct actif');
      },
      err => {
        console.warn('Geolocation error:', err);
        setGeoStatus(
          'Autorisez l’accès à votre position GPS dans votre navigateur ou cliquez sur "Lancer la navigation Google Maps".'
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);

  const handleStartLiveRoute = () => {
    setIsTracking(true);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setGeoStatus('Itinéraire calculé depuis votre position actuelle !');
        },
        () => {
          // If browser blocks geolocation (e.g. non-HTTPS local IP), open Google Maps native navigation which uses Current Location automatically
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${RESTAURANT_LAT},${RESTAURANT_LNG}&travelmode=${travelMode}`,
            '_blank'
          );
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${RESTAURANT_LAT},${RESTAURANT_LNG}&travelmode=${travelMode}`,
        '_blank'
      );
    }
  };

  const openNativeGpsNavigation = () => {
    const originParam = userPos
      ? `&origin=${userPos.lat},${userPos.lng}`
      : '';
    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${RESTAURANT_LAT},${RESTAURANT_LNG}&travelmode=${travelMode}`;
    window.open(url, '_blank');
  };

  const distanceKm = userPos
    ? calculateDistanceKm(
        userPos.lat,
        userPos.lng,
        RESTAURANT_LAT,
        RESTAURANT_LNG
      )
    : null;

  const estimatedMinutes =
    distanceKm !== null
      ? travelMode === 'driving'
        ? Math.max(2, Math.round((distanceKm / 35) * 60))
        : Math.max(3, Math.round((distanceKm / 4.8) * 60))
      : null;

  // Map iframe URL: if we have the user's GPS position, embed the live route from userPos to Restaurant; otherwise center on exact GPS coordinates
  const mapEmbedUrl = userPos
    ? `https://maps.google.com/maps?saddr=${userPos.lat},${userPos.lng}&daddr=${RESTAURANT_LAT},${RESTAURANT_LNG}&hl=fr&output=embed`
    : `https://maps.google.com/maps?q=${RESTAURANT_LAT},${RESTAURANT_LNG}&hl=fr&z=17&output=embed`;

  return (
    <ClientShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Coordonnées & Contrôleur d'Itinéraire GPS en Direct */}
        <div className="lg:col-span-5 bg-white/90 backdrop-blur-[2px] rounded-2xl border-2 border-[#e6d5c3] shadow-lg p-6 space-y-5 relative overflow-hidden">
          <div className="flex items-center gap-4 border-b border-stone-200 pb-4">
            <img
              src="/images/logo_gratitude.jpg"
              alt="Logo"
              className="w-16 h-16 rounded-full object-cover border-2 border-[#d99b26] shadow"
            />
            <div>
              <h2 className="text-xl font-extrabold text-[#2b1810]">
                Contact &amp; Itinéraire GPS
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                Restaurant La Gratitude — Zagtouli, route de Bobo
              </p>
            </div>
          </div>

          {/* Live GPS Tracking Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#7a1212] to-[#540b0b] text-white space-y-3 border-2 border-[#eab308] shadow-md">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#eab308] text-[#2b1810] font-extrabold text-xs">
                Navigation GPS en Direct
              </span>
              <span className="text-xs font-mono text-amber-200">
                {RESTAURANT_DMS}
              </span>
            </div>

            <p className="text-xs text-amber-100 leading-relaxed">
              Activez le suivi GPS pour tracer l’itinéraire exact depuis votre téléphone ou ordinateur jusqu’au restaurant.
            </p>

            {/* Mode de déplacement */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTravelMode('driving')}
                className={`py-2 px-3 rounded-xl font-extrabold text-xs transition inline-flex items-center justify-center gap-1.5 ${
                  travelMode === 'driving'
                    ? 'bg-[#eab308] text-[#2b1810] shadow'
                    : 'bg-white/10 text-amber-100 hover:bg-white/20'
                }`}
              >
                <CarIcon className="w-4 h-4 shrink-0" />
                <span>Voiture / Moto</span>
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('walking')}
                className={`py-2 px-3 rounded-xl font-extrabold text-xs transition inline-flex items-center justify-center gap-1.5 ${
                  travelMode === 'walking'
                    ? 'bg-[#eab308] text-[#2b1810] shadow'
                    : 'bg-white/10 text-amber-100 hover:bg-white/20'
                }`}
              >
                <WalkIcon className="w-4 h-4 shrink-0" />
                <span>À pied</span>
              </button>
            </div>

            {/* Live Distance & Time Readout */}
            {userPos && distanceKm !== null && (
              <div className="bg-black/35 rounded-xl p-3 border border-white/15 grid grid-cols-2 gap-2 text-center">
                <div>
                  <span className="text-xs text-amber-200 block">Distance</span>
                  <strong className="text-base font-extrabold text-white">
                    {distanceKm.toFixed(2)} km
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-amber-200 block">
                    Temps estimé
                  </span>
                  <strong className="text-base font-extrabold text-[#facc15]">
                    ~ {estimatedMinutes} min
                  </strong>
                </div>
              </div>
            )}

            {geoStatus && (
              <div className="text-xs text-emerald-300 font-semibold">
                ● {geoStatus}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleStartLiveRoute}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#facc15] to-[#eab308] hover:brightness-110 text-[#2b1810] font-extrabold text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2"
              >
                <MapPinIcon className="w-4 h-4 shrink-0" />
                <span>Tracer l’itinéraire depuis ma position sur la carte</span>
              </button>

              <button
                type="button"
                onClick={openNativeGpsNavigation}
                className="w-full py-2.5 px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xs shadow transition flex items-center justify-center gap-2"
              >
                <CompassIcon className="w-4 h-4 shrink-0" />
                <span>Lancer le guidage vocal Google Maps (Suivi en direct)</span>
              </button>
            </div>
          </div>

          {/* Info Cards */}
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-[#fdf5e8] border border-[#dec6a7]">
              <strong className="flex items-center gap-1.5 text-[#881313] mb-0.5">
                <MapPinIcon className="w-4 h-4 shrink-0" />
                <span>Adresse &amp; Coordonnées GPS exactes :</span>
              </strong>
              <p className="font-bold text-[#2b1810]">
                Zagtouli, Route de Bobo (RN1) — Ouagadougou, Burkina Faso
              </p>
              <p className="text-xs font-mono text-stone-600 mt-1">
                GPS : {RESTAURANT_DMS} ({RESTAURANT_LAT}, {RESTAURANT_LNG})
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fdf5e8] border border-[#dec6a7] flex items-center justify-between">
              <div>
                <strong className="flex items-center gap-1.5 text-[#881313]">
                  <PhoneIcon className="w-4 h-4 shrink-0" />
                  <span>Téléphone &amp; WhatsApp :</span>
                </strong>
                <span className="font-extrabold text-base text-[#2b1810]">
                  +226 60 18 65 25
                </span>
              </div>
              <a
                href="tel:+22660186525"
                className="px-4 py-2 rounded-xl bg-[#881313] text-white font-bold text-xs shadow inline-flex items-center gap-1.5"
              >
                <PhoneIcon className="w-3.5 h-3.5" />
                <span>Appeler</span>
              </a>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fdf5e8] border border-[#dec6a7]">
              <strong className="flex items-center gap-1.5 text-[#881313]">
                <ClockIcon className="w-4 h-4 shrink-0" />
                <span>Horaires d’ouverture :</span>
              </strong>
              <p className="font-bold text-[#2b1810]">
                Lundi au Dimanche : de 07h00 à 23h00
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Carte Interactive avec Point Exact (12.332672, -1.631211) et Trajet en Direct */}
        <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-[#881313] shadow-lg overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-[#7a1212] to-[#991b1b] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#eab308]">
            <div>
              <span className="font-extrabold text-sm flex items-center gap-1.5">
                {userPos ? (
                  <>
                    <CompassIcon className="w-4 h-4 text-[#facc15] shrink-0" />
                    <span>Itinéraire en Direct : Votre Appareil → Restaurant La Gratitude</span>
                  </>
                ) : (
                  <>
                    <MapPinIcon className="w-4 h-4 text-[#facc15] shrink-0" />
                    <span>Position Exacte : Restaurant La Gratitude (Zagtouli)</span>
                  </>
                )}
              </span>
              <span className="text-xs text-amber-200 font-mono">
                {RESTAURANT_DMS} • Élév. 328 m
              </span>
            </div>

            {userPos && (
              <button
                type="button"
                onClick={() => setUserPos(null)}
                className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold"
              >
                Recentrer sur le restaurant
              </button>
            )}
          </div>

          <div className="flex-1 min-h-[460px] w-full bg-stone-100 relative">
            <iframe
              key={mapEmbedUrl}
              title="Carte GPS Restaurant La Gratitude"
              src={mapEmbedUrl}
              className="w-full h-full min-h-[460px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
