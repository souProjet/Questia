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

/** Seuils de glissé sur la carte quête (web), alignés sur l’app mobile à ~100px / ~72px */
const QUEST_CARD_SWIPE_X = 100;
const QUEST_CARD_SWIPE_UP = 72;
const QUEST_CARD_ROT_MAX = 12;
/** Rotation finale quand la carte sort de l’écran */
const QUEST_CARD_FLIGHT_ROT = 26;
const QUEST_CARD_FLIGHT_MS = 480;

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
  const [showRerollConfirm, setShowRerollConfirm] = useState(false);
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
  /** Évite les doublons quest_viewed sur relances silencieuses de la même quête. */
  const lastQuestViewKey = useRef<string | null>(null);

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
      trackAnalyticsEvent(AnalyticsEvent.questAccepted, {
        quest_id: questAnalyticsId(quest),
        quest_phase: quest.phase,
        is_outdoor: quest.isOutdoor,
      });
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
      trackAnalyticsEvent(AnalyticsEvent.questCompleted, {
        quest_id: questAnalyticsId(quest),
        quest_phase: quest.phase,
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
    } finally {
      setCompleting(false);
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
    const daily = quest.rerollsRemaining ?? 1;
    const bonus = quest.bonusRerollCredits ?? 0;
    if (daily + bonus <= 0) return;
    setShowRerollConfirm(true);
  }, [quest, rerolling]);

  const handleReroll = async () => {
    if (!quest || rerolling) return;
    setShowRerollConfirm(false);
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
        trackAnalyticsEvent(AnalyticsEvent.questRerolled, { quest_id: questAnalyticsId(quest) });
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
      trackAnalyticsEvent(AnalyticsEvent.questAbandoned, { quest_id: questAnalyticsId(quest) });
      setShowAbandonConfirm(false);
    } finally {
      setAbandoning(false);
    }
  };

  const rerollDaily = quest?.rerollsRemaining ?? 1;
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

  const [showDetails, setShowDetails] = useState(false);

  /** Glisser sur la carte (pointeur / tactile) */
  const [questSwipeOffset, setQuestSwipeOffset] = useState({ x: 0, y: 0 });
  const [questSwipeDragging, setQuestSwipeDragging] = useState(false);
  const [swipeFlying, setSwipeFlying] = useState(false);
  /** Après le vol : la carte reste hors écran tant qu’une modale / le panneau détail est ouvert (évite le retour avant la fermeture). */
  const [swipeParkedAfterFlight, setSwipeParkedAfterFlight] = useState(false);
  const questSwipeRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
  });
  const swipePendingActionRef = useRef<null | 'accept' | 'reroll' | 'details' | 'complete'>(null);

  const endQuestSwipe = useCallback(() => {
    questSwipeRef.current = { active: false, pointerId: null, startX: 0, startY: 0 };
    setQuestSwipeOffset({ x: 0, y: 0 });
    setQuestSwipeDragging(false);
    setSwipeFlying(false);
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

    if (action === 'complete') {
      void doComplete();
      setQuestSwipeOffset({ x: 0, y: 0 });
      return;
    }
    if (action === 'reroll') {
      setSwipeParkedAfterFlight(true);
      confirmReroll();
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
    if (action === 'details') {
      setSwipeParkedAfterFlight(true);
      setShowDetails(true);
    }
  }, [handleAccept, confirmReroll, quest?.isOutdoor, doComplete]);

  const runSwipeCompletionRef = useRef(runSwipeCompletion);
  runSwipeCompletionRef.current = runSwipeCompletion;

  const startSwipeFlight = useCallback(
    (dir: 'right' | 'left' | 'up') => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (isAccepted) {
          void doComplete();
          endQuestSwipe();
          return;
        }
        if (dir === 'right') handleAccept();
        else if (dir === 'left' && canReroll) confirmReroll();
        else if (dir === 'up') setShowDetails(true);
        endQuestSwipe();
        return;
      }
      const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 700;
      let endX = 0;
      let endY = 0;
      if (dir === 'right') {
        swipePendingActionRef.current = isAccepted ? 'complete' : 'accept';
        endX = vw + 200;
      } else if (dir === 'left') {
        swipePendingActionRef.current = 'reroll';
        endX = -(vw + 200);
      } else {
        swipePendingActionRef.current = 'details';
        endX = 0;
        endY = -vh * 0.45;
      }
      questSwipeRef.current = { active: false, pointerId: null, startX: 0, startY: 0 };
      setQuestSwipeDragging(false);
      setSwipeFlying(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setQuestSwipeOffset({ x: endX, y: endY });
        });
      });
    },
    [isAccepted, canReroll, handleAccept, confirmReroll, doComplete, endQuestSwipe],
  );

  useEffect(() => {
    if (!swipeFlying) return;
    const id = window.setTimeout(() => {
      runSwipeCompletionRef.current();
    }, QUEST_CARD_FLIGHT_MS + 160);
    return () => window.clearTimeout(id);
  }, [swipeFlying]);

  /** Quand toutes les surfaces « bloquantes » sont fermées, on ramène la carte au centre. */
  useEffect(() => {
    if (!swipeParkedAfterFlight) return;
    if (showRerollConfirm || showSafety || showDetails) return;
    setSwipeParkedAfterFlight(false);
    endQuestSwipe();
  }, [swipeParkedAfterFlight, showRerollConfirm, showSafety, showDetails, endQuestSwipe]);

  const onQuestCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!(isPending || isAccepted) || accepting || rerolling || reporting || completing || swipeFlying || swipeParkedAfterFlight) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button')) return;
      questSwipeRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      };
      setQuestSwipeDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [isPending, isAccepted, accepting, rerolling, reporting, completing, swipeFlying, swipeParkedAfterFlight],
  );

  /** Une seule direction à la fois : horizontal (gauche/droite) ou vertical (haut), pas les deux. */
  const projectSwipeDelta = useCallback((dx: number, dy: number) => {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax >= ay) {
      return { x: dx, y: 0 };
    }
    return { x: 0, y: Math.min(0, dy) };
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
        if (horizontal && absX > QUEST_CARD_SWIPE_X && dx > 0 && !completing) {
          startSwipeFlight('right');
          return;
        }
        endQuestSwipe();
        return;
      }

      if (horizontal) {
        if (absX > QUEST_CARD_SWIPE_X) {
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
        return;
      }
      if (dy < -QUEST_CARD_SWIPE_UP) {
        startSwipeFlight('up');
        return;
      }
      endQuestSwipe();
    },
    [isAccepted, completing, endQuestSwipe, startSwipeFlight, canReroll],
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
    if (!swipePendingActionRef.current) return;
    runSwipeCompletionRef.current();
  }, []);

  /** Transform / overlays : en attente ou acceptée (swipe pour valider), hors chargements */
  const questCardTransformsActive =
    (isPending || isAccepted) && !(rerolling || reporting || accepting) && !completing;
  /** Gestes : pas pendant l’animation de sortie */
  const questCardSwipeInteractive =
    (isPending || isAccepted) &&
    !(rerolling || reporting || accepting) &&
    !completing &&
    !swipeFlying &&
    !swipeParkedAfterFlight;

  const swipeOverlayOpacity = useMemo(() => {
    const ox = questSwipeOffset.x;
    const oy = questSwipeOffset.y;
    const acceptOp = ox > 0 ? Math.min(1, ox / QUEST_CARD_SWIPE_X) : 0;
    const changeOp =
      isPending && ox < 0 ? Math.min(1, (-ox / QUEST_CARD_SWIPE_X) * (canReroll ? 1 : 0.35)) : 0;
    const detailOp = isPending && oy < 0 ? Math.min(1, -oy / QUEST_CARD_SWIPE_UP) : 0;
    return { acceptOp, changeOp, detailOp };
  }, [questSwipeOffset, canReroll, isPending]);

  const questCardSwipeStyle = useMemo((): React.CSSProperties | undefined => {
    if (!questCardTransformsActive) return undefined;
    const { x, y } = questSwipeOffset;
    let rot = Math.max(
      -QUEST_CARD_ROT_MAX,
      Math.min(QUEST_CARD_ROT_MAX, (x / 220) * QUEST_CARD_ROT_MAX),
    );
    let scale = 1;
    if (swipeFlying) {
      if (x > 120) rot = QUEST_CARD_FLIGHT_ROT;
      else if (x < -120) rot = -QUEST_CARD_FLIGHT_ROT;
      else if (y < -120) {
        rot = -6;
        scale = 0.94;
      }
    }
    const flightEase = 'cubic-bezier(0.22, 0.82, 0.28, 1)';
    const snapEase = 'cubic-bezier(0.34, 1.25, 0.45, 1)';
    return {
      transform: `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${scale})`,
      transition:
        questSwipeDragging && !swipeFlying
          ? 'none'
          : swipeFlying
            ? `transform ${QUEST_CARD_FLIGHT_MS}ms ${flightEase}, opacity ${QUEST_CARD_FLIGHT_MS}ms ease-out`
            : swipeParkedAfterFlight
              ? 'opacity 0.2s ease-out'
              : `transform 0.45s ${snapEase}, opacity 0.45s ${snapEase}`,
      opacity: swipeParkedAfterFlight ? 0 : swipeFlying ? 0.88 : 1,
      touchAction: 'none',
      willChange: questSwipeDragging || swipeFlying ? 'transform' : undefined,
    };
  }, [questCardTransformsActive, questSwipeOffset, questSwipeDragging, swipeFlying, swipeParkedAfterFlight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (!quest) return;
      if (quest.status === 'pending') {
        if (e.key === 'ArrowRight') { handleAccept(); e.preventDefault(); }
        else if (e.key === 'ArrowLeft' && canReroll) { confirmReroll(); e.preventDefault(); }
        else if (e.key === 'ArrowUp' || e.key === 'Enter') { setShowDetails(true); e.preventDefault(); }
        return;
      }
      if (quest.status === 'accepted' && e.key === 'ArrowRight' && !completing) {
        e.preventDefault();
        void doComplete();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quest, canReroll, completing, handleAccept, confirmReroll, doComplete]);

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

        <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 py-4 sm:min-h-[min(560px,calc(100dvh-11rem))]">
        {quest ? (
          <div className="relative w-full max-w-[480px]">
            {questCardTransformsActive && !isAbandoned ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-4 top-3 bottom-0 -z-10 scale-[0.93] rounded-[26px] border border-[var(--border-ui)]/35 bg-[var(--muted)]/12 shadow-lg"
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
            } bg-[var(--card)] ${rerolling || reporting || accepting || completing ? 'pointer-events-none opacity-50 scale-[0.97]' : ''} ${
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
                {isPending && (
                  <div
                    className="pointer-events-none absolute inset-0 z-[15] overflow-hidden rounded-[28px]"
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
                    <div
                      className="absolute left-0 right-0 top-0 flex h-[52px] items-center justify-center rounded-t-[28px] bg-indigo-500/20"
                      style={{ opacity: swipeOverlayOpacity.detailOp }}
                    >
                      <span className="text-base font-black tracking-wide text-indigo-600 dark:text-indigo-400">
                        {t('swipeOverlayDetails')}
                      </span>
                    </div>
                  </div>
                )}
                {isAccepted && (
                  <div
                    className="pointer-events-none absolute inset-0 z-[15] overflow-hidden rounded-[28px]"
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
                <div className="relative z-0 px-6 pt-8 pb-4 flex flex-col items-center text-center">
                  <span className="text-[56px] leading-none mb-4 select-none" aria-hidden>
                    {questDisplayEmoji(quest.emoji)}
                  </span>
                  <h2 className="font-display text-[22px] font-black leading-tight text-[var(--text)] mb-3 px-2">
                    {quest.title}
                  </h2>
                  <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                    {quest.archetypeCategory ? (
                      <span className="rounded-full border border-[var(--muted)]/20 bg-[var(--muted)]/5 px-2.5 py-0.5 text-[11px] font-bold text-[var(--muted)]">
                        {questFamilyLabel(quest.archetypeCategory, appLocale)}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[var(--link-on-bg)]/30 bg-[var(--link-on-bg)]/8 px-2.5 py-0.5 text-[11px] font-bold text-[var(--link-on-bg)]">
                      {questPace === 'planned' ? t('pacePlannedLabel') : t('paceTodayLabel')}
                    </span>
                    {quest.isOutdoor ? (
                      <span className="rounded-full border border-[var(--green)]/30 bg-[var(--green)]/8 px-2.5 py-0.5 text-[11px] font-bold text-[var(--green)]">
                        {t('outdoorBadge')}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--muted)] line-clamp-3 px-1 mb-3">
                    {quest.mission}
                  </p>
                  <p className="text-xs font-semibold text-[var(--muted)]">
                    {quest.duration}
                  </p>
                </div>

                {isPending && (
                  <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="w-full py-3 text-center text-xs font-semibold text-[var(--muted)]/60 hover:text-[var(--muted)] transition-colors"
                  >
                    {t('swipeTapDetails')}
                  </button>
                )}

                {isAccepted && (
                  <div className="px-5 pb-5">
                    <button
                      type="button"
                      onClick={doComplete}
                      disabled={completing}
                      className="btn btn-primary btn-lg w-full text-base font-black"
                    >
                      {completing ? '\u2026' : t('validateQuest')}
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
                  <div className="px-5 pb-5 space-y-2">
                    <button type="button" onClick={handleAccept} disabled={accepting}
                      className="btn btn-cta btn-lg w-full text-base font-black">
                      {accepting ? '\u2026' : t('acceptChallenge')}
                    </button>
                    <button
                      type="button"
                      onClick={confirmReroll}
                      disabled={rerolling || !canReroll}
                      className="w-full py-3 rounded-xl border-2 border-[var(--orange)]/40 bg-[var(--orange)]/5 text-sm font-black text-[var(--orange)] hover:bg-[var(--orange)]/10 transition-colors disabled:opacity-40"
                    >
                      {rerolling ? '\u2026' : t('changeQuest', { label: rerollLabel })}
                    </button>
                  </div>
                )}
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

      {/* Detail panel */}
      {showDetails && quest && (
        <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDetails(false)} />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--card)] rounded-t-3xl md:rounded-3xl border border-[var(--border-ui)]/40 shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-[var(--muted)]/30" />
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[1.5px] text-[var(--orange)] mb-2">{t('missionHeading')}</p>
                <p className="text-[15px] leading-relaxed font-medium text-[var(--text)]">{quest.mission}</p>
              </div>

              {quest.hook ? (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[1.5px] text-[var(--orange)] mb-2">{t('hookLabel')}</p>
                  <blockquote className="text-sm italic text-center text-[var(--text)] border border-[var(--muted)]/15 rounded-xl p-4">
                    &ldquo;{quest.hook}&rdquo;
                  </blockquote>
                </div>
              ) : null}

              {quest.isOutdoor && quest.destination ? (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[1.5px] text-[var(--orange)] mb-2">{t('mapHeading')}</p>
                  <p className="text-xs text-[var(--muted)] mb-3">{t('mapDescription')}</p>
                  <QuestDestinationMap destination={quest.destination} userPosition={userPosition} />
                </div>
              ) : null}

              {quest.safetyNote && isPending ? (
                <div className="border border-[var(--orange)]/30 rounded-xl p-4">
                  <p className="text-[11px] font-black uppercase tracking-[1.5px] text-[var(--orange)] mb-2">{t('safetyTitle')}</p>
                  <p className="text-sm text-[var(--text)]">{quest.safetyNote}</p>
                </div>
              ) : null}

              <div className="flex items-center gap-3 text-xs font-semibold text-[var(--muted)]">
                <span>{quest.duration}</span>
                {quest.isOutdoor ? (
                  <span className="rounded-full border border-[var(--green)]/30 bg-[var(--green)]/8 px-2 py-0.5 text-[10px] font-bold text-[var(--green)]">
                    {t('outdoorBadge')}
                  </span>
                ) : null}
              </div>

              {isPending ? (
                <div className="space-y-2 pt-2">
                  {isPlannedQuest ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetails(false);
                        setReportDeferredDate(calendarDay);
                        setShowReportModal(true);
                      }}
                      disabled={!canReroll}
                      className="w-full py-3.5 rounded-xl border border-[var(--link-on-bg)]/30 text-sm font-bold text-[var(--link-on-bg)] hover:bg-[var(--link-on-bg)]/5 transition-colors disabled:opacity-40"
                    >
                      {t('reportShortQuest')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetails(false);
                      setShowAbandonConfirm(true);
                    }}
                    className="w-full py-3.5 rounded-xl border border-[var(--muted)]/25 text-sm font-bold text-[var(--muted)] hover:bg-[var(--muted)]/5 transition-colors"
                  >
                    {t('notForMe')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showSafety && quest && (
        <SafetySheet quest={quest} onConfirm={doAccept} onClose={() => setShowSafety(false)} />
      )}

      {showRerollConfirm && quest && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="reroll-confirm-title">
          <div className="max-w-md w-full rounded-2xl border border-[color:var(--border-ui-strong)] bg-[var(--card)] p-6 shadow-2xl motion-safe:animate-fade-up motion-reduce:animate-none">
            <h3 id="reroll-confirm-title" className="font-display text-lg font-black text-[var(--text)]">{t('rerollConfirmTitle')}</h3>
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{t('rerollConfirmBody')}</p>
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn btn-ghost btn-md flex-1" onClick={() => setShowRerollConfirm(false)}>{t('cancel')}</button>
              <button type="button" className="btn btn-cta btn-md flex-[2] font-black" onClick={() => void handleReroll()}>{t('rerollConfirmAction')}</button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && quest && isPlannedQuest && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <div className="max-w-md w-full rounded-2xl border border-[color:var(--border-ui-strong)] bg-[var(--card)] p-6 shadow-2xl">
            <h3 id="report-title" className="font-display text-lg font-black text-[var(--text)]">{t('reportModalTitle')}</h3>
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{t('reportModalBody', { maxDays: REPORT_DEFER_MAX_DAYS })}</p>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-[var(--subtle)]" htmlFor="report-date">{t('reportDateLabel')}</label>
            <input id="report-date" type="date" className="mt-1 w-full rounded-xl border border-[color:var(--border-ui)] bg-[var(--input-bg)] px-3 py-2 text-[var(--text)]" min={calendarDay} max={reportDateMax} value={reportDeferredDate} onChange={(e) => setReportDeferredDate(e.target.value)} />
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn btn-ghost btn-md flex-1" onClick={() => setShowReportModal(false)} disabled={reporting}>{t('cancel')}</button>
              <button type="button" className="btn btn-primary btn-md flex-[2] font-black" onClick={() => void handleReportConfirm()} disabled={reporting || !canReroll}>{reporting ? '\u2026' : t('confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {showAbandonConfirm && quest && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="abandon-title">
          <div className="max-w-md w-full rounded-2xl border border-[color:var(--border-ui-strong)] bg-[var(--card)] p-6 shadow-2xl">
            <h3 id="abandon-title" className="font-display text-lg font-black text-[var(--text)]">{t('abandonModalTitle')}</h3>
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{t('abandonModalBody')}</p>
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn btn-ghost btn-md flex-1" onClick={() => setShowAbandonConfirm(false)} disabled={abandoning}>{t('back')}</button>
              <button type="button" className="btn btn-md flex-[2] border border-[color:var(--border-ui)] bg-[color:color-mix(in_srgb,var(--text)_10%,var(--card))] font-black text-[var(--text)]" onClick={() => void confirmAbandon()} disabled={abandoning}>{abandoning ? '\u2026' : t('confirm')}</button>
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
