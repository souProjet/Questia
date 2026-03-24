'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserButton } from '@clerk/nextjs';

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const isAppRoute = pathname?.startsWith('/app');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 pt-3">
      <nav
        className="navbar-shell flex items-center justify-between px-4 md:px-6 py-3 mx-auto max-w-6xl rounded-2xl"
        aria-label="Navigation principale"
      >
        {/* Logo */}
        <Link
          href={isSignedIn ? '/app' : '/'}
          className="flex items-center gap-3 group"
          aria-label="Questia, accueil"
        >
          <span className="flex items-center gap-3" aria-hidden>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white group-hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg, #f97316, #fbbf24)', boxShadow: '0 8px 20px rgba(249,115,22,.35)' }}
            >
              ⚔
            </div>
            <span className="leading-none">
              <span className="font-display font-black text-lg tracking-tight text-[var(--text)] block">QUESTIA</span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--link-on-bg)] block">
                Quêtes quotidiennes dans la vraie vie
              </span>
            </span>
          </span>
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
              {isAppRoute && (
                <>
                  <Link
                    href="/app/shop"
                    className="hidden sm:inline-flex text-sm font-black text-[var(--text)] px-3 py-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--orange)_48%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_72%,transparent)] hover:bg-[var(--card)] hover:border-[color:color-mix(in_srgb,var(--orange)_58%,transparent)] transition-all shadow-sm"
                  >
                    Boutique
                  </Link>
                  <Link
                    href="/app/history"
                    className="hidden sm:inline-flex text-sm font-black text-[var(--text)] px-3 py-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--cyan)_42%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_72%,transparent)] hover:bg-[var(--card)] hover:border-[color:color-mix(in_srgb,var(--cyan)_55%,transparent)] transition-all shadow-sm"
                  >
                    Historique
                  </Link>
                  <Link
                    href="/app/profile"
                    className="hidden sm:inline-flex text-sm font-black text-[var(--text)] px-3 py-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--violet)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_72%,transparent)] hover:bg-[var(--card)] hover:border-[color:color-mix(in_srgb,var(--violet)_55%,transparent)] transition-all shadow-sm"
                  >
                    Profil
                  </Link>
                </>
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
