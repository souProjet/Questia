import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { UiLucideIcon, type ThemePalette } from '@questia/ui';
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

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  return `~${Math.round(min / 60)} h`;
}

export default function ParcoursScreen() {
  const router = useRouter();
  const { packId: rawPackId } = useLocalSearchParams<{ packId: string | string[] }>();
  const packId = Array.isArray(rawPackId) ? rawPackId[0] : (rawPackId ?? '');
  const { locale: appLocale } = useAppLocale();
  const loc: Locale = appLocale === 'en' ? 'en' : 'fr';
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { getToken } = useAuth();

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
      const token = await getToken();
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
  }, [getToken, packId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleComplete = useCallback(
    async (slotKey: string) => {
      if (busy) return;
      setBusy(true);
      try {
        const token = await getToken();
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
    [busy, getToken, loc, packId],
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
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Text style={styles.errText}>{loc === 'en' ? 'Unknown pack.' : 'Pack inconnu.'}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>
              {loc === 'en' ? 'Back' : 'Retour'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const completedCount = data?.state.completedCount ?? 0;
  const totalSlots = data?.state.totalSlots ?? arcStatic.chapters.reduce((a, c) => a + c.slots.length, 0);
  const pct = Math.round((completedCount / Math.max(1, totalSlots)) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.backRow}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <UiLucideIcon name="ChevronLeft" size={16} color={palette.muted} />
          <Text style={styles.backText}>
            {loc === 'en' ? 'Back to shop' : 'Retour boutique'}
          </Text>
        </Pressable>

        <LinearGradient
          colors={['#7C3AED', '#C026D3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroIconBubble}>
              <UiLucideIcon name={packMeta.icon} size={28} color="#FFFFFF" />
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
            <Text style={styles.progressLabel}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </LinearGradient>

        {recentXp > 0 ? (
          <View style={styles.flashSuccess}>
            <Text style={styles.flashText}>
              +{recentXp} XP {loc === 'en' ? 'awarded' : 'crédités'}
            </Text>
          </View>
        ) : null}

        {recentReward ? (
          <View style={styles.rewardBanner}>
            <UiLucideIcon name="Trophy" size={28} color="#B45309" />
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

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.orange} />
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
                onOpenSlot={(slotKey) => setOpenSlotKey(slotKey)}
              />
            ))
          : null}

        {data ? (
          <View style={styles.rewardCard}>
            <View style={styles.rewardCardHeader}>
              <UiLucideIcon name="Trophy" size={16} color="#B45309" />
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
  );
}

function ChapterCard({
  index,
  chapter,
  loc,
  styles,
  onOpenSlot,
}: {
  index: number;
  chapter: ArcStateView['chapters'][number];
  loc: Locale;
  styles: ReturnType<typeof createStyles>;
  onOpenSlot: (slotKey: string) => void;
}) {
  const badge =
    chapter.status === 'completed'
      ? { label: loc === 'en' ? 'Done' : 'Terminé', color: '#047857', bg: '#D1FAE5', icon: 'CheckCircle2' as const }
      : chapter.status === 'in_progress'
        ? { label: loc === 'en' ? 'In progress' : 'En cours', color: '#6D28D9', bg: '#EDE9FE', icon: 'PlayCircle' as const }
        : { label: loc === 'en' ? 'Locked' : 'Verrouillé', color: '#64748B', bg: '#F1F5F9', icon: 'Lock' as const };
  return (
    <View
      style={[
        styles.chapterCard,
        chapter.status === 'locked' && styles.chapterCardLocked,
      ]}
    >
      <View style={styles.chapterHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.chapterEyebrow}>
            {loc === 'en' ? `Chapter ${index + 1}` : `Chapitre ${index + 1}`}
          </Text>
          <Text style={styles.chapterTitle}>{pickLocale(loc, chapter.title)}</Text>
          <Text style={styles.chapterDesc}>{pickLocale(loc, chapter.description)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
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
          ]}
        >
          <View
            style={[
              styles.slotIconBubble,
              s.status === 'completed' && styles.slotIconBubbleDone,
              s.status === 'locked' && styles.slotIconBubbleLocked,
            ]}
          >
            <UiLucideIcon
              name={s.status === 'completed' ? 'Check' : s.status === 'locked' ? 'Lock' : s.icon}
              size={14}
              color={
                s.status === 'completed'
                  ? '#047857'
                  : s.status === 'locked'
                    ? '#94A3B8'
                    : '#6D28D9'
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
            <UiLucideIcon name="ChevronRight" size={16} color="#7C3AED" />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

function SlotDetailSheet({
  loc,
  styles,
  chapter,
  slot,
  status,
  busy,
  onClose,
  onComplete,
}: {
  loc: Locale;
  styles: ReturnType<typeof createStyles>;
  chapter: QuestPackArcChapter;
  slot: QuestPackArcSlot;
  status: 'completed' | 'available' | 'locked';
  busy: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const safety = slot.safetyNote ? pickLocale(loc, slot.safetyNote) : null;
  return (
    <View style={styles.sheetBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheetCard}>
        <View style={styles.sheetHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <View style={styles.sheetIconBubble}>
              <UiLucideIcon name={slot.icon} size={22} color="#6D28D9" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.sheetEyebrow}>{pickLocale(loc, chapter.title)}</Text>
              <Text style={styles.sheetTitle}>{pickLocale(loc, slot.title)}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.sheetClose}>
            <UiLucideIcon name="X" size={18} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Text style={styles.sheetMission}>{pickLocale(loc, slot.mission)}</Text>
          <View style={styles.hookBox}>
            <Text style={styles.hookText}>« {pickLocale(loc, slot.hook)} »</Text>
          </View>
          <View style={styles.metaRow}>
            <UiLucideIcon name="Clock" size={11} color="#64748B" />
            <Text style={styles.metaText}>{durationLabel(slot.durationMinutes)}</Text>
            <Text style={styles.metaSep}>·</Text>
            <Text style={styles.metaText}>+{slot.xp} XP</Text>
          </View>
          {safety ? (
            <View style={styles.safetyBox}>
              <UiLucideIcon name="ShieldAlert" size={12} color="#92400E" />
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
    safe: { flex: 1, backgroundColor: p.bg },
    scrollContent: { padding: 16, paddingBottom: 48 },
    center: { padding: 32, alignItems: 'center', justifyContent: 'center' },

    backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    backText: { color: p.muted, fontWeight: '700', fontSize: 13 },
    backBtn: { marginTop: 16, backgroundColor: p.orange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    backBtnText: { color: '#FFFFFF', fontWeight: '900' },

    heroCard: {
      borderRadius: 24,
      padding: 18,
      marginBottom: 16,
    },
    heroRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    heroIconBubble: {
      height: 52,
      width: 52,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroEyebrow: { color: '#FFFFFF', opacity: 0.85, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 2 },
    heroTagline: { color: '#FFFFFF', opacity: 0.92, fontSize: 13, marginTop: 4, lineHeight: 18 },
    progressHeader: { marginTop: 18, flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { color: '#FFFFFF', opacity: 0.9, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },
    progressTrack: {
      marginTop: 8,
      height: 9,
      borderRadius: 6,
      backgroundColor: 'rgba(255,255,255,0.2)',
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#FFFFFF' },

    flashSuccess: { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
    flashAmber: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
    flashError: { backgroundColor: '#FEE2E2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
    flashText: { fontWeight: '800', color: '#065F46', fontSize: 13 },
    flashTextRed: { fontWeight: '800', color: '#991B1B', fontSize: 13 },
    errText: { color: p.text, fontWeight: '800', textAlign: 'center' },

    rewardBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEF3C7',
      borderColor: '#FCD34D',
      borderWidth: 2,
      borderRadius: 18,
      padding: 14,
      marginBottom: 12,
    },
    rewardEyebrow: { color: '#B45309', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    rewardTitle: { color: '#78350F', fontSize: 18, fontWeight: '900', marginTop: 2 },
    rewardSub: { color: '#78350F', fontWeight: '700', fontSize: 12, marginTop: 4, lineHeight: 16 },

    chapterCard: {
      backgroundColor: p.card,
      borderRadius: 20,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: p.border,
    },
    chapterCardLocked: { opacity: 0.7 },
    chapterHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
    chapterEyebrow: { color: p.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    chapterTitle: { color: p.text, fontSize: 17, fontWeight: '900', marginTop: 2 },
    chapterDesc: { color: p.muted, fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 16 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
    statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    slotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: 12,
      marginTop: 6,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
    },
    slotRowDone: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
    slotRowLocked: { opacity: 0.55, backgroundColor: p.surface },
    slotIconBubble: { height: 32, width: 32, borderRadius: 10, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
    slotIconBubbleDone: { backgroundColor: '#A7F3D0' },
    slotIconBubbleLocked: { backgroundColor: '#E2E8F0' },
    slotTitle: { color: p.text, fontWeight: '800', fontSize: 13 },
    slotTitleDone: { color: '#065F46', textDecorationLine: 'line-through' },
    slotTitleLocked: { color: '#94A3B8' },
    slotMeta: { color: p.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },

    rewardCard: {
      borderColor: '#FCD34D',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: 16,
      backgroundColor: '#FFFBEB',
      padding: 14,
      marginTop: 4,
    },
    rewardCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    rewardCardEyebrow: { color: '#B45309', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    rewardCardBody: { color: '#78350F', fontWeight: '800', fontSize: 13, lineHeight: 18 },

    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
    sheetCard: {
      backgroundColor: p.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: '90%',
      paddingBottom: 12,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    sheetIconBubble: { height: 44, width: 44, borderRadius: 14, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
    sheetEyebrow: { color: p.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    sheetTitle: { color: p.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
    sheetClose: { padding: 6, borderRadius: 999, backgroundColor: p.surface },

    sheetBody: { paddingHorizontal: 18, paddingVertical: 14, gap: 12 },
    sheetMission: { color: p.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
    hookBox: { backgroundColor: '#EDE9FE', borderRadius: 12, padding: 12 },
    hookText: { color: '#5B21B6', fontStyle: 'italic', fontSize: 13, lineHeight: 18 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { color: p.muted, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
    metaSep: { color: p.muted, fontSize: 11 },
    safetyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1, borderRadius: 12, padding: 10 },
    safetyText: { color: '#78350F', fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 },

    sheetFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 10, borderTopWidth: 1, borderTopColor: p.border },
    laterBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    laterBtnText: { color: p.muted, fontWeight: '800', fontSize: 13 },
    doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14 },
    doneBtnDisabled: { opacity: 0.4 },
    doneBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
    doneBtnXp: { color: '#FFFFFF', opacity: 0.8, fontWeight: '800', fontSize: 11 },
  });
}
