import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import {
  BADGE_CATEGORY_LABEL_FR,
  getBadgeCatalogForUi,
  levelFromTotalXp,
  type ExplorerAxis,
  type RiskAxis,
} from '@questia/shared';
import { colorWithAlpha, type ThemePalette } from '@questia/ui';
import { useAppTheme } from '../../contexts/AppThemeContext';

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
  const router = useRouter();
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createProfileStyles(palette), [palette]);
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
        <View style={{ width: 72 }} />
        <Text style={[styles.topTitle, styles.topTitleCenter]}>Profil</Text>
        <View style={{ width: 72 }} />
      </View>

      {loading && !profile ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.cyan} size="large" />
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

          <Pressable
            onPress={() => router.push('/shop')}
            accessibilityRole="button"
            accessibilityLabel="Niveau et XP"
            accessibilityHint="Ouvre la boutique pour bonus XP et cosmétiques"
            style={({ pressed }) => [styles.levelCard, pressed && styles.levelCardPressed]}
          >
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
          </Pressable>

          <View style={styles.miniStats}>
            <Pressable
              onPress={() => router.push('/history')}
              accessibilityRole="button"
              accessibilityLabel="Historique des quêtes"
              accessibilityHint="Ouvre le journal des quêtes"
              style={({ pressed }) => [styles.mini, pressed && styles.miniPressed]}
            >
              <Text style={styles.miniEmoji}>📍</Text>
              <Text style={styles.miniVal}>Jour {profile?.currentDay ?? 1}</Text>
              <Text style={styles.miniLbl}>Parcours</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/home')}
              accessibilityRole="button"
              accessibilityLabel="Accueil et quête du jour"
              accessibilityHint="Retour à l’accueil"
              style={({ pressed }) => [styles.mini, pressed && styles.miniPressed]}
            >
              <Text style={styles.miniEmoji}>🔥</Text>
              <Text style={styles.miniVal}>{profile?.streakCount ?? 0}</Text>
              <Text style={styles.miniLbl}>Série</Text>
            </Pressable>
          </View>

          <Text style={styles.section}>Insignes</Text>
          <Text style={styles.hint}>
            Débloqués : bordure ambre et ombre. En attente : carte grisée et bordure en pointillés.
          </Text>

          <View style={styles.badgeGrid}>
            {badgeCatalog.map((b) => (
              <View
                key={b.id}
                style={[styles.badgeCard, b.unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked]}
              >
                <View style={styles.badgeTopRow}>
                  <Text style={[styles.badgeEmoji, !b.unlocked && styles.badgeEmojiMuted]}>{b.placeholderEmoji}</Text>
                  {b.unlocked ? (
                    <View style={styles.badgePillUnlocked}>
                      <Text style={styles.badgePillUnlockedText}>Débloqué</Text>
                    </View>
                  ) : (
                    <View style={styles.badgePillLocked}>
                      <Text style={styles.badgePillLockedText}>À débloquer</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.badgeCat, b.unlocked ? styles.badgeCatUnlocked : styles.badgeCatLocked]}>
                  {BADGE_CATEGORY_LABEL_FR[b.category]}
                </Text>
                <Text style={[styles.badgeName, !b.unlocked && styles.badgeNameMuted]}>{b.title}</Text>
                <Text style={[styles.badgeCrit, !b.unlocked && styles.badgeCritLocked]}>{b.criteria}</Text>
                {b.unlocked && b.unlockedAt ? (
                  <Text style={styles.badgeDateUnlocked}>
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

          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]}
            onPress={() => void signOut()}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
          >
            <Text style={styles.signOutBtnText}>Se déconnecter</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createProfileStyles(p: ThemePalette) {
  const C = {
    bg: p.bg,
    card: p.card,
    border: p.borderCyan,
    accent: p.cyan,
    text: p.text,
    muted: p.muted,
  };

  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: C.muted },
  topTitleCenter: { flex: 1, textAlign: 'center' },
  signOutBtn: {
    marginTop: 28,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorWithAlpha('#b91c1c', 0.45),
    backgroundColor: colorWithAlpha('#b91c1c', 0.06),
  },
  signOutBtnPressed: { opacity: 0.88 },
  signOutBtnText: { fontSize: 15, fontWeight: '800', color: '#b91c1c' },
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
  levelCardPressed: { opacity: 0.9 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  levelLabel: { fontSize: 12, fontWeight: '800', color: p.linkOnBg, letterSpacing: 2 },
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
  miniPressed: { opacity: 0.88 },
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
    borderRadius: 18,
    padding: 14,
  },
  badgeCardUnlocked: {
    backgroundColor: p.cardCream,
    borderWidth: 2,
    borderColor: colorWithAlpha(p.gold, 0.75),
    shadowColor: p.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  badgeCardLocked: {
    backgroundColor: p.surface,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: p.border,
    opacity: 0.95,
  },
  badgeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  badgeEmoji: { fontSize: 28, marginBottom: 0 },
  badgeEmojiMuted: { opacity: 0.45 },
  badgePillUnlocked: {
    backgroundColor: colorWithAlpha(p.green, 0.2),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colorWithAlpha(p.green, 0.45),
  },
  badgePillUnlockedText: { fontSize: 8, fontWeight: '900', color: p.green, letterSpacing: 0.6 },
  badgePillLocked: {
    backgroundColor: colorWithAlpha(p.text, 0.08),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: p.border,
  },
  badgePillLockedText: { fontSize: 8, fontWeight: '900', color: p.muted, letterSpacing: 0.6 },
  badgeCat: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeCatUnlocked: {
    color: '#78350f',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
  },
  badgeCatLocked: {
    color: '#64748b',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
  },
  badgeName: { fontSize: 14, fontWeight: '900', color: C.text, marginBottom: 4 },
  badgeNameMuted: { color: p.subtle },
  badgeCrit: { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 8, lineHeight: 16 },
  badgeCritLocked: { color: p.subtle },
  badgeDate: { fontSize: 10, color: p.subtle, fontWeight: '600' },
  badgeDateUnlocked: { fontSize: 10, color: p.green, fontWeight: '800' },
  });
}
