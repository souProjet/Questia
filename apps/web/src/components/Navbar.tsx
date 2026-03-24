'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserButton } from '@clerk/nextjs';

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const isAppRoute = pathname?.startsWith('/app');

  const navShell = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.93), rgba(236,253,255,0.9))',
    borderColor: 'rgba(34,211,238,.35)',
    boxShadow: '0 10px 30px rgba(15,23,42,.12), inset 0 1px 0 rgba(255,255,255,.7)',
    backdropFilter: 'blur(14px)' as const,
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 pt-3">
      <nav
        className="flex items-center justify-between px-4 md:px-6 py-3 mx-auto max-w-6xl rounded-2xl border"
        style={navShell}
      >
        {/* Logo */}
        <Link href={isSignedIn ? '/app' : '/'} className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white group-hover:scale-105 transition-all"
            style={{ background: 'linear-gradient(135deg, #f97316, #fbbf24)', boxShadow: '0 8px 20px rgba(249,115,22,.35)' }}
          >
            ⚔
          </div>
          <div className="leading-none">
            <p className="font-display font-black text-lg tracking-tight text-slate-900">QUESTIA</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-900">Quêtes quotidiennes dans la vraie vie</p>
          </div>
        </Link>

        {/* Nav links */}
        {!isAppRoute && (
          <div className="hidden md:flex items-center gap-2 text-sm">
            <a href="#hero-examples" className="px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-cyan-300/60 transition-all">🗺️ Exemples</a>
            <a href="#how" className="px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-emerald-300/60 transition-all">⚡ Fonctionnement</a>
            <a href="#telecharger" className="px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-cyan-300/60 transition-all">
              📲 Télécharger
            </a>
            <a href="#testimonials" className="px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-orange-300/60 transition-all">💬 Avis</a>
            <a href="#faq" className="px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-emerald-300/60 transition-all">❓ FAQ</a>
          </div>
        )}

        {/* Auth */}
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              {!isAppRoute && (
                <Link href="/app" className="btn-primary text-sm py-2 px-5">
                  Ouvrir l&apos;app
                </Link>
              )}
              <UserButton
                appearance={{
                  variables: { colorPrimary: '#f97316' },
                  elements: { avatarBox: 'w-8 h-8' },
                }}
              />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-3 py-2 rounded-xl hover:bg-white/70"
              >
                Connexion
              </Link>
              <Link href="/onboarding" className="btn-cta text-sm py-2 px-5">
                Commencer
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
