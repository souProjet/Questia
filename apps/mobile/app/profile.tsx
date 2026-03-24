import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import {
  BADGE_CATEGORY_LABEL_FR,
  getBadgeCatalogForUi,
  levelFromTotalXp,
  type ExplorerAxis,
  type RiskAxis,
} from '@questia/shared';
import { DA } from '@questia/ui';

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

type ProfilePayload = {
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  totalXp: number;
  streakCount: number;
  currentDay: number;
  badgesEarned: unknown;
};

export default function ProfileScreen() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);

  const barAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch(`${API_BASE_URL}/api/profile`, token);
      if (!res.ok) {
        setError(res.status === 401 ? 'Session expirée.' : `Erreur ${res.status}`);
        setProfile(null);
        return;
      }
      const data = (await res.json()) as ProfilePayload;
      setProfile(data);
      barAnim.setValue(0);
      const j = levelFromTotalXp(data.totalXp ?? 0);
      Animated.timing(barAnim, {
        toValue: j.xpPerLevel > 0 ? j.xpIntoLevel / j.xpPerLevel : 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } catch {
      setError('Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  }, [barAnim]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalXp = profile?.totalXp ?? 0;
  const { level, xpIntoLevel, xpToNext, xpPerLevel } = levelFromTotalXp(totalXp);
  const badgeCatalog = getBadgeCatalogForUi(profile?.badgesEarned);

  const quadrantLabel = profile
    ? `${profile.explorerAxis === 'explorer' ? 'Explorateur·rice' : 'Casanier·ière'} · ${
        profile.riskAxis === 'risktaker' ? 'Audacieux·se' : 'Prudent·e'
      }`
    : '';

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.topTitle}>Profil</Text>
        <View style={{ width: 72 }} />
      </View>

      {loading && !profile ? (
        <View style={styles.center}>
          <ActivityIndicator color="#22d3ee" size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.greeting}>
            {user?.firstName ?? 'Aventurier·e'} <Text style={styles.emoji}>🎮</Text>
          </Text>
          <Text style={styles.quadrant}>{quadrantLabel}</Text>

          <View style={styles.levelCard}>
            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>Niveau</Text>
              <Text style={styles.levelValue}>{level}</Text>
            </View>
            <Text style={styles.xpCaption}>
              {totalXp} XP au total · encore {xpToNext} XP pour monter (tranche {xpIntoLevel}/{xpPerLevel})
            </Text>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { width: barWidth }]} />
            </View>
          </View>

          <View style={styles.miniStats}>
            <View style={styles.mini}>
              <Text style={styles.miniEmoji}>📍</Text>
              <Text style={styles.miniVal}>Jour {profile?.currentDay ?? 1}</Text>
              <Text style={styles.miniLbl}>Parcours</Text>
            </View>
            <View style={styles.mini}>
              <Text style={styles.miniEmoji}>🔥</Text>
              <Text style={styles.miniVal}>{profile?.streakCount ?? 0}</Text>
              <Text style={styles.miniLbl}>Série</Text>
            </View>
          </View>

          <Text style={styles.section}>Insignes</Text>
          <Text style={styles.hint}>
            Tous les objectifs sont visibles : débloqués en couleur, les autres en attente.
          </Text>

          <View style={styles.badgeGrid}>
            {badgeCatalog.map((b) => (
              <View
                key={b.id}
                style={[styles.badgeCard, !b.unlocked && styles.badgeCardLocked]}
              >
                <View style={styles.badgeTopRow}>
                  <Text style={[styles.badgeEmoji, !b.unlocked && styles.badgeEmojiMuted]}>{b.placeholderEmoji}</Text>
                  {!b.unlocked ? (
                    <Text style={styles.badgeLockLabel}>À débloquer</Text>
                  ) : null}
                </View>
                <Text style={styles.badgeCat}>{BADGE_CATEGORY_LABEL_FR[b.category]}</Text>
                <Text style={[styles.badgeName, !b.unlocked && styles.badgeNameMuted]}>{b.title}</Text>
                <Text style={styles.badgeCrit}>{b.criteria}</Text>
                {b.unlocked && b.unlockedAt ? (
                  <Text style={styles.badgeDate}>
                    {new Date(b.unlockedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                ) : (
                  <Text style={styles.badgeDate}>Objectif en cours</Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const C = {
  bg: DA.bg,
  card: DA.card,
  border: DA.borderCyan,
  accent: DA.cyan,
  text: DA.text,
  muted: DA.muted,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: C.accent, fontWeight: '800', fontSize: 14 },
  topTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: C.muted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  err: { color: '#f87171', textAlign: 'center', fontWeight: '600' },
  retry: {
    backgroundColor: C.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '800' },
  scroll: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 26, fontWeight: '900', color: C.text, marginBottom: 6 },
  emoji: { fontSize: 22 },
  quadrant: { fontSize: 14, fontWeight: '700', color: C.muted, marginBottom: 20 },
  levelCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  levelLabel: { fontSize: 12, fontWeight: '800', color: '#0e7490', letterSpacing: 2 },
  levelValue: { fontSize: 36, fontWeight: '900', color: C.text },
  xpCaption: { marginTop: 8, fontSize: 12, color: C.muted, fontWeight: '600', lineHeight: 18 },
  track: {
    marginTop: 12,
    height: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.06)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
  },
  fill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  miniStats: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  mini: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  miniEmoji: { fontSize: 18, marginBottom: 4 },
  miniVal: { fontSize: 16, fontWeight: '900', color: C.text },
  miniLbl: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },
  section: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: C.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  hint: { fontSize: 12, color: C.muted, marginBottom: 14, fontWeight: '500', lineHeight: 18 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    width: '47%',
    minWidth: 140,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.22)',
  },
  badgeCardLocked: {
    opacity: 0.88,
    backgroundColor: 'rgba(248,250,252,0.98)',
    borderColor: 'rgba(148,163,184,0.5)',
  },
  badgeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  badgeEmoji: { fontSize: 28, marginBottom: 0 },
  badgeEmojiMuted: { opacity: 0.65 },
  badgeLockLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8' },
  badgeCat: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  badgeName: { fontSize: 14, fontWeight: '900', color: C.text, marginBottom: 4 },
  badgeNameMuted: { color: '#64748b' },
  badgeCrit: { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 8, lineHeight: 16 },
  badgeDate: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
});
