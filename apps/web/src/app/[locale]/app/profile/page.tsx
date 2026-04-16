'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Navbar } from '@/components/Navbar';
import {
  BADGE_CATEGORY_LABEL_EN,
  BADGE_CATEGORY_LABEL_FR,
  getBadgeCatalogForUi,
  type AppLocale,
  type BadgeCatalogEntry,
  type ExplorerAxis,
  type RiskAxis,
} from '@questia/shared';
import type { SerializedBadge } from '@/lib/progression';

type ProfileRes = {
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  streakCount: number;
  currentDay: number;
  shop?: { activeThemeId: string };
  badgesEarned?: unknown;
  progression: {
    level: number;
    totalXp: number;
    xpIntoLevel: number;
    xpToNext: number;
    xpPerLevel: number;
    badges: SerializedBadge[];
    badgeCatalog: BadgeCatalogEntry[];
  };
};

export default function ProfilePage() {
  const t = useTranslations('AppProfile');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
  const badgeCat = locale === 'en' ? BADGE_CATEGORY_LABEL_EN : BADGE_CATEGORY_LABEL_FR;
  const [data, setData] = useState<ProfileRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/profile?locale=${locale}`, { cache: 'no-store' });
      if (!res.ok) {
        setError(res.status === 401 ? t('errNotSignedIn') : t('errProfileMissing'));
        return;
      }
      const json = (await res.json()) as ProfileRes & { totalXp?: number };
      setData(json);
    } catch {
      setError(t('errLoad'));
    }
  }, [t, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/user/data-export', { credentials: 'include' });
      if (!res.ok) {
        setError(res.status === 401 ? t('errNotSignedIn') : t('errExportDenied'));
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      let name = 'questia-export.json';
      const m = cd?.match(/filename="([^"]+)"/);
      if (m?.[1]) name = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('errExport'));
    } finally {
      setExporting(false);
    }
  }, [t]);

  const handleDeleteAccount = useCallback(async () => {
    setDeleteError(null);
    const expectedWord = t('deleteWord');
    if (deleteConfirm !== expectedWord) {
      setDeleteError(t('deleteConfirmWrong'));
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: expectedWord }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
      if (!res.ok) {
        setDeleteError(json.error ?? json.detail ?? t('errDelete'));
        return;
      }
      window.location.href = '/sign-in';
    } catch {
      setDeleteError(t('errDelete'));
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, t]);

  useEffect(() => {
    const themeId = data?.shop?.activeThemeId ?? 'default';
    if (typeof document === 'undefined') return;
    if (themeId === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', themeId);
  }, [data?.shop?.activeThemeId]);

  const quadrant = data
    ? `${data.explorerAxis === 'explorer' ? t('axisExplorer') : t('axisHomebody')} · ${
        data.riskAxis === 'risktaker' ? t('riskAudacious') : t('riskCautious')
      }`
    : '';

  const prog = data?.progression;
  const pct =
    prog && prog.xpPerLevel > 0 ? Math.min(100, (prog.xpIntoLevel / prog.xpPerLevel) * 100) : 0;
  const catalog: BadgeCatalogEntry[] =
    prog?.badgeCatalog && prog.badgeCatalog.length > 0
      ? prog.badgeCatalog
      : getBadgeCatalogForUi(data?.badgesEarned, locale as AppLocale);

  return (
    <div className="min-h-screen bg-adventure overflow-x-hidden">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="relative z-10 max-w-2xl mx-auto px-3 sm:px-5 pt-24 pb-20 outline-none">
        <div className="flex flex-wrap gap-4 mb-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--link-on-bg)] hover:underline"
          >
            {t('backToQuest')}
          </Link>
          <Link
            href="/app/shop"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--orange)] hover:underline"
          >
            {t('linkShop')}
          </Link>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
            {error}
          </p>
        )}

        {!data && !error && (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        )}

        {data && prog && (
          <>
            <h1 className="font-display font-black text-3xl text-[var(--text)] mb-2">{t('title')}</h1>
            <p className="text-[var(--muted)] font-semibold mb-8">{quadrant}</p>

            <section className="app-profile-level-card p-6 mb-8">
              <div className="mb-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
                  {t('levelLabel')}
                </p>
                <p className="mt-1.5 font-display text-5xl font-black tabular-nums leading-none tracking-tight text-[var(--text)]">
                  {prog.level}
                </p>
              </div>
              <p className="text-sm font-semibold text-[var(--muted)] mb-3 leading-relaxed">
                {t('xpLine', {
                  total: prog.totalXp,
                  more: prog.xpToNext,
                  into: prog.xpIntoLevel,
                  per: prog.xpPerLevel,
                })}
              </p>
              <div className="h-3 rounded-full bg-[color:var(--progress-track)] overflow-hidden border border-[color:var(--border-ui-strong)] shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-orange-400 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </section>

            <section className="flex flex-wrap gap-3 mb-10">
              <span className="pill-expansion shadow-sm">
                <span aria-hidden>📍</span> {t('dayChip', { day: data.currentDay })}
              </span>
              <span className="streak-badge text-xs shadow-sm">
                <span aria-hidden>🔥</span>
                <span className="font-black">{data.streakCount}</span> {t('streakChip')}
              </span>
            </section>

            <h2 className="label mb-3">{t('badgesTitle')}</h2>
            <p className="text-sm text-[var(--muted)] mb-6">{t('badgesSub')}</p>

            <ul className="grid gap-4 sm:grid-cols-2">
              {catalog.map((b) => (
                <li
                  key={b.id}
                  className={`rounded-2xl p-4 transition-all ${
                    b.unlocked
                      ? 'app-profile-badge-unlocked motion-safe:hover:shadow-[0_14px_40px_-10px_rgba(245,158,11,0.4)]'
                      : 'border-2 border-dashed border-[color:color-mix(in_srgb,var(--text)_18%,transparent)] bg-[var(--surface)]/90 grayscale-[0.9] opacity-[0.92] shadow-inner'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-3xl leading-none ${!b.unlocked ? 'opacity-55 saturate-50' : ''}`}
                      aria-hidden
                    >
                      {b.placeholderEmoji}
                    </span>
                    {b.unlocked ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-900 ring-1 ring-emerald-400/55 shadow-sm">
                        {t('badgeUnlocked')}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-600/15 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-[var(--muted)] ring-1 ring-[color:color-mix(in_srgb,var(--text)_12%,transparent)]">
                        {t('badgeLocked')}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-block mt-1 mb-1 rounded-full px-2 py-0.5 text-xs font-black uppercase tracking-wider ${
                      b.unlocked
                        ? 'border border-[color:color-mix(in_srgb,var(--gold)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--gold)_12%,var(--surface))] text-[var(--orange)]'
                        : 'border border-[color:var(--border-ui)] bg-[var(--card)] text-[var(--subtle)]'
                    }`}
                  >
                    {badgeCat[b.category]}
                  </span>
                  <p
                    className={`font-black ${
                      b.unlocked ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                    }`}
                  >
                    {b.title}
                  </p>
                  <p
                    className={`text-xs mt-1 font-medium ${
                      b.unlocked ? 'text-[var(--on-cream-muted)]' : 'text-[var(--subtle)]'
                    }`}
                  >
                    {b.criteria}
                  </p>
                  {b.unlocked && b.unlockedAt ? (
                    <p className="text-xs text-emerald-800/90 mt-3 font-bold">
                      {new Date(b.unlockedAt).toLocaleDateString(dateLocale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--subtle)] mt-3 font-semibold">{t('objectiveInProgress')}</p>
                  )}
                </li>
              ))}
            </ul>

            <section className="mt-12 space-y-6">

              {/* ── Liens légaux ── */}
              <div className="rounded-2xl border border-[var(--border-ui)] bg-[var(--card)] p-5 sm:p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-4">{t('legalTitle')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { href: '/legal/confidentialite', label: t('legalPrivacy'), icon: '🔒' },
                    { href: '/legal/mentions-legales', label: t('legalLegal'), icon: '📄' },
                    { href: '/legal/cgu', label: t('legalTerms'), icon: '📋' },
                    { href: '/legal/cgv', label: t('legalSales'), icon: '💳' },
                    { href: '/legal/bien-etre', label: t('legalWellbeing'), icon: '💚' },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border-ui)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-cyan-400/50 hover:bg-cyan-50/60 transition-colors duration-150"
                    >
                      <span className="text-base leading-none" aria-hidden>{l.icon}</span>
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* ── Export ── */}
              <div className="rounded-2xl border border-[var(--border-ui)] bg-[var(--card)] p-5 sm:p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-3">{t('dataTitle')}</h3>
                <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">{t('dataSub')}</p>
                <button
                  type="button"
                  onClick={() => void handleExport()}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-50/70 px-4 py-2.5 text-sm font-bold text-cyan-900 hover:bg-cyan-100/80 hover:border-cyan-500/70 transition-colors disabled:opacity-50"
                >
                  <span aria-hidden>📥</span>
                  {exporting ? t('exportPreparing') : t('exportCta')}
                </button>
              </div>

              {/* ── Suppression ── */}
              <div className="rounded-2xl border border-red-200/80 bg-red-50/50 p-5 sm:p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-2">
                  <span className="shrink-0 text-lg leading-none mt-0.5" aria-hidden>⚠️</span>
                  <h3 className="font-bold text-red-900">{t('deleteTitle')}</h3>
                </div>
                <p className="text-sm text-red-800/80 mb-4 leading-relaxed">
                  {t('deleteBodyText')}{' '}
                  <strong>{t('deleteBodyStrong')}</strong>
                </p>
                <label htmlFor="delete-confirm" className="block text-xs font-bold text-red-900/70 mb-1.5">
                  {t('deleteTypeLabel', { word: t('deleteWord') })}
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={t('deletePlaceholder')}
                  className="w-full max-w-xs rounded-lg border border-red-300/80 bg-white px-3 py-2 text-sm font-semibold text-red-900 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400/40 mb-3"
                  autoComplete="off"
                />
                {deleteError && (
                  <p className="text-sm font-semibold text-red-700 mb-2" role="alert">
                    {deleteError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={deleting || deleteConfirm !== t('deleteWord')}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? t('deleteDeleting') : t('deleteCta')}
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
