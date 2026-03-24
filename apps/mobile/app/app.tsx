import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { MAX_REROLLS_PER_DAY, questDisplayEmoji, questFamilyLabel } from '@questia/shared';
import { DA } from '@questia/ui';
import type { EscalationPhase } from '@questia/shared';

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
}

const PHASE_LABEL: Record<EscalationPhase, string> = {
  calibration: 'Étalonnage',
  expansion:   'Expansion',
  rupture:     'Rupture',
};

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

  const { signOut, getToken, isLoaded: authLoaded } = useAuth();
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
        const data = await res.json() as Partial<DailyQuest>;
        const qd = quest.questDate;
        setQuest((prev) => (prev ? { ...prev, ...data, status: (data.status ?? 'completed') as DailyQuest['status'] } : null));
        router.push({ pathname: '/share-card', params: { questDate: qd } });
      }
    } finally {
      setCompleting(false);
    }
  }, [quest, getToken, router]);

  const handleAccept = () => {
    if (quest?.isOutdoor) setShowSafety(true);
    else doAccept();
  };

  const handleReroll = async () => {
    if (!quest || quest.status !== 'pending' || rerolling || rerollsRemaining <= 0) return;
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

  const qs = quest?.status;
  const isPending = qs === 'pending';
  const isAccepted = qs === 'accepted';
  const isCompleted = qs === 'completed';
  const questFamily = quest ? questFamilyLabel(quest.archetypeCategory) : null;

  if (loading && !quest) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingFull}>
          <ActivityIndicator color="#22d3ee" size="large" />
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
        <View style={[styles.header, compact && styles.headerCompact]}>
          <View style={styles.headerTitles}>
            <Text style={styles.appName}>QUESTIA</Text>
            <Text
              style={[styles.greeting, compact && styles.greetingCompact, narrow && styles.greetingNarrow]}
              numberOfLines={2}
            >
              Bonjour, {user?.firstName ?? 'Aventurier'} 👋
            </Text>
          </View>
          <Pressable
            onPress={() => signOut()}
            style={styles.signOutBtn}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
          >
            <Text style={styles.signOutText}>Déco.</Text>
          </Pressable>
        </View>

        <View style={[styles.statsRow, compact && styles.statsRowCompact]}>
          {[
            { emoji: '🌱', value: PHASE_LABEL[quest?.phase ?? 'calibration'], label: 'Phase' },
            { emoji: '📍', value: `Jour ${quest?.day ?? 1}`, label: 'Parcours' },
            { emoji: '🎲', value: `${rerollsRemaining}/${MAX_REROLLS_PER_DAY}`, label: 'Relances' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, compact && styles.statCardCompact]}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={[styles.statValue, compact && styles.statValueCompact]} numberOfLines={2}>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {(quest?.streak ?? 0) > 0 && (
          <View style={styles.streakHint}>
            <Text style={styles.streakHintText}>
              🔥 {quest?.streak} jour{quest?.streak !== 1 ? 's' : ''} de suite
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>
          {isCompleted ? '🏆  Quête validée' : isAccepted ? '✅  En cours' : '⚔️  Quête du jour'}
        </Text>

        {quest && (
          <View style={[styles.questCard, (isAccepted || isCompleted) && styles.questCardAccepted]}>
            <View style={[styles.questCardBar, (isAccepted || isCompleted) && styles.questCardBarAccepted]} />
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

              <View style={styles.missionBlock}>
                <Text style={styles.missionLabel}>⚡ TA MISSION</Text>
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
              </View>

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
                  <Text style={styles.mapCtaLabel}>🗺️ Lieu suggéré</Text>
                  <Text style={styles.mapCtaText}>{quest.destination.label}</Text>
                  <Text style={styles.mapCtaHint}>Ouvre dans Plans / Google Maps</Text>
                </Pressable>
              ) : null}

              {quest.city && quest.city !== 'ta ville' && (
                <View style={styles.questTags}>
                  <View style={styles.tag}><Text style={styles.tagText}>📍 {quest.city}</Text></View>
                </View>
              )}

              {quest.hook ? (
                <View style={styles.hookBox}>
                  <Text style={styles.hookText}>" {quest.hook} "</Text>
                </View>
              ) : null}

              {isCompleted ? (
                <View style={styles.shareBlock}>
                  <View style={styles.acceptedBanner}>
                    <Text style={styles.acceptedText}>🏆  Quête validée ! À demain.</Text>
                  </View>
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
                <View style={styles.actions}>
                  <Pressable style={styles.acceptBtn} onPress={doComplete} disabled={completing}>
                    <Text style={styles.acceptText}>
                      {completing ? '…' : '✅  J\'ai fait la quête — valider'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.rerollBtn, rerollsRemaining <= 0 && styles.rerollBtnDisabled]}
                    onPress={handleReroll}
                    disabled={rerollsRemaining <= 0 || rerolling}
                  >
                    <Text style={styles.rerollText}>
                      🎲  Relancer ({rerolling ? '…' : rerollsRemaining})
                    </Text>
                  </Pressable>
                  {API_BASE_URL.includes('localhost') && (
                    <View style={styles.localhostWarning}>
                      <Text style={styles.localhostWarningText}>
                        Sur téléphone, remplace localhost par l'IP de ton PC dans .env
                      </Text>
                    </View>
                  )}
                  <Pressable style={styles.acceptBtn} onPress={handleAccept} disabled={accepting}>
                    <Text style={styles.acceptText}>
                      {accepting ? 'Confirmation…' : 'Accepter la quête ⚔️'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {showSafety && quest && (
        <SafetySheet quest={quest} onConfirm={doAccept} onClose={() => setShowSafety(false)} />
      )}
    </SafeAreaView>
  );
}

const C = {
  bg: DA.bg,
  card: DA.card,
  border: DA.borderCyan,
  accent: DA.cyan,
  accentWarm: DA.orange,
  text: DA.text,
  muted: DA.muted,
  success: DA.green,
};

const styles = StyleSheet.create({
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  headerCompact: { marginBottom: 18 },
  headerTitles: { flex: 1, marginRight: 12, minWidth: 0 },
  appName: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 3, marginBottom: 4 },
  greeting: { fontSize: 26, fontWeight: '900', color: C.text },
  greetingCompact: { fontSize: 22, lineHeight: 28 },
  greetingNarrow: { fontSize: 20, lineHeight: 26 },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: DA.surface,
    borderWidth: 1,
    borderColor: DA.border,
    marginTop: 2,
  },
  signOutText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statsRowCompact: { gap: 8, marginBottom: 10 },
  streakHint: {
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.2)',
  },
  streakHintText: { fontSize: 12, fontWeight: '700', color: '#9a3412', textAlign: 'center' },
  statCard: { flex: 1, minWidth: 0, backgroundColor: C.card, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statCardCompact: { paddingHorizontal: 8, paddingVertical: 10, borderRadius: 14 },
  statEmoji: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 2, textAlign: 'center' },
  statValueCompact: { fontSize: 11, lineHeight: 15 },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '500' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },
  questCard: { backgroundColor: C.card, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(249,115,22,0.22)', marginBottom: 16 },
  questCardAccepted: { borderColor: 'rgba(16,185,129,0.3)' },
  questCardBar: { height: 4, backgroundColor: C.accent },
  questCardBarAccepted: { backgroundColor: C.success },
  questCardBody: { padding: 20 },
  questCardBodyCompact: { padding: 16 },
  mapCta: {
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    backgroundColor: 'rgba(16,185,129,0.06)',
  },
  mapCtaLabel: { fontSize: 10, fontWeight: '900', color: '#047857', letterSpacing: 1, marginBottom: 6 },
  mapCtaText: { fontSize: 15, fontWeight: '800', color: C.text },
  mapCtaHint: { fontSize: 11, color: C.muted, marginTop: 6, fontWeight: '600' },
  missionBlock: {
    borderWidth: 2,
    borderColor: 'rgba(34,211,238,0.45)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  missionLabel: { fontSize: 10, fontWeight: '900', color: '#0e7490', letterSpacing: 2, marginBottom: 8 },
  missionText: { fontSize: 18, fontWeight: '900', color: C.text, lineHeight: 26 },
  missionTextCompact: { fontSize: 16, lineHeight: 24 },
  missionMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(34,211,238,0.35)' },
  durationPill: { backgroundColor: 'rgba(251,191,36,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(249,115,22,0.35)' },
  durationPillText: { fontSize: 12, fontWeight: '900', color: '#9a3412' },
  titleBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(249,115,22,0.2)' },
  titleBlockText: { flex: 1 },
  questIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(34,211,238,0.1)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.25)', justifyContent: 'center', alignItems: 'center' },
  questIcon: { fontSize: 22 },
  questCategory: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 4 },
  questTitle: { fontSize: 19, fontWeight: '900', color: C.text, lineHeight: 24 },
  questTitleCompact: { fontSize: 17, lineHeight: 22 },
  questTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tag: { backgroundColor: DA.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  tagText: { fontSize: 12, color: C.muted },
  tagOutdoor: { backgroundColor: 'rgba(16,185,129,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  tagOutdoorText: { fontSize: 12, color: C.success, fontWeight: '600' },
  hookBox: { backgroundColor: 'rgba(249,115,22,0.08)', borderLeftWidth: 3, borderLeftColor: C.accentWarm, borderRadius: 4, padding: 14, marginBottom: 18 },
  hookText: { color: '#2dd4bf', fontSize: 14, fontStyle: 'italic', fontWeight: '500', lineHeight: 22 },
  actions: { gap: 10 },
  rerollBtn: { backgroundColor: DA.surface, borderWidth: 1, borderColor: C.border, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  rerollBtnDisabled: { opacity: 0.4 },
  rerollText: { color: C.accent, fontWeight: '700', fontSize: 14 },
  acceptBtn: { backgroundColor: C.accentWarm, paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  acceptText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  localhostWarning: { backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 10, marginBottom: 8 },
  localhostWarningText: { color: '#f59e0b', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  acceptedBanner: { backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', borderRadius: 14, padding: 16, alignItems: 'center' },
  acceptedText: { color: C.success, fontWeight: '700', fontSize: 14 },
  shareBlock: { gap: 12 },
  shareLinkBtn: {
    borderWidth: 2,
    borderColor: 'rgba(34,211,238,0.45)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareLinkText: { fontWeight: '900', fontSize: 15, color: '#0e7490' },
});

const sheet = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: DA.overlay },
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: DA.cardCream, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: DA.borderCyan, maxHeight: '90%', padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: DA.trackMuted, alignSelf: 'center', marginBottom: 24 },
  safetyTitle: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 8, textAlign: 'center' },
  safetySubtitle: { fontSize: 14, color: C.muted, marginBottom: 20, textAlign: 'center' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: DA.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.success, borderColor: C.success },
  check: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ruleText: { fontSize: 14, color: C.text, flex: 1 },
  safetyActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  laterBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: DA.border, alignItems: 'center' },
  laterText: { color: C.muted, fontWeight: '600', fontSize: 14 },
  goBtn: { flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: C.accentWarm, alignItems: 'center' },
  goBtnDisabled: { opacity: 0.5 },
  goText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
