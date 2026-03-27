'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import { QuestHomeLoading } from '@/components/QuestHomeLoading';
import { Icon } from '@/components/Icons';
import { QuestShareComposer } from '@/components/QuestShareComposer';
import { QuestXpCelebration } from '@/components/QuestXpCelebration';
import {
  ProfileRefinementModal,
  type RefinementQuestionUi,
} from '@/components/ProfileRefinementModal';
import type { AppLocale, DisplayBadge, EscalationPhase, XpBreakdown } from '@questia/shared';
import {
  questDisplayEmoji,
  questFamilyLabel,
  getTitleDefinition,
  isValidQuestDateIso,
  formatQuestDateForLocale,
  REPORT_DEFER_MAX_DAYS,
  QUEST_LOADER_DAY_STORAGE_KEY,
  getQuestCalendarDateNow,
} from '@questia/shared';

const QuestDestinationMap = dynamic(
  () => import('@/components/QuestDestinationMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 animate-pulse rounded-2xl bg-gradient-to-br from-cyan-100/40 to-orange-50/50" />
    ),
  },
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyQuest {
  questDate: string;
  archetypeId: number;
  archetypeName: string;
  archetypeCategory?: string;
  emoji: string;
  title: string;
  mission: string;
  hook: string;
  duration: string;
  safetyNote: string | null;
  isOutdoor: boolean;
  city: string | null;
  weather: string | null;
  weatherTemp: number | null;
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced' | 'abandoned';
  questPace?: 'instant' | 'planned';
  /** Après report : date notée pour une quête plus ambitieuse (rappel) */
  deferredSocialUntil?: string | null;
  day: number;
  streak: number;
  phase: EscalationPhase;
  destination?: {
    label: string;
    lat: number | null;
    lon: number | null;
  } | null;
  context?: {
    weatherIcon: string;
    weatherDescription: string;
    temp: number;
    city: string;
  };
  progression?: {
    totalXp: number;
    level: number;
    xpIntoLevel: number;
    xpToNext: number;
    xpPerLevel: number;
  };
  /** Boutique / relances (réponse API quête) */
  rerollsRemaining?: number;
  bonusRerollCredits?: number;
  activeThemeId?: string;
  equippedTitleId?: string | null;
  xpBonusCharges?: number;
  refinement?: {
    due: boolean;
    schemaVersion: number;
    questions?: RefinementQuestionUi[];
    consentNotice?: string;
  };
}

// ── Phase → friendly label ─────────────────────────────────────────────────────

const PHASE_LABEL: Record<EscalationPhase, { text: string; pill: string; emoji: string }> = {
  calibration: { text: 'Semaine de découverte', pill: 'pill-calibration', emoji: '🌱' },
  expansion:   { text: 'En mode exploration',   pill: 'pill-expansion',   emoji: '🧭' },
  rupture:     { text: 'Phase d\'intensité',    pill: 'pill-rupture',     emoji: '⚡' },
};

const PHASE_LABEL_EN: Record<EscalationPhase, { text: string; pill: string; emoji: string }> = {
  calibration: { text: 'Discovery week', pill: 'pill-calibration', emoji: '🌱' },
  expansion:   { text: 'Exploration mode', pill: 'pill-expansion', emoji: '🧭' },
  rupture:     { text: 'Intensity phase', pill: 'pill-rupture', emoji: '⚡' },
};

function weatherEmojiFromText(desc: string | null | undefined): string {
  const d = (desc ?? '').toLowerCase();
  if (d.includes('pluie') || d.includes('averses')) return '🌧️';
  if (d.includes('neige')) return '❄️';
  if (d.includes('orage')) return '⛈️';
  if (d.includes('brouillard')) return '🌫️';
  if (d.includes('nuage') || d.includes('couvert')) return '☁️';
  if (d.includes('soleil') || d.includes('clair')) return '☀️';
  return '🌤️';
}

// ── Safety consent ─────────────────────────────────────────────────────────────

