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
  isValidQuestDateIso,
  REPORT_DEFER_MAX_DAYS,
  QUEST_LOADER_DAY_STORAGE_KEY,
  getQuestCalendarDateNow,
  QUESTIA_SHOP_GRANTS_UPDATED,
} from '@questia/shared';
import { AnalyticsEvent } from '@/lib/analytics/events';
import { questAnalyticsId, trackAnalyticsEvent } from '@/lib/analytics/track';

const QuestDestinationMap = dynamic(
  () => import('@/components/QuestDestinationMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 animate-pulse rounded-2xl bg-gradient-to-br from-cyan-100/40 to-orange-50/50" />
    ),
  },
);

/** Seuil de glissé horizontal sur la carte quête (web), aligné sur l'app mobile ~100px */
const QUEST_CARD_SWIPE_X = 100;
const QUEST_CARD_ROT_MAX = 12;
/** Rotation au « mur » (même logique que mobile : la carte ne quitte pas l'écran) */
const QUEST_CARD_BUMP_ROT = 14;
/** Phase 1 : vers le mur ; phase 2 : retour au centre */
const QUEST_CARD_BUMP_MS = 200;
const QUEST_CARD_RETURN_MS = 210;

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

function cloneDailyQuestSnapshot(q: DailyQuest): DailyQuest {
  return JSON.parse(JSON.stringify(q)) as DailyQuest;
}

