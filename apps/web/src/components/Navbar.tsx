'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import { ChevronRight, HelpCircle, Map, MessageCircle, Smartphone, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminNavLink } from '@/components/AdminNavLink';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { QuestiaLogo } from '@/components/QuestiaLogo';

const burgerBar =
  'absolute left-0 w-[22px] h-0.5 rounded-full bg-gradient-to-r from-cyan-600 via-orange-500 to-amber-500 shadow-[0_1px_0_rgba(255,255,255,.35)]';

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-[18px] w-[22px]" aria-hidden>
      <span
        className={`${burgerBar} transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 ${
          open ? 'top-[8px] rotate-45' : 'top-[4px] rotate-0'
        }`}
      />
      <span
        className={`${burgerBar} left-0 top-[8px] transition-opacity duration-200 ease-out motion-reduce:duration-100 ${
          open ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <span
        className={`${burgerBar} transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 ${
          open ? 'top-[8px] -rotate-45' : 'top-[12px] rotate-0'
        }`}
      />
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations('Navbar');
  const { isSignedIn } = useAuth();

  const marketingMenu = useMemo(
    (): { href: string; label: string; Icon: LucideIcon }[] => [
      { href: '#hero-examples', label: t('navExamples'), Icon: Map },
      { href: '#how', label: t('navHow'), Icon: Zap },
      { href: '#telecharger', label: t('navDownload'), Icon: Smartphone },
      { href: '#testimonials', label: t('navTestimonials'), Icon: MessageCircle },
      { href: '#faq', label: t('navFaq'), Icon: HelpCircle },
    ],
    [t],
  );
  const panelId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerReady, setDrawerReady] = useState(false);

  const isAppRoute = pathname?.startsWith('/app') ?? false;
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  const showMarketingNav = !isAppRoute && !isAdminRoute;
  const showLocaleSwitcher = !isAdminRoute;
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
      {marketingMenu.map(({ href, label, Icon }) => (
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
        aria-label={t('ariaMain')}
      >
        <Link
          href={isSignedIn ? '/app' : '/'}
          className="flex min-w-0 shrink items-center gap-2 sm:gap-3 group"
          aria-label={t('ariaHome')}
        >
          <span className="flex min-w-0 items-center gap-2 sm:gap-3" aria-hidden>
            <QuestiaLogo variant="navbar" priority className="group-hover:scale-[1.03] transition-transform motion-reduce:transition-none" />
            <span className="min-w-0 leading-none">
              <span className="font-display font-black text-base sm:text-lg tracking-tight text-[var(--text)] block whitespace-nowrap">
                QUESTIA
              </span>
              <span className="hidden min-[400px]:block text-[0.625rem] sm:text-xs font-bold uppercase tracking-wide text-[var(--link-on-bg)] whitespace-nowrap truncate max-w-[12rem] sm:max-w-none">
                {t('brandSubtitle')}
              </span>
            </span>
          </span>
        </Link>

        {showMarketingNav && (
          <div className="hidden md:flex flex-nowrap items-center gap-1.5 lg:gap-2.5 xl:gap-3 text-sm min-w-0 shrink">
            {marketingDesktop}
          </div>
        )}

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2 md:gap-3 md:pl-1 lg:pl-2">
          {/* Sur mobile, la langue est dans le menu burger (évite la barre surchargée). */}
          {showLocaleSwitcher ? (
            <div className="hidden md:flex md:shrink-0 md:items-center">
              <LocaleSwitcher />
            </div>
          ) : null}
          {isSignedIn ? (
            <>
              {showMarketingNav && (
                <Link href="/app" className="hidden sm:inline-flex btn-primary text-sm py-2 px-4 md:px-5">
                  {t('openApp')}
                </Link>
              )}
              {isAppRoute && (
                <>
                  <Link
                    href="/app/shop"
                    className="hidden md:inline-flex text-sm font-black text-[var(--text)] px-3 py-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--orange)_48%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_72%,transparent)] hover:bg-[var(--card)] hover:border-[color:color-mix(in_srgb,var(--orange)_58%,transparent)] transition-all shadow-sm"
                  >
                    {t('shop')}
                  </Link>
                  <Link
                    href="/app/history"
                    className="hidden md:inline-flex text-sm font-black text-[var(--text)] px-3 py-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--cyan)_42%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_72%,transparent)] hover:bg-[var(--card)] hover:border-[color:color-mix(in_srgb,var(--cyan)_55%,transparent)] transition-all shadow-sm"
                  >
                    {t('history')}
                  </Link>
                  <Link
                    href="/app/profile"
                    className="hidden md:inline-flex text-sm font-black text-[var(--text)] px-3 py-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--violet)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_72%,transparent)] hover:bg-[var(--card)] hover:border-[color:color-mix(in_srgb,var(--violet)_55%,transparent)] transition-all shadow-sm"
                  >
                    {t('profile')}
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
                {t('signIn')}
              </Link>
              <Link
                href="/onboarding"
                className="btn-cta text-xs sm:text-sm py-1.5 px-3 sm:py-2 sm:px-5 whitespace-nowrap"
              >
                {t('getStarted')}
              </Link>
            </>
          )}

          {showMobileMenu ? (
            <button
              type="button"
              id={`${panelId}-trigger`}
              className="md:hidden relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-orange-300/55 bg-gradient-to-br from-white via-amber-50/70 to-cyan-50/50 text-[var(--on-cream)] shadow-[0_6px_0_rgba(120,53,15,.09),0_12px_28px_rgba(249,115,22,.14)] hover:border-orange-400/65 hover:shadow-[0_7px_0_rgba(120,53,15,.08),0_14px_32px_rgba(249,115,22,.18)] active:translate-y-0.5 active:shadow-[0_4px_0_rgba(120,53,15,.1),0_8px_20px_rgba(249,115,22,.12)] transition-[transform,box-shadow,border-color,filter] motion-reduce:transform-none ring-1 ring-white/70"
              aria-expanded={mobileOpen}
              aria-controls={panelId}
              onClick={() => setMobileOpen((o) => !o)}
            >
              <span className="sr-only">{drawerMounted ? t('closeMenu') : t('openMenu')}</span>
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
            className={`fixed inset-0 z-[100] bg-gradient-to-br from-slate-950/50 via-orange-950/25 to-cyan-950/30 backdrop-blur-[6px] md:hidden transition-opacity duration-300 ease-out motion-reduce:duration-100 ${
              drawerReady ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-label={t('closeMenu')}
            onClick={closeMobile}
            tabIndex={drawerReady ? 0 : -1}
          />
          <div
            id={panelId}
            className={`navbar-mobile-drawer fixed inset-y-0 right-0 z-[101] flex w-[min(100%,19rem)] max-w-[calc(100vw-2.5rem)] flex-col md:hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-75 motion-reduce:ease-out will-change-transform pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
              drawerReady ? 'translate-x-0' : 'translate-x-full pointer-events-none'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
          >
            <div
              className="h-1 w-full shrink-0 bg-gradient-to-r from-cyan-400 via-orange-400 to-emerald-500"
              aria-hidden
            />
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-orange-200/45 bg-gradient-to-r from-[#fffbeb]/95 via-white/90 to-cyan-50/40 px-4 py-3.5">
              <div className="min-w-0">
                <p
                  id={`${panelId}-title`}
                  className="font-display font-black text-[var(--on-cream)] text-lg tracking-tight"
                >
                  {t('menuTitle')}
                </p>
                <p className="text-xs font-bold text-orange-900/75 mt-0.5 tracking-wide">{t('menuSubtitle')}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-orange-200/60 bg-white/90 text-orange-900 shadow-sm hover:bg-cyan-50/80 hover:border-cyan-300/55 transition-colors"
                onClick={closeMobile}
                aria-label={t('close')}
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 bg-gradient-to-b from-white/40 via-amber-50/20 to-cyan-50/35">
              {showMarketingNav ? (
                <nav className="flex flex-col gap-0.5" aria-label={t('navSections')}>
                  {marketingMenu.map(({ href, label, Icon }) => (
                    <a
                      key={href}
                      href={href}
                      onClick={closeMobile}
                      className="group flex items-center gap-3 rounded-2xl px-3 py-3.5 text-[15px] font-bold text-[var(--on-cream)] border-2 border-transparent hover:border-orange-200/70 hover:bg-white/80 hover:shadow-[0_4px_0_rgba(234,88,12,.08)] active:scale-[0.99] transition-all"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100/90 to-orange-100/80 text-cyan-900 ring-1 ring-orange-200/50 group-hover:ring-cyan-400/45 shadow-[inset_0_1px_0_rgba(255,255,255,.7)]">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">{label}</span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-orange-400/80 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                        strokeWidth={2.25}
                      />
                    </a>
                  ))}
                  {showLocaleSwitcher ? (
                    <div className="mt-4 flex w-full justify-center border-t border-orange-200/40 pt-4 md:hidden">
                      <LocaleSwitcher />
                    </div>
                  ) : null}
                </nav>
              ) : null}

              {isAppRoute ? (
                <nav className="flex flex-col gap-1.5" aria-label={t('navApp')}>
                  <Link
                    href="/app/shop"
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl border border-orange-200/80 bg-orange-50/50 px-3 py-3.5 text-sm font-black text-slate-900 hover:bg-orange-50 transition-colors"
                  >
                    <span className="w-1 self-stretch rounded-full bg-orange-500" aria-hidden />
                    {t('shop')}
                    <ChevronRight className="ml-auto h-4 w-4 text-orange-600/80" strokeWidth={2.25} aria-hidden />
                  </Link>
                  <Link
                    href="/app/history"
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl border border-cyan-200/80 bg-cyan-50/40 px-3 py-3.5 text-sm font-black text-slate-900 hover:bg-cyan-50/70 transition-colors"
                  >
                    <span className="w-1 self-stretch rounded-full bg-cyan-500" aria-hidden />
                    {t('history')}
                    <ChevronRight className="ml-auto h-4 w-4 text-cyan-700/80" strokeWidth={2.25} aria-hidden />
                  </Link>
                  <Link
                    href="/app/profile"
                    onClick={closeMobile}
                    className="flex items-center gap-3 rounded-xl border border-violet-200/70 bg-violet-50/35 px-3 py-3.5 text-sm font-black text-slate-900 hover:bg-violet-50/60 transition-colors"
                  >
                    <span className="w-1 self-stretch rounded-full bg-violet-500" aria-hidden />
                    {t('profile')}
                    <ChevronRight className="ml-auto h-4 w-4 text-violet-600/80" strokeWidth={2.25} aria-hidden />
                  </Link>
                  <AdminNavLink variant="drawer" />
                  {showLocaleSwitcher ? (
                    <div className="mt-4 flex justify-center border-t border-orange-200/40 pt-4">
                      <LocaleSwitcher />
                    </div>
                  ) : null}
                </nav>
              ) : null}

              {!isSignedIn ? (
                <div className="mt-6 border-t border-orange-200/40 pt-5">
                  <Link
                    href="/sign-in"
                    onClick={closeMobile}
                    className="flex w-full items-center justify-center rounded-2xl border-2 border-orange-300/50 bg-white/90 py-3.5 text-sm font-black text-[var(--on-cream)] shadow-[0_4px_0_rgba(120,53,15,.08)] hover:border-cyan-400/45 hover:bg-cyan-50/50 transition-colors"
                  >
                    {t('signIn')}
                  </Link>
                </div>
              ) : showMarketingNav ? (
                <div className="mt-6 border-t border-orange-200/40 pt-5">
                  <Link
                    href="/app"
                    onClick={closeMobile}
                    className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-400 py-3.5 text-sm font-black text-white shadow-[0_6px_0_rgba(180,83,9,.2),0_12px_28px_rgba(249,115,22,.35)] hover:brightness-[1.04] active:translate-y-0.5 active:shadow-sm transition-[filter,transform,box-shadow] motion-reduce:transform-none"
                  >
                    {t('openApp')}
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
