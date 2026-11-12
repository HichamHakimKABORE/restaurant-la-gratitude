'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        localStorage.removeItem('admin_logged_out');
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');
        let safeNext = '/admin';
        if (next && !next.startsWith('//') && !next.includes('\\') && !/[\r\n]/.test(next)) {
          try {
            const resolved = new URL(next, 'http://localhost');
            if (resolved.origin === 'http://localhost' && resolved.pathname.startsWith('/admin')) {
              safeNext = `${resolved.pathname}${resolved.search}`;
            }
          } catch {}
        }
        router.push(safeNext);
      } else {
        setError(data.error || 'Identifiant ou mot de passe incorrect.');
      }
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3e7d7] p-4 relative overflow-hidden">
      {/* Filigrane du Logo en arrière-plan */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center select-none z-0"
      >
        <img
          src="/images/logo_gratitude.jpg"
          alt=""
          className="w-[420px] h-[420px] sm:w-[600px] sm:h-[600px] rounded-full object-cover opacity-[0.10] mix-blend-multiply"
        />
      </div>

      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-[#881313] shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/images/logo_gratitude.jpg"
            alt="Logo Restaurant La Gratitude"
            className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-[#d99b26] shadow-lg"
          />
          <div className="leading-none pt-1">
            <span className="text-sm font-bold text-[#2b1810] block">Restaurant</span>
            <h1 className="font-script text-4xl text-[#991b1b]">La Gratitude</h1>
          </div>
          <h2 className="text-base font-extrabold text-[#2b1810] pt-2">
            Connexion Administrateur Sécurisée
          </h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs sm:text-sm">
            <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Identifiant"
              autoComplete="username"
              maxLength={200}
              required
              className="bg-transparent w-full text-stone-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs sm:text-sm">
            <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
              autoComplete="current-password"
              maxLength={200}
              required
              className="bg-transparent w-full text-stone-800 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="px-2 py-0.5 rounded bg-stone-200/80 hover:bg-stone-300 text-[11px] font-bold text-stone-700 shrink-0"
            >
              {showPassword ? 'Masquer' : 'Voir'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#881313] to-[#a81c1c] hover:brightness-110 text-white font-extrabold text-sm shadow-lg transition"
          >
            {loading ? 'Vérification...' : 'Se connecter'}
          </button>
        </form>

        <div className="text-center text-xs pt-2 border-t border-stone-200">
          <span className="text-stone-500">
            Accès réservé à la direction du restaurant
          </span>
        </div>
      </div>
    </div>
  );
}