function SafetySheet({
  quest,
  onConfirm,
  onClose,
}: {
  quest: DailyQuest;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('AppQuest');
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const rules = [
    t('safetyRule1'),
    t('safetyRule2'),
    t('safetyRule3'),
    t('safetyRule4'),
    t('safetyRule5'),
  ];
  const toggle = (i: number) =>
    setChecked((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const ok = checked.size === rules.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md card rounded-3xl overflow-hidden shadow-xl">
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-amber-400 to-orange-500" />
        <div className="p-7">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3"><Icon name="Shield" size="2xl" className="text-orange-500" /></div>
            <h3 className="font-display font-black text-xl text-[var(--on-cream)] mb-1">
              {t('safetyTitle')}
            </h3>
            <p className="text-sm text-[var(--on-cream-muted)]">
              {t('safetySubtitle', { title: quest.title })}
            </p>
          </div>
          <div className="space-y-2 mb-5">
            {rules.map((r, i) => (
              <button key={i} onClick={() => toggle(i)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: checked.has(i) ? 'rgba(16,185,129,.1)' : 'rgba(15,23,42,.04)',
                  border: `1px solid ${checked.has(i) ? 'rgba(16,185,129,.35)' : 'rgba(15,23,42,.1)'}`,
                }}>
                <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                  style={{ background: checked.has(i) ? '#10b981' : '#fff', border: `2px solid ${checked.has(i) ? '#10b981' : 'rgba(15,23,42,.2)'}` }}>
                  {checked.has(i) ? <Icon name="Check" size="xs" className="text-white" /> : null}
                </div>
                <span className={`text-sm ${checked.has(i) ? 'text-[var(--on-cream)]' : 'text-[var(--on-cream-muted)]'}`}>{r}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-ghost btn-md flex-1">
              {t('safetyNotToday')}
            </button>
            <button onClick={() => ok && onConfirm()} disabled={!ok}
              className="btn btn-md flex-[2] text-white transition-all"
              style={{ background: ok ? 'linear-gradient(135deg,#f97316,#fbbf24)' : 'rgba(15,23,42,.08)', color: ok ? '#fff' : '#64748b', cursor: ok ? 'pointer' : 'not-allowed', boxShadow: ok ? '0 4px 20px rgba(249,115,22,.35)' : 'none' }}>
              <span className="flex items-center justify-center gap-2">
                {t('safetyLetsGo')} <Icon name="Map" size="sm" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

function AppPageContent() {
  const { user, isLoaded } = useUser();
  const intlLocale = useLocale();
  const appLocale: AppLocale = intlLocale === 'en' ? 'en' : 'fr';
  const t = useTranslations('AppQuest');
  const searchParams = useSearchParams();
  const router = useRouter();
  const questDateFromUrl = useMemo(() => {
    const raw = searchParams.get('questDate') ?? searchParams.get('date');
    if (!raw) return null;
    return isValidQuestDateIso(raw) ? raw : null;
  }, [searchParams]);
  /** Jour calendaire courant (mis à jour au passage de minuit / retour sur l’onglet) — évite l’état « figé » si l’onglet reste ouvert. */
  const [calendarDay, setCalendarDay] = useState(() => getQuestCalendarDateNow());
  const reportDateMax = useMemo(() => {
    const d = new Date(`${calendarDay}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + REPORT_DEFER_MAX_DAYS);
    return d.toISOString().slice(0, 10);
  }, [calendarDay]);

  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  /** Incrémenté après relance/report pour remonter la carte quête (animation / nouveau contenu). */
  const [questCardSwapKey, setQuestCardSwapKey] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDeferredDate, setReportDeferredDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [reporting, setReporting] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [xpCelebration, setXpCelebration] = useState<{
    xpGain: {
      gained: number;
      breakdown: XpBreakdown;
      newTotal: number;
      previousTotal: number;
    };
    badgesUnlocked: DisplayBadge[];
  } | null>(null);
  /** Flash plein écran court après acceptation de la quête (feedback « jeu »). */
  const [acceptQuestFlash, setAcceptQuestFlash] = useState(false);
  const [showRefinement, setShowRefinement] = useState(false);

  // ── Ensure profile exists (get-or-create from onboarding localStorage) ───────

  const ensureProfile = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/profile', { method: 'GET' });
      if (res.ok) return true;
      if (res.status !== 404) return false;
      const explorer = typeof window !== 'undefined' ? localStorage.getItem('questia_explorer') : null;
      const risk = typeof window !== 'undefined' ? localStorage.getItem('questia_risk') : null;
      const createRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explorerAxis: explorer === 'homebody' || explorer === 'explorer' ? explorer : undefined,
          riskAxis: risk === 'cautious' || risk === 'risktaker' ? risk : undefined,
        }),
      });
      return createRes.ok || createRes.status === 201;
    } catch {
      return false;
    }
  }, []);

  // ── Load daily quest ──────────────────────────────────────────────────────

  const loadQuest = useCallback(
    async (
      lat?: number,
      lon?: number,
      opts?: { silent?: boolean; questDate?: string; ignoreUrlQuestDate?: boolean },
    ): Promise<boolean> => {
      const silent = opts?.silent ?? false;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const hasProfile = await ensureProfile();
        if (!hasProfile) {
          if (!silent) setError(t('errorProfileFirst'));
          return false;
        }
        const qd = opts?.ignoreUrlQuestDate
          ? opts.questDate ?? undefined
          : opts?.questDate ?? questDateFromUrl ?? undefined;
        const sp = new URLSearchParams();
        if (lat != null && lon != null) {
          sp.set('lat', String(lat));
          sp.set('lon', String(lon));
        }
        if (qd) sp.set('questDate', qd);
        sp.set('locale', appLocale);
        const qs = sp.toString() ? `?${sp.toString()}` : '';
        const res = await fetch(`/api/quest/daily${qs}`, { cache: 'no-store' });
        let payload: unknown;
        try {
          payload = await res.json();
        } catch {
          payload = {};
        }
        if (!res.ok) {
          if (!silent) {
            const err = (payload as { error?: string }).error;
            if (res.status === 401) {
              setError(err ?? t('errorSignIn'));
            } else if (res.status === 404) {
              setError(err ?? t('errorNoQuestDate'));
            } else if (res.status === 400) {
              setError(err ?? t('errorInvalidLink'));
            } else {
              setError(err ?? t('errorLoadQuest'));
            }
          }
          return false;
        }
        const data = payload as DailyQuest;
        setQuest(data);
        if (data.refinement?.due && data.refinement.questions?.length) {
          setShowRefinement(true);
        } else {
          setShowRefinement(false);
        }
        return true;
      } catch (e: unknown) {
        if (!silent) {
          const msg = e instanceof Error ? e.message : t('errorGeneric');
          setError(msg);
        }
        return false;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ensureProfile, questDateFromUrl, appLocale],
  );

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      const ok = await loadQuest(undefined, undefined, { questDate: questDateFromUrl ?? undefined });
      if (cancelled || !ok) return;
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setUserPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          void loadQuest(pos.coords.latitude, pos.coords.longitude, {
            silent: true,
            questDate: questDateFromUrl ?? undefined,
          });
        },
        () => {},
        { maximumAge: 300_000, timeout: 2_500 },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, loadQuest, questDateFromUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncDay = () => {
      const d = getQuestCalendarDateNow();
      setCalendarDay((prev) => (prev !== d ? d : prev));
    };
    const id = window.setInterval(syncDay, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') syncDay();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', syncDay);
    syncDay();
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', syncDay);
    };
  }, []);

  /** Marque le jour calendaire comme « déjà ouvert » pour les textes du loader (reprise vs première ouverture). */
  useEffect(() => {
    if (!quest || typeof window === 'undefined') return;
    try {
      localStorage.setItem(QUEST_LOADER_DAY_STORAGE_KEY, getQuestCalendarDateNow());
    } catch {
      /* quota / navigation privée */
    }
  }, [quest]);

  const prevCalendarDayRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    if (prevCalendarDayRef.current === null) {
      prevCalendarDayRef.current = calendarDay;
      return;
    }
    if (prevCalendarDayRef.current === calendarDay) return;
    prevCalendarDayRef.current = calendarDay;
    const urlPast = questDateFromUrl != null && questDateFromUrl < calendarDay;
    if (urlPast) router.replace('/app', { scroll: false });
    void loadQuest(userPosition?.lat, userPosition?.lon, {
      silent: true,
      ignoreUrlQuestDate: urlPast,
    });
  }, [
    isLoaded,
    calendarDay,
    questDateFromUrl,
    router,
    loadQuest,
    userPosition?.lat,
    userPosition?.lon,
  ]);

  /** Aligne la barre d’adresse avec la quête affichée (partage / deep link). */
  const questDateLoaded = quest?.questDate;
  useEffect(() => {
    if (!questDateLoaded) return;
    const qd = questDateLoaded;
    const cur = searchParams.get('questDate') ?? searchParams.get('date');
    if (qd === calendarDay) {
      if (cur) router.replace('/app', { scroll: false });
    } else if (cur !== qd) {
      router.replace(`/app?questDate=${encodeURIComponent(qd)}`, { scroll: false });
    }
  }, [questDateLoaded, calendarDay, router, searchParams]);

  useEffect(() => {
    const themeId = quest?.activeThemeId ?? 'default';
    if (typeof document === 'undefined') return;
    if (themeId === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', themeId);
  }, [quest?.activeThemeId]);

  // ── Accept quest ──────────────────────────────────────────────────────────

  const doAccept = useCallback(async () => {
    if (!quest) return;
    setAccepting(true);
    setBannerError(null);
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: quest.questDate, safetyConsentGiven: quest.isOutdoor }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setBannerError(err.error ?? t('bannerAcceptFailed'));
        return;
      }
      const data = await res.json() as Partial<DailyQuest>;
      setQuest((prev) => (prev ? { ...prev, ...data, status: (data.status ?? prev.status) as DailyQuest['status'] } : null));
      setAcceptQuestFlash(true);
      window.setTimeout(() => setAcceptQuestFlash(false), 780);
    } finally {
      setAccepting(false);
      setShowSafety(false);
    }
  }, [quest, t]);

  const doComplete = useCallback(async () => {
    if (!quest) return;
    setCompleting(true);
    setBannerError(null);
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: quest.questDate, action: 'complete' }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setBannerError(err.error ?? t('bannerCompleteFailed'));
        return;
      }
      const data = await res.json() as Partial<DailyQuest> & {
        xpGain?: {
          gained: number;
          breakdown: XpBreakdown;
          newTotal: number;
          previousTotal: number;
        };
        badgesUnlocked?: DisplayBadge[];
        progression?: DailyQuest['progression'];
      };
      setQuest((prev) =>
        prev
          ? {
              ...prev,
              ...data,
              status: (data.status ?? 'completed') as DailyQuest['status'],
              progression: data.progression ?? prev.progression,
            }
          : null,
      );
      if (data.xpGain) {
        setXpCelebration({
          xpGain: data.xpGain,
          badgesUnlocked: data.badgesUnlocked ?? [],
        });
      } else {
        setShowShareCard(true);
      }
    } finally {
      setCompleting(false);
    }
  }, [quest, t]);

  const handleAccept = () => {
    if (quest?.isOutdoor) { setShowSafety(true); }
    else { doAccept(); }
  };

  // ── Reroll ────────────────────────────────────────────────────────────────

  const handleReroll = async () => {
    if (!quest || rerolling) return;
    // Aligné sur l’UI : boutons visibles si pas acceptée / terminée. Ne pas exiger === 'pending'
    // (réponse API sans status, typo de casse, etc. — sinon clic sans effet ni message).
    if (quest.status === 'accepted' || quest.status === 'completed' || quest.status === 'abandoned') return;

    const daily = quest.rerollsRemaining ?? 1;
    const bonus = quest.bonusRerollCredits ?? 0;
    if (daily + bonus <= 0) return;

    setRerolling(true);
    setBannerError(null);
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: quest.questDate, action: 'reroll' }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setBannerError(data.error ?? t('bannerRerollFailed'));
        return;
      }
      // Rechargement immédiat (pas d’attente géoloc : évite plusieurs secondes sans retour visible).
      const ok = await loadQuest(userPosition?.lat, userPosition?.lon, {
        silent: true,
        questDate: quest.questDate,
      });
      if (!ok) {
        setBannerError(t('bannerReloadFailed'));
      } else {
        setQuestCardSwapKey((k) => k + 1);
      }
    } finally {
      setRerolling(false);
    }
  };

  const handleReportConfirm = async () => {
    if (!quest || reporting) return;
    if (quest.status !== 'pending') return;
    if ((quest.questPace ?? 'instant') !== 'planned') return;
    setReporting(true);
    setBannerError(null);
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          questDate: quest.questDate,
          deferredUntil: reportDeferredDate,
        }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setBannerError(data.error ?? t('bannerReportFailed'));
        return;
      }
      setShowReportModal(false);
      const ok = await loadQuest(userPosition?.lat, userPosition?.lon, {
        silent: true,
        questDate: quest.questDate,
      });
      if (!ok) setBannerError(t('bannerReloadFailed'));
      else setQuestCardSwapKey((k) => k + 1);
    } finally {
      setReporting(false);
    }
  };

  const confirmAbandon = async () => {
    if (!quest || abandoning) return;
    if (quest.status !== 'pending' && quest.status !== 'accepted') return;
    setAbandoning(true);
    setBannerError(null);
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abandon', questDate: quest.questDate }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setBannerError(data.error ?? t('bannerAbandonFailed'));
        return;
      }
      const data = (await res.json()) as Partial<DailyQuest>;
      setQuest((prev) =>
        prev
          ? {
              ...prev,
              ...data,
              status: (data.status ?? 'abandoned') as DailyQuest['status'],
              streak: data.streak ?? 0,
            }
          : null,
      );
      setShowAbandonConfirm(false);
    } finally {
      setAbandoning(false);
    }
  };

  // ── Phase label ───────────────────────────────────────────────────────────

  const phase = quest?.phase ?? 'calibration';
  const phaseInfo = (appLocale === 'en' ? PHASE_LABEL_EN : PHASE_LABEL)[phase];
  const questFamily = quest ? questFamilyLabel(quest.archetypeCategory, appLocale) : null;

  const rerollDaily = quest?.rerollsRemaining ?? 1;
  const rerollBonus = quest?.bonusRerollCredits ?? 0;
  const rerollParts: string[] = [];
  if (rerollDaily > 0) rerollParts.push(t('rerollDaily', { n: rerollDaily }));
  if (rerollBonus > 0) rerollParts.push(t('rerollBonus', { n: rerollBonus }));
  const rerollLabel = rerollParts.length > 0 ? rerollParts.join(' · ') : t('rerollNone');
  const canReroll =
    quest &&
    quest.status !== 'accepted' &&
    quest.status !== 'completed' &&
    quest.status !== 'abandoned' &&
    rerollDaily + rerollBonus > 0;

  const questStatusDisplay = useMemo(() => {
    if (!quest) return null;
    const map: Record<
      DailyQuest['status'],
      { label: string; emoji: string; pillClass: string }
    > = {
      pending: {
        label: t('statusPending'),
        emoji: '⏳',
        pillClass: 'border-amber-300/60 bg-amber-50/95 text-amber-950',
      },
      accepted: {
        label: t('statusAccepted'),
        emoji: '⚔️',
        pillClass: 'border-emerald-400/50 bg-emerald-50/95 text-emerald-950',
      },
      completed: {
        label: t('statusCompleted'),
        emoji: '✅',
        pillClass: 'border-emerald-500/45 bg-emerald-100/90 text-emerald-950',
      },
      abandoned: {
        label: t('statusAbandoned'),
        emoji: '🌙',
        pillClass: 'border-slate-400/75 bg-slate-100/98 text-slate-900 ring-1 ring-slate-400/35',
      },
      rejected: {
        label: t('statusRejected'),
        emoji: '✕',
        pillClass: 'border-red-200/80 bg-red-50/95 text-red-950',
      },
      replaced: {
        label: t('statusReplaced'),
        emoji: '🔄',
        pillClass: 'border-violet-300/60 bg-violet-50/95 text-violet-950',
      },
    };
    return map[quest.status];
  }, [quest, t]);

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-adventure overflow-x-hidden">
        <Navbar />
        <QuestHomeLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-adventure overflow-x-hidden">
        <Navbar />
        <main id="main-content" tabIndex={-1} className="max-w-2xl mx-auto px-3 sm:px-5 pt-24 pb-20 flex flex-col items-center justify-center text-center gap-6 outline-none">
          <Icon name="Frown" size="2xl" className="text-[var(--subtle)] mx-auto" />
          <h2 className="font-display font-black text-2xl text-[var(--text)]">{t('errorEmptyTitle')}</h2>
          <p className="text-[var(--muted)] max-w-md">{error}</p>
          {error.includes('onboarding') && (
            <Link href="/onboarding" className="btn btn-primary btn-md">{t('ctaCreateProfile')}</Link>
          )}
        </main>
      </div>
    );
  }

  const weatherLine = quest
    ? `${quest.context?.weatherDescription ?? quest.weather ?? t('weatherFallback')} · ${Math.round(quest.context?.temp ?? quest.weatherTemp ?? 18)}°C`
    : '';

  const questStatus = quest?.status;
  const isPending = questStatus === 'pending';
  const isAccepted = questStatus === 'accepted';
  const isCompleted = questStatus === 'completed';
  const isAbandoned = questStatus === 'abandoned';
  const questPace = quest?.questPace ?? 'instant';
  const isPlannedQuest = questPace === 'planned';

  return (
    <div className="min-h-screen bg-adventure relative overflow-x-hidden">
      <Navbar />

      {acceptQuestFlash ? (
        <div
          className="pointer-events-none fixed inset-0 z-[85] bg-gradient-to-br from-emerald-300/45 via-amber-200/35 to-cyan-300/40 motion-safe:animate-quest-accept-flash motion-reduce:hidden"
          aria-hidden
        />
      ) : null}

      {showRefinement && quest?.refinement?.questions && quest.refinement.questions.length > 0 ? (
        <ProfileRefinementModal
          questions={quest.refinement.questions}
          consentNotice={quest.refinement.consentNotice ?? t('refinementConsentDefault')}
          onDone={() => {
            setShowRefinement(false);
            void loadQuest(userPosition?.lat, userPosition?.lon, {
              silent: true,
              questDate: questDateFromUrl ?? undefined,
            });
          }}
        />
      ) : null}

      {/* Décors « plateau » comme la landing */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-16 left-1/2 w-[min(100rem,200%)] max-w-none -translate-x-1/2 h-[min(38vh,26rem)] rounded-[100%] bg-gradient-to-b from-cyan-200/25 via-orange-100/10 to-transparent blur-3xl motion-safe:animate-glow-soft opacity-70 motion-reduce:animate-none motion-reduce:opacity-45" />
        <div className="absolute top-28 left-[6%] text-5xl opacity-[0.22] select-none motion-safe:animate-float motion-reduce:animate-none">
          🧭
        </div>
        <div className="absolute top-32 right-[8%] text-[2.75rem] opacity-[0.2] select-none motion-safe:animate-float motion-reduce:animate-none [animation-delay:2s]">
          🎒
        </div>
        <div className="absolute top-[46%] left-[12%] text-4xl opacity-[0.18] select-none motion-safe:animate-float-delayed motion-reduce:animate-none">
          🎲
        </div>
        <div className="absolute bottom-24 right-[14%] text-5xl opacity-[0.2] select-none motion-safe:animate-float motion-reduce:animate-none [animation-delay:1s]">
          🗺️
        </div>
      </div>

      <main id="main-content" tabIndex={-1} className="relative z-10 max-w-2xl mx-auto px-3 sm:px-5 pt-24 pb-24 outline-none">
        {bannerError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-center text-sm font-semibold text-red-900 shadow-sm"
          >
            {bannerError}
            <button
              type="button"
              className="ml-2 underline decoration-red-400 underline-offset-2"
              onClick={() => setBannerError(null)}
            >
              {t('bannerDismiss')}
            </button>
          </div>
        )}

        {/* Bandeau joueur : une seule lecture, emojis comme la landing */}
        <section className="mb-8 mt-2 rounded-[1.75rem] border-2 border-orange-300/45 bg-gradient-to-br from-[#fffbeb] via-white/95 to-cyan-50/40 px-5 py-6 md:px-7 md:py-7 shadow-[0_10px_0_rgba(180,83,9,.1),0_22px_48px_rgba(249,115,22,.12)] motion-safe:animate-fade-up-slow motion-reduce:animate-none [animation-delay:40ms] [animation-fill-mode:backwards]">

          <h1 className="font-display font-black text-2xl leading-[1.15] text-[var(--on-cream)] sm:text-3xl md:text-[2.15rem]">
            {t('greeting', { name: user?.firstName ?? t('defaultName') })}{' '}
            <span aria-hidden>👋</span>
            <br />
            <span className="text-gradient-pop text-[1.02em] md:text-[1.06em] tracking-[-0.02em]">
              {t('heroTitle')}
            </span>{' '}
            <span aria-hidden className="text-[0.95em] not-italic">
              ⚔️
            </span>
          </h1>
          <p className="mt-3 text-sm font-semibold text-[var(--on-cream-muted)] md:text-base">
            {t('heroSubtitle')}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={`${phaseInfo.pill} shadow-sm`}>
              <span aria-hidden>{phaseInfo.emoji}</span>
              {phaseInfo.text}
            </span>
            {(quest?.streak ?? 0) > 0 && (
              <span
                className="streak-badge text-xs shadow-sm"
                title={t('streakTitle')}
              >
                <span aria-hidden>🔥</span>
                <span className="font-black">{quest?.streak}</span>
                <span className="font-semibold">
                  {' '}
                  {quest?.streak !== 1 ? t('streakDays') : t('streakDay')} {t('streakInARow')}
                </span>
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 rounded-full border border-cyan-500/45 bg-white/95 px-3 py-1 text-xs font-black text-[var(--on-cream)] shadow-sm"
              title={t('journeyBadgeTooltip')}
            >
              <span aria-hidden>📍</span>
              {t('journeyDay', { day: quest?.day ?? 1 })}
            </span>
            {quest?.equippedTitleId && getTitleDefinition(quest.equippedTitleId) ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1 text-[11px] font-black text-amber-950 shadow-sm"
                title={t('equippedTitleShop')}
              >
                <span aria-hidden>{getTitleDefinition(quest.equippedTitleId)!.emoji}</span>
                {getTitleDefinition(quest.equippedTitleId)!.label}
              </span>
            ) : null}
            {(quest?.xpBonusCharges ?? 0) > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/45 bg-emerald-50/95 px-3 py-1 text-[11px] font-black text-emerald-950 shadow-sm"
                title={t('xpBonusTooltip')}
              >
                {t('xpBonusCharges', { n: quest?.xpBonusCharges ?? 0 })}
              </span>
            ) : null}
          </div>

          {quest?.progression && (
              <div className="mt-5 rounded-2xl border border-cyan-300/45 bg-gradient-to-r from-cyan-50/90 to-white/90 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-cyan-950">
                <span>
                  {t('levelLine', { level: quest.progression.level, xp: quest.progression.totalXp })}
                </span>
                <span className="font-bold text-[var(--on-cream-muted)]">
                  {t('xpToLevel', { xp: quest.progression.xpToNext })}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-[var(--on-cream-subtle)]">
                {t('xpInLevel', {
                  into: quest.progression.xpIntoLevel,
                  per: quest.progression.xpPerLevel,
                })}
              </p>
              <div className="mt-2 h-2 rounded-full bg-[color:var(--progress-track)] overflow-hidden border border-cyan-200/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-orange-400 transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      (quest.progression.xpIntoLevel / Math.max(1, quest.progression.xpPerLevel)) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {quest && (quest.city || quest.weather) && (
            <p className="mt-5 border-t border-dashed border-orange-300/50 pt-4 text-sm font-medium text-[var(--on-cream-muted)]">
              <span className="mr-1.5" aria-hidden>
                {weatherEmojiFromText(quest.context?.weatherDescription ?? quest.weather)}
              </span>
              {weatherLine}
              {quest.city && quest.city !== 'ta ville' && (
                <>
                  <span className="text-[var(--on-cream-subtle)]"> · </span>
                  <span className="font-bold text-[var(--link-on-bg)]">📍 {quest.city}</span>
                </>
              )}
            </p>
          )}
        </section>

        {quest && questStatusDisplay ? (
          <div
            role="status"
            aria-live="polite"
            className="relative mb-4 overflow-hidden rounded-2xl border-2 border-orange-300/65 bg-gradient-to-br from-orange-50/98 via-white/95 to-amber-50/70 px-3 py-3 shadow-[0_12px_36px_-14px_rgba(249,115,22,.28)] ring-1 ring-orange-200/50 backdrop-blur-sm motion-safe:animate-fade-up-slow motion-reduce:animate-none motion-reduce:opacity-100 [animation-delay:50ms] [animation-fill-mode:backwards] sm:flex sm:flex-row sm:items-stretch sm:gap-0 sm:px-4 sm:py-3.5"
          >
            <div
              className="pointer-events-none absolute inset-y-0 -left-[28%] z-0 w-[58%] bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-90 motion-safe:animate-quest-day-strip-shine motion-reduce:animate-none"
              aria-hidden
            />
            <div className="relative z-[1] flex flex-row items-stretch gap-3 sm:gap-4">
              <div
                className="w-1 shrink-0 self-stretch min-h-[48px] rounded-full bg-gradient-to-b from-orange-400 via-amber-400 to-orange-500 shadow-[0_0_14px_rgba(249,115,22,.45)]"
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-950/90">
                    {t('questOfDay')}
                  </span>
                  <time
                    className="font-display text-[1.05rem] font-black text-[var(--on-cream)] sm:text-lg"
                    dateTime={quest.questDate}
                  >
                    {formatQuestDateForLocale(quest.questDate, appLocale)}
                  </time>
                </div>
                <span
                  className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-[13px] font-black shadow-md motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-[1.02] ${questStatusDisplay.pillClass}`}
                >
                  <span aria-hidden>{questStatusDisplay.emoji}</span>
                  {questStatusDisplay.label}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Carte quête — même ADN que QuestExamplesSlider (embedded) */}
        {quest && (
          <article
            key={questCardSwapKey}
            className={`quest-slider-embedded overflow-hidden ring-1 transition-[opacity,box-shadow] duration-300 motion-safe:animate-fade-up-slow motion-reduce:animate-none [animation-delay:110ms] [animation-fill-mode:backwards] ${
              isAbandoned
                ? 'ring-slate-400/35'
                : isAccepted || isCompleted
                  ? 'ring-emerald-400/40 shadow-[0_12px_40px_-8px_rgba(16,185,129,.2)]'
                  : 'ring-orange-400/25'
            } ${rerolling || reporting ? 'pointer-events-none opacity-55' : ''}`}
          >
            <div className="px-4 pb-5 pt-5 sm:px-6 sm:pt-6">
              {/* Titre + tag : identité de la quête avant les consignes */}
              <div className="mb-6 flex items-start gap-3">
                <span className="text-3xl leading-none select-none sm:text-4xl" aria-hidden>
                  {questDisplayEmoji(quest.emoji)}
                </span>
                <div className="min-w-0 flex-1 pr-2">
                  <h2 className="font-display text-lg font-black leading-tight text-[var(--on-cream)] sm:text-xl">
                    {quest.title}
                  </h2>
                  {(questFamily || questPace) ? (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--on-cream-subtle)]">
                      {questFamily ? (
                        <span className="rounded-full border border-[color:color-mix(in_srgb,var(--on-cream)_16%,transparent)] bg-white/90 px-2.5 py-0.5 font-semibold text-[var(--on-cream-muted)] shadow-sm">
                          {questFamily}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full border px-2.5 py-0.5 font-semibold shadow-sm ${
                          questPace === 'planned'
                            ? 'border-violet-300/70 bg-violet-50/95 text-violet-950'
                            : 'border-cyan-300/60 bg-cyan-50/95 text-cyan-950'
                        }`}
                        title={
                          questPace === 'planned' ? t('pacePlannedTitle') : t('paceTodayTitle')
                        }
                      >
                        {questPace === 'planned' ? t('pacePlannedLabel') : t('paceTodayLabel')}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Mission concrète */}
              <section
                className="mb-6 rounded-2xl border-2 border-cyan-400/55 bg-gradient-to-br from-white via-cyan-50/50 to-white p-5 shadow-[0_8px_28px_-6px_rgba(34,211,238,0.22)] ring-1 ring-cyan-200/70 sm:p-6"
                aria-labelledby="mission-heading"
              >
                <p
                  id="mission-heading"
                  className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-950"
                >
                  <span className="text-base leading-none" aria-hidden>
                    ⚡
                  </span>
                  {t('missionHeading')}
                </p>
                <p className="font-display text-[1.15rem] font-black leading-[1.35] text-[var(--on-cream)] sm:text-xl md:text-[1.35rem] md:leading-snug">
                  {quest.mission}
                </p>
                {quest.deferredSocialUntil && isPending && (
                  <p className="mt-4 rounded-xl border border-dashed border-violet-200/80 bg-violet-50/60 px-3 py-2.5 text-xs font-semibold leading-relaxed text-violet-950">
                    {appLocale === 'en' ? (
                      <>
                        📅 For a bolder or social challenge, you chose{' '}
                        <span className="font-black">
                          {formatQuestDateForLocale(quest.deferredSocialUntil, appLocale)}
                        </span>
                        {' '}
                        — a reminder, not an obligation.
                      </>
                    ) : (
                      <>
                        📅 Pour un défi plus ambitieux ou social, tu t’étais fixé·e le{' '}
                        <span className="font-black">
                          {formatQuestDateForLocale(quest.deferredSocialUntil, appLocale)}
                        </span>{' '}
                        — c’est un repère, pas une obligation.
                      </>
                    )}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cyan-200/60 pt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300/70 bg-orange-100/95 px-3 py-1.5 text-xs font-black text-orange-950">
                    <span aria-hidden>⏱️</span>
                    {quest.duration}
                  </span>
                  {quest.isOutdoor && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-100/90 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                      {t('outdoorBadge')}
                    </span>
                  )}
                </div>
              </section>

              {quest.isOutdoor && quest.destination ? (
                <section
                  className="mb-6 rounded-2xl border border-cyan-200/50 bg-gradient-to-br from-white via-cyan-50/35 to-emerald-50/30 p-5 shadow-[0_8px_28px_-8px_rgba(34,211,238,0.18)] ring-1 ring-cyan-100/75 sm:p-6"
                  aria-labelledby="map-heading"
                >
                  <h3
                    id="map-heading"
                    className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-950"
                  >
                    <Icon name="Map" size="sm" className="text-cyan-700" />
                    {t('mapHeading')}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--on-cream-muted)]">
                    {t('mapDescription')}
                  </p>
                  <QuestDestinationMap destination={quest.destination} userPosition={userPosition} />
                </section>
              ) : null}

              <figure className="quest-hook-card mb-2 mt-1">
                <figcaption className="quest-hook-card__label">{t('hookLabel')}</figcaption>
                <blockquote className="quest-hook-card__quote">
                  <span className="quest-hook-card__g" aria-hidden>
                    «
                  </span>
                  <span className="font-medium text-[var(--on-cream)]">{quest.hook}</span>
                  <span className="quest-hook-card__g" aria-hidden>
                    »
                  </span>
                </blockquote>
              </figure>

              {quest.safetyNote && isPending && (
                <p className="mt-5 border-l-4 border-amber-300/90 pl-3 text-sm leading-relaxed text-slate-600">
                  {quest.safetyNote}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4 border-t-2 border-orange-300/35 bg-gradient-to-r from-white/75 via-amber-50/50 to-cyan-50/40 px-4 py-5 sm:px-5">
              {isCompleted ? (
                <div className="text-center space-y-3">
                  <p className="font-display text-lg font-black text-emerald-900">
                    {t('completedTitle')}
                  </p>
                  <p className="mt-2 text-sm text-[var(--on-cream-muted)]">{t('completedSubtitle')}</p>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowShareCard(true)}
                      className="btn btn-md w-full sm:w-auto font-black border-2 border-cyan-400/50 bg-gradient-to-r from-cyan-50 to-amber-50 text-cyan-950 shadow-sm"
                    >
                      {t('shareVictory')}
                    </button>
                  </div>
                </div>
              ) : isAbandoned ? (
                <div className="text-center space-y-2 text-[var(--on-cream-muted)]">
                  <p className="font-display text-lg font-black text-slate-700">
                    {t('abandonedTitle')}
                  </p>
                  <p className="text-sm">
                    {t('abandonedSubtitle')}
                  </p>
                </div>
              ) : isAccepted ? (
                completing ? (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="font-bold text-emerald-900">{t('saving')}</p>
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={doComplete} className="btn btn-primary btn-lg w-full text-base font-black">
                      {t('validateQuest')}
                    </button>
                    <p className="text-center text-xs text-[var(--on-cream-muted)]">
                      {t('validateHint')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAbandonConfirm(true)}
                      className="mx-auto mt-2 text-center text-[11px] font-semibold text-[var(--muted)] underline-offset-2 hover:underline"
                    >
                      {t('abandonLink')}
                    </button>
                  </>
                )
              ) : accepting ? (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  <p className="font-bold text-orange-900">{t('confirming')}</p>
                </div>
              ) : (
                <>
                  <button type="button" onClick={handleAccept} className="btn btn-cta btn-lg w-full text-base font-black">
                    {t('acceptChallenge')}
                  </button>
                  <div className="quest-actions-reroll">
                    <button
                      type="button"
                      onClick={handleReroll}
                      disabled={rerolling || !canReroll}
                      className="quest-actions-reroll__btn"
                    >
                      <Icon name="Dices" size="sm" className="shrink-0 opacity-95" />
                      {rerolling ? '…' : t('changeQuest', { label: rerollLabel })}
                    </button>
                  </div>
                  <div className="quest-actions-secondary">
                    <div
                      className={`quest-actions-secondary__row ${!isPlannedQuest ? 'sm:mx-auto sm:max-w-xl' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => setShowAbandonConfirm(true)}
                        className={`quest-actions-secondary__btn quest-actions-secondary__btn--pass ${isPlannedQuest ? 'w-full sm:flex-1' : 'w-full'}`}
                      >
                        <Icon name="Frown" size="sm" className="opacity-80" />
                        {t('notForMe')}
                      </button>
                      {isPlannedQuest ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReportDeferredDate(calendarDay);
                            setShowReportModal(true);
                          }}
                          disabled={!canReroll}
                          className="quest-actions-secondary__btn quest-actions-secondary__btn--report w-full sm:flex-1"
                        >
                          <Icon name="ClipboardList" size="sm" />
                          {t('reportShortQuest')}
                        </button>
                      ) : null}
                    </div>
                    {isPlannedQuest ? (
                      <p className="mt-2 px-1 text-center text-[10px] leading-relaxed text-[var(--on-cream-subtle)]">
                        {t('reportHint')}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </article>
        )}
      </main>

      {showSafety && quest && (
        <SafetySheet quest={quest} onConfirm={doAccept} onClose={() => setShowSafety(false)} />
      )}

      {showReportModal && quest && (quest.questPace ?? 'instant') === 'planned' && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
        >
          <div className="max-w-md w-full rounded-2xl border border-cyan-200/80 bg-white p-6 shadow-2xl">
            <h3 id="report-title" className="font-display text-lg font-black text-slate-900">
              {t('reportModalTitle')}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {t('reportModalBody', { maxDays: REPORT_DEFER_MAX_DAYS })}
            </p>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="report-date">
              {t('reportDateLabel')}
            </label>
            <input
              id="report-date"
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              min={calendarDay}
              max={reportDateMax}
              value={reportDeferredDate}
              onChange={(e) => setReportDeferredDate(e.target.value)}
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-md flex-1"
                onClick={() => setShowReportModal(false)}
                disabled={reporting}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md flex-[2] font-black"
                onClick={() => void handleReportConfirm()}
                disabled={reporting || !canReroll}
              >
                {reporting ? '…' : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAbandonConfirm && quest && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="abandon-title"
        >
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 id="abandon-title" className="font-display text-lg font-black text-slate-900">
              {t('abandonModalTitle')}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {t('abandonModalBody')}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-md flex-1"
                onClick={() => setShowAbandonConfirm(false)}
                disabled={abandoning}
              >
                {t('back')}
              </button>
              <button
                type="button"
                className="btn btn-md flex-[2] border border-slate-300 bg-slate-100 font-black text-slate-900"
                onClick={() => void confirmAbandon()}
                disabled={abandoning}
              >
                {abandoning ? '…' : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {xpCelebration && (
        <QuestXpCelebration
          key={`${xpCelebration.xpGain.previousTotal}-${xpCelebration.xpGain.newTotal}`}
          open
          xpGain={xpCelebration.xpGain}
          badgesUnlocked={xpCelebration.badgesUnlocked}
          onOpenChange={(open) => {
            if (!open) setXpCelebration(null);
          }}
          onContinue={() => {
            setXpCelebration(null);
            setShowShareCard(true);
          }}
        />
      )}

      {quest?.status === 'completed' && (
        <QuestShareComposer
          open={showShareCard}
          onOpenChange={setShowShareCard}
          userFirstName={user?.firstName ?? t('shareDefaultName')}
          payload={{
            questDate: quest.questDate,
            emoji: quest.emoji,
            title: quest.title,
            mission: quest.mission,
            hook: quest.hook,
            duration: quest.duration,
            streak: quest.streak,
            day: quest.day,
          }}
        />
      )}
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-adventure">
          <Navbar />
          <main
            id="main-content"
            tabIndex={-1}
            className="max-w-2xl mx-auto px-3 sm:px-5 pt-24 pb-20 outline-none"
          >
            <div className="animate-pulse space-y-5 mt-4">
              <div className="h-5 rounded-xl w-40 bg-[color:var(--progress-track)]" />
              <div className="h-10 rounded-xl w-72 bg-[color:var(--progress-track)]" />
              <div className="h-80 rounded-3xl bg-[color:var(--progress-track)]" />
            </div>
          </main>
        </div>
      }
    >
      <AppPageContent />
    </Suspense>
  );
}
