import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';

import {
  getQuestPack,
  getQuestPackArc,
  type ArcStateView,
  type QuestPackArc,
  type QuestPackArcChapter,
  type QuestPackArcSlot,
} from '@questia/shared';
import {
  colorWithAlpha,
  homeScreenBackdropGradient,
  UiLucideIcon,
  type ThemePalette,
} from '@questia/ui';
import { useAppLocale } from '../../contexts/AppLocaleContext';
import { useAppTheme } from '../../contexts/AppThemeContext';
import { hapticLight, hapticSuccess } from '../../lib/haptics';
import { API_BASE_URL, apiFetch } from '../../lib/api';

type Locale = 'fr' | 'en';

interface FetchedArc {
  arc: QuestPackArc;
  state: ArcStateView;
}
interface CompletePayload extends FetchedArc {
  xpEarned: number;
  rewardJustClaimed: { titleId: string; coins: number } | null;
  coinBalance: number;
  totalXp: number;
}

function pickLocale<T extends { fr: string; en: string }>(loc: Locale, value: T): string {
  return loc === 'en' ? value.en : value.fr;
}

function parseParcoursFrom(raw: string | string[] | undefined): 'home' | 'shop' | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'home' || v === 'shop') return v;
  return null;
}

function parcoursBackAction(
  from: 'home' | 'shop' | null,
  loc: Locale,
): { label: string; path: '/home' | '/shop' } {
  if (from === 'home') {
    return { path: '/home', label: loc === 'en' ? 'Back home' : "Retour à l'accueil" };
  }
  if (from === 'shop') {
    return { path: '/shop', label: loc === 'en' ? 'Back to shop' : 'Retour boutique' };
  }
  return { path: '/home', label: loc === 'en' ? 'Back' : 'Retour' };
}

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  return `~${Math.round(min / 60)} h`;
}

