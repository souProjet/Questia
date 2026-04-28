import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Animated,
  Easing,
  Modal,
  AppState,
  DeviceEventEmitter,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  isValidQuestDateIso,
  formatQuestDateForLocale,
  REPORT_DEFER_MAX_DAYS,
  QUEST_LOADER_DAY_STORAGE_KEY,
  AnalyticsEvent,
  questAnalyticsId,
  QUESTIA_SHOP_GRANTS_UPDATED,
  getQuestPack,
} from '@questia/shared';
import {
  colorWithAlpha,
  homeScreenBackdropGradient,
  computeAuraOrbTints,
  UiLucideIcon,
  type ThemePalette,
} from '@questia/ui';
import type { PersonalityVector } from '@questia/shared';
import type { EscalationPhase, DisplayBadge, XpBreakdown } from '@questia/shared';
import { useAppLocale } from '../../contexts/AppLocaleContext';
import { getHomeDashboardStrings } from '../../lib/homeDashboardStrings';
import { useAppTheme } from '../../contexts/AppThemeContext';
import { QuestRewardOverlay, type QuestRewardPayload } from '../../components/QuestRewardOverlay';
import { GlassScrim } from '../../components/GlassScrim';
import { getScrimGlass } from '../../lib/themeModalChrome';
import ProfileRefinementSheet, { type RefinementQuestionUi } from '../../components/ProfileRefinementSheet';
import { QuestHomeLoading } from '../../components/QuestHomeLoading';
import { QuestSwipeCard } from '../../components/QuestSwipeCard';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticError, hapticMedium, hapticSuccess, hapticWarning } from '../../lib/haptics';
import { getQuestReportStrings } from '../../lib/questReportStrings';
import { trackMobileEvent } from '../../lib/analytics/track';

const SITE_PUBLIC = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://questia.fr';
const PRIVACY_URL = `${SITE_PUBLIC}/legal/confidentialite`;

interface ProgressionPayload {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpToNext: number;
  xpPerLevel: number;
  badges: DisplayBadge[];
}

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
  deferredSocialUntil?: string | null;
  day: number;
  streak: number;
  phase: EscalationPhase;
  rerollsRemaining?: number;
  destination?: { label: string; lat: number | null; lon: number | null } | null;
  progression?: ProgressionPayload;
  xpAwarded?: number | null;
  context?: {
    weatherIcon: string;
    weatherDescription: string;
    temp: number;
    city: string;
  };
  bonusRerollCredits?: number;
  equippedTitleId?: string | null;
  xpBonusCharges?: number;
  refinement?: {
    due: boolean;
    schemaVersion: number;
    questions?: RefinementQuestionUi[];
    consentNotice?: string;
  };
  ownedQuestPackIds?: string[];
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

import { API_BASE_URL, apiFetch } from '../../lib/api';

