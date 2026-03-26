'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import { ChevronRight, HelpCircle, Map, MessageCircle, Smartphone, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminNavLink } from '@/components/AdminNavLink';

const MARKETING_MENU: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '#hero-examples', label: 'Exemples', Icon: Map },
  { href: '#how', label: 'Fonctionnement', Icon: Zap },
  { href: '#telecharger', label: 'Télécharger', Icon: Smartphone },
  { href: '#testimonials', label: 'Avis', Icon: MessageCircle },
  { href: '#faq', label: 'FAQ', Icon: HelpCircle },
];

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-[18px] w-[22px]" aria-hidden>
      <span
        className={`absolute left-0 w-[22px] h-0.5 rounded-full bg-slate-800 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 ${
          open ? 'top-[8px] rotate-45' : 'top-[4px] rotate-0'
        }`}
      />
      <span
        className={`absolute left-0 top-[8px] w-[22px] h-0.5 rounded-full bg-slate-800 transition-opacity duration-200 ease-out motion-reduce:duration-100 ${
          open ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <span
        className={`absolute left-0 w-[22px] h-0.5 rounded-full bg-slate-800 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 ${
          open ? 'top-[8px] -rotate-45' : 'top-[12px] rotate-0'
        }`}
      />
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const panelId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerReady, setDrawerReady] = useState(false);

  const isAppRoute = pathname?.startsWith('/app') ?? false;
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  const showMarketingNav = !isAppRoute && !isAdminRoute;
  const showMobileMenu = showMarketingNav || isAppRoute;

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (mobileOpen) {
      setDrawerMounted(true);
      setDrawerReady(false);
      const reduced =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        setDrawerReady(true);
        return;
      }
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setDrawerReady(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setDrawerReady(false);
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setDrawerMounted(false), reduced ? 50 : 300);
    return () => window.clearTimeout(t);
  }, [mobileOpen]);

  useEffect(() => {
    if (!drawerMounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerMounted]);

  useEffect(() => {
    if (!drawerMounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerMounted, closeMobile]);

  const marketingDesktop = (
    <>
      {MARKETING_MENU.map(({ href, label, Icon }) => (
        <a
          key={href}
          href={href}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-2.5 lg:px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-cyan-300/60 transition-all text-sm"
        >
          <span>{label}</span>
          <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden strokeWidth={2.25} />
        </a>
      ))}
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 lg:px-6 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
      <nav
        className="navbar-shell flex flex-nowrap items-center justify-between gap-2 sm:gap-4 md:gap-5 lg:gap-7 xl:gap-10 px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3 mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[min(90rem,calc(100vw-2rem))] rounded-2xl min-w-0"
        aria-label="Navigation principale"
      >
        <Link
          href={isSignedIn ? '/app' : '/'}
          className="flex min-w-0 shrink items-center gap-2 sm:gap-3 group"
          aria-label="Questia, accueil"
        >
          <span className="flex min-w-0 items-center gap-2 sm:gap-3" aria-hidden>
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl flex items-center justify-center text-sm sm:text-base font-black text-white group-hover:scale-105 transition-all"
              style={{
                background: 'linear-gradient(135deg, #f97316, #fbbf24)',
                boxShadow: '0 8px 20px rgba(249,115,22,.35)',
              }}
            >
              Q
            </div>
            <span className="min-w-0 leading-none">
              <span className="font-display font-black text-base sm:text-lg tracking-tight text-[var(--text)] block whitespace-nowrap">
                QUESTIA
              </span>
              <span className="hidden min-[400px]:block text-[0.625rem] sm:text-xs font-bold uppercase tracking-wide text-[var(--link-on-bg)] whitespace-nowrap truncate max-w-[12rem] sm:max-w-none">
                Quêtes quotidiennes dans la vraie vie
              </span>
            </span>
          </span>
        </Link>

        {showMarketingNav && (
          <div className="hidden md:flex flex-nowrap items-center gap-1.5 lg:gap-2.5 xl:gap-3 text-sm min-w-0 shrink">
            {marketingDesktop}
          </div>
        )}

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 md:gap-3 md:pl-1 lg:pl-2">
          {isSignedIn ? (
            <>
              {showMarketingNav && (
                <Link href="/app" className="hidden sm:inline-flex btn-primary text-sm py-2 px-4 md:px-5">
                  Ouvrir l&apos;app
                </Link>
              )}
              {isAppRoute && (
                <>
                  <Link
                    href="/app/shop"
                    className="hidden md:inline-flex text-sm font-black text-[var(--text)] px-3 py-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--orange)_48%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_72%,transparent)] hover:bg-[var(--card)] hover:border-[color:color-mix(in_srgb,var(--orange)_58%,transparent)] transition-all shadow-sm"
                  >
                    Boutique
                  </Link>
                  <Link
                    href="/app/history"
                    className="hidden md:inline-flex text-sm font-black text-[var(--text)] px-3 py-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--cyan)_42%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_72%,transparent)] hover:bg-[var(--card)] hover:border-[color:color-mix(in_srgb,var(--cyan)_55%,transparent)] transition-all shadow-sm"
                  >
                    Historique
                  </Link>
                  <Link
                    href="/app/profile"
                    className="hidden md:inline-flex text-sm font-black text-[var(--text)] px-3 py-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--violet)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_72%,transparent)] hover:bg-[var(--card)] hover:border-[color:color-mix(in_srgb,var(--violet)_55%,transparent)] transition-all shadow-sm"
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
                className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-2 md:px-3 py-2 rounded-xl hover:bg-white/70"
              >
                Connexion
              </Link>
              <Link
                href="/onboarding"
                className="btn-cta text-xs sm:text-sm py-1.5 px-3 sm:py-2 sm:px-5 whitespace-nowrap"
              >
                Commencer
              </Link>
            </>
          )}

          {showMobileMenu ? (
            <button
              type="button"
              id={`${panelId}-trigger`}
              className="md:hidden relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300/90 active:bg-slate-100/90 transition-colors"
              aria-expanded={mobileOpen}
              aria-controls={panelId}
              onClick={() => setMobileOpen((o) => !o)}
            >
              <span className="sr-only">{drawerMounted ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
              <BurgerIcon open={drawerReady && drawerMounted} />
            </button>
          ) : null}
        </div>
      </nav>

      {/* Tiroir mobile : plein bord droit, style sheet */}
      {showMobileMenu && drawerMounted ? (
        <>
          <button
            type="button"
            className={`fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-sm md:hidden transition-opacity duration-300 ease-out motion-reduce:duration-100 ${
              drawerReady ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Fermer le menu"
            onClick={closeMobile}
            tabIndex={drawerReady ? 0 : -1}
          />
          <div
            id={panelId}
            className={`fixed inset-y-0 right-0 z-[101] flex w-[min(100%,19rem)] max-w-[calc(100vw-2.5rem)] flex-col bg-white shadow-[-12px_0_48px_rgba(15,23,42,0.14)] md:hidden border-l border-slate-200/80 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-75 motion-reduce:ease-out will-change-transform pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
              drawerReady ? 'translate-x-0' : 'translate-x-full pointer-events-none'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
              <div className="min-w-0">
                <p id={`${panelId}-title`} className="font-display font-black text-slate-900 text-lg tracking-tight">
                  Menu
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Questia</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                onClick={closeMobile}
                aria-label="Fermer"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              {showMarketingNav ? (
                <nav className="flex flex-col gap-0.5" aria-label="Sections du site">
                  {MARKETING_MENU.map(({ href, label, Icon }) => (
                    <a
                      key={href}
                      href={href}
                      onClick={closeMobile}
                      className="group flex items-center gap-3 rounded-xl px-3 py-3.5 text-[15px] font-semibold text-slate-800 hover:bg-slate-50 active:bg-slate-100/80 transition-colors"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-50 to-orange-50/80 text-cyan-800 ring-1 ring-slate-200/80 group-hover:ring-cyan-300/50">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">{label}</span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                        strokeWidth={2.25}
                      />
                    </a>
                  ))}
                </nav>
              ) : null}

              {isAppRoute ? (
                <nav className="flex flex-col gap-1.5" aria-label="Navigation app">
                  <Link
                    href="/app/shop"
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl border border-orange-200/80 bg-orange-50/50 px-3 py-3.5 text-sm font-black text-slate-900 hover:bg-orange-50 transition-colors"
                  >
                    <span className="w-1 self-stretch rounded-full bg-orange-500" aria-hidden />
                    Boutique
                    <ChevronRight className="ml-auto h-4 w-4 text-orange-600/80" strokeWidth={2.25} aria-hidden />
                  </Link>
                  <Link
                    href="/app/history"
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl border border-cyan-200/80 bg-cyan-50/40 px-3 py-3.5 text-sm font-black text-slate-900 hover:bg-cyan-50/70 transition-colors"
                  >
                    <span className="w-1 self-stretch rounded-full bg-cyan-500" aria-hidden />
                    Historique
                    <ChevronRight className="ml-auto h-4 w-4 text-cyan-700/80" strokeWidth={2.25} aria-hidden />
                  </Link>
                  <Link
                    href="/app/profile"
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl border border-violet-200/70 bg-violet-50/35 px-3 py-3.5 text-sm font-black text-slate-900 hover:bg-violet-50/60 transition-colors"
                  >
                    <span className="w-1 self-stretch rounded-full bg-violet-500" aria-hidden />
                    Profil
                    <ChevronRight className="ml-auto h-4 w-4 text-violet-600/80" strokeWidth={2.25} aria-hidden />
                  </Link>
                  <AdminNavLink variant="drawer" />
                </nav>
              ) : null}

              {!isSignedIn ? (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <Link
                    href="/sign-in"
                    onClick={closeMobile}
                    className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    Connexion
                  </Link>
                </div>
              ) : showMarketingNav ? (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <Link
                    href="/app"
                    onClick={closeMobile}
                    className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-black text-white shadow-md shadow-orange-500/25 hover:brightness-[1.03] active:brightness-[0.98] transition-[filter,box-shadow]"
                  >
                    Ouvrir l&apos;app
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
