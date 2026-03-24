import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { questDisplayEmoji, questFamilyLabel, getTitleDefinition } from '@questia/shared';
import { colorWithAlpha, type ThemePalette } from '@questia/ui';
import type { EscalationPhase, DisplayBadge, XpBreakdown } from '@questia/shared';
import { useAppTheme } from '../../contexts/AppThemeContext';
import { QuestRewardOverlay, type QuestRewardPayload } from '../../components/QuestRewardOverlay';

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
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced';
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
}

const PHASE_LABEL: Record<EscalationPhase, { text: string; emoji: string }> = {
  calibration: { text: 'Semaine de découverte', emoji: '🌱' },
  expansion:   { text: 'En mode exploration',   emoji: '🧭' },
  rupture:     { text: 'Phase d\'intensité',    emoji: '⚡' },
};

const PHASE_CHIP: Record<EscalationPhase, { bg: string; border: string; color: string }> = {
  calibration: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', color: '#10b981' },
  expansion:   { bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.35)', color: '#0e7490' },
  rupture:     { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.28)', color: '#c2410c' },
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function apiFetch(
  url: string,
  token: string | null,
  options?: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

function SafetySheet({ quest, onConfirm, onClose }: {
  quest: DailyQuest;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { palette } = useAppTheme();
  const sheet = useMemo(() => buildSafetySheetStyles(palette), [palette]);
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
      <Pressable style={sheet.backdrop} onPress={onClose} />
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
  const narrow = windowWidth < 360;
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  /** Clerk recrée souvent getToken → évite de recréer loadQuest à chaque rendu (boucle infinie d’effets). */
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [rerollsRemaining, setRerollsRemaining] = useState(1);
  const [reward, setReward] = useState<QuestRewardPayload | null>(null);
  const [showReward, setShowReward] = useState(false);

  const ensureProfile = useCallback(async (token: string | null): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/profile`, token, { method: 'GET' });
      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, error: 'Session expirée. Déconnecte-toi et reconnecte-toi.' };
      if (res.status !== 404) return { ok: false, error: `Erreur ${res.status}` };
      const explorer = await AsyncStorage.getItem('questia_explorer');
      const risk = await AsyncStorage.getItem('questia_risk');
      const createRes = await apiFetch(`${API_BASE_URL}/api/profile`, token, {
        method: 'POST',
        body: JSON.stringify({
          explorerAxis: explorer === 'homebody' || explorer === 'explorer' ? explorer : undefined,
          riskAxis: risk === 'cautious' || risk === 'risktaker' ? risk : undefined,
        }),
      });
      if (createRes.ok || createRes.status === 201) return { ok: true };
      if (createRes.status === 401) return { ok: false, error: 'Session expirée. Déconnecte-toi et reconnecte-toi.' };
      return { ok: false, error: 'Impossible de créer le profil.' };
    } catch (e) {
      return { ok: false, error: 'Impossible de joindre l\'API. Sur téléphone, mets l\'URL ngrok dans .env (EXPO_PUBLIC_API_BASE_URL).' };
    }
  }, []);

  const loadQuest = useCallback(
    async (lat?: number, lon?: number, opts?: { silent?: boolean }): Promise<boolean> => {
      const silent = opts?.silent ?? false;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const token = await getTokenRef.current();
        const result = await ensureProfile(token);
        if (!result.ok) {
          if (!silent) setError(result.error ?? 'Complète l\'onboarding d\'abord.');
          return false;
        }
        let url = `${API_BASE_URL}/api/quest/daily`;
        if (lat != null && lon != null) {
          url += `?lat=${lat}&lon=${lon}`;
        }
        const res = await apiFetch(url, token);
        if (res.status === 404) {
          if (!silent) setError('Profil introuvable. Complète l\'onboarding.');
          return false;
        }
        if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json() as DailyQuest;
        setQuest(data);
        setRerollsRemaining(data.rerollsRemaining ?? 1);
        return true;
      } catch (e) {
        if (!silent) {
          setError(e instanceof Error ? e.message : 'Impossible de joindre l\'API. Vérifie EXPO_PUBLIC_API_BASE_URL.');
        }
        return false;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ensureProfile],
  );

  const enrichQuestWithLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await loadQuest(loc.coords.latitude, loc.coords.longitude, { silent: true });
    } catch {
      /* géoloc refusée ou indisponible — la quête sans météo locale reste affichée */
    }
  }, [loadQuest]);

  useEffect(() => {
    if (!authLoaded) return;
    let cancelled = false;
    (async () => {
      const ok = await loadQuest();
      if (cancelled || !ok) return;
      await enrichQuestWithLocation();
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, loadQuest, enrichQuestWithLocation]);

  const doAccept = useCallback(async () => {
    if (!quest) return;
    setAccepting(true);
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily`, token, {
        method: 'POST',
        body: JSON.stringify({ questDate: quest.questDate, safetyConsentGiven: quest.isOutdoor }),
      });
      if (res.ok) {
        const data = await res.json() as Partial<DailyQuest>;
        setQuest((prev) => (prev ? { ...prev, ...data, status: (data.status ?? prev.status) as DailyQuest['status'] } : null));
        setShowSafety(false);
      }
    } finally {
      setAccepting(false);
    }
  }, [quest, getToken]);

  const doComplete = useCallback(async () => {
    if (!quest) return;
    setCompleting(true);
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily`, token, {
        method: 'POST',
        body: JSON.stringify({ questDate: quest.questDate, action: 'complete' }),
      });
      if (res.ok) {
        const data = await res.json() as Partial<DailyQuest> & {
          xpGain?: { gained: number; breakdown: XpBreakdown; newTotal: number; previousTotal: number };
          badgesUnlocked?: DisplayBadge[];
          progression?: ProgressionPayload;
        };
        const qd = quest.questDate;
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
        if (data.xpGain) {
          setReward({
            xpGain: data.xpGain,
            badgesUnlocked: data.badgesUnlocked ?? [],
          });
          setShowReward(true);
        } else {
          router.push({ pathname: '/share-card', params: { questDate: qd } });
        }
      }
    } finally {
      setCompleting(false);
    }
  }, [quest, getToken, router]);

  const finishRewardAndShare = useCallback(() => {
    const qd = quest?.questDate;
    setShowReward(false);
    setReward(null);
    if (qd) router.push({ pathname: '/share-card', params: { questDate: qd } });
  }, [quest?.questDate, router]);

  const qs = quest?.status;
  const isPending = qs === 'pending';
  const isAccepted = qs === 'accepted';
  const isCompleted = qs === 'completed';
  const questFamily = quest ? questFamilyLabel(quest.archetypeCategory) : null;

  const phase = quest?.phase ?? 'calibration';
  const phaseInfo = PHASE_LABEL[phase];
  const phaseChip = PHASE_CHIP[phase];
  const rerollDaily = quest?.rerollsRemaining ?? rerollsRemaining;
  const rerollBonus = quest?.bonusRerollCredits ?? 0;
  const rerollParts: string[] = [];
  if (rerollDaily > 0) rerollParts.push(`${rerollDaily} du jour`);
  if (rerollBonus > 0) rerollParts.push(`${rerollBonus} bonus`);
  const rerollLabel = rerollParts.length > 0 ? rerollParts.join(' · ') : 'aucune';
  const canRerollQuest =
    !!quest &&
    isPending &&
    !rerolling &&
    rerollDaily + rerollBonus > 0;

  const weatherLine = quest
    ? `${quest.context?.weatherDescription ?? quest.weather ?? 'Ciel variable'} · ${Math.round(
        quest.context?.temp ?? quest.weatherTemp ?? 18,
      )}°C`
    : '';

  const handleAccept = () => {
    if (quest?.isOutdoor) setShowSafety(true);
    else doAccept();
  };

  const handleReroll = async () => {
    if (!quest || quest.status !== 'pending' || rerolling || !canRerollQuest) return;
    setRerolling(true);
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily`, token, {
        method: 'POST',
        body: JSON.stringify({ questDate: quest.questDate, action: 'reroll' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Erreur relance');
        return;
      }
      const ok = await loadQuest();
      if (ok) await enrichQuestWithLocation();
    } finally {
      setRerolling(false);
    }
  };

  const { palette } = useAppTheme();
  const styles = useMemo(() => buildDashboardStyles(palette), [palette]);

  if (loading && !quest) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingFull}>
          <ActivityIndicator color={palette.cyan} size="large" />
          <Text style={styles.loadingText}>Chargement de ta quête…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !quest) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void loadQuest()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Espace sous le dernier bloc (la SafeAreaView gère déjà encoche / home indicator)
  const scrollBottomPad = 32;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          compact && styles.contentCompact,
          { paddingBottom: scrollBottomPad },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces
      >
        <View
          style={[
            styles.heroBand,
            compact && styles.heroBandCompact,
            narrow && styles.heroBandNarrow,
          ]}
        >
          <LinearGradient
            colors={['#fffbeb', '#ffffff', 'rgba(236,254,255,0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.heroInner,
              compact && styles.heroInnerCompact,
              narrow && styles.heroInnerNarrow,
            ]}
          >
            <Pressable
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel="Profil"
              accessibilityHint="Ouvre la page profil"
              style={({ pressed }) => [pressed && styles.heroChipPressed]}
            >
              <Text
                style={[styles.heroGreeting, compact && styles.heroGreetingCompact, narrow && styles.heroGreetingNarrow]}
                numberOfLines={2}
              >
                Salut {user?.firstName ?? 'aventurier·e'} 👋
              </Text>
            </Pressable>
            <Text
              style={[
                styles.heroQuestLine,
                compact && styles.heroQuestLineCompact,
                narrow && styles.heroQuestLineNarrow,
              ]}
            >
              Place à la quête du matin{' '}
              <Text style={[styles.heroQuestEmoji, compact && styles.heroQuestEmojiCompact]}>⚔️</Text>
            </Text>
            <Text
              style={[styles.heroObjective, compact && styles.heroObjectiveCompact, narrow && styles.heroObjectiveNarrow]}
              numberOfLines={narrow ? 2 : undefined}
            >
              🎯 Objectif : sortir du pilote automatique — mode aventure.
            </Text>

            <View style={[styles.heroChips, compact && styles.heroChipsCompact]}>
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel="Phase et parcours"
                accessibilityHint="Ouvre le profil"
                style={({ pressed }) => [
                  styles.phaseChip,
                  compact && styles.phaseChipDense,
                  { backgroundColor: phaseChip.bg, borderColor: phaseChip.border },
                  pressed && styles.heroChipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.phaseChipText,
                    compact && styles.phaseChipTextDense,
                    { color: phaseChip.color },
                  ]}
                >
                  {phaseInfo.emoji} {phaseInfo.text}
                </Text>
              </Pressable>
              {(quest?.streak ?? 0) > 0 && (
                <Pressable
                  onPress={() => router.push('/profile')}
                  accessibilityRole="button"
                  accessibilityLabel="Série de jours"
                  accessibilityHint="Ouvre le profil"
                  style={({ pressed }) => [
                    styles.streakBadge,
                    compact && styles.streakBadgeDense,
                    pressed && styles.heroChipPressed,
                  ]}
                >
                  <Text style={[styles.streakBadgeText, compact && styles.streakBadgeTextDense]}>
                    🔥 <Text style={styles.streakBadgeNum}>{quest?.streak}</Text>
                    {compact
                      ? ' j. suite'
                      : ` jour${(quest?.streak ?? 0) !== 1 ? 's' : ''} de suite`}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel="Jour de parcours"
                accessibilityHint="Ouvre le profil"
                style={({ pressed }) => [
                  styles.parcoursChip,
                  compact && styles.parcoursChipDense,
                  pressed && styles.heroChipPressed,
                ]}
              >
                <Text style={[styles.parcoursChipText, compact && styles.parcoursChipTextDense]}>
                  {compact
                    ? `📍 J. ${quest?.day ?? 1}`
                    : `📍 Parcours · jour ${quest?.day ?? 1}`}
                </Text>
              </Pressable>
              {quest?.equippedTitleId && getTitleDefinition(quest.equippedTitleId) ? (
                <Pressable
                  onPress={() => router.push('/shop')}
                  accessibilityRole="button"
                  accessibilityLabel="Titre boutique"
                  accessibilityHint="Ouvre la boutique"
                  style={({ pressed }) => [
                    styles.titleShopChip,
                    compact && styles.titleShopChipDense,
                    pressed && styles.heroChipPressed,
                  ]}
                >
                  <Text style={[styles.titleShopChipText, compact && styles.titleShopChipTextDense]} numberOfLines={1}>
                    {getTitleDefinition(quest.equippedTitleId)!.emoji}{' '}
                    {getTitleDefinition(quest.equippedTitleId)!.label}
                  </Text>
                </Pressable>
              ) : null}
              {(quest?.xpBonusCharges ?? 0) > 0 ? (
                <Pressable
                  onPress={() => router.push('/shop')}
                  accessibilityRole="button"
                  accessibilityLabel="Bonus XP boutique"
                  accessibilityHint="Ouvre la boutique"
                  style={({ pressed }) => [
                    styles.xpBonusChip,
                    compact && styles.xpBonusChipDense,
                    pressed && styles.heroChipPressed,
                  ]}
                >
                  <Text style={[styles.xpBonusChipText, compact && styles.xpBonusChipTextDense]}>
                    {compact
                      ? `⚡ ${quest?.xpBonusCharges} XP+`
                      : `⚡ ${quest?.xpBonusCharges} bonus XP`}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {quest?.progression ? (
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel="Profil et progression"
                accessibilityHint="Ouvre la page profil"
                style={({ pressed }) => [
                  styles.xpStripHero,
                  compact && styles.xpStripHeroCompact,
                  pressed && styles.xpStripHeroPressed,
                ]}
              >
                <View style={styles.xpStripTop}>
                  <Text style={[styles.xpStripLabelHero, compact && styles.xpStripLabelHeroCompact]} numberOfLines={1}>
                    {compact
                      ? `⭐ Nv.${quest.progression.level} · ${quest.progression.totalXp} XP`
                      : `⭐ Niveau ${quest.progression.level} · ${quest.progression.totalXp} XP`}
                  </Text>
                  <Text style={[styles.xpStripSubHero, compact && styles.xpStripSubHeroCompact]} numberOfLines={1}>
                    {compact
                      ? `+${quest.progression.xpToNext}`
                      : `+${quest.progression.xpToNext} pour monter`}
                  </Text>
                </View>
                <Text style={[styles.xpStripMetaHero, compact && styles.xpStripMetaHeroCompact]}>
                  {compact
                    ? `${quest.progression.xpIntoLevel}/${quest.progression.xpPerLevel}`
                    : `${quest.progression.xpIntoLevel}/${quest.progression.xpPerLevel} dans ce niveau`}
                </Text>
                <View style={[styles.xpTrackHero, compact && styles.xpTrackHeroCompact]}>
                  <LinearGradient
                    colors={['#22d3ee', '#fb923c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.xpFillHero,
                      {
                        width: `${Math.min(
                          100,
                          (quest.progression.xpIntoLevel / Math.max(1, quest.progression.xpPerLevel)) * 100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </Pressable>
            ) : null}

            {quest && (quest.city || quest.weather) ? (
              <View style={[styles.heroWeatherRow, compact && styles.heroWeatherRowCompact]}>
                <Text style={[styles.heroWeatherText, compact && styles.heroWeatherTextCompact]}>
                  {weatherEmojiFromText(quest.context?.weatherDescription ?? quest.weather)} {weatherLine}
                  {quest.city && quest.city !== 'ta ville' ? (
                    <>
                      <Text style={styles.heroWeatherSep}> · </Text>
                      <Text style={styles.heroWeatherCity}>📍 {quest.city}</Text>
                    </>
                  ) : null}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {quest && (
          <LinearGradient
            colors={['#fff7df', '#fff3c6', '#d7f5f9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.questSliderEmbedded,
              (isAccepted || isCompleted) && styles.questSliderEmbeddedDone,
            ]}
          >
            <View style={[styles.questCardBody, compact && styles.questCardBodyCompact]}>
              <View style={styles.titleBlock}>
                <View style={styles.questIconBox}>
                  <Text style={styles.questIcon}>{questDisplayEmoji(quest.emoji)}</Text>
                </View>
                <View style={styles.titleBlockText}>
                  <Text style={[styles.questTitle, compact && styles.questTitleCompact]}>{quest.title}</Text>
                  {questFamily ? <Text style={styles.questCategory}>{questFamily}</Text> : null}
                </View>
              </View>

              <LinearGradient
                colors={['#ffffff', 'rgba(224,242,254,0.55)', '#ffffff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.missionBlock}
              >
                <View style={styles.missionHeadingRow}>
                  <Text style={styles.missionHeadingEmoji}>⚡</Text>
                  <Text style={styles.missionLabel}>Ta mission — quoi faire</Text>
                </View>
                <Text style={[styles.missionText, compact && styles.missionTextCompact]}>{quest.mission}</Text>
                <View style={styles.missionMetaRow}>
                  <View style={styles.durationPill}>
                    <Text style={styles.durationPillText}>⏱️ {quest.duration}</Text>
                  </View>
                  {quest.isOutdoor && (
                    <View style={styles.tagOutdoor}>
                      <Text style={styles.tagOutdoorText}>🌿 Extérieur</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>

              {quest.isOutdoor && quest.destination ? (
                <Pressable
                  style={styles.mapCta}
                  onPress={() => {
                    const d = quest.destination!;
                    const url =
                      d.lat != null && d.lon != null
                        ? `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.label)}`;
                    Linking.openURL(url);
                  }}
                >
                  <Text style={styles.mapCtaLabel}>🗺️ Point de rendez-vous</Text>
                  <Text style={styles.mapCtaHint}>
                    Lieu suggéré pour ta mission (public, accessible). Ouvre dans Plans / Google Maps.
                  </Text>
                  <Text style={styles.mapCtaText}>{quest.destination.label}</Text>
                </Pressable>
              ) : null}

              {quest.hook ? (
                <View style={styles.hookCard}>
                  <Text style={styles.hookCaption}>Pensée du jour</Text>
                  <Text style={styles.hookQuote}>
                    <Text style={styles.hookGuillemet}>« </Text>
                    <Text style={styles.hookQuoteBody}>{quest.hook}</Text>
                    <Text style={styles.hookGuillemet}> »</Text>
                  </Text>
                </View>
              ) : null}

              {quest.safetyNote && isPending ? (
                <View style={styles.safetyNoteBox}>
                  <Text style={styles.safetyNoteEmoji}>⚠️</Text>
                  <Text style={styles.safetyNoteText}>{quest.safetyNote}</Text>
                </View>
              ) : null}
            </View>

            <LinearGradient
              colors={['rgba(255,255,255,0.88)', 'rgba(255,251,235,0.55)', 'rgba(236,254,255,0.45)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.questActionsFooter}
            >
              {isCompleted ? (
                <View style={styles.footerActionsInner}>
                  <Text style={styles.completedFooterTitle}>🏆 Quête validée — belle perf, à demain !</Text>
                  <Text style={styles.completedFooterSub}>Ta série et ton parcours sont à jour.</Text>
                  <Link
                    href={{ pathname: '/share-card', params: { questDate: quest.questDate } }}
                    asChild
                  >
                    <Pressable style={styles.shareLinkBtn}>
                      <Text style={styles.shareLinkText}>📸 Partager ma victoire</Text>
                    </Pressable>
                  </Link>
                </View>
              ) : isAccepted ? (
                <View style={styles.footerActionsInner}>
                  <Pressable style={styles.acceptBtn} onPress={doComplete} disabled={completing}>
                    <Text style={styles.acceptText}>
                      {completing ? '…' : '✅  J\'ai fait la quête — valider'}
                    </Text>
                  </Pressable>
                  <Text style={styles.acceptedHint}>
                    {`Quand c'est fait dans la vraie vie, valide ici pour cocher ta mission.`}
                  </Text>
                </View>
              ) : (
                <View style={styles.footerActionsInner}>
                  <Pressable style={styles.acceptBtn} onPress={handleAccept} disabled={accepting}>
                    <Text style={styles.acceptText}>
                      {accepting ? 'Confirmation…' : '⚔️  Je relève le défi !'}
                    </Text>
                  </Pressable>
                  {API_BASE_URL.includes('localhost') && (
                    <View style={styles.localhostWarning}>
                      <Text style={styles.localhostWarningText}>
                        {`Sur téléphone, remplace localhost par l'IP de ton PC dans .env`}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    style={[styles.rerollBtn, !canRerollQuest && styles.rerollBtnDisabled]}
                    onPress={handleReroll}
                    disabled={!canRerollQuest}
                  >
                    <Text style={styles.rerollText}>
                      {rerolling ? '…' : `🎲  Changer de quête (${rerollLabel})`}
                    </Text>
                  </Pressable>
                </View>
              )}
            </LinearGradient>
          </LinearGradient>
        )}

        {isPending && quest ? (
          <Text style={styles.footerTeaser}>Demain matin : nouvelle carte sur ton plateau 🌅</Text>
        ) : null}
      </ScrollView>

      {showSafety && quest && (
        <SafetySheet quest={quest} onConfirm={doAccept} onClose={() => setShowSafety(false)} />
      )}

      <QuestRewardOverlay visible={showReward} payload={reward} onContinue={finishRewardAndShare} />
    </SafeAreaView>
  );
}

function buildDashboardStyles(p: ThemePalette) {
  const C = {
    bg: p.bg,
    card: p.card,
    border: p.borderCyan,
    accent: p.cyan,
    accentWarm: p.orange,
    text: p.text,
    muted: p.muted,
    success: p.green,
  };

  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 14, paddingBottom: 24 },
  contentCompact: { paddingHorizontal: 16, paddingTop: 10 },
  loadingFull: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: C.accent, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  heroBand: {
    position: 'relative',
    marginBottom: 14,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(253,186,116,0.45)',
    overflow: 'hidden',
    shadowColor: p.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  heroBandCompact: { marginBottom: 12, borderRadius: 20 },
  heroBandNarrow: { marginBottom: 10, borderRadius: 18 },
  heroInner: { paddingHorizontal: 16, paddingVertical: 14, position: 'relative', zIndex: 1 },
  heroInnerCompact: { paddingHorizontal: 14, paddingVertical: 11 },
  heroInnerNarrow: { paddingHorizontal: 12, paddingVertical: 9 },
  heroGreeting: { fontSize: 20, fontWeight: '900', color: p.onCream, lineHeight: 25 },
  heroGreetingCompact: { fontSize: 19, lineHeight: 24 },
  heroGreetingNarrow: { fontSize: 17, lineHeight: 22 },
  heroQuestLine: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
    color: '#0e7490',
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  heroQuestLineCompact: { fontSize: 17, lineHeight: 22, marginTop: 3 },
  heroQuestLineNarrow: { fontSize: 16, lineHeight: 21 },
  heroQuestEmoji: { fontSize: 17 },
  heroQuestEmojiCompact: { fontSize: 15 },
  heroObjective: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: p.onCreamMuted,
    lineHeight: 18,
  },
  heroObjectiveCompact: { marginTop: 6, fontSize: 12, lineHeight: 16 },
  heroObjectiveNarrow: { fontSize: 11, lineHeight: 15 },
  heroChips: { marginTop: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  heroChipsCompact: { marginTop: 8, gap: 5 },
  phaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  phaseChipDense: { paddingHorizontal: 8, paddingVertical: 4 },
  phaseChipText: { fontSize: 11, fontWeight: '800', flexShrink: 1 },
  phaseChipTextDense: { fontSize: 10 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(251,191,36,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.28)',
  },
  streakBadgeDense: { paddingHorizontal: 8, paddingVertical: 4 },
  streakBadgeText: { fontSize: 11, fontWeight: '600', color: '#92400e' },
  streakBadgeTextDense: { fontSize: 10 },
  streakBadgeNum: { fontWeight: '900' },
  parcoursChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.cyan, 0.45),
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  parcoursChipDense: { paddingHorizontal: 8, paddingVertical: 4 },
  parcoursChipText: { fontSize: 11, fontWeight: '900', color: p.onCream },
  parcoursChipTextDense: { fontSize: 10 },
  titleShopChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.45)',
    backgroundColor: 'rgba(255,251,235,0.95)',
    maxWidth: '100%',
  },
  titleShopChipDense: { paddingHorizontal: 8, paddingVertical: 4 },
  titleShopChipText: { fontSize: 10, fontWeight: '900', color: '#78350f', flexShrink: 1 },
  titleShopChipTextDense: { fontSize: 9 },
  xpBonusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.45)',
    backgroundColor: 'rgba(236,253,245,0.95)',
  },
  xpBonusChipDense: { paddingHorizontal: 8, paddingVertical: 4 },
  xpBonusChipText: { fontSize: 10, fontWeight: '900', color: '#064e3b' },
  xpBonusChipTextDense: { fontSize: 9 },
  xpStripHero: {
    marginTop: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.cyan, 0.4),
    backgroundColor: 'rgba(236,254,255,0.5)',
  },
  xpStripHeroCompact: { marginTop: 8, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 12 },
  xpStripHeroPressed: { opacity: 0.88 },
  heroChipPressed: { opacity: 0.88 },
  xpStripTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 6 },
  xpStripLabelHero: { fontSize: 11, fontWeight: '900', color: '#155e75', flex: 1 },
  xpStripLabelHeroCompact: { fontSize: 10 },
  xpStripSubHero: { fontSize: 10, fontWeight: '700', color: C.muted },
  xpStripSubHeroCompact: { fontSize: 9 },
  xpStripMetaHero: { fontSize: 9, fontWeight: '600', color: C.muted, marginBottom: 6 },
  xpStripMetaHeroCompact: { fontSize: 8, marginBottom: 5 },
  xpTrackHero: {
    height: 7,
    borderRadius: 5,
    backgroundColor: p.trackMuted,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colorWithAlpha(p.cyan, 0.35),
  },
  xpTrackHeroCompact: { height: 6 },
  xpFillHero: { height: '100%', borderRadius: 5 },
  heroWeatherRow: {
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: 'rgba(253,186,116,0.45)',
  },
  heroWeatherRowCompact: { marginTop: 8, paddingTop: 8 },
  heroWeatherText: { fontSize: 12, fontWeight: '500', color: p.onCreamMuted, lineHeight: 17 },
  heroWeatherTextCompact: { fontSize: 11, lineHeight: 16 },
  heroWeatherSep: { color: C.muted },
  heroWeatherCity: { fontWeight: '800', color: p.linkOnBg },
  questSliderEmbedded: {
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(249,115,22,0.38)',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#78350f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  questSliderEmbeddedDone: {
    borderColor: 'rgba(16,185,129,0.38)',
    shadowColor: '#047857',
    shadowOpacity: 0.18,
  },
  questCardBody: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8 },
  questCardBodyCompact: { paddingHorizontal: 14, paddingTop: 16 },
  mapCta: {
    borderWidth: 1,
    borderColor: colorWithAlpha(p.green, 0.45),
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    backgroundColor: colorWithAlpha(p.green, 0.08),
  },
  mapCtaLabel: { fontSize: 11, fontWeight: '900', color: '#065f46', letterSpacing: 2, marginBottom: 8 },
  mapCtaHint: { fontSize: 12, color: p.onCreamMuted, marginBottom: 10, fontWeight: '500', lineHeight: 18 },
  mapCtaText: { fontSize: 15, fontWeight: '800', color: p.onCream },
  missionBlock: {
    borderWidth: 2,
    borderColor: colorWithAlpha(p.cyan, 0.5),
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: p.cyan,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  missionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  missionHeadingEmoji: { fontSize: 16, lineHeight: 20 },
  missionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#155e75',
    letterSpacing: 2,
    textTransform: 'uppercase',
    flex: 1,
  },
  missionText: { fontSize: 18, fontWeight: '900', color: p.onCream, lineHeight: 26 },
  missionTextCompact: { fontSize: 16, lineHeight: 24, color: p.onCream },
  missionMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colorWithAlpha(p.cyan, 0.35),
  },
  durationPill: {
    backgroundColor: colorWithAlpha(p.gold, 0.28),
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.orange, 0.4),
  },
  durationPillText: { fontSize: 12, fontWeight: '900', color: p.onCream },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colorWithAlpha(p.orange, 0.25),
  },
  titleBlockText: { flex: 1 },
  questIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colorWithAlpha(p.cyan, 0.12),
    borderWidth: 1,
    borderColor: colorWithAlpha(p.cyan, 0.28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  questIcon: { fontSize: 22 },
  questCategory: {
    marginTop: 8,
    alignSelf: 'flex-start',
    fontSize: 11,
    color: p.onCreamMuted,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.onCream, 0.14),
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  questTitle: { fontSize: 19, fontWeight: '900', color: C.text, lineHeight: 24 },
  questTitleCompact: { fontSize: 17, lineHeight: 22 },
  tagOutdoor: {
    backgroundColor: colorWithAlpha(p.green, 0.1),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.green, 0.28),
  },
  tagOutdoorText: { fontSize: 12, color: C.success, fontWeight: '600' },
  hookCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.orange, 0.28),
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
    backgroundColor: p.cardCream,
    shadowColor: p.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  hookCaption: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: p.onCreamMuted,
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  hookQuote: { textAlign: 'center' },
  hookGuillemet: { fontSize: 15, fontWeight: '800', color: colorWithAlpha(p.orange, 0.85) },
  hookQuoteBody: { fontSize: 15, fontWeight: '600', lineHeight: 24, color: p.onCream },
  safetyNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.45)',
    backgroundColor: 'rgba(254,252,232,0.95)',
  },
  safetyNoteEmoji: { fontSize: 18, lineHeight: 22 },
  safetyNoteText: { flex: 1, fontSize: 14, color: '#78350f', fontWeight: '600', lineHeight: 20 },
  questActionsFooter: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(253,186,116,0.35)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    paddingBottom: 18,
  },
  footerActionsInner: { gap: 10 },
  completedFooterTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#065f46',
    textAlign: 'center',
    lineHeight: 24,
  },
  completedFooterSub: { fontSize: 13, color: p.onCreamMuted, textAlign: 'center', marginBottom: 4 },
  acceptedHint: { fontSize: 12, color: p.onCreamMuted, textAlign: 'center', lineHeight: 18, marginTop: 2 },
  rerollBtn: { backgroundColor: p.surface, borderWidth: 1, borderColor: C.border, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  rerollBtnDisabled: { opacity: 0.4 },
  rerollText: { color: C.accent, fontWeight: '700', fontSize: 14 },
  acceptBtn: {
    backgroundColor: C.accentWarm,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: p.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  localhostWarning: { backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 10, marginBottom: 8 },
  localhostWarningText: { color: '#f59e0b', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  shareLinkBtn: {
    borderWidth: 2,
    borderColor: colorWithAlpha(p.cyan, 0.45),
    backgroundColor: p.cardCream,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareLinkText: { fontWeight: '900', fontSize: 15, color: p.linkOnBg },
  footerTeaser: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: C.muted,
    lineHeight: 18,
  },
  });
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
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: p.overlay },
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: p.cardCream,
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
