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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import {
  BADGE_CATEGORY_LABEL_EN,
  BADGE_CATEGORY_LABEL_FR,
  getBadgeCatalogForUi,
  levelFromTotalXp,
  getTitleDefinition,
  type ExplorerAxis,
  type RiskAxis,
  type EscalationPhase,
} from '@questia/shared';
import { colorWithAlpha, type ThemePalette } from '@questia/ui';
import { useAppLocale } from '../../contexts/AppLocaleContext';
import { useAppTheme } from '../../contexts/AppThemeContext';
import { hapticLight } from '../../lib/haptics';
import { getProfileScreenStrings } from '../../lib/profileScreenStrings';
import { elevationAndroidSafe } from '../../lib/elevationAndroid';

import { API_BASE_URL, apiFetch } from '../../lib/api';

const SITE_PUBLIC = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://questia.fr';

const LEGAL_PATHS = [
  { key: 'privacy' as const, icon: '\u{1F512}', path: '/legal/confidentialite' },
  { key: 'legal' as const, icon: '\u{1F4C4}', path: '/legal/mentions-legales' },
  { key: 'terms' as const, icon: '\u{1F4CB}', path: '/legal/cgu' },
  { key: 'sales' as const, icon: '\u{1F4B3}', path: '/legal/cgv' },
  { key: 'wellbeing' as const, icon: '\u{1F49A}', path: '/legal/bien-etre' },
];

type ProfilePayload = {
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  totalXp: number;
  streakCount: number;
  currentDay: number;
  badgesEarned: unknown;
};