function applyOptimisticRerollDecrement(q: DailyQuest): DailyQuest {
  const daily = q.rerollsRemaining ?? 0;
  const bonus = q.bonusRerollCredits ?? 0;
  if (daily > 0) return { ...q, rerollsRemaining: Math.max(0, daily - 1) };
  if (bonus > 0) return { ...q, bonusRerollCredits: Math.max(0, bonus - 1) };
  return q;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4 md:items-center">
      <div className="quest-modal-backdrop absolute inset-0 cursor-pointer" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="safety-sheet-title"
        className="quest-modal-sheet relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-md flex-col overflow-hidden"
      >
        <div className="quest-modal-panel-accent" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 pt-3 sm:p-7 sm:pt-6">
          <div className="text-center">
            <div className="mb-2 flex justify-center sm:mb-3">
              <Icon name="Shield" size="2xl" className="text-orange-500" />
            </div>
            <h3 id="safety-sheet-title" className="font-display text-lg font-black text-[var(--text)] sm:text-xl">
              {t('safetyTitle')}
            </h3>
            <p className="mt-1 text-xs leading-snug text-[var(--muted)] sm:text-sm">
              {t('safetySubtitle', { title: quest.title })}
            </p>
          </div>
          <div className="mt-4 space-y-2 sm:mt-6 sm:space-y-2.5">
            {rules.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                className="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-all sm:gap-3 sm:p-3"
                style={{
                  background: checked.has(i) ? 'rgba(16,185,129,.1)' : 'rgba(15,23,42,.04)',
                  border: `1px solid ${checked.has(i) ? 'rgba(16,185,129,.35)' : 'rgba(15,23,42,.1)'}`,
                }}
              >
                <div
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md"
                  style={{
                    background: checked.has(i) ? '#10b981' : '#fff',
                    border: `2px solid ${checked.has(i) ? '#10b981' : 'rgba(15,23,42,.2)'}`,
                  }}
                >
                  {checked.has(i) ? <Icon name="Check" size="xs" className="text-white" /> : null}
                </div>
                <span className={`text-xs leading-snug sm:text-sm ${checked.has(i) ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
                  {r}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-[var(--border-ui)]/25 bg-[var(--card)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-md flex-1">
              {t('safetyNotToday')}
            </button>
            <button
              type="button"
              onClick={() => ok && onConfirm()}
              disabled={!ok}
              className="btn btn-md flex-[2] text-white transition-all"
              style={{
                background: ok ? 'linear-gradient(135deg,#f97316,#fbbf24)' : 'rgba(15,23,42,.08)',
                color: ok ? '#fff' : '#64748b',
                cursor: ok ? 'pointer' : 'not-allowed',
                boxShadow: ok ? '0 4px 20px rgba(249,115,22,.35)' : 'none',
              }}
            >
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
  /** Jour calendaire courant (mis à jour au passage de minuit / retour sur l'onglet) — évite l'état « figé » si l'onglet reste ouvert. */
  const [calendarDay, setCalendarDay] = useState(() => getQuestCalendarDateNow());
  const reportDateMax = useMemo(() => {
    const d = new Date(`${calendarDay}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + REPORT_DEFER_MAX_DAYS);
    return d.toISOString().slice(0, 10);
  }, [calendarDay]);

  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSafety, setShowSafety] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [showRerollConfirm, setShowRerollConfirm] = useState(false);
  /** Incrémenté après relance/report pour remonter la carte quête (animation / nouveau contenu). */
  const [questCardSwapKey, setQuestCardSwapKey] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDeferredDate, setReportDeferredDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
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
  /** Évite les doublons quest_viewed sur relances silencieuses de la même quête. */
  const lastQuestViewKey = useRef<string | null>(null);
  const acceptInFlightRef = useRef(false);
  const completeInFlightRef = useRef(false);
  const abandonInFlightRef = useRef(false);
  const reportInFlightRef = useRef(false);

  // ── Ensure profile exists (get-or-create from onboarding localStorage) ───────

  const ensureProfile = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/profile', { method: 'GET' });
      if (res.ok) return true;
      if (res.status !== 404) return false;
      const explorer = typeof window !== 'undefined' ? localStorage.getItem('questia_explorer') : null;
      const risk = typeof window !== 'undefined' ? localStorage.getItem('questia_risk') : null;
      const sociability = typeof window !== 'undefined' ? localStorage.getItem('questia_sociability') : null;
      const createRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explorerAxis: explorer === 'homebody' || explorer === 'explorer' ? explorer : undefined,
          riskAxis: risk === 'cautious' || risk === 'risktaker' ? risk : undefined,
          ...(sociability === 'solitary' || sociability === 'balanced' || sociability === 'social'
            ? { sociability }
            : {}),
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
        const qk = `${data.questDate}_${data.archetypeId}`;
        if (lastQuestViewKey.current !== qk) {
          lastQuestViewKey.current = qk;
          trackAnalyticsEvent(AnalyticsEvent.questViewed, {
            quest_id: questAnalyticsId(data),
            quest_status: data.status,
          });
        }
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
    [ensureProfile, questDateFromUrl, appLocale, t],
  );

  /** Après achat boutique (relances bonus, etc.) : resynchroniser les compteurs sur la carte quête. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onShopGrants = () => {
      void loadQuest(userPosition?.lat, userPosition?.lon, {
        silent: true,
        questDate: questDateFromUrl ?? undefined,
      });
    };
    window.addEventListener(QUESTIA_SHOP_GRANTS_UPDATED, onShopGrants);
    return () => window.removeEventListener(QUESTIA_SHOP_GRANTS_UPDATED, onShopGrants);
  }, [loadQuest, userPosition?.lat, userPosition?.lon, questDateFromUrl]);

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

  /** Aligne la barre d'adresse avec la quête affichée (partage / deep link). */
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
    if (!quest || acceptInFlightRef.current || quest.status !== 'pending') return;
    const snapshot = cloneDailyQuestSnapshot(quest);
    acceptInFlightRef.current = true;
    setBannerError(null);
    setQuest((prev) => (prev ? { ...prev, status: 'accepted' } : null));
    setShowSafety(false);
    setAcceptQuestFlash(true);
    window.setTimeout(() => setAcceptQuestFlash(false), 780);
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questDate: snapshot.questDate,
          safetyConsentGiven: snapshot.isOutdoor,
        }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setQuest(snapshot);
        setBannerError(err.error ?? t('bannerAcceptFailed'));
        return;
      }
      const data = (await res.json()) as Partial<DailyQuest>;
      setQuest((prev) =>
        prev ? { ...prev, ...data, status: (data.status ?? 'accepted') as DailyQuest['status'] } : null,
      );
      trackAnalyticsEvent(AnalyticsEvent.questAccepted, {
        quest_id: questAnalyticsId(snapshot),
        quest_phase: snapshot.phase,
        is_outdoor: snapshot.isOutdoor,
      });
    } catch {
      setQuest(snapshot);
      setBannerError(t('bannerAcceptFailed'));
    } finally {
      acceptInFlightRef.current = false;
    }
  }, [quest, t]);

  const doComplete = useCallback(async () => {
    if (!quest || completeInFlightRef.current || quest.status !== 'accepted') return;
    const snapshot = cloneDailyQuestSnapshot(quest);
    const qd = snapshot.questDate;
    completeInFlightRef.current = true;
    setBannerError(null);
    setQuest((prev) => (prev ? { ...prev, status: 'completed' } : null));
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: qd, action: 'complete' }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setQuest(snapshot);
        setBannerError(err.error ?? t('bannerCompleteFailed'));
        return;
      }
      const data = (await res.json()) as Partial<DailyQuest> & {
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
      trackAnalyticsEvent(AnalyticsEvent.questCompleted, {
        quest_id: questAnalyticsId(snapshot),
        quest_phase: snapshot.phase,
        xp_gained: data.xpGain?.gained,
      });
      if (data.xpGain) {
        setXpCelebration({
          xpGain: data.xpGain,
          badgesUnlocked: data.badgesUnlocked ?? [],
        });
      } else {
        setShowShareCard(true);
      }
    } catch {
      setQuest(snapshot);
      setBannerError(t('bannerCompleteFailed'));
    } finally {
      completeInFlightRef.current = false;
    }
  }, [quest, t]);

  const handleAccept = useCallback(() => {
    if (quest?.isOutdoor) { setShowSafety(true); }
    else { doAccept(); }
  }, [quest, doAccept]);

  // ── Reroll ────────────────────────────────────────────────────────────────

  const confirmReroll = useCallback(() => {
    if (!quest || rerolling) return;
    if (quest.status === 'accepted' || quest.status === 'completed' || quest.status === 'abandoned') return;
    const daily = quest.rerollsRemaining ?? 0;
    const bonus = quest.bonusRerollCredits ?? 0;
    if (daily + bonus <= 0) return;
    setShowRerollConfirm(true);
  }, [quest, rerolling]);

  const handleReroll = async () => {
    if (!quest || rerolling) return;
    const snapshot = cloneDailyQuestSnapshot(quest);
    const qd = snapshot.questDate;
    setShowRerollConfirm(false);
    setRerolling(true);
    setBannerError(null);
    setQuest((prev) => (prev && prev.questDate === qd ? applyOptimisticRerollDecrement(prev) : prev));
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questDate: qd, action: 'reroll' }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setQuest(snapshot);
        setBannerError(data.error ?? t('bannerRerollFailed'));
        return;
      }
      const ok = await loadQuest(userPosition?.lat, userPosition?.lon, {
        silent: true,
        questDate: qd,
      });
      if (!ok) {
        setBannerError(t('bannerReloadFailed'));
      } else {
        setQuestCardSwapKey((k) => k + 1);
        trackAnalyticsEvent(AnalyticsEvent.questRerolled, { quest_id: questAnalyticsId(snapshot) });
      }
    } catch {
      setQuest(snapshot);
      setBannerError(t('bannerRerollFailed'));
    } finally {
      setRerolling(false);
    }
  };

  const handleReportConfirm = async () => {
    if (!quest || reportInFlightRef.current) return;
    if (quest.status !== 'pending') return;
    if ((quest.questPace ?? 'instant') !== 'planned') return;
    const snapshot = cloneDailyQuestSnapshot(quest);
    const qd = snapshot.questDate;
    const deferred = reportDeferredDate;
    reportInFlightRef.current = true;
    setBannerError(null);
    setShowReportModal(false);
    setRerolling(true);
    setQuest((prev) => (prev && prev.questDate === qd ? applyOptimisticRerollDecrement(prev) : prev));
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          questDate: qd,
          deferredUntil: deferred,
        }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setQuest(snapshot);
        setShowReportModal(true);
        setBannerError(data.error ?? t('bannerReportFailed'));
        return;
      }
      const ok = await loadQuest(userPosition?.lat, userPosition?.lon, {
        silent: true,
        questDate: qd,
      });
      if (!ok) setBannerError(t('bannerReloadFailed'));
      else setQuestCardSwapKey((k) => k + 1);
    } catch {
      setQuest(snapshot);
      setShowReportModal(true);
      setBannerError(t('bannerReportFailed'));
    } finally {
      reportInFlightRef.current = false;
      setRerolling(false);
    }
  };

  const confirmAbandon = async () => {
    if (!quest || abandonInFlightRef.current) return;
    if (quest.status !== 'pending' && quest.status !== 'accepted') return;
    const snapshot = cloneDailyQuestSnapshot(quest);
    const qd = snapshot.questDate;
    abandonInFlightRef.current = true;
    setBannerError(null);
    setShowAbandonConfirm(false);
    setQuest((prev) =>
      prev && prev.questDate === qd
        ? { ...prev, status: 'abandoned' as const, streak: 0 }
        : prev,
    );
    try {
      const res = await fetch('/api/quest/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abandon', questDate: qd }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setQuest(snapshot);
        setShowAbandonConfirm(true);
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
      trackAnalyticsEvent(AnalyticsEvent.questAbandoned, { quest_id: questAnalyticsId(snapshot) });
    } catch {
      setQuest(snapshot);
      setShowAbandonConfirm(true);
      setBannerError(t('bannerAbandonFailed'));
    } finally {
      abandonInFlightRef.current = false;
    }
  };

  const rerollDaily = quest?.rerollsRemaining ?? 0;
  const rerollBonus = quest?.bonusRerollCredits ?? 0;
  const rerollParts: string[] = [];
  if (rerollDaily > 0) rerollParts.push(t('rerollDaily', { n: rerollDaily }));
  if (rerollBonus > 0) rerollParts.push(t('rerollBonus', { n: rerollBonus }));
  const rerollLabel = rerollParts.length > 0 ? rerollParts.join(' \u00b7 ') : t('rerollNone');
  const canReroll =
    quest &&
    quest.status !== 'accepted' &&
    quest.status !== 'completed' &&
    quest.status !== 'abandoned' &&
    rerollDaily + rerollBonus > 0;

  const questStatus = quest?.status;
  const isPending = questStatus === 'pending';
  const isAccepted = questStatus === 'accepted';
  const isCompleted = questStatus === 'completed';
  const isAbandoned = questStatus === 'abandoned';
  const questPace = quest?.questPace ?? 'instant';
  const isPlannedQuest = questPace === 'planned';

  /** Glisser sur la carte (pointeur / tactile) */
  const [questSwipeOffset, setQuestSwipeOffset] = useState({ x: 0, y: 0 });
  const [questSwipeDragging, setQuestSwipeDragging] = useState(false);
  const [swipeFlying, setSwipeFlying] = useState(false);
  /** null = pas d'anim bump ; out = vers le mur ; back = retour au centre puis complétion */
  const [swipeBumpPhase, setSwipeBumpPhase] = useState<null | 'out' | 'back'>(null);
  /** Après le bump + complétion : la carte peut rester masquée tant qu'une modale / le panneau détail est ouvert. */
  const [swipeParkedAfterFlight, setSwipeParkedAfterFlight] = useState(false);
  const questSwipeRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
  });
  const swipePendingActionRef = useRef<null | 'accept' | 'reroll' | 'complete'>(null);

  const endQuestSwipe = useCallback(() => {
    questSwipeRef.current = { active: false, pointerId: null, startX: 0, startY: 0 };
    setQuestSwipeOffset({ x: 0, y: 0 });
    setQuestSwipeDragging(false);
    setSwipeFlying(false);
    setSwipeBumpPhase(null);
    setSwipeParkedAfterFlight(false);
    swipePendingActionRef.current = null;
  }, []);

  useEffect(() => {
    endQuestSwipe();
  }, [quest?.questDate, quest?.status, questCardSwapKey, endQuestSwipe]);

  const runSwipeCompletion = useCallback(() => {
    const action = swipePendingActionRef.current;
    if (!action) return;
    swipePendingActionRef.current = null;
    setSwipeFlying(false);
    setSwipeBumpPhase(null);

    if (action === 'complete') {
      void doComplete();
      setQuestSwipeOffset({ x: 0, y: 0 });
      return;
    }
    if (action === 'reroll') {
      setSwipeParkedAfterFlight(true);
      return;
    }
    if (action === 'accept') {
      if (quest?.isOutdoor) {
        setSwipeParkedAfterFlight(true);
        handleAccept();
        return;
      }
      setQuestSwipeOffset({ x: 0, y: 0 });
      handleAccept();
      return;
    }
  }, [handleAccept, quest?.isOutdoor, doComplete]);

  const runSwipeCompletionRef = useRef(runSwipeCompletion);
  runSwipeCompletionRef.current = runSwipeCompletion;

  const startSwipeFlight = useCallback(
    (dir: 'right' | 'left') => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (isAccepted) {
          void doComplete();
          endQuestSwipe();
          return;
        }
        if (dir === 'right') handleAccept();
        else if (dir === 'left' && canReroll) confirmReroll();
        endQuestSwipe();
        return;
      }
      const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
      const wallX = Math.min(vw * 0.22, 112);
      let endX = 0;
      if (dir === 'right') {
        swipePendingActionRef.current = isAccepted ? 'complete' : 'accept';
        endX = wallX;
      } else if (dir === 'left') {
        swipePendingActionRef.current = 'reroll';
        endX = -wallX;
        confirmReroll();
      }
      questSwipeRef.current = { active: false, pointerId: null, startX: 0, startY: 0 };
      setQuestSwipeDragging(false);
      setSwipeBumpPhase('out');
      setSwipeFlying(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setQuestSwipeOffset({ x: endX, y: 0 });
        });
      });
    },
    [isAccepted, canReroll, handleAccept, confirmReroll, doComplete, endQuestSwipe],
  );

  useEffect(() => {
    if (!swipeFlying) return;
    const id = window.setTimeout(() => {
      runSwipeCompletionRef.current();
    }, QUEST_CARD_BUMP_MS + QUEST_CARD_RETURN_MS + 400);
    return () => window.clearTimeout(id);
  }, [swipeFlying]);

  /** Quand toutes les surfaces « bloquantes » sont fermées, on ramène la carte au centre. */
  useEffect(() => {
    if (!swipeParkedAfterFlight) return;
    if (showRerollConfirm || showSafety) return;
    setSwipeParkedAfterFlight(false);
    endQuestSwipe();
  }, [swipeParkedAfterFlight, showRerollConfirm, showSafety, endQuestSwipe]);

  const onQuestCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!(isPending || isAccepted) || rerolling || swipeFlying || swipeParkedAfterFlight) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button, a, [data-quest-card-scroll]')) return;
      questSwipeRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      };
      setQuestSwipeDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [isPending, isAccepted, rerolling, swipeFlying, swipeParkedAfterFlight],
  );

  /** Quête en attente : seul le swipe horizontal compte (pas d’ouverture « détails » au vertical). */
  const projectSwipeDelta = useCallback((dx: number, dy: number) => {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax >= ay) {
      return { x: dx, y: 0 };
    }
    return { x: 0, y: 0 };
  }, []);

  /** En accepté : seul le swipe vers la droite suit le doigt (pas de gauche / haut inutiles). */
  const projectSwipeDeltaAccepted = useCallback((dx: number, dy: number) => {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax >= ay) {
      return { x: Math.max(0, dx), y: 0 };
    }
    return { x: 0, y: 0 };
  }, []);

  const onQuestCardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = questSwipeRef.current;
      if (!s.active || e.pointerId !== s.pointerId) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      setQuestSwipeOffset(
        isAccepted ? projectSwipeDeltaAccepted(dx, dy) : projectSwipeDelta(dx, dy),
      );
    },
    [isAccepted, projectSwipeDelta, projectSwipeDeltaAccepted],
  );

  const onQuestCardPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = questSwipeRef.current;
      if (!s.active || e.pointerId !== s.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* déjà relâché */
      }
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      questSwipeRef.current = { active: false, pointerId: null, startX: 0, startY: 0 };
      setQuestSwipeDragging(false);

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const horizontal = absX >= absY;

      if (isAccepted) {
        if (horizontal && absX > QUEST_CARD_SWIPE_X && dx > 0 && !completeInFlightRef.current) {
          startSwipeFlight('right');
          return;
        }
        endQuestSwipe();
        return;
      }

      if (horizontal && absX > QUEST_CARD_SWIPE_X) {
        if (dx > 0) {
          startSwipeFlight('right');
          return;
        }
        if (canReroll) {
          startSwipeFlight('left');
          return;
        }
      }
      endQuestSwipe();
    },
    [isAccepted, endQuestSwipe, startSwipeFlight, canReroll],
  );

  const onQuestCardPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = questSwipeRef.current;
      if (!s.active || e.pointerId !== s.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      endQuestSwipe();
    },
    [endQuestSwipe],
  );

  const onQuestCardTransitionEnd = useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    if (!swipeFlying) return;
    setSwipeBumpPhase((phase) => {
      if (phase === 'out') {
        setQuestSwipeOffset({ x: 0, y: 0 });
        return 'back';
      }
      if (phase === 'back') {
        queueMicrotask(() => {
          runSwipeCompletionRef.current();
        });
        return 'back';
      }
      return phase;
    });
  }, [swipeFlying]);

  /** Transform / overlays : en attente ou acceptée (swipe pour valider), hors chargements */
  const questCardTransformsActive = (isPending || isAccepted) && !rerolling;
  /** Gestes : pas pendant l'animation de sortie */
  const questCardSwipeInteractive =
    (isPending || isAccepted) && !rerolling && !swipeFlying && !swipeParkedAfterFlight;

  const swipeOverlayOpacity = useMemo(() => {
    const ox = questSwipeOffset.x;
    const acceptOp = ox > 0 ? Math.min(1, ox / QUEST_CARD_SWIPE_X) : 0;
    const changeOp =
      isPending && ox < 0 ? Math.min(1, (-ox / QUEST_CARD_SWIPE_X) * (canReroll ? 1 : 0.35)) : 0;
    return { acceptOp, changeOp };
  }, [questSwipeOffset, canReroll, isPending]);

  const questCardSwipeStyle = useMemo((): React.CSSProperties | undefined => {
    if (!questCardTransformsActive) return undefined;
    const { x, y } = questSwipeOffset;
    let rot = Math.max(
      -QUEST_CARD_ROT_MAX,
      Math.min(QUEST_CARD_ROT_MAX, (x / 220) * QUEST_CARD_ROT_MAX),
    );
    if (swipeFlying) {
      if (x > 40) rot = QUEST_CARD_BUMP_ROT;
      else if (x < -40) rot = -QUEST_CARD_BUMP_ROT;
    }
    const bumpOutEase = 'cubic-bezier(0.22, 0.82, 0.28, 1)';
    const bumpBackEase = 'cubic-bezier(0.34, 1.25, 0.45, 1)';
    const snapEase = 'cubic-bezier(0.34, 1.25, 0.45, 1)';
    return {
      transform: `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`,
      transition:
        questSwipeDragging && !swipeFlying
          ? 'none'
          : swipeFlying && swipeBumpPhase === 'out'
            ? `transform ${QUEST_CARD_BUMP_MS}ms ${bumpOutEase}`
            : swipeFlying && swipeBumpPhase === 'back'
              ? `transform ${QUEST_CARD_RETURN_MS}ms ${bumpBackEase}`
            : swipeParkedAfterFlight
              ? 'opacity 0.2s ease-out'
              : `transform 0.45s ${snapEase}, opacity 0.45s ${snapEase}`,
      opacity: swipeParkedAfterFlight ? 0 : 1,
      touchAction: 'none',
      willChange: questSwipeDragging || swipeFlying ? 'transform' : undefined,
    };
  }, [
    questCardTransformsActive,
    questSwipeOffset,
    questSwipeDragging,
    swipeFlying,
    swipeBumpPhase,
    swipeParkedAfterFlight,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (!quest) return;
      if (quest.status === 'pending') {
        if (e.key === 'ArrowRight') { handleAccept(); e.preventDefault(); }
        else if (e.key === 'ArrowLeft' && canReroll) { confirmReroll(); e.preventDefault(); }
        return;
      }
      if (quest.status === 'accepted' && e.key === 'ArrowRight' && !completeInFlightRef.current) {
        e.preventDefault();
        void doComplete();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quest, canReroll, handleAccept, confirmReroll, doComplete]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <QuestHomeLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
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

  return (
    <div className="min-h-screen bg-[var(--bg)] relative overflow-x-visible">
      <Navbar />

      {acceptQuestFlash ? (
        <div
          className="pointer-events-none fixed inset-0 z-[85] bg-emerald-400/30 motion-safe:animate-quest-accept-flash motion-reduce:hidden"
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

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col items-stretch px-4 pb-8 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] outline-none sm:px-5 md:pt-24"
      >
        {quest ? (
          <div className="mb-4 flex w-full min-w-0 items-center justify-between gap-3 border-b border-[var(--border-ui)]/25 pb-3">
            <span className="text-sm font-black tracking-wide text-[var(--muted)]">
              J.{quest.day ?? 1}
            </span>
            {(quest.streak ?? 0) > 0 ? (
              <span className="text-base font-black text-[var(--orange)] tabular-nums">
                &#128293; {quest.streak}
              </span>
            ) : null}
          </div>
        ) : null}

        {bannerError && (
          <div
            role="alert"
            className="mb-4 w-full max-w-md rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-center text-sm font-semibold text-red-900 shadow-sm"
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

        <div className="flex w-full flex-1 flex-col items-center justify-start gap-4 py-2 sm:justify-center sm:py-4 sm:min-h-[min(560px,calc(100dvh-11rem))]">
        {quest ? (
          <div className="relative w-full max-w-[480px]">
            {/* Halo doux sous la carte (pas de « 2e carte » vide façon Tinder : il n'y a pas de profil suivant ici) */}
            {questCardTransformsActive && !isAbandoned ? (
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] bg-gradient-to-br from-[var(--orange)]/[0.07] via-transparent to-[var(--cyan)]/[0.08] opacity-90"
              />
            ) : null}
            <div
            key={questCardSwapKey}
            className={`relative w-full max-w-[480px] rounded-[28px] border-2 overflow-hidden shadow-xl ${
              /* quest-card-enter anime aussi transform : ça bloque le swipe (style inline ignoré) */
              questCardTransformsActive
                ? 'touch-none'
                : 'motion-safe:animate-quest-card-enter motion-reduce:animate-none [animation-fill-mode:backwards]'
            } ${questCardSwipeInteractive ? '' : 'transition-all duration-300'} ${
              isAbandoned
                ? 'border-slate-400/35'
                : isAccepted || isCompleted
                  ? 'border-emerald-400/40 shadow-emerald-500/15'
                  : 'border-[var(--orange)]/30 shadow-orange-500/10'
            } bg-[var(--card)] ${rerolling ? 'pointer-events-none opacity-50 scale-[0.97]' : ''} ${
              questCardSwipeInteractive
                ? questSwipeDragging
                  ? 'cursor-grabbing select-none'
                  : 'cursor-grab'
                : ''
            }`}
            style={questCardSwipeStyle}
            onPointerDown={questCardSwipeInteractive ? onQuestCardPointerDown : undefined}
            onPointerMove={questCardSwipeInteractive ? onQuestCardPointerMove : undefined}
            onPointerUp={questCardSwipeInteractive ? onQuestCardPointerUp : undefined}
            onPointerCancel={questCardSwipeInteractive ? onQuestCardPointerCancel : undefined}
            onTransitionEnd={questCardTransformsActive ? onQuestCardTransitionEnd : undefined}
          >
            {isAbandoned ? (
              <div className="py-16 px-8 text-center">
                <p className="text-lg font-black text-[var(--muted)]">{t('abandonedTitle')}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{t('abandonedSubtitle')}</p>
              </div>
            ) : (
              <>
                <div className="relative z-0 flex flex-col px-5 pb-1 pt-5 sm:px-6">
                  <div className="flex flex-col items-center text-center">
                    <h2 className="font-display flex max-w-[24ch] items-baseline justify-center gap-2 px-1 text-xl font-black leading-snug text-[var(--text)] sm:text-[22px]">
                      <span className="text-[22px] leading-none select-none sm:text-[24px]" aria-hidden>
                        {questDisplayEmoji(quest.emoji)}
                      </span>
                      <span>{quest.title}</span>
                    </h2>
                    <p className="mt-2 max-w-md text-[13px] leading-snug text-[var(--muted)]">
                      {[
                        quest.archetypeCategory ? questFamilyLabel(quest.archetypeCategory, appLocale) : null,
                        isPlannedQuest ? t('questCardMetaPacePlanned') : t('questCardMetaPaceToday'),
                        quest.isOutdoor ? t('questCardOutdoorShort') : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {quest.hook?.trim() ? (
                      <p className="mt-3 w-full max-w-md border-l-[3px] border-[var(--orange)]/45 pl-3 text-left text-sm italic leading-relaxed text-[var(--text)]/90 line-clamp-2">
                        {quest.hook.trim()}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 w-full border-t border-[var(--border-ui)]/35 pt-4 text-left" data-quest-card-scroll>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                      {t('questCardMissionEyebrow')}
                    </p>
                    <p className="text-[15px] leading-relaxed text-[var(--text)]">{quest.mission}</p>
                    <p className="mt-3 text-xs font-semibold tabular-nums text-[var(--muted)]">{quest.duration}</p>

                    {isPending && isPlannedQuest ? (
                      <div className="mt-3 rounded-xl border border-[var(--link-on-bg)]/30 bg-[var(--link-on-bg)]/[0.08] px-3 py-2.5 text-sm font-semibold leading-snug text-[var(--link-on-bg)]">
                        {canReroll ? t('reportPlannedHint') : t('reportNoRerollsHint')}
                      </div>
                    ) : null}

                    {quest.isOutdoor && quest.destination ? (
                      <section className="mt-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--orange)] sm:text-[11px]">
                          {t('mapHeading')}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-[var(--muted)] sm:text-xs">{t('mapDescription')}</p>
                        <div className="mt-2">
                          <QuestDestinationMap destination={quest.destination} userPosition={userPosition} compact />
                        </div>
                      </section>
                    ) : null}

                    {quest.safetyNote && isPending ? (
                      <section className="mt-4 rounded-xl border border-[var(--orange)]/30 bg-[var(--orange)]/[0.06] p-3 sm:p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--orange)] sm:text-[11px]">
                          {t('safetyTitle')}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{quest.safetyNote}</p>
                      </section>
                    ) : null}
                  </div>
                </div>

                {isAccepted && (
                  <div className="px-5 pb-5 space-y-2">
                    <button type="button" onClick={() => void doComplete()} className="btn btn-primary btn-lg w-full text-base font-black">
                      {t('validateQuest')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAbandonConfirm(true)}
                      className="w-full py-2.5 text-center text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--text)] hover:underline decoration-[var(--muted)] underline-offset-4"
                    >
                      {t('abandonLink')}
                    </button>
                  </div>
                )}

                {isCompleted && (
                  <div className="px-5 pb-5 text-center space-y-2">
                    <p className="text-lg font-black text-[var(--green)]">{t('completedTitle')}</p>
                    <p className="text-sm text-[var(--muted)]">{t('completedSubtitle')}</p>
                    <button
                      type="button"
                      onClick={() => setShowShareCard(true)}
                      className="quest-actions-share-btn btn btn-md w-full font-black mt-2"
                    >
                      {t('shareVictory')}
                    </button>
                  </div>
                )}

                {isPending && (
                  <div className="relative z-0 px-5 pb-5 space-y-2">
                    {isPlannedQuest && canReroll ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReportDeferredDate(calendarDay);
                          setShowReportModal(true);
                        }}
                        className="w-full rounded-xl border border-[var(--link-on-bg)]/30 py-3 text-sm font-bold text-[var(--link-on-bg)] transition-colors hover:bg-[var(--link-on-bg)]/5"
                      >
                        {t('reportShortQuest')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={confirmReroll}
                      disabled={rerolling || !canReroll}
                      className="w-full py-3 rounded-xl border-2 border-[var(--orange)]/40 bg-[var(--orange)]/5 text-sm font-black text-[var(--orange)] hover:bg-[var(--orange)]/10 transition-colors disabled:opacity-40"
                    >
                      {rerolling ? '\u2026' : t('changeQuest', { label: rerollLabel })}
                    </button>
                    <button type="button" onClick={handleAccept} className="btn btn-cta btn-lg w-full text-base font-black">
                      {t('acceptChallenge')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAbandonConfirm(true)}
                      className="w-full py-2.5 text-center text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--text)] hover:underline decoration-[var(--muted)] underline-offset-4"
                    >
                      {t('abandonLink')}
                    </button>
                  </div>
                )}

                {isPending && (
                  <div
                    className="pointer-events-none absolute inset-0 z-[35] overflow-hidden rounded-[28px]"
                    aria-hidden
                  >
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-emerald-500/25"
                      style={{ opacity: swipeOverlayOpacity.acceptOp }}
                    >
                      <span className="-rotate-12 text-2xl font-black tracking-[0.2em] text-emerald-700">
                        {t('swipeOverlayAccept')}
                      </span>
                    </div>
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-orange-500/25"
                      style={{ opacity: swipeOverlayOpacity.changeOp }}
                    >
                      <span className="rotate-12 text-2xl font-black tracking-[0.2em] text-orange-800">
                        {t('swipeOverlayChange')}
                      </span>
                    </div>
                  </div>
                )}
                {isAccepted && (
                  <div
                    className="pointer-events-none absolute inset-0 z-[20] overflow-hidden rounded-[28px]"
                    aria-hidden
                  >
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-emerald-500/25"
                      style={{ opacity: swipeOverlayOpacity.acceptOp }}
                    >
                      <span className="-rotate-12 text-2xl font-black tracking-[0.2em] text-emerald-700">
                        {t('swipeOverlayValidate')}
                      </span>
                    </div>
                  </div>
                )}

                {rerolling ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-[50] flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px] bg-[rgba(18,18,20,0.88)]"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className="h-10 w-10 motion-safe:animate-spin rounded-full border-2 border-[var(--orange)] border-t-transparent motion-reduce:animate-none"
                      aria-hidden
                    />
                    <p className="max-w-[min(100%,20rem)] px-4 text-center text-sm font-bold text-white drop-shadow-md">
                      {t('rerollLoading')}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
          </div>
        ) : null}

        {(isPending || isAccepted) && quest && (
          <p className="text-xs text-[var(--muted)]/50 text-center">
            {isPending ? t('swipeKeyboardHint') : t('swipeKeyboardHintAccepted')}
          </p>
        )}
        </div>
      </main>

      {showSafety && quest && (
        <SafetySheet quest={quest} onConfirm={doAccept} onClose={() => setShowSafety(false)} />
      )}

      {showRerollConfirm && quest && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reroll-confirm-title">
          <div className="quest-modal-backdrop absolute inset-0 cursor-pointer" onClick={() => setShowRerollConfirm(false)} aria-hidden />
          <div className="quest-modal-panel relative z-10 w-full motion-safe:animate-fade-up motion-reduce:animate-none">
            <div className="quest-modal-panel-accent" />
            <div className="quest-modal-panel-body">
              <h3 id="reroll-confirm-title" className="font-display text-lg font-black text-[var(--text)]">{t('rerollConfirmTitle')}</h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{t('rerollConfirmBody')}</p>
              <div className="mt-5 flex gap-2">
                <button type="button" className="btn btn-ghost btn-md flex-1" onClick={() => setShowRerollConfirm(false)}>{t('cancel')}</button>
                <button type="button" className="btn btn-cta btn-md flex-[2] font-black" onClick={() => void handleReroll()}>{t('rerollConfirmAction')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReportModal && quest && isPlannedQuest && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <div className="quest-modal-backdrop absolute inset-0 cursor-pointer" onClick={() => setShowReportModal(false)} aria-hidden />
          <div className="quest-modal-panel relative z-10 w-full">
            <div className="quest-modal-panel-accent" />
            <div className="quest-modal-panel-body">
              <h3 id="report-title" className="font-display text-lg font-black text-[var(--text)]">{t('reportModalTitle')}</h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{t('reportModalBody', { maxDays: REPORT_DEFER_MAX_DAYS })}</p>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-[var(--subtle)]" htmlFor="report-date">{t('reportDateLabel')}</label>
              <input id="report-date" type="date" className="mt-1 w-full rounded-xl border border-[color:var(--border-ui)] bg-[var(--input-bg)] px-3 py-2 text-[var(--text)]" min={calendarDay} max={reportDateMax} value={reportDeferredDate} onChange={(e) => setReportDeferredDate(e.target.value)} />
              <div className="mt-5 flex gap-2">
                <button type="button" className="btn btn-ghost btn-md flex-1" onClick={() => setShowReportModal(false)}>{t('cancel')}</button>
                <button type="button" className="btn btn-primary btn-md flex-[2] font-black" onClick={() => void handleReportConfirm()} disabled={!canReroll}>{t('confirm')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAbandonConfirm && quest && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="abandon-title">
          <div className="quest-modal-backdrop absolute inset-0 cursor-pointer" onClick={() => setShowAbandonConfirm(false)} aria-hidden />
          <div className="quest-modal-panel relative z-10 w-full">
            <div className="quest-modal-panel-accent" />
            <div className="quest-modal-panel-body">
              <h3 id="abandon-title" className="font-display text-lg font-black text-[var(--text)]">{t('abandonModalTitle')}</h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{t('abandonModalBody')}</p>
              <div className="mt-5 flex gap-2">
                <button type="button" className="btn btn-ghost btn-md flex-1" onClick={() => setShowAbandonConfirm(false)}>{t('back')}</button>
                <button type="button" className="btn btn-md flex-[2] border border-[color:var(--border-ui)] bg-[color:color-mix(in_srgb,var(--text)_10%,var(--card))] font-black text-[var(--text)]" onClick={() => void confirmAbandon()}>{t('confirm')}</button>
              </div>
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
          onOpenChange={(open) => { if (!open) setXpCelebration(null); }}
          onContinue={() => { setXpCelebration(null); setShowShareCard(true); }}
        />
      )}

      {quest?.status === 'completed' && (
        <QuestShareComposer
          open={showShareCard}
          onOpenChange={(open) => {
            setShowShareCard(open);
            if (open) trackAnalyticsEvent(AnalyticsEvent.shareOpened, { share_channel: 'quest_card' });
          }}
          userFirstName={user?.firstName ?? t('shareDefaultName')}
          shareLocale={appLocale === 'en' ? 'en' : 'fr'}
          payload={{
            questDate: quest.questDate,
            emoji: quest.emoji,
            title: quest.title,
            mission: quest.mission,
            hook: quest.hook,
            duration: quest.duration,
            streak: quest.streak,
            day: quest.day,
            equippedTitleId: quest.equippedTitleId ?? null,
            progression: quest.progression ?? null,
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
        <div className="min-h-screen bg-[var(--bg)]">
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