export default function ParcoursScreen() {
  const router = useRouter();
  const { packId: rawPackId, from: rawFrom } = useLocalSearchParams<{
    packId: string | string[];
    from?: string | string[];
  }>();
  const packId = Array.isArray(rawPackId) ? rawPackId[0] : (rawPackId ?? '');
  const { locale: appLocale } = useAppLocale();
  const loc: Locale = appLocale === 'en' ? 'en' : 'fr';
  const fromSource = useMemo(() => parseParcoursFrom(rawFrom), [rawFrom]);
  const backNav = useMemo(() => parcoursBackAction(fromSource, loc), [fromSource, loc]);
  const { palette, themeId } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const backdropColors = useMemo(
    () => homeScreenBackdropGradient(themeId, palette),
    [themeId, palette],
  );
  const heroGradient = useMemo(
    () =>
      [colorWithAlpha(palette.gold, 0.16), palette.card, colorWithAlpha(palette.cyan, 0.11)] as [
        string,
        string,
        string,
      ],
    [palette],
  );
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const arcStatic = useMemo(() => getQuestPackArc(packId), [packId]);
  const packMeta = useMemo(() => getQuestPack(packId), [packId]);

  const [data, setData] = useState<FetchedArc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSlotKey, setOpenSlotKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recentReward, setRecentReward] = useState<{ titleId: string; coins: number } | null>(null);
  const [recentXp, setRecentXp] = useState<number>(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch(`${API_BASE_URL}/api/quest/pack/${packId}`, token);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? 'Erreur');
      }
      const j = (await res.json()) as FetchedArc;
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [packId]);

  useEffect(() => {
    if (!packId) return;
    if (!getQuestPackArc(packId) || !getQuestPack(packId)) return;
    void refresh();
  }, [packId, refresh]);

  const handleComplete = useCallback(
    async (slotKey: string) => {
      if (busy) return;
      setBusy(true);
      try {
        const token = await getTokenRef.current();
        const res = await apiFetch(`${API_BASE_URL}/api/quest/pack/${packId}`, token, {
          method: 'POST',
          body: JSON.stringify({ slotKey }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? 'Erreur');
        }
        const j = (await res.json()) as CompletePayload;
        setData({ arc: j.arc, state: j.state });
        setRecentXp(j.xpEarned);
        if (j.rewardJustClaimed) {
          setRecentReward(j.rewardJustClaimed);
          void hapticSuccess();
        } else if (j.xpEarned > 0) {
          void hapticLight();
        }
        setOpenSlotKey(null);
      } catch (e) {
        Alert.alert(loc === 'en' ? 'Error' : 'Erreur', e instanceof Error ? e.message : 'Erreur');
      } finally {
        setBusy(false);
      }
    },
    [busy, loc, packId],
  );

  const findSlot = useCallback(
    (slotKey: string): { chapter: QuestPackArcChapter; slot: QuestPackArcSlot } | null => {
      if (!data) return null;
      const [chId, slug] = slotKey.split('.');
      const chapter = data.arc.chapters.find((c) => c.id === chId);
      if (!chapter) return null;
      const slot = chapter.slots.find((s) => s.slug === slug);
      if (!slot) return null;
      return { chapter, slot };
    },
    [data],
  );

  const slotStatus = useCallback(
    (slotKey: string): 'completed' | 'available' | 'locked' => {
      if (!data) return 'locked';
      for (const c of data.state.chapters) {
        for (const s of c.slots) {
          if (s.key === slotKey) return s.status;
        }
      }
      return 'locked';
    },
    [data],
  );

  if (!arcStatic || !packMeta) {
    return (
      <View style={styles.rootFill}>
        <LinearGradient
          colors={backdropColors}
          locations={[0, 0.22, 0.48, 0.72, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeTransparent} edges={['top', 'left', 'right']}>
          <View style={styles.center}>
            <Text style={styles.errText}>{loc === 'en' ? 'Unknown pack.' : 'Pack inconnu.'}</Text>
            <Pressable style={styles.backBtn} onPress={() => router.push(backNav.path as never)}>
              <Text style={styles.backBtnText}>{backNav.label}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const completedCount = data?.state.completedCount ?? 0;
  const totalSlots = data?.state.totalSlots ?? arcStatic.chapters.reduce((a, c) => a + c.slots.length, 0);
  const pct = Math.round((completedCount / Math.max(1, totalSlots)) * 100);

  return (
    <View style={styles.rootFill}>
      <LinearGradient
        colors={backdropColors}
        locations={[0, 0.22, 0.48, 0.72, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeTransparent} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.backRow}
          onPress={() => router.push(backNav.path as never)}
          hitSlop={8}
        >
          <UiLucideIcon name="ChevronLeft" size={16} color={palette.linkOnBg} />
          <Text style={styles.backText}>{backNav.label}</Text>
        </Pressable>

        {/**
         * Android : ne pas combiner elevation + overflow:hidden + LinearGradient sur le même nœud
         * (bandes / fond carré). Enveloppe externe = ombre / bordure ; interne = clip + dégradé.
         */}
        <View
          style={[
            styles.heroShellOuter,
            Platform.OS === 'android' && styles.heroShellOuterFlatChrome,
          ]}
        >
          <View style={styles.heroShellInner}>
            <LinearGradient
              colors={heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroRow}>
            <View style={styles.heroIconBubble}>
              <UiLucideIcon name={packMeta.icon} size={28} color={palette.cyan} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.heroEyebrow}>
                {loc === 'en' ? '10-quest journey' : 'Parcours de 10 quêtes'}
              </Text>
              <Text style={styles.heroTitle}>
                {loc === 'en' ? packMeta.labelEn : packMeta.label}
              </Text>
              <Text style={styles.heroTagline}>
                {loc === 'en' ? packMeta.taglineEn : packMeta.tagline}
              </Text>
            </View>
          </View>

          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {completedCount}/{totalSlots} {loc === 'en' ? 'completed' : 'complétées'}
            </Text>
            <Text style={styles.progressLabelStrong}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          </View>
        </View>

        {recentXp > 0 ? (
          <View style={styles.flashSuccess}>
            <Text style={styles.flashText}>
              +{recentXp} XP {loc === 'en' ? 'awarded' : 'crédités'}
            </Text>
          </View>
        ) : null}

        {recentReward ? (
          <View style={styles.rewardBanner}>
            <UiLucideIcon name="Trophy" size={28} color={palette.gold} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.rewardEyebrow}>
                {loc === 'en' ? 'Journey complete' : 'Parcours terminé'}
              </Text>
              <Text style={styles.rewardTitle}>
                {loc === 'en' ? 'Title unlocked + bonus QC' : 'Titre débloqué + bonus QC'}
              </Text>
              <Text style={styles.rewardSub}>
                {loc === 'en'
                  ? `Title "${recentReward.titleId}" added · +${recentReward.coins} QC`
                  : `Titre « ${recentReward.titleId} » ajouté · +${recentReward.coins} QC`}
              </Text>
            </View>
          </View>
        ) : null}

        {data?.state.rewardClaimed && !recentReward ? (
          <View style={styles.flashAmber}>
            <Text style={styles.flashText}>
              {loc === 'en' ? 'Journey already completed — well done!' : 'Parcours déjà bouclé — bravo !'}
            </Text>
          </View>
        ) : null}

        {data ? (
          <Text style={styles.pathLabel}>
            {loc === 'en' ? 'Your path' : 'Ton parcours'}
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.cyan} />
          </View>
        ) : null}

        {error ? (
          <View style={styles.flashError}>
            <Text style={styles.flashTextRed}>{error}</Text>
          </View>
        ) : null}

        {data
          ? data.state.chapters.map((c, i) => (
              <ChapterCard
                key={c.id}
                index={i}
                chapter={c}
                loc={loc}
                styles={styles}
                palette={palette}
                onOpenSlot={(slotKey) => setOpenSlotKey(slotKey)}
              />
            ))
          : null}

        {data ? (
          <View style={styles.rewardCard}>
            <View style={styles.rewardCardHeader}>
              <UiLucideIcon name="Trophy" size={16} color={palette.gold} />
              <Text style={styles.rewardCardEyebrow}>
                {loc === 'en' ? 'Final reward' : 'Récompense finale'}
              </Text>
            </View>
            <Text style={styles.rewardCardBody}>
              {loc === 'en'
                ? `Title "${data.arc.rewardTitleId}" + ${data.arc.rewardCoins} Quest Coins`
                : `Titre « ${data.arc.rewardTitleId} » + ${data.arc.rewardCoins} Quest Coins`}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={!!openSlotKey}
        animationType="slide"
        transparent
        onRequestClose={() => setOpenSlotKey(null)}
      >
        {openSlotKey
          ? (() => {
              const found = findSlot(openSlotKey);
              if (!found) return null;
              const status = slotStatus(openSlotKey);
              return (
                <SlotDetailSheet
                  loc={loc}
                  styles={styles}
                  palette={palette}
                  themeId={themeId}
                  chapter={found.chapter}
                  slot={found.slot}
                  status={status}
                  busy={busy}
                  onClose={() => {
                    setOpenSlotKey(null);
                    setRecentXp(0);
                  }}
                  onComplete={() => void handleComplete(openSlotKey)}
                />
              );
            })()
          : null}
      </Modal>
    </SafeAreaView>
    </View>
  );
}

function ChapterCard({
  index,
  chapter,
  loc,
  styles,
  palette,
  onOpenSlot,
}: {
  index: number;
  chapter: ArcStateView['chapters'][number];
  loc: Locale;
  styles: ReturnType<typeof createStyles>;
  palette: ThemePalette;
  onOpenSlot: (slotKey: string) => void;
}) {
  const badge =
    chapter.status === 'completed'
      ? { label: loc === 'en' ? 'Done' : 'Terminé', color: palette.green, bg: colorWithAlpha(palette.green, 0.14), icon: 'CheckCircle2' as const }
      : chapter.status === 'in_progress'
        ? { label: loc === 'en' ? 'In progress' : 'En cours', color: palette.text, bg: colorWithAlpha(palette.gold, 0.2), icon: 'PlayCircle' as const }
        : { label: loc === 'en' ? 'Locked' : 'Verrouillé', color: palette.muted, bg: colorWithAlpha(palette.text, 0.06), icon: 'Lock' as const };
  return (
    <View
      style={[
        styles.chapterCard,
        chapter.status === 'locked' && styles.chapterCardLocked,
      ]}
    >
      <View style={styles.chapterHeader}>
        <View style={styles.chapterStepWrap}>
          <View style={styles.chapterStepCircle}>
            <Text style={styles.chapterStepNum}>{index + 1}</Text>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.chapterEyebrow}>
            {loc === 'en' ? `Chapter ${index + 1}` : `Chapitre ${index + 1}`}
          </Text>
          <Text style={styles.chapterTitle}>{pickLocale(loc, chapter.title)}</Text>
          <Text style={styles.chapterDesc}>{pickLocale(loc, chapter.description)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: colorWithAlpha(palette.text, 0.08) }]}>
          <UiLucideIcon name={badge.icon} size={11} color={badge.color} />
          <Text style={[styles.statusBadgeText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {chapter.slots.map((s) => (
        <Pressable
          key={s.key}
          disabled={s.status === 'locked'}
          onPress={() => onOpenSlot(s.key)}
          style={[
            styles.slotRow,
            s.status === 'completed' && styles.slotRowDone,
            s.status === 'locked' && styles.slotRowLocked,
            s.status === 'available' && styles.slotRowActive,
          ]}
        >
          <View
            style={[
              styles.slotIconBubble,
              s.status === 'completed' && [styles.slotIconBubbleDone, { borderColor: colorWithAlpha(palette.green, 0.45) }],
              s.status === 'locked' && styles.slotIconBubbleLocked,
            ]}
          >
            <UiLucideIcon
              name={s.status === 'completed' ? 'Check' : s.status === 'locked' ? 'Lock' : s.icon}
              size={14}
              color={
                s.status === 'completed'
                  ? palette.green
                  : s.status === 'locked'
                    ? palette.muted
                    : palette.cyan
              }
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                styles.slotTitle,
                s.status === 'completed' && styles.slotTitleDone,
                s.status === 'locked' && styles.slotTitleLocked,
              ]}
            >
              {pickLocale(loc, s.title)}
            </Text>
            <Text style={styles.slotMeta}>
              {durationLabel(s.durationMinutes)} · +{s.xp} XP
            </Text>
          </View>
          {s.status === 'available' ? (
            <UiLucideIcon name="ChevronRight" size={16} color={palette.linkOnBg} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

function SlotDetailSheet({
  loc,
  styles,
  palette,
  themeId,
  chapter,
  slot,
  status,
  busy,
  onClose,
  onComplete,
}: {
  loc: Locale;
  styles: ReturnType<typeof createStyles>;
  palette: ThemePalette;
  themeId: string;
  chapter: QuestPackArcChapter;
  slot: QuestPackArcSlot;
  status: 'completed' | 'available' | 'locked';
  busy: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const safety = slot.safetyNote ? pickLocale(loc, slot.safetyNote) : null;
  const accentColors = useMemo(
    () =>
      themeId === 'midnight'
        ? ([colorWithAlpha(palette.cyan, 0.9), colorWithAlpha(palette.gold, 0.85), colorWithAlpha(palette.orange, 0.9)] as const)
        : ([palette.cyan, palette.gold, palette.orange] as const),
    [palette, themeId],
  );
  return (
    <View style={styles.sheetBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheetCard}>
        <LinearGradient
          colors={accentColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.sheetAccentBar}
        />
        <View style={styles.sheetHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <View style={styles.sheetIconBubble}>
              <UiLucideIcon name={slot.icon} size={22} color={palette.cyan} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.sheetEyebrow}>{pickLocale(loc, chapter.title)}</Text>
              <Text style={styles.sheetTitle}>{pickLocale(loc, slot.title)}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.sheetClose}>
            <UiLucideIcon name="X" size={18} color={palette.muted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Text style={styles.sheetMission}>{pickLocale(loc, slot.mission)}</Text>
          <View style={styles.hookBox}>
            <Text style={styles.hookText}>« {pickLocale(loc, slot.hook)} »</Text>
          </View>
          <View style={styles.metaRow}>
            <UiLucideIcon name="Clock" size={11} color={palette.muted} />
            <Text style={styles.metaText}>{durationLabel(slot.durationMinutes)}</Text>
            <Text style={styles.metaSep}>·</Text>
            <Text style={styles.metaText}>+{slot.xp} XP</Text>
          </View>
          {safety ? (
            <View style={styles.safetyBox}>
              <UiLucideIcon name="ShieldAlert" size={12} color={palette.gold} />
              <Text style={styles.safetyText}>{safety}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.sheetFooter}>
          <Pressable onPress={onClose} style={styles.laterBtn}>
            <Text style={styles.laterBtnText}>
              {loc === 'en' ? 'Later' : 'Plus tard'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onComplete}
            disabled={busy || status !== 'available'}
            style={[
              styles.doneBtn,
              { backgroundColor: palette.green, borderColor: colorWithAlpha(palette.green, 0.5) },
              (busy || status !== 'available') && styles.doneBtnDisabled,
            ]}
          >
            <UiLucideIcon name="Check" size={14} color="#FFFFFF" />
            <Text style={styles.doneBtnText}>
              {status === 'completed'
                ? loc === 'en'
                  ? 'Already done'
                  : 'Déjà fait'
                : busy
                  ? '…'
                  : loc === 'en'
                    ? "I've done it"
                    : "C'est fait"}
            </Text>
            <Text style={styles.doneBtnXp}>+{slot.xp} XP</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(p: ThemePalette) {
  return StyleSheet.create({
    rootFill: { flex: 1, backgroundColor: p.bg },
    safe: { flex: 1, backgroundColor: p.bg },
    safeTransparent: { flex: 1, backgroundColor: 'transparent' },
    scrollContent: { padding: 16, paddingBottom: 48 },
    center: { padding: 32, alignItems: 'center', justifyContent: 'center' },

    backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
    backText: { color: p.linkOnBg, fontWeight: '800', fontSize: 13 },
    backBtn: { marginTop: 16, backgroundColor: p.orange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    backBtnText: { color: '#FFFFFF', fontWeight: '900' },

    pathLabel: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: p.subtle,
      marginBottom: 8,
      marginTop: 4,
    },

    heroShellOuter: {
      borderRadius: 26,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.orange, 0.38),
      backgroundColor: p.card,
      shadowColor: p.orange,
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    heroShellOuterFlatChrome: {
      elevation: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    heroShellInner: {
      position: 'relative',
      borderRadius: 24,
      overflow: 'hidden',
      padding: 18,
    },
    heroRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    heroIconBubble: {
      height: 54,
      width: 54,
      borderRadius: 16,
      backgroundColor: p.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colorWithAlpha(p.orange, 0.28),
    },
    heroEyebrow: { color: p.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    heroTitle: { color: p.text, fontSize: 24, fontWeight: '900', marginTop: 2, letterSpacing: -0.3 },
    heroTagline: { color: p.muted, fontSize: 13, marginTop: 6, lineHeight: 19, fontWeight: '600' },
    progressHeader: { marginTop: 18, flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { color: p.muted, fontWeight: '800', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
    progressLabelStrong: { color: p.text, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
    progressTrack: {
      marginTop: 8,
      height: 8,
      borderRadius: 8,
      backgroundColor: p.trackMuted,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 8, backgroundColor: p.green },

    flashSuccess: {
      backgroundColor: colorWithAlpha(p.green, 0.12),
      borderColor: colorWithAlpha(p.green, 0.35),
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
    },
    flashAmber: {
      backgroundColor: colorWithAlpha(p.gold, 0.16),
      borderColor: colorWithAlpha(p.gold, 0.4),
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
    },
    flashError: { backgroundColor: 'rgba(254, 226, 226, 0.9)', borderColor: 'rgba(252, 165, 165, 0.6)', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
    flashText: { fontWeight: '800', color: p.green, fontSize: 13 },
    flashTextRed: { fontWeight: '800', color: '#b91c1c', fontSize: 13 },
    errText: { color: p.text, fontWeight: '800', textAlign: 'center' },

    rewardBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderColor: colorWithAlpha(p.gold, 0.55),
      borderWidth: 2,
      borderRadius: 22,
      padding: 16,
      marginBottom: 12,
      backgroundColor: p.cardCream,
    },
    rewardEyebrow: { color: p.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    rewardTitle: { color: p.text, fontSize: 19, fontWeight: '900', marginTop: 2 },
    rewardSub: { color: p.muted, fontWeight: '700', fontSize: 12, marginTop: 4, lineHeight: 16 },

    chapterCard: {
      backgroundColor: p.card,
      borderRadius: 22,
      padding: 14,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.cyan, 0.35),
    },
    chapterCardLocked: { opacity: 0.72 },
    chapterHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
    chapterStepWrap: { marginRight: 2 },
    chapterStepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.cyan, 0.4),
      backgroundColor: p.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chapterStepNum: { fontSize: 14, fontWeight: '900', color: p.text },
    chapterEyebrow: { color: p.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    chapterTitle: { color: p.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
    chapterDesc: { color: p.muted, fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 16 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
    statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },

    slotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 11,
      borderRadius: 14,
      marginTop: 6,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.cardCream,
    },
    slotRowActive: {
      borderColor: colorWithAlpha(p.orange, 0.22),
    },
    slotRowDone: { backgroundColor: colorWithAlpha(p.green, 0.1), borderColor: colorWithAlpha(p.green, 0.32) },
    slotRowLocked: { opacity: 0.55, backgroundColor: p.surface },
    slotIconBubble: {
      height: 32,
      width: 32,
      borderRadius: 10,
      backgroundColor: colorWithAlpha(p.cyan, 0.1),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.cyan, 0.22),
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotIconBubbleDone: { backgroundColor: colorWithAlpha(p.green, 0.14) },
    slotIconBubbleLocked: { backgroundColor: p.surface, borderColor: p.border },
    slotTitle: { color: p.text, fontWeight: '800', fontSize: 13 },
    slotTitleDone: { color: p.green, textDecorationLine: 'line-through' },
    slotTitleLocked: { color: p.muted },
    slotMeta: { color: p.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },

    rewardCard: {
      borderColor: colorWithAlpha(p.gold, 0.5),
      borderWidth: 2,
      borderStyle: 'dashed',
      borderRadius: 18,
      backgroundColor: p.cardCream,
      padding: 16,
      marginTop: 4,
    },
    rewardCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    rewardCardEyebrow: { color: p.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    rewardCardBody: { color: p.text, fontWeight: '800', fontSize: 13, lineHeight: 18 },

    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: p.overlay },
    sheetAccentBar: { height: 4, width: '100%' },
    sheetCard: {
      backgroundColor: p.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: '90%',
      paddingBottom: 12,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.cyan, 0.28),
      borderBottomWidth: 0,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    sheetIconBubble: {
      height: 44,
      width: 44,
      borderRadius: 14,
      backgroundColor: colorWithAlpha(p.cyan, 0.1),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.orange, 0.25),
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetEyebrow: { color: p.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    sheetTitle: { color: p.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
    sheetClose: { padding: 6, borderRadius: 999, backgroundColor: p.surface },

    sheetBody: { paddingHorizontal: 18, paddingVertical: 14, gap: 12 },
    sheetMission: { color: p.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
    hookBox: {
      backgroundColor: colorWithAlpha(p.cyan, 0.08),
      borderRadius: 12,
      padding: 12,
      borderLeftWidth: 4,
      borderLeftColor: colorWithAlpha(p.orange, 0.45),
    },
    hookText: { color: p.linkOnBg, fontStyle: 'italic', fontSize: 13, lineHeight: 19, fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { color: p.muted, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
    metaSep: { color: p.muted, fontSize: 11 },
    safetyBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colorWithAlpha(p.gold, 0.12),
      borderColor: colorWithAlpha(p.gold, 0.4),
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 10,
    },
    safetyText: { color: p.text, fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 },

    sheetFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 10, borderTopWidth: 1, borderTopColor: p.border },
    laterBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    laterBtnText: { color: p.muted, fontWeight: '800', fontSize: 13 },
    doneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 14,
      borderWidth: 2,
    },
    doneBtnDisabled: { opacity: 0.4 },
    doneBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
    doneBtnXp: { color: '#FFFFFF', opacity: 0.9, fontWeight: '800', fontSize: 11 },
  });
}
