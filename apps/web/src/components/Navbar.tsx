'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserButton } from '@clerk/nextjs';
import { AdminNavLink } from '@/components/AdminNavLink';

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const isAppRoute = pathname?.startsWith('/app') ?? false;
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  /** Landing : ancres + CTA app. Exclure /app et /admin (console). */
  const showMarketingNav = !isAppRoute && !isAdminRoute;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 lg:px-6 pt-3">
      <nav
        className="navbar-shell flex flex-nowrap items-center justify-between gap-4 md:gap-5 lg:gap-7 xl:gap-10 px-4 md:px-6 lg:px-8 py-3 mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[min(90rem,calc(100vw-2rem))] rounded-2xl min-w-0"
        aria-label="Navigation principale"
      >
        {/* Logo */}
        <Link
          href={isSignedIn ? '/app' : '/'}
          className="flex min-w-0 shrink items-center gap-3 group"
          aria-label="Questia, accueil"
        >
          <span className="flex min-w-0 items-center gap-3" aria-hidden>
            <div
              className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-black text-white group-hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg, #f97316, #fbbf24)', boxShadow: '0 8px 20px rgba(249,115,22,.35)' }}
            >
              ⚔
            </div>
            <span className="min-w-0 leading-none">
              <span className="font-display font-black text-lg tracking-tight text-[var(--text)] block whitespace-nowrap">
                QUESTIA
              </span>
              <span className="text-[0.6875rem] sm:text-xs font-bold uppercase tracking-wide text-[var(--link-on-bg)] block whitespace-nowrap">
                Quêtes quotidiennes dans la vraie vie
              </span>
            </span>
          </span>
        </Link>

        {/* Nav links */}
        {showMarketingNav && (
          <div className="hidden md:flex flex-nowrap items-center gap-1.5 lg:gap-2.5 xl:gap-3 text-sm min-w-0 shrink">
            <a
              href="#hero-examples"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-2.5 lg:px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-cyan-300/60 transition-all"
            >
              <span aria-hidden>🗺️</span>
              <span>Exemples</span>
            </a>
            <a
              href="#how"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-2.5 lg:px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-emerald-300/60 transition-all"
            >
              <span aria-hidden>⚡</span>
              <span>Fonctionnement</span>
            </a>
            <a
              href="#telecharger"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-2.5 lg:px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-cyan-300/60 transition-all"
            >
              <span aria-hidden>📲</span>
              <span>Télécharger</span>
            </a>
            <a
              href="#testimonials"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-2.5 lg:px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-orange-300/60 transition-all"
            >
              <span aria-hidden>💬</span>
              <span>Avis</span>
            </a>
            <a
              href="#faq"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-2.5 lg:px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-emerald-300/60 transition-all"
            >
              <span aria-hidden>❓</span>
              <span>FAQ</span>
            </a>
          </div>
        )}

        {/* Auth */}
        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3 md:pl-1 lg:pl-2">
          {isSignedIn ? (
            <>
              {showMarketingNav && (
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
                  <AdminNavLink />
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