/** Interprète les séquences littérales \uXXXX (ex. chaîne API mal sérialisée) pour l'affichage. */
function normalizeDisplayText(text: string): string {
  if (!text.includes('\\u')) return text;
  return text.replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function SafetySheet({ quest, onConfirm, onClose }: {
  quest: DailyQuest;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { palette, themeId } = useAppTheme();
  const sheet = useMemo(() => buildSafetySheetStyles(palette), [palette]);
  const scrimGlass = useMemo(() => getScrimGlass(themeId), [themeId]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const rules = [
    "Je reste dans des lieux publics et accessibles.",
    "Je n'entrerai pas dans des propriétés privées.",
    "Je vérifierai les conditions météo avant de partir.",
    "Je fais confiance à mon instinct — si ça semble risqué, je passe.",
    "J'ai informé quelqu'un de mon itinéraire (optionnel mais recommandé).",
  ];
  const toggle = (i: number) =>
    setChecked((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const ok = checked.size === rules.length;

  return (
    <View style={sheet.overlay}>
      <GlassScrim
        overlayColor={palette.overlay}
        intensity={scrimGlass.intensity}
        tint={scrimGlass.tint}
        onPress={onClose}
        accessibilityLabel="Fermer"
      />
      <View style={sheet.container}>
        <View style={sheet.handle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={sheet.safetyTitle}>Avant de partir…</Text>
          <Text style={sheet.safetySubtitle}>{quest.title} se passe en extérieur.</Text>
          {rules.map((r, i) => (
            <Pressable key={i} onPress={() => toggle(i)} style={sheet.ruleRow}>
              <View style={[sheet.checkbox, checked.has(i) && sheet.checkboxChecked]}>
                {checked.has(i) && <Text style={sheet.check}>✓</Text>}
              </View>
              <Text style={sheet.ruleText}>{r}</Text>
            </Pressable>
          ))}
          <View style={sheet.safetyActions}>
            <Pressable style={sheet.laterBtn} onPress={onClose}>
              <Text style={sheet.laterText}>Plus tard</Text>
            </Pressable>
            <Pressable style={[sheet.goBtn, !ok && sheet.goBtnDisabled]} onPress={() => ok && onConfirm()} disabled={!ok}>
              <Text style={sheet.goText}>C'est parti !</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 400;
  const routeParams = useLocalSearchParams<{ questDate?: string | string[]; date?: string | string[] }>();
  const qRaw = routeParams.questDate ?? routeParams.date;
  const questDateParam = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const questDateFromRoute =
    typeof questDateParam === 'string' && isValidQuestDateIso(questDateParam) ? questDateParam : null;

  const { getToken, isLoaded: authLoaded, signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const { locale: appLocale } = useAppLocale();
  const homeUi = useMemo(() => getHomeDashboardStrings(appLocale), [appLocale]);

  const reportUi = useMemo(() => getQuestReportStrings(appLocale), [appLocale]);

  /** Clerk recrée souvent getToken → évite de recréer loadQuest à chaque rendu (boucle infinie d'effets). */
  const getTokenRef = useRef(getToken);
  const lastQuestViewKey = useRef<string | null>(null);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSafety, setShowSafety] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [showRerollConfirm, setShowRerollConfirm] = useState(false);
  const [showSwipeOnboarding, setShowSwipeOnboarding] = useState(false);
  const [questCardSwapKey, setQuestCardSwapKey] = useState(0);
  const [reward, setReward] = useState<QuestRewardPayload | null>(null);
  const [showReward, setShowReward] = useState(false);
  const acceptFlashOp = useRef(new Animated.Value(0)).current;

  const [calendarDay, setCalendarDay] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const reportDateOptions = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= REPORT_DEFER_MAX_DAYS; i++) {
      const d = new Date(`${calendarDay}T12:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, [calendarDay]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDeferredDate, setReportDeferredDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  /** Dernière position GPS (affichage carte / itinéraire, aligné sur le site). */
  const [userMapPosition, setUserMapPosition] = useState<{ lat: number; lon: number } | null>(null);
  const abandonInFlightRef = useRef(false);
  const reportInFlightRef = useRef(false);

  const ensureProfile = useCallback(async (token: string | null): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/profile`, token, { method: 'GET' });
      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, error: homeUi.errSession };
      if (res.status !== 404) return { ok: false, error: homeUi.errHttp(res.status) };
      const explorer = await AsyncStorage.getItem('questia_explorer');
      const risk = await AsyncStorage.getItem('questia_risk');
      const soc = await AsyncStorage.getItem('questia_sociability');
      const createRes = await apiFetch(`${API_BASE_URL}/api/profile`, token, {
        method: 'POST',
        body: JSON.stringify({
          explorerAxis: explorer === 'homebody' || explorer === 'explorer' ? explorer : undefined,
          riskAxis: risk === 'cautious' || risk === 'risktaker' ? risk : undefined,
          ...(soc === 'solitary' || soc === 'balanced' || soc === 'social' ? { sociability: soc } : {}),
        }),
      });
      if (createRes.ok || createRes.status === 201) return { ok: true };
      if (createRes.status === 401) return { ok: false, error: homeUi.errSession };
      return { ok: false, error: homeUi.errCreateProfile };
    } catch (e) {
      return { ok: false, error: homeUi.errApiUnreachable };
    }
  }, [homeUi]);

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
        const token = await getTokenRef.current();
        const result = await ensureProfile(token);
        if (!result.ok) {
          if (!silent) setError(result.error ?? homeUi.errOnboarding);
          return false;
        }
        const qd = opts?.ignoreUrlQuestDate
          ? opts.questDate ?? undefined
          : opts?.questDate ?? questDateFromRoute ?? undefined;
        const sp = new URLSearchParams();
        if (lat != null && lon != null) {
          sp.set('lat', String(lat));
          sp.set('lon', String(lon));
        }
        if (qd) sp.set('questDate', qd);
        sp.set('locale', appLocale);
        const qs = sp.toString();
        const url = `${API_BASE_URL}/api/quest/daily${qs ? `?${qs}` : ''}`;
        const res = await apiFetch(url, token);
        if (res.status === 404) {
          if (!silent) setError(homeUi.errProfileMissing);
          return false;
        }
        if (!res.ok) throw new Error(homeUi.errServer);
        const data = await res.json() as DailyQuest;
        setQuest(data);
        const qk = `${data.questDate}_${data.archetypeId}`;
        if (lastQuestViewKey.current !== qk) {
          lastQuestViewKey.current = qk;
          trackMobileEvent(AnalyticsEvent.questViewed, {
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
      } catch (e) {
        if (!silent) {
          setError(e instanceof Error ? e.message : homeUi.errApiCheck);
        }
        return false;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ensureProfile, questDateFromRoute, appLocale, homeUi],
  );

  const enrichQuestWithLocation = useCallback(
    async (opts?: { ignoreUrlQuestDate?: boolean }) => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setUserMapPosition(null);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserMapPosition({ lat: loc.coords.latitude, lon: loc.coords.longitude });
        await loadQuest(loc.coords.latitude, loc.coords.longitude, {
          silent: true,
          questDate: opts?.ignoreUrlQuestDate ? undefined : questDateFromRoute ?? undefined,
          ignoreUrlQuestDate: opts?.ignoreUrlQuestDate,
        });
      } catch {
        /* géoloc refusée ou indisponible — la quête sans météo locale reste affichée */
      }
    },
    [loadQuest, questDateFromRoute],
  );

  /** Boutique : après achat (relances bonus, etc.), resynchroniser la carte quête sans redémarrer l’app. */
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(QUESTIA_SHOP_GRANTS_UPDATED, () => {
      void loadQuest(undefined, undefined, {
        silent: true,
        questDate: questDateFromRoute ?? undefined,
      }).then((ok) => {
        if (ok) void enrichQuestWithLocation();
      });
    });
    return () => sub.remove();
  }, [loadQuest, enrichQuestWithLocation, questDateFromRoute]);

  useEffect(() => {
    const syncDay = () => {
      const d = new Date().toISOString().slice(0, 10);
      setCalendarDay((prev) => (prev !== d ? d : prev));
    };
    const id = setInterval(syncDay, 60_000);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') syncDay();
    });
    syncDay();
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const prevCalendarDayRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authLoaded) return;
    if (prevCalendarDayRef.current === null) {
      prevCalendarDayRef.current = calendarDay;
      return;
    }
    if (prevCalendarDayRef.current === calendarDay) return;
    prevCalendarDayRef.current = calendarDay;
    const urlPast = questDateFromRoute != null && questDateFromRoute < calendarDay;
    if (urlPast) router.replace('/home');
    let cancelled = false;
    void (async () => {
      const ok = await loadQuest(undefined, undefined, { silent: true, ignoreUrlQuestDate: urlPast });
      if (cancelled || !ok) return;
      await enrichQuestWithLocation({ ignoreUrlQuestDate: urlPast });
    })();
    return () => { cancelled = true; };
  }, [authLoaded, calendarDay, questDateFromRoute, router, loadQuest, enrichQuestWithLocation]);

  useEffect(() => {
    if (!authLoaded) return;
    let cancelled = false;
    (async () => {
      const ok = await loadQuest(undefined, undefined, { questDate: questDateFromRoute ?? undefined });
      if (cancelled || !ok) return;
      await enrichQuestWithLocation();
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, loadQuest, enrichQuestWithLocation, questDateFromRoute]);

  const doAccept = useCallback(async () => {
    if (!quest || quest.status !== 'pending') return;
    const snapshot = cloneDailyQuestSnapshot(quest);
    setError(null);
    hapticMedium();
    setQuest((prev) => (prev ? { ...prev, status: 'accepted' } : null));
    setShowSafety(false);
    acceptFlashOp.setValue(0);
    Animated.sequence([
      Animated.timing(acceptFlashOp, { toValue: 1, duration: 72, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(acceptFlashOp, { toValue: 0, duration: 620, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start();
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily`, token, {
        method: 'POST',
        body: JSON.stringify({ questDate: snapshot.questDate, safetyConsentGiven: snapshot.isOutdoor }),
      });
      if (!res.ok) {
        hapticError();
        const data = await res.json().catch(() => ({}));
        setQuest(snapshot);
        setError((data as { error?: string }).error ?? homeUi.errApiCheck);
        setQuestCardSwapKey((k) => k + 1);
        return;
      }
      const data = await res.json() as Partial<DailyQuest>;
      trackMobileEvent(AnalyticsEvent.questAccepted, {
        quest_id: questAnalyticsId(snapshot),
        quest_phase: snapshot.phase,
        is_outdoor: snapshot.isOutdoor,
      });
      setQuest((prev) =>
        prev ? { ...prev, ...data, status: (data.status ?? 'accepted') as DailyQuest['status'] } : null,
      );
    } catch {
      hapticError();
      setQuest(snapshot);
      setError(homeUi.errApiCheck);
      setQuestCardSwapKey((k) => k + 1);
    }
  }, [quest, getToken, acceptFlashOp, homeUi.errApiCheck]);

  const doComplete = useCallback(async () => {
    if (!quest || quest.status !== 'accepted') return;
    const snapshot = cloneDailyQuestSnapshot(quest);
    const qd = snapshot.questDate;
    setError(null);
    setQuest((prev) => (prev ? { ...prev, status: 'completed' } : null));
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily`, token, {
        method: 'POST',
        body: JSON.stringify({ questDate: qd, action: 'complete' }),
      });
      if (!res.ok) {
        hapticError();
        const data = await res.json().catch(() => ({}));
        setQuest(snapshot);
        setError((data as { error?: string }).error ?? homeUi.errApiCheck);
        setQuestCardSwapKey((k) => k + 1);
        return;
      }
      const data = await res.json() as Partial<DailyQuest> & {
        xpGain?: { gained: number; breakdown: XpBreakdown; newTotal: number; previousTotal: number };
        badgesUnlocked?: DisplayBadge[];
        progression?: ProgressionPayload;
      };
      setQuest((prev) =>
        prev
          ? {
              ...prev,
              ...data,
              status: (data.status ?? 'completed') as DailyQuest['status'],
              progression: data.progression ?? prev.progression,
              xpAwarded: data.xpAwarded ?? prev.xpAwarded,
            }
          : null,
      );
      trackMobileEvent(AnalyticsEvent.questCompleted, {
        quest_id: questAnalyticsId(snapshot),
        quest_phase: snapshot.phase,
        ...(data.xpGain?.gained != null ? { xp_gained: data.xpGain.gained } : {}),
      });
      if (data.xpGain) {
        hapticSuccess();
        setReward({
          xpGain: data.xpGain,
          badgesUnlocked: data.badgesUnlocked ?? [],
        });
        setShowReward(true);
      } else {
        hapticSuccess();
        trackMobileEvent(AnalyticsEvent.shareOpened, { share_channel: 'quest_card' });
        router.push({ pathname: '/share-card', params: { questDate: qd } });
      }
    } catch {
      hapticError();
      setQuest(snapshot);
      setError(homeUi.errApiCheck);
      setQuestCardSwapKey((k) => k + 1);
    }
  }, [quest, getToken, router, homeUi.errApiCheck]);

  const finishRewardAndShare = useCallback(() => {
    const qd = quest?.questDate;
    setShowReward(false);
    setReward(null);
    if (qd) {
      trackMobileEvent(AnalyticsEvent.shareOpened, { share_channel: 'quest_card' });
      router.push({ pathname: '/share-card', params: { questDate: qd } });
    }
  }, [quest?.questDate, router]);

  const openQuestShare = useCallback(() => {
    if (!quest) return;
    trackMobileEvent(AnalyticsEvent.shareOpened, { share_channel: 'quest_card' });
    router.push({ pathname: '/share-card', params: { questDate: quest.questDate } });
  }, [quest, router]);

  const qs = quest?.status;
  const isPending = qs === 'pending';
  const questPace = quest?.questPace ?? 'instant';

  const rerollDaily = quest?.rerollsRemaining ?? 0;
  const rerollBonus = quest?.bonusRerollCredits ?? 0;
  const canRerollQuest =
    !!quest &&
    isPending &&
    !rerolling &&
    rerollDaily + rerollBonus > 0;

  const handleAccept = () => {
    if (quest?.isOutdoor) {
      setShowSafety(true);
      setQuestCardSwapKey((k) => k + 1);
      return;
    }
    void doAccept();
  };

  const confirmReroll = () => {
    if (!quest || quest.status !== 'pending' || rerolling || !canRerollQuest) return;
    setShowRerollConfirm(true);
  };

  const handleReroll = async () => {
    if (!quest || quest.status !== 'pending' || rerolling || !canRerollQuest) return;
    const snapshot = cloneDailyQuestSnapshot(quest);
    const qd = snapshot.questDate;
    setShowRerollConfirm(false);
    setRerolling(true);
    setError(null);
    setQuest((prev) => (prev && prev.questDate === qd ? applyOptimisticRerollDecrement(prev) : prev));
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily`, token, {
        method: 'POST',
        body: JSON.stringify({ questDate: qd, action: 'reroll' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setQuest(snapshot);
        setError((data as { error?: string }).error ?? homeUi.errReroll);
        hapticError();
        setQuestCardSwapKey((k) => k + 1);
        return;
      }
      const ok = await loadQuest(undefined, undefined, { questDate: qd, silent: true });
      if (ok) {
        trackMobileEvent(AnalyticsEvent.questRerolled, { quest_id: questAnalyticsId(snapshot) });
        setQuestCardSwapKey((k) => k + 1);
        hapticSuccess();
        /** Météo / coords : ne pas garder l’overlay « changement » le temps du GPS + 2ᵉ fetch. */
        void enrichQuestWithLocation();
      } else {
        setError(homeUi.errReroll);
        hapticError();
        setQuestCardSwapKey((k) => k + 1);
      }
    } catch {
      setQuest(snapshot);
      setError(homeUi.errApiCheck);
      hapticError();
      setQuestCardSwapKey((k) => k + 1);
    } finally {
      setRerolling(false);
    }
  };

  const handleReportConfirm = async () => {
    if (!quest || reportInFlightRef.current || !canRerollQuest) return;
    if (quest.status !== 'pending' || (quest.questPace ?? 'instant') !== 'planned') return;
    const snapshot = cloneDailyQuestSnapshot(quest);
    const qd = snapshot.questDate;
    const deferred = reportDeferredDate;
    reportInFlightRef.current = true;
    setError(null);
    setShowReportModal(false);
    setRerolling(true);
    setQuest((prev) => (prev && prev.questDate === qd ? applyOptimisticRerollDecrement(prev) : prev));
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily`, token, {
        method: 'POST',
        body: JSON.stringify({
          action: 'report',
          questDate: qd,
          deferredUntil: deferred,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setQuest(snapshot);
        setShowReportModal(true);
        setError((data as { error?: string }).error ?? homeUi.errReport);
        hapticError();
        return;
      }
      const ok = await loadQuest(undefined, undefined, { questDate: qd, silent: true });
      if (ok) {
        hapticMedium();
        setQuestCardSwapKey((k) => k + 1);
        void enrichQuestWithLocation();
      } else {
        setError(homeUi.errReport);
        hapticError();
      }
    } catch {
      setQuest(snapshot);
      setShowReportModal(true);
      setError(homeUi.errApiCheck);
      hapticError();
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
    setError(null);
    setShowAbandonModal(false);
    hapticWarning();
    setQuest((prev) =>
      prev && prev.questDate === qd
        ? { ...prev, status: 'abandoned' as const, streak: 0 }
        : prev,
    );
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily`, token, {
        method: 'POST',
        body: JSON.stringify({ action: 'abandon', questDate: qd }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setQuest(snapshot);
        setShowAbandonModal(true);
        setError((data as { error?: string }).error ?? homeUi.errAbandon);
        hapticError();
        return;
      }
      trackMobileEvent(AnalyticsEvent.questAbandoned, { quest_id: questAnalyticsId(snapshot) });
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
    } catch {
      setQuest(snapshot);
      setShowAbandonModal(true);
      setError(homeUi.errApiCheck);
      hapticError();
    } finally {
      abandonInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (showReportModal) setReportDeferredDate(calendarDay);
  }, [showReportModal, calendarDay]);

  useEffect(() => {
    if (!quest) return;
    void AsyncStorage.setItem(QUEST_LOADER_DAY_STORAGE_KEY, new Date().toISOString().slice(0, 10));
  }, [quest]);

  useEffect(() => {
    if (!quest || quest.status !== 'pending') return;
    void (async () => {
      const seen = await AsyncStorage.getItem('questia_swipe_onboarding_seen');
      if (!seen) setShowSwipeOnboarding(true);
    })();
  }, [quest]);

  const dismissSwipeOnboarding = useCallback(() => {
    setShowSwipeOnboarding(false);
    void AsyncStorage.setItem('questia_swipe_onboarding_seen', '1');
  }, []);

  const { palette, themeId, personality } = useAppTheme();
  const styles = useMemo(() => buildDashboardStyles(palette, themeId), [palette, themeId]);
  const scrimGlass = useMemo(() => getScrimGlass(themeId), [themeId]);
  const safeInsets = useSafeAreaInsets();

  const ownedPacksChips = useMemo(() => {
    const ids = quest?.ownedQuestPackIds;
    if (!ids?.length) return [];
    return ids
      .map((id) => {
        const meta = getQuestPack(id);
        if (!meta) return null;
        return {
          id,
          label: appLocale === 'en' ? meta.labelEn : meta.label,
          icon: meta.icon,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [quest?.ownedQuestPackIds, appLocale]);

  const swipeStrings = useMemo(() => ({
    swipeAccept: homeUi.swipeAccept,
    swipeChange: homeUi.swipeChange,
    validateCta: homeUi.validateCta,
    swipeValidateOverlay: homeUi.swipeValidateOverlay,
    shareCta: homeUi.shareVictoryCta,
    completedTitle: homeUi.completedTitle,
    completedSub: homeUi.completedSubtitle,
    abandonedTitle: homeUi.abandonedTitle,
    abandonedSub: homeUi.abandonedSub,
    paceToday: homeUi.paceToday,
    pacePlanned: homeUi.pacePlanned,
    missionEyebrow: homeUi.missionHeading,
    outdoorTag: homeUi.outdoorTag,
    destinationLabel: homeUi.destinationLabel,
    destinationHint: homeUi.destinationHint,
    safetyLabel: homeUi.safetyLabel,
    reportCta: homeUi.reportCta,
    abandonCta: homeUi.abandonCta,
    reportPlannedHint: homeUi.reportPlannedHint,
    reportNoRerollsHint: homeUi.reportNoRerollsHint,
    mapOpenInMaps: homeUi.mapOpenInMaps,
    mapOpenDirections: homeUi.mapOpenDirections,
    mapRouteFailed: homeUi.mapRouteFailed,
    mapNoGeocodeTitle: homeUi.mapNoGeocodeTitle,
    mapNoGeocodeBody: homeUi.mapNoGeocodeBody,
    mapRendezvous: homeUi.mapRendezvous,
    mapUserHere: homeUi.mapUserHere,
  }), [homeUi]);

  if (loading && !quest) {
    return (
      <HomeBackdropShell palette={palette} themeId={themeId} personality={personality} styles={styles}>
        <QuestHomeLoading compact={compact} />
      </HomeBackdropShell>
    );
  }

  if (error && !quest) {
    const sessionExpired = error === homeUi.errSession;
    return (
      <HomeBackdropShell palette={palette} themeId={themeId} personality={personality} styles={styles}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{normalizeDisplayText(error)}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void loadQuest()}>
            <Text style={styles.retryText}>{homeUi.errorRetry}</Text>
          </Pressable>
          {sessionExpired ? (
            <Pressable
              style={styles.signOutOutlineBtn}
              onPress={() => {
                void signOut();
              }}
            >
              <Text style={styles.signOutOutlineText}>{homeUi.errorSignOut}</Text>
            </Pressable>
          ) : null}
        </View>
      </HomeBackdropShell>
    );
  }

  return (
    <HomeBackdropShell palette={palette} themeId={themeId} personality={personality} styles={styles}>
        {/* Flash d'acceptation */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { zIndex: 40, opacity: acceptFlashOp, backgroundColor: 'rgba(16, 185, 129, 0.42)' },
          ]}
        />

        {/* Raffinement profil */}
        {quest?.refinement?.questions && quest.refinement.questions.length > 0 ? (
          <ProfileRefinementSheet
            visible={showRefinement}
            questions={quest.refinement.questions}
            consentNotice={
              quest.refinement.consentNotice ??
              `Ces réponses servent uniquement à adapter tes quêtes. Politique de confidentialité : ${PRIVACY_URL}`
            }
            getToken={() => getTokenRef.current()}
            onDone={() => {
              setShowRefinement(false);
              void loadQuest(undefined, undefined, { silent: true });
            }}
          />
        ) : null}

        {/* Header minimal */}
        <View style={styles.minimalHeader}>
          <Text style={[styles.headerDay, { color: palette.muted }]}>
            J.{quest?.day ?? 1}
          </Text>
          {(quest?.streak ?? 0) > 0 ? (
            <View style={styles.headerStreakRow}>
              <UiLucideIcon name="Flame" size={16} color={palette.orange} strokeWidth={2.2} />
              <Text style={[styles.headerStreak, { color: palette.orange }]}>{quest?.streak}</Text>
            </View>
          ) : (
            <View />
          )}
          <Pressable onPress={() => router.push('/profile')} hitSlop={12}>
            <View style={[styles.headerAvatar, { backgroundColor: `${palette.cyan}22`, borderColor: `${palette.cyan}44` }]}>
              <Text style={styles.headerAvatarText}>
                {(user?.firstName ?? '?')[0]}
              </Text>
            </View>
          </Pressable>
        </View>

        {ownedPacksChips.length > 0 ? (
          <View
            style={styles.ownedPacksRow}
            accessibilityRole="summary"
            accessibilityLabel={homeUi.ownedPacksSectionA11y}
          >
            <View style={styles.ownedPacksLabelCol}>
              <UiLucideIcon name="Compass" size={14} color={palette.cyan} strokeWidth={2.2} />
              <Text style={styles.ownedPacksEyebrow} numberOfLines={1}>
                {homeUi.ownedPacksEyebrow}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.ownedPacksScroll}
              contentContainerStyle={[
                styles.ownedPacksScrollContent,
                { paddingRight: 12 + safeInsets.right },
              ]}
            >
              {ownedPacksChips.map((chip) => (
                <Pressable
                  key={chip.id}
                  onPress={() => router.push(`/parcours/${chip.id}?from=home` as never)}
                  style={({ pressed }) => [styles.ownedPackChip, pressed && { opacity: 0.88 }]}
                  accessibilityRole="button"
                  accessibilityLabel={homeUi.ownedPackA11y(chip.label)}
                >
                  <UiLucideIcon name={chip.icon} size={15} color={palette.cyan} strokeWidth={2.2} />
                  <Text style={styles.ownedPackChipLabel} numberOfLines={1}>
                    {chip.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Erreur inline */}
        {quest && error ? (
          <View style={styles.inlineErrorBanner}>
            <Text style={styles.inlineErrorText}>{normalizeDisplayText(error)}</Text>
            <Pressable onPress={() => setError(null)} hitSlop={8}>
              <Text style={styles.inlineErrorDismiss}>OK</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Carte Swipe ou état vide */}
        {quest ? (
          <View style={styles.swipeArea} key={questCardSwapKey}>
            <QuestSwipeCard
              key={`${quest.questDate}-${quest.status}`}
              quest={quest}
              locale={appLocale}
              palette={palette}
              themeId={themeId}
              personality={personality}
              canReroll={canRerollQuest}
              onAccept={handleAccept}
              onReroll={confirmReroll}
              onValidate={doComplete}
              onShare={openQuestShare}
              onReport={
                questPace === 'planned' && canRerollQuest
                  ? () => {
                      setReportDeferredDate(calendarDay);
                      setShowReportModal(true);
                    }
                  : undefined
              }
              onAbandon={() => setShowAbandonModal(true)}
              strings={swipeStrings}
              userPosition={userMapPosition}
              rerolling={rerolling}
              rerollLoadingLabel={homeUi.rerollLoading}
            />
          </View>
        ) : null}

        {showSwipeOnboarding && quest?.status === 'pending' ? (
          <Pressable style={styles.onboardingOverlay} onPress={dismissSwipeOnboarding}>
            <View style={[styles.onboardingTooltip, { backgroundColor: palette.card, borderColor: `${palette.orange}55` }]}>
              <Text style={[styles.onboardingText, { color: palette.text }]}>
                {appLocale === 'en'
                  ? 'Swipe right to accept, or left to change the quest.'
                  : 'Glisse à droite pour accepter, ou à gauche pour changer de quête.'}
              </Text>
              <Text style={[styles.onboardingDismiss, { color: palette.muted }]}>
                {appLocale === 'en' ? 'Got it' : 'Compris'}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* Safety sheet */}
        {showSafety && quest && (
          <SafetySheet quest={quest} onConfirm={doAccept} onClose={() => setShowSafety(false)} />
        )}

        {/* Modal report */}
        <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
          <View style={styles.modalBackdrop}>
            <GlassScrim
              overlayColor={palette.overlay}
              intensity={scrimGlass.intensity}
              tint={scrimGlass.tint}
            />
            <View style={styles.modalBackdropInner}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{reportUi.reportModalTitle}</Text>
              <Text style={styles.modalBody}>{reportUi.reportModalBody(REPORT_DEFER_MAX_DAYS)}</Text>
              <Text style={styles.modalLabel}>{reportUi.reportDateLabel}</Text>
              <ScrollView style={styles.datePickScroll} nestedScrollEnabled>
                {reportDateOptions.map((iso) => (
                  <Pressable
                    key={iso}
                    onPress={() => setReportDeferredDate(iso)}
                    style={[styles.datePickRow, reportDeferredDate === iso && styles.datePickRowActive]}
                  >
                    <Text style={[styles.datePickRowText, reportDeferredDate === iso && styles.datePickRowTextActive]}>
                      {formatQuestDateForLocale(iso, appLocale)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalBtnGhost} onPress={() => setShowReportModal(false)}>
                  <Text style={styles.modalBtnGhostText}>{homeUi.rerollConfirmCancel}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtnPrimary, !canRerollQuest && styles.rerollBtnDisabled]}
                  onPress={() => void handleReportConfirm()}
                  disabled={!canRerollQuest}
                >
                  <Text style={styles.modalBtnPrimaryText}>{homeUi.rerollConfirmAction}</Text>
                </Pressable>
              </View>
            </View>
            </View>
          </View>
        </Modal>

        {/* Modal abandon */}
        <Modal visible={showAbandonModal} transparent animationType="fade" onRequestClose={() => setShowAbandonModal(false)}>
          <View style={styles.modalBackdrop}>
            <GlassScrim
              overlayColor={palette.overlay}
              intensity={scrimGlass.intensity}
              tint={scrimGlass.tint}
            />
            <View style={styles.modalBackdropInner}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{homeUi.abandonCta} ?</Text>
              <Text style={styles.modalBody}>{homeUi.abandonedSub}</Text>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalBtnGhost} onPress={() => setShowAbandonModal(false)}>
                  <Text style={styles.modalBtnGhostText}>{homeUi.rerollConfirmCancel}</Text>
                </Pressable>
                <Pressable style={styles.modalBtnAbandon} onPress={() => void confirmAbandon()}>
                  <Text style={styles.modalBtnAbandonText}>{homeUi.rerollConfirmAction}</Text>
                </Pressable>
              </View>
            </View>
            </View>
          </View>
        </Modal>

        {/* Modal reroll confirm */}
        <Modal visible={showRerollConfirm} transparent animationType="fade" onRequestClose={() => setShowRerollConfirm(false)}>
          <View style={styles.modalBackdrop}>
            <GlassScrim
              overlayColor={palette.overlay}
              intensity={scrimGlass.intensity}
              tint={scrimGlass.tint}
            />
            <View style={styles.modalBackdropInner}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{homeUi.rerollConfirmTitle}</Text>
              <Text style={styles.modalBody}>{homeUi.rerollConfirmBody}</Text>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalBtnGhost} onPress={() => setShowRerollConfirm(false)}>
                  <Text style={styles.modalBtnGhostText}>{homeUi.rerollConfirmCancel}</Text>
                </Pressable>
                <Pressable style={styles.modalBtnPrimary} onPress={() => void handleReroll()}>
                  <Text style={styles.modalBtnPrimaryText}>{homeUi.rerollConfirmAction}</Text>
                </Pressable>
              </View>
            </View>
            </View>
          </View>
        </Modal>

        <QuestRewardOverlay visible={showReward} payload={reward} onContinue={finishRewardAndShare} />
    </HomeBackdropShell>
  );
}


function buildDashboardStyles(p: ThemePalette, themeId: string) {
  const isThemed = themeId !== 'default';
  const C = {
    bg: p.bg,
    card: p.card,
    border: p.borderCyan,
    accent: p.cyan,
    text: p.text,
    muted: p.muted,
  };

  return StyleSheet.create({
    rootShell: { flex: 1 },
    /** Remplit l'écran ; le SafeAreaView est à l'intérieur pour éviter les bandes / clipping. */
    homeGradient: { flex: 1 },
    safe: { flex: 1, backgroundColor: 'transparent' },
    homeBackdropBlob: {
      position: 'absolute',
    },
    homeBackdropBlobTR: {
      top: -100,
      right: -130,
      width: 400,
      height: 400,
      borderRadius: 200,
    },
    homeBackdropBlobBL: {
      bottom: -80,
      left: -150,
      width: 440,
      height: 440,
      borderRadius: 220,
    },
    homeBackdropBlobTL: {
      top: '12%',
      left: -100,
      width: 260,
      height: 260,
      borderRadius: 130,
    },
    minimalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    headerDay: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    headerStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerStreak: { fontSize: 16, fontWeight: '900' },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerAvatarText: { fontSize: 15, fontWeight: '900', color: p.linkOnBg },
    swipeArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 12,
      position: 'relative',
    },
    inlineErrorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isThemed ? colorWithAlpha('#f87171', 0.42) : 'rgba(248,113,113,0.45)',
      backgroundColor: isThemed ? colorWithAlpha('#f87171', 0.12) : 'rgba(254,242,242,0.95)',
    },
    inlineErrorText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: isThemed ? '#fecaca' : '#991b1b',
    },
    inlineErrorDismiss: {
      fontSize: 13,
      fontWeight: '800',
      color: isThemed ? '#fecaca' : '#991b1b',
      textDecorationLine: 'underline',
    },
    errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
    errorText: { color: isThemed ? '#fecaca' : '#991b1b', fontSize: 14, textAlign: 'center' },
    retryBtn: { backgroundColor: C.accent, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    signOutOutlineBtn: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isThemed ? colorWithAlpha('#f87171', 0.42) : 'rgba(248,113,113,0.55)',
      backgroundColor: 'transparent',
    },
    signOutOutlineText: { color: isThemed ? '#fecaca' : '#991b1b', fontWeight: '700', fontSize: 15 },
    rerollBtnDisabled: { opacity: 0.42 },
    onboardingOverlay: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      zIndex: 60,
      alignItems: 'center',
    },
    onboardingTooltip: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 18,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      alignItems: 'center',
      gap: 8,
    },
    onboardingText: {
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 19,
    },
    onboardingDismiss: {
      fontSize: 12,
      fontWeight: '800',
      textDecorationLine: 'underline' as const,
    },
    modalBackdrop: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      padding: 20,
    },
    modalBackdropInner: {
      flex: 1,
      justifyContent: 'center',
      zIndex: 1,
    },
    modalCard: {
      backgroundColor: p.card,
      borderRadius: 20,
      padding: 20,
      maxHeight: '88%',
      borderWidth: 1,
      borderColor: colorWithAlpha(isThemed ? p.cyan : p.borderCyan, isThemed ? 0.26 : 0.32),
    },
    modalTitle: { fontSize: 18, fontWeight: '900', color: p.text, marginBottom: 8 },
    modalBody: { fontSize: 14, color: p.muted, lineHeight: 20, marginBottom: 12 },
    modalLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: p.muted,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    datePickScroll: { maxHeight: 220, marginBottom: 12 },
    datePickRow: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colorWithAlpha(p.cyan, 0.25),
    },
    datePickRowActive: { borderColor: C.accent, backgroundColor: colorWithAlpha(p.cyan, 0.12) },
    datePickRowText: { fontSize: 14, fontWeight: '600', color: p.text },
    datePickRowTextActive: { fontWeight: '900', color: p.linkOnBg },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    modalBtnGhost: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: p.border,
      alignItems: 'center',
    },
    modalBtnGhostText: { fontWeight: '700', color: p.muted },
    modalBtnPrimary: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: C.accent,
      alignItems: 'center',
    },
    modalBtnPrimaryText: { fontWeight: '900', color: '#fff' },
    modalBtnAbandon: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: isThemed ? colorWithAlpha(p.text, 0.12) : '#e2e8f0',
      alignItems: 'center',
    },
    modalBtnAbandonText: { fontWeight: '900', color: p.text },
    /** Une ligne : libellé fixe + scroll horizontal (petits écrans). */
    ownedPacksRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      paddingHorizontal: 20,
      gap: 8,
      minHeight: 40,
    },
    ownedPacksLabelCol: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      maxWidth: 88,
      flexShrink: 0,
    },
    ownedPacksEyebrow: {
      flexShrink: 1,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: p.muted,
      textTransform: 'uppercase',
    },
    ownedPacksScroll: { flex: 1, minWidth: 0, maxHeight: 44 },
    ownedPacksScrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 2,
    },
    ownedPackChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
      maxWidth: 200,
      paddingVertical: 7,
      paddingHorizontal: 11,
      marginRight: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colorWithAlpha(p.cyan, isThemed ? 0.4 : 0.28),
      backgroundColor: colorWithAlpha(p.cyan, isThemed ? 0.11 : 0.07),
    },
    ownedPackChipLabel: {
      flexShrink: 1,
      fontSize: 12,
      fontWeight: '800',
      color: p.text,
    },
  });
}

type DashboardStyles = ReturnType<typeof buildDashboardStyles>;

/** Dégradé + halos derrière la carte (pas sur la carte elle-même). */
function HomeBackdropShell({
  palette,
  themeId,
  personality,
  styles,
  children,
}: {
  palette: ThemePalette;
  themeId: string;
  personality: PersonalityVector | null;
  styles: DashboardStyles;
  children: React.ReactNode;
}) {
  const gradientColors = useMemo(() => homeScreenBackdropGradient(themeId, palette), [themeId, palette]);
  const orbTints = useMemo(
    () => computeAuraOrbTints(personality, themeId, palette),
    [personality, themeId, palette],
  );
  const bottom = gradientColors[4];
  return (
    <GestureHandlerRootView style={[styles.rootShell, { backgroundColor: bottom }]}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.22, 0.45, 0.72, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={styles.homeGradient}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <View style={[styles.homeBackdropBlob, styles.homeBackdropBlobTR, { backgroundColor: orbTints.tr }]} />
          <View style={[styles.homeBackdropBlob, styles.homeBackdropBlobBL, { backgroundColor: orbTints.bl }]} />
          <View style={[styles.homeBackdropBlob, styles.homeBackdropBlobTL, { backgroundColor: orbTints.tl }]} />
        </View>
        <SafeAreaView style={[styles.safe, { zIndex: 1 }]}>{children}</SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

function buildSafetySheetStyles(p: ThemePalette) {
  const C = {
    text: p.text,
    muted: p.muted,
    success: p.green,
    accentWarm: p.orange,
  };
  return StyleSheet.create({
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: p.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      borderColor: p.borderCyan,
      maxHeight: '90%',
      padding: 24,
      paddingBottom: 40,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: p.trackMuted, alignSelf: 'center', marginBottom: 24 },
    safetyTitle: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 8, textAlign: 'center' },
    safetySubtitle: { fontSize: 14, color: C.muted, marginBottom: 20, textAlign: 'center' },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: p.border, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: C.success, borderColor: C.success },
    check: { color: '#fff', fontWeight: '800', fontSize: 14 },
    ruleText: { fontSize: 14, color: C.text, flex: 1 },
    safetyActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
    laterBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: p.border, alignItems: 'center' },
    laterText: { color: C.muted, fontWeight: '600', fontSize: 14 },
    goBtn: { flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: C.accentWarm, alignItems: 'center' },
    goBtnDisabled: { opacity: 0.5 },
    goText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  });
}
