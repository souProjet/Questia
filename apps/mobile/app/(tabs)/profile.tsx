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
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import {
  BADGE_CATEGORY_LABEL_EN,
  BADGE_CATEGORY_LABEL_FR,
  getBadgeCatalogForUi,
  levelFromTotalXp,
  getTitleDefinition,
  getThemeIds,
  TITLES_REGISTRY,
  type ExplorerAxis,
  type RiskAxis,
  type EscalationPhase,
} from '@questia/shared';
import { colorWithAlpha, UiLucideIcon, type ThemePalette } from '@questia/ui';
import { BlurView } from 'expo-blur';
import { useAppLocale } from '../../contexts/AppLocaleContext';
import { useAppTheme } from '../../contexts/AppThemeContext';
import { GlassScrim } from '../../components/GlassScrim';
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

const DURATION_MIN_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;
const DURATION_MAX_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240, 480, 720, 1440] as const;

type ProfilePayload = {
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  totalXp: number;
  streakCount: number;
  currentDay: number;
  badgesEarned: unknown;
  reminderCadence?: string;
  questDurationMinMinutes?: number;
  questDurationMaxMinutes?: number;
  heavyQuestPreference?: string;
  shop?: {
    activeThemeId: string;
    equippedTitleId: string | null;
  };
};

const TITLE_NONE = '__none__';

type SelectOpt = { value: string; label: string };

function AppearanceSelectSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SelectOpt[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <GlassScrim
          overlayColor={palette.overlay}
          intensity={62}
          tint="dark"
          onPress={onClose}
          accessibilityLabel="Fermer"
        />
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <View
            style={{
              backgroundColor: colorWithAlpha(palette.card, 0.96),
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 24 + insets.bottom,
              paddingTop: 16,
              paddingHorizontal: 20,
              maxHeight: 420,
            }}
          >
            {Platform.OS !== 'web' ? (
              <BlurView intensity={58} tint="light" style={StyleSheet.absoluteFillObject} />
            ) : null}
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { backgroundColor: colorWithAlpha(palette.card, 0.62), borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}
            />
            <View style={{ width: 36, height: 4, backgroundColor: palette.muted, borderRadius: 2, alignSelf: 'center', marginBottom: 14 }} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: palette.text, marginBottom: 12, textAlign: 'center' }}>
              {title}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => { onSelect(o.value); onClose(); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    paddingHorizontal: 4,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colorWithAlpha(palette.muted, 0.2),
                  }}
                >
                  <Text style={{ fontSize: 14, color: o.value === selectedValue ? palette.cyan : palette.text }}>
                    {o.label}
                  </Text>
                  {o.value === selectedValue ? (
                    <Text style={{ color: palette.cyan, fontWeight: '700' }}>✓</Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={onClose} hitSlop={8} style={{ marginTop: 16, alignSelf: 'center' }}>
              <Text style={{ color: palette.muted, fontSize: 14 }}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { locale: appLocale, setLocale } = useAppLocale();
  const s = useMemo(() => getProfileScreenStrings(appLocale), [appLocale]);
  const dateLocale = appLocale === 'en' ? 'en-GB' : 'fr-FR';
  const badgeCat = appLocale === 'en' ? BADGE_CATEGORY_LABEL_EN : BADGE_CATEGORY_LABEL_FR;
  const router = useRouter();
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const { palette, refresh: refreshAppTheme } = useAppTheme();
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

  const [prefsCadence, setPrefsCadence] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [prefsHeavyQuest, setPrefsHeavyQuest] = useState<'low' | 'balanced' | 'high'>('balanced');
  const [prefsDurMin, setPrefsDurMin] = useState(5);
  const [prefsDurMax, setPrefsDurMax] = useState(1440);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);

  const [activeThemeId, setActiveThemeId] = useState('default');
  const [equippedTitleId, setEquippedTitleId] = useState<string | null>(null);
  const [appearSelectKind, setAppearSelectKind] = useState<null | 'theme' | 'title'>(null);
  const [appearSaving, setAppearSaving] = useState(false);

  const barAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPrefsMsg(null);
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
      if (data.shop) {
        setActiveThemeId(data.shop.activeThemeId ?? 'default');
        setEquippedTitleId(data.shop.equippedTitleId ?? null);
      }
      const c =
        data.reminderCadence === 'weekly' || data.reminderCadence === 'monthly'
          ? data.reminderCadence
          : 'daily';
      setPrefsCadence(c);
      const h =
        data.heavyQuestPreference === 'low' || data.heavyQuestPreference === 'high'
          ? data.heavyQuestPreference
          : 'balanced';
      setPrefsHeavyQuest(h);
      setPrefsDurMin(data.questDurationMinMinutes ?? 5);
      setPrefsDurMax(data.questDurationMaxMinutes ?? 1440);
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

  const minDurOptions = useMemo(
    () => Array.from(new Set([...DURATION_MIN_PRESETS, prefsDurMin])).sort((a, b) => a - b),
    [prefsDurMin],
  );
  const maxDurOptions = useMemo(
    () => Array.from(new Set([...DURATION_MAX_PRESETS, prefsDurMax])).sort((a, b) => a - b),
    [prefsDurMax],
  );

  const savePrefs = useCallback(async () => {
    setPrefsSaving(true);
    setPrefsMsg(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch(`${API_BASE_URL}/api/profile`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          reminderCadence: prefsCadence,
          heavyQuestPreference: prefsHeavyQuest,
          questDurationMinMinutes: prefsDurMin,
          questDurationMaxMinutes: prefsDurMax,
        }),
      });
      if (!res.ok) {
        setPrefsMsg(s.prefsErr);
        return;
      }
      const updated = (await res.json()) as ProfilePayload;
      setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      setPrefsMsg(s.prefsSaved);
    } catch {
      setPrefsMsg(s.prefsErr);
    } finally {
      setPrefsSaving(false);
    }
  }, [prefsCadence, prefsHeavyQuest, prefsDurMin, prefsDurMax, s]);

  const saveAppearance = useCallback(async (patch: { activeThemeId?: string; equippedTitleId?: string | null }) => {
    setAppearSaving(true);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch(`${API_BASE_URL}/api/profile`, token, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (!res.ok) return;
      const j = (await res.json()) as { shop?: { activeThemeId: string; equippedTitleId: string | null } };
      if (j.shop) {
        setActiveThemeId(j.shop.activeThemeId ?? 'default');
        setEquippedTitleId(j.shop.equippedTitleId ?? null);
        if (patch.activeThemeId != null) void refreshAppTheme();
      }
    } catch {
      /* non bloquant */
    } finally {
      setAppearSaving(false);
    }
  }, [refreshAppTheme]);

  const themeOptions = useMemo<SelectOpt[]>(() => {
    return getThemeIds().map((id) => ({ value: id, label: s.themeLabel(id) }));
  }, [s]);

  const titleOptions = useMemo<SelectOpt[]>(() => {
    const opts: SelectOpt[] = [{ value: TITLE_NONE, label: s.noTitle }];
    for (const [id, def] of Object.entries(TITLES_REGISTRY)) {
      opts.push({ value: id, label: def.label });
    }
    return opts;
  }, [s]);

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
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>
              {user?.firstName ?? s.defaultName}
            </Text>
            <UiLucideIcon name="Sparkles" size={20} color={palette.orange} />
          </View>
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
              <View style={styles.miniIconWrap}>
                <UiLucideIcon name="MapPin" size={18} color={palette.cyan} />
              </View>
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
              <View style={styles.miniIconWrap}>
                <UiLucideIcon name="Flame" size={18} color={palette.orange} />
              </View>
              <Text style={styles.miniVal}>{profile?.streakCount ?? 0}</Text>
              <Text style={styles.miniLbl}>{s.streak}</Text>
            </Pressable>
          </View>

          {todayInfo ? (
            <View style={styles.todayInfoGrid}>
              {todayInfo.phase ? (
                <View style={styles.todayInfoCard}>
                  <View style={styles.todayInfoIconWrap}>
                    <UiLucideIcon
                      name={todayInfo.phase === 'calibration' ? 'Leaf' : todayInfo.phase === 'expansion' ? 'Compass' : 'Zap'}
                      size={18}
                      color={palette.cyan}
                    />
                  </View>
                  <Text style={styles.todayInfoLabel}>
                    {appLocale === 'en'
                      ? todayInfo.phase === 'calibration' ? 'Discovery' : todayInfo.phase === 'expansion' ? 'Exploration' : 'Intensity'
                      : todayInfo.phase === 'calibration' ? 'Découverte' : todayInfo.phase === 'expansion' ? 'Exploration' : 'Intensité'}
                  </Text>
                </View>
              ) : null}
              {todayInfo.weather ? (
                <View style={styles.todayInfoCard}>
                  <View style={styles.todayInfoIconWrap}>
                    <UiLucideIcon name="Sun" size={18} color={palette.orange} />
                  </View>
                  <Text style={styles.todayInfoLabel} numberOfLines={1}>
                    {todayInfo.weather}{todayInfo.weatherTemp != null ? ` ${Math.round(todayInfo.weatherTemp)}°` : ''}
                  </Text>
                  {todayInfo.city ? <Text style={styles.todayInfoSub} numberOfLines={1}>{todayInfo.city}</Text> : null}
                </View>
              ) : null}
              {todayInfo.equippedTitleId && getTitleDefinition(todayInfo.equippedTitleId) ? (
                <View style={styles.todayInfoCard}>
                  <View style={styles.todayInfoIconWrap}>
                    <UiLucideIcon
                      name={getTitleDefinition(todayInfo.equippedTitleId)!.icon}
                      size={18}
                      color={palette.orange}
                    />
                  </View>
                  <Text style={styles.todayInfoLabel} numberOfLines={1}>{getTitleDefinition(todayInfo.equippedTitleId)!.label}</Text>
                </View>
              ) : null}
              {(todayInfo.xpBonusCharges ?? 0) > 0 ? (
                <View style={styles.todayInfoCard}>
                  <View style={styles.todayInfoIconWrap}>
                    <UiLucideIcon name="Zap" size={18} color={palette.green} />
                  </View>
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

          <Text style={styles.section}>{s.appearanceSection}</Text>
          <View style={{ gap: 8, marginBottom: 4 }}>
            <View style={[styles.levelCard, { padding: 14, gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.xpCaption, { color: palette.muted, fontSize: 12 }]}>{s.appearanceTheme}</Text>
                <Pressable
                  onPress={() => setAppearSelectKind('theme')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={s.themeCurrentA11y(s.themeLabel(activeThemeId))}
                  accessibilityHint={s.themeOpenHint}
                >
                  <Text style={{ fontSize: 14, color: palette.cyan, fontWeight: '600' }}>
                    {s.themeLabel(activeThemeId)}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12 }}>▼</Text>
                </Pressable>
              </View>
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colorWithAlpha(palette.muted, 0.25) }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.xpCaption, { color: palette.muted, fontSize: 12 }]}>{s.appearanceTitle}</Text>
                <Pressable
                  onPress={() => setAppearSelectKind('title')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={s.titleCurrentA11y(equippedTitleId ? (getTitleDefinition(equippedTitleId)?.label ?? equippedTitleId) : s.noTitle)}
                  accessibilityHint={s.titleOpenHint}
                  disabled={appearSaving}
                >
                  <Text style={{ fontSize: 14, color: palette.cyan, fontWeight: '600' }}>
                    {equippedTitleId ? (getTitleDefinition(equippedTitleId)?.label ?? equippedTitleId) : s.noTitle}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12 }}>▼</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.section}>{s.prefsSection}</Text>
          <Text style={styles.prefsSub}>{s.prefsCadenceTitle}</Text>
          <View style={styles.localeRow}>
            {(
              [
                { id: 'daily' as const, label: s.prefsCadenceDaily },
                { id: 'weekly' as const, label: s.prefsCadenceWeekly },
                { id: 'monthly' as const, label: s.prefsCadenceMonthly },
              ]
            ).map((row) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  hapticLight();
                  setPrefsCadence(row.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: prefsCadence === row.id }}
                style={({ pressed }) => [
                  styles.localeChip,
                  prefsCadence === row.id && styles.localeChipSelected,
                  pressed && styles.localeChipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.localeChipText,
                    prefsCadence === row.id && styles.localeChipTextSelected,
                  ]}
                  numberOfLines={2}
                >
                  {row.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.prefsSub, { marginTop: 14 }]}>{s.prefsHeavyTitle}</Text>
          <Text style={styles.hint}>{s.prefsHeavyHint}</Text>
          <View style={styles.localeRow}>
            {(
              [
                { id: 'low' as const, label: s.prefsHeavyLow },
                { id: 'balanced' as const, label: s.prefsHeavyBalanced },
                { id: 'high' as const, label: s.prefsHeavyHigh },
              ]
            ).map((row) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  hapticLight();
                  setPrefsHeavyQuest(row.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: prefsHeavyQuest === row.id }}
                style={({ pressed }) => [
                  styles.localeChip,
                  prefsHeavyQuest === row.id && styles.localeChipSelected,
                  pressed && styles.localeChipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.localeChipText,
                    prefsHeavyQuest === row.id && styles.localeChipTextSelected,
                  ]}
                  numberOfLines={2}
                >
                  {row.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.prefsSub}>{s.prefsDurationTitle}</Text>
          <Text style={styles.hint}>{s.prefsDurationHint}</Text>
          <Text style={styles.durLabel}>{s.prefsDurMin}</Text>
          <View style={styles.durWrap}>
            {minDurOptions.map((m) => (
              <Pressable
                key={`min-${m}`}
                onPress={() => {
                  hapticLight();
                  setPrefsDurMin(m);
                  if (m > prefsDurMax) setPrefsDurMax(m);
                }}
                style={({ pressed }) => [
                  styles.durChip,
                  prefsDurMin === m && styles.durChipSelected,
                  pressed && styles.localeChipPressed,
                ]}
              >
                <Text style={[styles.durChipText, prefsDurMin === m && styles.durChipTextSelected]}>{m}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.durLabel, { marginTop: 12 }]}>{s.prefsDurMax}</Text>
          <View style={styles.durWrap}>
            {maxDurOptions.map((m) => (
              <Pressable
                key={`max-${m}`}
                onPress={() => {
                  hapticLight();
                  setPrefsDurMax(m);
                  if (m < prefsDurMin) setPrefsDurMin(m);
                }}
                style={({ pressed }) => [
                  styles.durChip,
                  prefsDurMax === m && styles.durChipSelected,
                  pressed && styles.localeChipPressed,
                ]}
              >
                <Text style={[styles.durChipText, prefsDurMax === m && styles.durChipTextSelected]}>{m}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => {
              hapticLight();
              void savePrefs();
            }}
            disabled={prefsSaving}
            style={({ pressed }) => [
              styles.prefsSaveBtn,
              pressed && styles.prefsSaveBtnPressed,
              prefsSaving && { opacity: 0.65 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={s.prefsSave}
          >
            <Text style={styles.prefsSaveBtnText}>{prefsSaving ? s.prefsSaving : s.prefsSave}</Text>
          </Pressable>
          {prefsMsg ? (
            <Text
              style={[
                styles.prefsMsg,
                prefsMsg === s.prefsErr ? { color: '#f87171' } : { color: palette.green },
              ]}
            >
              {prefsMsg}
            </Text>
          ) : null}

          <Text style={styles.section}>{s.badgesTitle}</Text>
          <Text style={styles.hint}>{s.badgesHint}</Text>

          <View style={styles.badgeList}>
            {badgeCatalog.map((b) => (
              <View
                key={b.id}
                style={[styles.badgeCard, b.unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked]}
              >
                {/* Ligne icône + badge statut */}
                <View style={styles.badgeTopRow}>
                  <View style={[styles.badgeIconWrap, !b.unlocked && styles.badgeIconWrapMuted]}>
                    <UiLucideIcon name={b.placeholderIcon} size={22} color={palette.orange} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={[styles.badgeCat, b.unlocked ? styles.badgeCatUnlocked : styles.badgeCatLocked]}>
                        {badgeCat[b.category]}
                      </Text>
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
                </View>
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

      <AppearanceSelectSheet
        visible={appearSelectKind === 'theme'}
        title={s.selectThemeTitle}
        options={themeOptions}
        selectedValue={activeThemeId}
        onSelect={(v) => { void saveAppearance({ activeThemeId: v }); }}
        onClose={() => setAppearSelectKind(null)}
      />
      <AppearanceSelectSheet
        visible={appearSelectKind === 'title'}
        title={s.selectTitleTitle}
        options={titleOptions}
        selectedValue={equippedTitleId ?? TITLE_NONE}
        onSelect={(v) => { void saveAppearance({ equippedTitleId: v === TITLE_NONE ? null : v }); }}
        onClose={() => setAppearSelectKind(null)}
      />
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
    greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    greeting: { fontSize: 26, fontWeight: '900', color: C.text },
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
      height: '100%', borderRadius: 8, backgroundColor: '#134e4a',
      shadowColor: '#134e4a', shadowOpacity: 0.45, shadowRadius: 8,
    },

    miniStats: { flexDirection: 'row', gap: 10, marginBottom: 22 },
    mini: {
      flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14,
      alignItems: 'center', borderWidth: 1, borderColor: C.border,
    },
    miniPressed: { opacity: 0.88 },
    miniIconWrap: { marginBottom: 4, height: 22, alignItems: 'center', justifyContent: 'center' },
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
    todayInfoIconWrap: { marginBottom: 4, height: 22, alignItems: 'center', justifyContent: 'center' },
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
    prefsSub: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: C.muted,
      marginBottom: 8,
      marginTop: 4,
      textTransform: 'uppercase',
    },
    durLabel: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 8 },
    durWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
    durChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.card,
    },
    durChipSelected: {
      borderColor: C.accent,
      backgroundColor: colorWithAlpha(p.cyan, 0.12),
    },
    durChipText: { fontSize: 13, fontWeight: '800', color: C.muted },
    durChipTextSelected: { color: C.text },
    prefsSaveBtn: {
      marginTop: 14,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: C.accent,
    },
    prefsSaveBtnPressed: { opacity: 0.88 },
    prefsSaveBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
    prefsMsg: { marginTop: 10, fontSize: 13, fontWeight: '700' },

    badgeList: { gap: 10 },
    badgeCard: { borderRadius: 18, padding: 14 },
    badgeCardUnlocked: {
      backgroundColor: p.card,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.gold ?? p.orange, 0.6),
      shadowColor: p.orange,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: elev(3),
    },
    badgeCardLocked: {
      backgroundColor: p.surface,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colorWithAlpha(p.muted, 0.35),
      opacity: 0.72,
    },
    badgeTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
    badgeIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colorWithAlpha(p.orange, 0.12),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.orange, 0.22),
      flexShrink: 0,
    },
    badgeIconWrapMuted: { opacity: 0.4 },
    badgePillUnlocked: {
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 999, borderWidth: 1,
      borderColor: colorWithAlpha(p.green, 0.45),
      backgroundColor: colorWithAlpha(p.green, 0.15),
    },
    badgePillUnlockedText: { fontSize: 8, fontWeight: '900', color: p.green, letterSpacing: 0.6, textTransform: 'uppercase' },
    badgePillLocked: {
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 999, borderWidth: 1,
      borderColor: colorWithAlpha(p.muted, 0.3),
      backgroundColor: colorWithAlpha(p.muted, 0.08),
    },
    badgePillLockedText: { fontSize: 8, fontWeight: '900', color: p.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
    badgeCat: {
      fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase',
      paddingHorizontal: 7, paddingVertical: 2,
      borderRadius: 999, overflow: 'hidden',
    },
    badgeCatUnlocked: {
      color: p.orange,
      backgroundColor: colorWithAlpha(p.gold ?? p.orange, 0.14),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.gold ?? p.orange, 0.38),
    },
    badgeCatLocked: {
      color: C.muted,
      backgroundColor: colorWithAlpha(p.muted, 0.1),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.muted, 0.25),
    },
    badgeName: { fontSize: 14, fontWeight: '900', color: C.text, marginBottom: 3 },
    badgeNameMuted: { color: p.muted },
    badgeCrit: { fontSize: 11, color: C.muted, fontWeight: '500', marginBottom: 6, lineHeight: 16 },
    badgeCritLocked: { color: p.muted },
    badgeDate: { fontSize: 10, color: p.muted, fontWeight: '600' },
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
