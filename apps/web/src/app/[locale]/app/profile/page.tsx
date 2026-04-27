'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Navbar } from '@/components/Navbar';
import { Icon } from '@/components/Icons';
import {
  BADGE_CATEGORY_LABEL_EN,
  BADGE_CATEGORY_LABEL_FR,
  getBadgeCatalogForUi,
  getThemeIds,
  TITLES_REGISTRY,
  type AppLocale,
  type BadgeCatalogEntry,
  type ExplorerAxis,
  type RiskAxis,
} from '@questia/shared';
import type { SerializedBadge } from '@/lib/progression';

const DURATION_MIN_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;
const DURATION_MAX_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240, 480, 720, 1440] as const;

type ShopSnapshot = {
  coinBalance: number;
  rerollsRemaining: number;
  bonusRerollCredits: number;
  activeThemeId: string;
  ownedThemes: string[];
  ownedTitleIds: string[];
  equippedTitleId: string | null;
  xpBonusCharges: number;
};

type ProfileRes = {
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  streakCount: number;
  currentDay: number;
  reminderCadence?: string;
  questDurationMinMinutes?: number;
  questDurationMaxMinutes?: number;
  heavyQuestPreference?: string;
  shop?: ShopSnapshot;
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

/* ── Composant section unifié ─────────────────────────────────────────────── */

function SectionBlock({
  eyebrow,
  title,
  children,
  className = '',
}: {
  eyebrow: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-8 ${className}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--muted)] mb-1">
        {eyebrow}
      </p>
      {title && (
        <h2 className="font-display font-black text-xl text-[var(--text)] mb-3">{title}</h2>
      )}
      {children}
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const t = useTranslations('AppProfile');
  const locale = useLocale();
  const numLocale = locale === 'en' ? 'en-US' : 'fr-FR';
  const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
  const badgeCat = locale === 'en' ? BADGE_CATEGORY_LABEL_EN : BADGE_CATEGORY_LABEL_FR;

  const [data, setData] = useState<ProfileRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [prefsCadence, setPrefsCadence] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [prefsHeavyQuest, setPrefsHeavyQuest] = useState<'low' | 'balanced' | 'high'>('balanced');
  const [prefsDurMin, setPrefsDurMin] = useState(5);
  const [prefsDurMax, setPrefsDurMax] = useState(1440);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);
  const [appearSaving, setAppearSaving] = useState<string | null>(null);

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
      const c = json.reminderCadence === 'weekly' || json.reminderCadence === 'monthly' ? json.reminderCadence : 'daily';
      setPrefsCadence(c);
      const h = json.heavyQuestPreference === 'low' || json.heavyQuestPreference === 'high' ? json.heavyQuestPreference : 'balanced';
      setPrefsHeavyQuest(h);
      setPrefsDurMin(json.questDurationMinMinutes ?? 5);
      setPrefsDurMax(json.questDurationMaxMinutes ?? 1440);
      setPrefsMsg(null);
    } catch {
      setError(t('errLoad'));
    }
  }, [t, locale]);

  useEffect(() => { void load(); }, [load]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/user/data-export', { credentials: 'include' });
      if (!res.ok) { setError(res.status === 401 ? t('errNotSignedIn') : t('errExportDenied')); return; }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      let name = 'questia-export.json';
      const m = cd?.match(/filename="([^"]+)"/);
      if (m?.[1]) name = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } catch { setError(t('errExport')); }
    finally { setExporting(false); }
  }, [t]);

  const handleSavePrefs = useCallback(async () => {
    setPrefsSaving(true);
    setPrefsMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderCadence: prefsCadence, heavyQuestPreference: prefsHeavyQuest, questDurationMinMinutes: prefsDurMin, questDurationMaxMinutes: prefsDurMax }),
      });
      if (!res.ok) { setPrefsMsg(t('prefsErr')); return; }
      const json = (await res.json()) as ProfileRes;
      setData((prev) => (prev ? { ...prev, ...json } : json));
      setPrefsMsg(t('prefsSaved'));
    } catch { setPrefsMsg(t('prefsErr')); }
    finally { setPrefsSaving(false); }
  }, [prefsCadence, prefsHeavyQuest, prefsDurMin, prefsDurMax, t]);

  const saveAppearance = useCallback(async (patch: { activeThemeId?: string; equippedTitleId?: string | null }) => {
    const key = 'activeThemeId' in patch ? 'theme' : 'title';
    setAppearSaving(key);
    try {
      const res = await fetch('/api/profile', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      if (!res.ok) return;
      const json = (await res.json()) as ProfileRes;
      setData((prev) => (prev ? { ...prev, shop: json.shop ?? prev.shop } : prev));
    } finally { setAppearSaving(null); }
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    setDeleteError(null);
    const expectedWord = t('deleteWord');
    if (deleteConfirm !== expectedWord) { setDeleteError(t('deleteConfirmWrong')); return; }
    setDeleting(true);
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: expectedWord }) });
      const json = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
      if (!res.ok) { setDeleteError(json.error ?? json.detail ?? t('errDelete')); return; }
      window.location.href = '/sign-in';
    } catch { setDeleteError(t('errDelete')); }
    finally { setDeleting(false); }
  }, [deleteConfirm, t]);

  useEffect(() => {
    const themeId = data?.shop?.activeThemeId ?? 'default';
    if (typeof document === 'undefined') return;
    if (themeId === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', themeId);
  }, [data?.shop?.activeThemeId]);

  const quadrant = data
    ? `${data.explorerAxis === 'explorer' ? t('axisExplorer') : t('axisHomebody')} · ${data.riskAxis === 'risktaker' ? t('riskAudacious') : t('riskCautious')}`
    : '';

  const minDurOptions = useMemo(
    () => Array.from(new Set([...DURATION_MIN_PRESETS, prefsDurMin])).sort((a, b) => a - b),
    [prefsDurMin],
  );
  const maxDurOptions = useMemo(
    () => Array.from(new Set([...DURATION_MAX_PRESETS, prefsDurMax])).sort((a, b) => a - b),
    [prefsDurMax],
  );

  const prog = data?.progression;
  const pct = prog && prog.xpPerLevel > 0 ? Math.min(100, (prog.xpIntoLevel / prog.xpPerLevel) * 100) : 0;
  const catalog: BadgeCatalogEntry[] =
    prog?.badgeCatalog && prog.badgeCatalog.length > 0
      ? prog.badgeCatalog
      : getBadgeCatalogForUi(data?.badgesEarned, locale as AppLocale);

  const shop = data?.shop;
  const ownedThemeIds = useMemo(() => new Set(shop?.ownedThemes ?? ['default']), [shop?.ownedThemes]);

  function themeLabel(id: string): string {
    if (id === 'default') return t('themeDefault');
    if (id === 'midnight') return t('themeMidnight');
    if (id === 'aurora') return t('themeAurora');
    if (id === 'parchment') return t('themeParchment');
    return id;
  }

  /* Classe partagée pour toutes les "cartes" de contenu */
  const card = 'rounded-2xl border border-[color:var(--border-ui)] bg-[var(--card)] shadow-sm';

  /* Bouton toggle sélectionné / non sélectionné */
  const toggleBtn = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
      active
        ? 'border-[color:var(--cyan)] bg-cyan-50 text-cyan-950 ring-1 ring-cyan-400/40'
        : 'border-[color:var(--border-ui)] bg-[var(--surface)] text-[var(--text)] hover:border-cyan-400/50'
    }`;

  return (
    <div className="min-h-screen bg-adventure overflow-x-hidden">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="relative z-10 max-w-2xl mx-auto px-3 sm:px-5 pt-24 pb-24 outline-none">

        {/* Navigation haut */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8">
          <Link href="/app" className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--link-on-bg)] hover:underline">
            <Icon name="Home" size="xs" aria-hidden />
            {t('backToQuest')}
          </Link>
          <Link href="/app/shop" className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--orange)] hover:underline">
            <Icon name="ShoppingCart" size="xs" aria-hidden />
            {t('linkShop')}
          </Link>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 mb-6">
            {error}
          </p>
        )}

        {!data && !error && (
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        )}

        {data && prog && (
          <>
            {/* ══ 1. HERO — Niveau & XP ══════════════════════════════════ */}
            <section className="mb-8 app-profile-level-card p-6 sm:p-7">
              {/* Eyebrow */}
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--muted)] mb-4">
                {t('title')} · {quadrant}
              </p>

              {/* Niveau + XP bar */}
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--muted)] mb-1">
                    {t('levelLabel')}
                  </p>
                  <p className="font-display text-6xl font-black tabular-nums leading-none tracking-tight text-[var(--text)]">
                    {prog.level}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span className="pill-expansion text-xs shadow-sm inline-flex items-center gap-1.5">
                    <Icon name="MapPin" size="xs" className="text-[var(--cyan)]" aria-hidden />
                    {t('dayChip', { day: data.currentDay })}
                  </span>
                  <span className="streak-badge text-xs shadow-sm inline-flex items-center gap-1.5">
                    <Icon name="Flame" size="xs" className="text-orange-600" aria-hidden />
                    <span className="font-black">{data.streakCount}</span>
                    {' '}{t('streakChip')}
                  </span>
                </div>
              </div>

              <div className="h-2.5 rounded-full bg-[color:var(--progress-track)] overflow-hidden border border-[color:var(--border-ui-strong)] shadow-inner mb-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-orange-400 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs font-semibold text-[var(--muted)] leading-relaxed">
                {t('xpLine', { total: prog.totalXp, more: prog.xpToNext, into: prog.xpIntoLevel, per: prog.xpPerLevel })}
              </p>
            </section>

            {/* ══ 2. INVENTAIRE ══════════════════════════════════════════ */}
            {shop && (
              <SectionBlock eyebrow="Inventaire">
                <div className={`${card} p-5 sm:p-6`}>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Quest Coins */}
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-[color:var(--border-ui)] bg-[var(--surface)] p-3 text-center">
                      <Icon name="Coins" size="md" className="text-amber-600" aria-hidden />
                      <p className="font-display font-black text-xl tabular-nums text-[var(--text)] leading-none">
                        {shop.coinBalance.toLocaleString(numLocale)}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Quest Coins</p>
                    </div>

                    {/* Relances */}
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-[color:var(--border-ui)] bg-[var(--surface)] p-3 text-center">
                      <Icon name="RefreshCw" size="md" className={shop.bonusRerollCredits > 0 ? 'text-[var(--orange)]' : 'text-[var(--subtle)]'} aria-hidden />
                      <p className={`font-display font-black text-xl tabular-nums leading-none ${shop.bonusRerollCredits > 0 ? 'text-[var(--orange)]' : 'text-[var(--muted)]'}`}>
                        {shop.bonusRerollCredits}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Relances</p>
                    </div>

                    {/* Surcharges XP */}
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-[color:var(--border-ui)] bg-[var(--surface)] p-3 text-center">
                      <Icon name="Zap" size="md" className={shop.xpBonusCharges > 0 ? 'text-[var(--green)]' : 'text-[var(--subtle)]'} aria-hidden />
                      <p className={`font-display font-black text-xl tabular-nums leading-none ${shop.xpBonusCharges > 0 ? 'text-[var(--green)]' : 'text-[var(--muted)]'}`}>
                        {shop.xpBonusCharges}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Boosts XP</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[color:var(--border-ui)] text-center">
                    <Link href="/app/shop" className="text-xs font-black text-[var(--orange)] hover:underline underline-offset-2">
                      Recharger ou acheter des boosts →
                    </Link>
                  </div>
                </div>
              </SectionBlock>
            )}

            {/* ══ 3. APPARENCE ══════════════════════════════════════════ */}
            {shop && (
              <SectionBlock eyebrow={t('appearanceTitle')}>
                <div className={`${card} p-5 sm:p-6`}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-[var(--subtle)]">
                        {t('appearanceTheme')}
                      </label>
                      <select
                        className="w-full rounded-xl border border-[color:var(--border-ui)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                        value={shop.activeThemeId}
                        disabled={appearSaving === 'theme'}
                        onChange={(e) => void saveAppearance({ activeThemeId: e.target.value })}
                      >
                        {getThemeIds()
                          .filter((id) => ownedThemeIds.has(id))
                          .map((id) => (
                            <option key={id} value={id}>{themeLabel(id)}</option>
                          ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-[var(--subtle)]">
                        {t('appearanceTitleEquip')}
                      </label>
                      <select
                        className="w-full rounded-xl border border-[color:var(--border-ui)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                        value={shop.equippedTitleId ?? ''}
                        disabled={appearSaving === 'title'}
                        onChange={(e) => {
                          const v = e.target.value;
                          void saveAppearance({ equippedTitleId: v === '' ? null : v });
                        }}
                      >
                        <option value="">{t('noTitle')}</option>
                        {Object.values(TITLES_REGISTRY).map((def) => (
                          <option key={def.id} value={def.id}>{def.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {appearSaving && (
                    <p className="mt-3 text-xs font-medium text-[var(--muted)]">Enregistrement…</p>
                  )}
                </div>
              </SectionBlock>
            )}

            {/* ══ 4. PROGRESSION — Insignes ══════════════════════════════ */}
            <SectionBlock eyebrow="Progression" title={t('badgesTitle')}>
              <p className="text-sm text-[var(--muted)] mb-4 -mt-1">{t('badgesSub')}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {catalog.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-2xl p-4 border-2 transition-all ${
                      b.unlocked
                        ? 'app-profile-badge-unlocked'
                        : 'bg-[var(--surface)] border-[color:var(--border-ui)] opacity-70 grayscale-[0.6]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--card)] ring-1 ring-[color:color-mix(in_srgb,var(--text)_8%,transparent)] ${!b.unlocked ? 'opacity-50' : ''}`}
                        aria-hidden
                      >
                        <Icon name={b.placeholderIcon} size="lg" className="text-[var(--orange)]" />
                      </span>
                      {b.unlocked ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-900 ring-1 ring-emerald-400/55">
                          {t('badgeUnlocked')}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-[color:var(--border-ui)] bg-[var(--card)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--subtle)]">
                          {t('badgeLocked')}
                        </span>
                      )}
                    </div>
                    <span className={`inline-block mb-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      b.unlocked
                        ? 'border border-[color:color-mix(in_srgb,var(--gold)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--gold)_12%,var(--surface))] text-[var(--orange)]'
                        : 'border border-[color:var(--border-ui)] bg-[var(--card)] text-[var(--subtle)]'
                    }`}>
                      {badgeCat[b.category]}
                    </span>
                    <p className={`font-black text-sm ${b.unlocked ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
                      {b.title}
                    </p>
                    <p className={`text-xs mt-1 font-medium leading-relaxed ${b.unlocked ? 'text-[var(--muted)]' : 'text-[var(--subtle)]'}`}>
                      {b.criteria}
                    </p>
                    {b.unlocked && b.unlockedAt ? (
                      <p className="text-xs text-emerald-700 mt-2.5 font-bold">
                        {new Date(b.unlockedAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--subtle)] mt-2.5 font-semibold">{t('objectiveInProgress')}</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionBlock>

            {/* ══ 5. PRÉFÉRENCES ════════════════════════════════════════ */}
            <SectionBlock eyebrow="Préférences" title={t('prefsSection')}>
              <div className={`${card} p-5 sm:p-6`}>
                {/* Cadence */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-[var(--muted)] mb-2">{t('prefsCadenceTitle')}</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={t('prefsCadenceTitle')}>
                    {(
                      [
                        { id: 'daily' as const, label: t('prefsCadenceDaily') },
                        { id: 'weekly' as const, label: t('prefsCadenceWeekly') },
                        { id: 'monthly' as const, label: t('prefsCadenceMonthly') },
                      ]
                    ).map((row) => (
                      <button key={row.id} type="button" onClick={() => setPrefsCadence(row.id)} className={toggleBtn(prefsCadence === row.id)}>
                        {row.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quêtes lourdes */}
                <div className="mb-6 pt-5 border-t border-[color:var(--border-ui)]">
                  <p className="text-xs font-bold text-[var(--muted)] mb-1">{t('prefsHeavyTitle')}</p>
                  <p className="text-xs text-[var(--subtle)] mb-3 leading-relaxed">{t('prefsHeavyHint')}</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={t('prefsHeavyTitle')}>
                    {(
                      [
                        { id: 'low' as const, label: t('prefsHeavyLow') },
                        { id: 'balanced' as const, label: t('prefsHeavyBalanced') },
                        { id: 'high' as const, label: t('prefsHeavyHigh') },
                      ]
                    ).map((row) => (
                      <button key={row.id} type="button" onClick={() => setPrefsHeavyQuest(row.id)} className={toggleBtn(prefsHeavyQuest === row.id)}>
                        {row.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Durée */}
                <div className="mb-6 pt-5 border-t border-[color:var(--border-ui)]">
                  <p className="text-xs font-bold text-[var(--muted)] mb-1">{t('prefsDurationTitle')}</p>
                  <p className="text-xs text-[var(--subtle)] mb-4 leading-relaxed">{t('prefsDurationHint')}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="block text-xs font-bold text-[var(--muted)] mb-1.5">{t('prefsDurMin')}</span>
                      <select
                        value={prefsDurMin}
                        onChange={(e) => { const v = Number(e.target.value); setPrefsDurMin(v); if (v > prefsDurMax) setPrefsDurMax(v); }}
                        className="w-full rounded-xl border border-[color:var(--border-ui)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                      >
                        {minDurOptions.map((m) => <option key={m} value={m}>{m} min</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-xs font-bold text-[var(--muted)] mb-1.5">{t('prefsDurMax')}</span>
                      <select
                        value={prefsDurMax}
                        onChange={(e) => { const v = Number(e.target.value); setPrefsDurMax(v); if (v < prefsDurMin) setPrefsDurMin(v); }}
                        className="w-full rounded-xl border border-[color:var(--border-ui)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--cyan)]/40"
                      >
                        {maxDurOptions.map((m) => <option key={m} value={m}>{m} min</option>)}
                      </select>
                    </label>
                  </div>
                </div>

                {/* Bouton save */}
                <div className="pt-4 border-t border-[color:var(--border-ui)] flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSavePrefs()}
                    disabled={prefsSaving}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-50/80 px-4 py-2.5 text-sm font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-50 transition-colors"
                  >
                    {prefsSaving ? t('prefsSaving') : t('prefsSave')}
                  </button>
                  {prefsMsg && (
                    <span className={`text-sm font-semibold ${prefsMsg === t('prefsSaved') ? 'text-emerald-700' : 'text-red-700'}`}>
                      {prefsMsg}
                    </span>
                  )}
                </div>
              </div>
            </SectionBlock>

            {/* ══ 6. MON COMPTE ══════════════════════════════════════════ */}
            <SectionBlock eyebrow="Mon compte">
              <div className={`${card} divide-y divide-[color:var(--border-ui)] overflow-hidden`}>

                {/* Légal */}
                <div className="p-5 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-3">{t('legalTitle')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { href: '/legal/confidentialite', label: t('legalPrivacy'), icon: 'Lock' as const },
                        { href: '/legal/mentions-legales', label: t('legalLegal'), icon: 'FileText' as const },
                        { href: '/legal/cgu', label: t('legalTerms'), icon: 'ClipboardList' as const },
                        { href: '/legal/cgv', label: t('legalSales'), icon: 'CreditCard' as const },
                        { href: '/legal/bien-etre', label: t('legalWellbeing'), icon: 'Heart' as const },
                      ] as const
                    ).map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="flex items-center gap-2 rounded-xl border border-[color:var(--border-ui)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-cyan-400/50 hover:bg-cyan-50/60 transition-colors"
                      >
                        <Icon name={l.icon} size="sm" className="text-[var(--muted)] shrink-0" aria-hidden />
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Export */}
                <div className="p-5 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-2">{t('dataTitle')}</p>
                  <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">{t('dataSub')}</p>
                  <button
                    type="button"
                    onClick={() => void handleExport()}
                    disabled={exporting}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-50/80 px-4 py-2.5 text-sm font-bold text-cyan-900 hover:bg-cyan-100 hover:border-cyan-500/70 transition-colors disabled:opacity-50"
                  >
                    <Icon name="Download" size="sm" className="shrink-0" aria-hidden />
                    {exporting ? t('exportPreparing') : t('exportCta')}
                  </button>
                </div>

                {/* Suppression */}
                <div className="p-5 sm:p-6 bg-red-50/40">
                  <div className="flex items-start gap-3 mb-3">
                    <Icon name="AlertTriangle" size="md" className="shrink-0 text-red-600 mt-0.5" aria-hidden />
                    <div>
                      <p className="font-bold text-red-900 text-sm">{t('deleteTitle')}</p>
                      <p className="text-sm text-red-800/75 mt-1 leading-relaxed">
                        {t('deleteBodyText')} <strong>{t('deleteBodyStrong')}</strong>
                      </p>
                    </div>
                  </div>
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
                    <p className="text-sm font-semibold text-red-700 mb-2" role="alert">{deleteError}</p>
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
              </div>
            </SectionBlock>
          </>
        )}
      </main>
    </div>
  );
}