export default function ProfileScreen() {
  const { locale: appLocale, setLocale } = useAppLocale();
  const s = useMemo(() => getProfileScreenStrings(appLocale), [appLocale]);
  const dateLocale = appLocale === 'en' ? 'en-GB' : 'fr-FR';
  const badgeCat = appLocale === 'en' ? BADGE_CATEGORY_LABEL_EN : BADGE_CATEGORY_LABEL_FR;
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
  const [todayInfo, setTodayInfo] = useState<{
    phase?: EscalationPhase;
    weather?: string;
    weatherTemp?: number | null;
    city?: string | null;
    equippedTitleId?: string | null;
    xpBonusCharges?: number;
  } | null>(null);

  const barAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch(`${API_BASE_URL}/api/profile?locale=${appLocale}`, token);
      if (!res.ok) {
        setError(res.status === 401 ? s.errSession : s.errGeneric(res.status));
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
      setError(s.errLoad);
    } finally {
      setLoading(false);
    }
  }, [barAnim, s, appLocale]);

  const loadToday = useCallback(async () => {
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/daily?locale=${appLocale}`, token);
      if (!res.ok) return;
      const data = await res.json();
      setTodayInfo({
        phase: data.phase,
        weather: data.context?.weatherDescription ?? data.weather,
        weatherTemp: data.context?.temp ?? data.weatherTemp,
        city: data.city,
        equippedTitleId: data.equippedTitleId,
        xpBonusCharges: data.xpBonusCharges ?? 0,
      });
    } catch {
      /* non bloquant */
    }
  }, [appLocale]);

  useEffect(() => {
    void load();
    void loadToday();
  }, [load, loadToday]);

  const totalXp = profile?.totalXp ?? 0;
  const { level, xpIntoLevel, xpToNext, xpPerLevel } = levelFromTotalXp(totalXp);
  const badgeCatalog = getBadgeCatalogForUi(profile?.badgesEarned, appLocale);

  const quadrantLabel = profile
    ? `${profile.explorerAxis === 'explorer' ? s.axisExplorer : s.axisHomebody} \u00b7 ${
        profile.riskAxis === 'risktaker' ? s.riskAudacious : s.riskCautious
      }`
    : '';

  const legalLabelByKey = useMemo(
    () =>
      ({
        privacy: s.legalPrivacy,
        legal: s.legalLegal,
        terms: s.legalTerms,
        sales: s.legalSales,
        wellbeing: s.legalWellbeing,
      }) as const,
    [s],
  );

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={{ width: 72 }} />
        <Text style={[styles.topTitle, styles.topTitleCenter]}>{s.title}</Text>
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
            <Text style={styles.retryText}>{s.retry}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.greeting}>
            {user?.firstName ?? s.defaultName} <Text style={styles.emoji}>{'\u{1F3AE}'}</Text>
          </Text>
          <Text style={styles.quadrant}>{quadrantLabel}</Text>

          <Pressable
            onPress={() => {
              hapticLight();
              router.push('/shop');
            }}
            accessibilityRole="button"
            accessibilityLabel={s.a11yLevelCard}
            accessibilityHint={s.a11yLevelHint}
            style={({ pressed }) => [styles.levelCard, pressed && styles.levelCardPressed]}
          >
            <View style={styles.levelHeader}>
              <Text style={styles.levelLabel}>{s.levelLabel}</Text>
              <Text style={styles.levelValue}>{level}</Text>
            </View>
            <Text style={styles.xpCaption}>
              {s.xpLine(totalXp, xpToNext, xpIntoLevel, xpPerLevel)}
            </Text>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { width: barWidth }]} />
            </View>
          </Pressable>

          <View style={styles.miniStats}>
            <Pressable
              onPress={() => router.push('/history')}
              accessibilityRole="button"
              accessibilityLabel={s.a11yHistory}
              accessibilityHint={s.a11yHistoryHint}
              style={({ pressed }) => [styles.mini, pressed && styles.miniPressed]}
            >
              <Text style={styles.miniEmoji}>{'\u{1F4CD}'}</Text>
              <Text style={styles.miniVal}>{s.dayChip(profile?.currentDay ?? 1)}</Text>
              <Text style={styles.miniLbl}>{s.journey}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/home')}
              accessibilityRole="button"
              accessibilityLabel={s.a11yHome}
              accessibilityHint={s.a11yHomeHint}
              style={({ pressed }) => [styles.mini, pressed && styles.miniPressed]}
            >
              <Text style={styles.miniEmoji}>{'\u{1F525}'}</Text>
              <Text style={styles.miniVal}>{profile?.streakCount ?? 0}</Text>
              <Text style={styles.miniLbl}>{s.streak}</Text>
            </Pressable>
          </View>

          {todayInfo ? (
            <View style={styles.todayInfoGrid}>
              {todayInfo.phase ? (
                <View style={styles.todayInfoCard}>
                  <Text style={styles.todayInfoEmoji}>
                    {todayInfo.phase === 'calibration' ? '\u{1F331}' : todayInfo.phase === 'expansion' ? '\u{1F9ED}' : '\u{26A1}'}
                  </Text>
                  <Text style={styles.todayInfoLabel}>
                    {appLocale === 'en'
                      ? todayInfo.phase === 'calibration' ? 'Discovery' : todayInfo.phase === 'expansion' ? 'Exploration' : 'Intensity'
                      : todayInfo.phase === 'calibration' ? 'Découverte' : todayInfo.phase === 'expansion' ? 'Exploration' : 'Intensité'}
                  </Text>
                </View>
              ) : null}
              {todayInfo.weather ? (
                <View style={styles.todayInfoCard}>
                  <Text style={styles.todayInfoEmoji}>{'\u{2600}\u{FE0F}'}</Text>
                  <Text style={styles.todayInfoLabel} numberOfLines={1}>
                    {todayInfo.weather}{todayInfo.weatherTemp != null ? ` ${Math.round(todayInfo.weatherTemp)}°` : ''}
                  </Text>
                  {todayInfo.city ? <Text style={styles.todayInfoSub} numberOfLines={1}>{todayInfo.city}</Text> : null}
                </View>
              ) : null}
              {todayInfo.equippedTitleId && getTitleDefinition(todayInfo.equippedTitleId) ? (
                <View style={styles.todayInfoCard}>
                  <Text style={styles.todayInfoEmoji}>{getTitleDefinition(todayInfo.equippedTitleId)!.emoji}</Text>
                  <Text style={styles.todayInfoLabel} numberOfLines={1}>{getTitleDefinition(todayInfo.equippedTitleId)!.label}</Text>
                </View>
              ) : null}
              {(todayInfo.xpBonusCharges ?? 0) > 0 ? (
                <View style={styles.todayInfoCard}>
                  <Text style={styles.todayInfoEmoji}>{'\u{26A1}'}</Text>
                  <Text style={styles.todayInfoLabel}>
                    {todayInfo.xpBonusCharges} {appLocale === 'en' ? 'XP bonus' : 'bonus XP'}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.section}>{s.localeSection}</Text>
          <View style={styles.localeRow}>
            <Pressable
              onPress={() => {
                hapticLight();
                void setLocale('fr');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: appLocale === 'fr' }}
              accessibilityLabel={s.localeFr}
              style={({ pressed }) => [
                styles.localeChip,
                appLocale === 'fr' && styles.localeChipSelected,
                pressed && styles.localeChipPressed,
              ]}
            >
              <Text
                style={[styles.localeChipText, appLocale === 'fr' && styles.localeChipTextSelected]}
              >
                {s.localeFr}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticLight();
                void setLocale('en');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: appLocale === 'en' }}
              accessibilityLabel={s.localeEn}
              style={({ pressed }) => [
                styles.localeChip,
                appLocale === 'en' && styles.localeChipSelected,
                pressed && styles.localeChipPressed,
              ]}
            >
              <Text
                style={[styles.localeChipText, appLocale === 'en' && styles.localeChipTextSelected]}
              >
                {s.localeEn}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.section}>{s.badgesTitle}</Text>
          <Text style={styles.hint}>{s.badgesHint}</Text>

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
                      <Text style={styles.badgePillUnlockedText}>{s.unlocked}</Text>
                    </View>
                  ) : (
                    <View style={styles.badgePillLocked}>
                      <Text style={styles.badgePillLockedText}>{s.locked}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.badgeCat, b.unlocked ? styles.badgeCatUnlocked : styles.badgeCatLocked]}>
                  {badgeCat[b.category]}
                </Text>
                <Text style={[styles.badgeName, !b.unlocked && styles.badgeNameMuted]}>{b.title}</Text>
                <Text style={[styles.badgeCrit, !b.unlocked && styles.badgeCritLocked]}>{b.criteria}</Text>
                {b.unlocked && b.unlockedAt ? (
                  <Text style={styles.badgeDateUnlocked}>
                    {new Date(b.unlockedAt).toLocaleDateString(dateLocale, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                ) : (
                  <Text style={styles.badgeDate}>{s.objectiveInProgress}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Liens l\u00e9gaux */}
          <Text style={styles.section}>{s.legalTitle}</Text>
          <View style={styles.legalGrid}>
            {LEGAL_PATHS.map((l) => {
              const label = legalLabelByKey[l.key];
              return (
                <Pressable
                  key={l.path}
                  onPress={() => void Linking.openURL(`${SITE_PUBLIC}${l.path}`)}
                  style={({ pressed }) => [styles.legalBtn, pressed && styles.legalBtnPressed]}
                  accessibilityRole="link"
                  accessibilityLabel={s.legalOpen(label)}
                >
                  <Text style={styles.legalBtnIcon}>{l.icon}</Text>
                  <Text style={styles.legalBtnText}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* D\u00e9connexion */}
          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]}
            onPress={() => {
              hapticLight();
              void signOut();
            }}
            accessibilityRole="button"
            accessibilityLabel={s.signOutA11y}
          >
            <Text style={styles.signOutBtnText}>{s.signOut}</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createProfileStyles(p: ThemePalette) {
  const elev = elevationAndroidSafe;
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

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
    err: { color: '#f87171', textAlign: 'center', fontWeight: '600' },
    retry: { backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
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
    levelHeader: { marginBottom: 2 },
    levelLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: C.muted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    levelValue: {
      fontSize: 42,
      fontWeight: '900',
      color: C.text,
      lineHeight: 44,
      letterSpacing: -0.5,
    },
    xpCaption: { marginTop: 8, fontSize: 12, color: C.muted, fontWeight: '600', lineHeight: 18 },
    track: {
      marginTop: 12, height: 12, borderRadius: 8,
      backgroundColor: 'rgba(15,23,42,0.06)', overflow: 'hidden',
      borderWidth: 1, borderColor: 'rgba(34,211,238,0.25)',
    },
    fill: {
      height: '100%', borderRadius: 8, backgroundColor: '#22d3ee',
      shadowColor: '#22d3ee', shadowOpacity: 0.45, shadowRadius: 8,
    },

    miniStats: { flexDirection: 'row', gap: 10, marginBottom: 22 },
    mini: {
      flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14,
      alignItems: 'center', borderWidth: 1, borderColor: C.border,
    },
    miniPressed: { opacity: 0.88 },
    miniEmoji: { fontSize: 18, marginBottom: 4 },
    miniVal: { fontSize: 16, fontWeight: '900', color: C.text },
    miniLbl: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },

    todayInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    todayInfoCard: {
      flexGrow: 1,
      minWidth: 80,
      backgroundColor: C.card,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    todayInfoEmoji: { fontSize: 18, marginBottom: 4 },
    todayInfoLabel: { fontSize: 11, fontWeight: '700', color: C.text, textAlign: 'center' },
    todayInfoSub: { fontSize: 10, fontWeight: '500', color: C.muted, marginTop: 2, textAlign: 'center' },

    localeRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
    localeChip: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.card,
    },
    localeChipSelected: {
      borderColor: C.accent,
      backgroundColor: colorWithAlpha(p.cyan, 0.12),
    },
    localeChipPressed: { opacity: 0.88 },
    localeChipText: { fontSize: 15, fontWeight: '800', color: C.muted },
    localeChipTextSelected: { color: C.text },

    section: {
      fontSize: 11, fontWeight: '800', letterSpacing: 2, color: C.muted,
      marginBottom: 6, marginTop: 20, textTransform: 'uppercase',
    },
    hint: { fontSize: 12, color: C.muted, marginBottom: 14, fontWeight: '500', lineHeight: 18 },

    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    badgeCard: { width: '47%', minWidth: 140, borderRadius: 18, padding: 14 },
    badgeCardUnlocked: {
      backgroundColor: p.card, borderWidth: 2, borderColor: colorWithAlpha(p.gold, 0.75),
      shadowColor: p.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: elev(4),
    },
    badgeCardLocked: {
      backgroundColor: p.surface, borderWidth: 2, borderStyle: 'dashed', borderColor: p.border, opacity: 0.95,
    },
    badgeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    badgeEmoji: { fontSize: 28 },
    badgeEmojiMuted: { opacity: 0.45 },
    badgePillUnlocked: {
      backgroundColor: colorWithAlpha(p.green, 0.2), paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 999, borderWidth: 1, borderColor: colorWithAlpha(p.green, 0.45),
    },
    badgePillUnlockedText: { fontSize: 8, fontWeight: '900', color: p.green, letterSpacing: 0.6 },
    badgePillLocked: {
      backgroundColor: colorWithAlpha(p.text, 0.08), paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 999, borderWidth: 1, borderColor: p.border,
    },
    badgePillLockedText: { fontSize: 8, fontWeight: '900', color: p.muted, letterSpacing: 0.6 },
    badgeCat: {
      fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase',
      marginBottom: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 999, overflow: 'hidden',
    },
    badgeCatUnlocked: {
      color: p.orange,
      backgroundColor: colorWithAlpha(p.gold, 0.14),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.gold, 0.45),
    },
    badgeCatLocked: { color: '#64748b', backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.45)' },
    badgeName: { fontSize: 14, fontWeight: '900', color: C.text, marginBottom: 4 },
    badgeNameMuted: { color: p.subtle },
    badgeCrit: { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 8, lineHeight: 16 },
    badgeCritLocked: { color: p.subtle },
    badgeDate: { fontSize: 10, color: p.subtle, fontWeight: '600' },
    badgeDateUnlocked: { fontSize: 10, color: p.green, fontWeight: '800' },

    infoCard: {
      marginTop: 24, backgroundColor: C.card, borderRadius: 18, padding: 16,
      borderWidth: 1, borderColor: C.border,
    },
    infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    infoCardIcon: { fontSize: 20 },
    infoCardTitle: { fontSize: 16, fontWeight: '900', color: C.text },
    infoCardBody: { fontSize: 13, color: C.muted, lineHeight: 20, fontWeight: '500' },

    legalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    legalBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
      borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
    },
    legalBtnPressed: { opacity: 0.8, backgroundColor: colorWithAlpha(p.cyan, 0.06) },
    legalBtnIcon: { fontSize: 14 },
    legalBtnText: { fontSize: 13, fontWeight: '700', color: C.text },

    signOutBtn: {
      marginTop: 28, marginBottom: 8, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
      borderWidth: 1, borderColor: colorWithAlpha('#b91c1c', 0.45),
      backgroundColor: colorWithAlpha('#b91c1c', 0.06),
    },
    signOutBtnPressed: { opacity: 0.88 },
    signOutBtnText: { fontSize: 15, fontWeight: '800', color: '#b91c1c' },
  });
}
