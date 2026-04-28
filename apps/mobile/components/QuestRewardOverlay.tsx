import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
  AccessibilityInfo,
  ScrollView,
} from 'react-native';
import { elevationAndroidSafe } from '../lib/elevationAndroid';
import { GlassScrim } from './GlassScrim';
import { LinearGradient } from 'expo-linear-gradient';
import type { DisplayBadge, XpBreakdown } from '@questia/shared';
import {
  levelFromTotalXp,
  XP_PER_LEVEL,
  xpBarSegmentsFromTotals,
  xpBreakdownRowsFr,
} from '@questia/shared';
import {
  colorWithAlpha,
  questSliderEmbeddedGradient,
  themePanelMuted,
  themePanelText,
  type ThemePalette,
  UiLucideIcon,
} from '@questia/ui';
import { useAppTheme } from '../contexts/AppThemeContext';
import { getScrimGlass } from '../lib/themeModalChrome';
import { useAppLocale } from '../contexts/AppLocaleContext';
import { getHomeDashboardStrings } from '../lib/homeDashboardStrings';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Carte centrée : hauteur max pour laisser voir confetti / halo autour. */
const CARD_MAX_H = Math.min(SCREEN_H * 0.88, 620);
/** Zone scrollable uniquement pour détail + badges (héros XP / jauge reste fixe au-dessus). */
const SCROLL_MAX_H = Math.max(180, Math.min(SCREEN_H * 0.38, 340));

export interface QuestRewardPayload {
  xpGain: {
    gained: number;
    breakdown: XpBreakdown;
    newTotal: number;
    previousTotal: number;
  };
  badgesUnlocked: DisplayBadge[];
}

type Props = {
  visible: boolean;
  payload: QuestRewardPayload | null;
  onContinue: () => void;
};

const CONFETTI_N = 26;

function rnd(i: number, salt: number) {
  const x = Math.sin(i * 91.7 + salt * 13.2) * 43758.5453;
  return x - Math.floor(x);
}

export function QuestRewardOverlay({ visible, payload, onContinue }: Props) {
  const { palette, themeId } = useAppTheme();
  const { locale } = useAppLocale();
  const rewardUi = useMemo(() => getHomeDashboardStrings(locale), [locale]);
  const rewardCardGrad = useMemo(
    () => questSliderEmbeddedGradient(themeId, palette),
    [themeId, palette],
  );
  const styles = useMemo(() => buildRewardStyles(palette, themeId), [palette, themeId]);
  const scrimGlass = useMemo(() => getScrimGlass(themeId), [themeId]);

  const scale = useRef(new Animated.Value(0.82)).current;
  const xpPop = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  const particleAnims = useRef(
    Array.from({ length: CONFETTI_N }, () => new Animated.Value(0)),
  ).current;

  const meta = useMemo(
    () =>
      Array.from({ length: CONFETTI_N }, (_, i) => ({
        id: i,
        x: (rnd(i, 1) - 0.5) * Math.min(SCREEN_W * 0.72, 280),
        y: 160 + rnd(i, 2) * 220,
        spin: rnd(i, 3) * 720,
        hue: Math.floor(rnd(i, 4) * 360),
        w: 5 + (i % 4),
        h: 7 + (i % 3),
      })),
    [],
  );

  const runEntrance = useCallback(() => {
    scale.setValue(0.82);
    xpPop.setValue(0);
    flash.setValue(0);
    ring.setValue(0);
    shakeX.setValue(0);
    particleAnims.forEach((a) => a.setValue(0));

    const shakeSeq = Animated.sequence([
      Animated.timing(shakeX, { toValue: -9, duration: 44, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 44, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -4, duration: 36, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 36, useNativeDriver: true }),
    ]);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 520, useNativeDriver: true }),
      ]),
      Animated.timing(ring, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5.5, tension: 100, useNativeDriver: true }),
      Animated.timing(xpPop, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.back(1.35)),
        useNativeDriver: true,
      }),
      shakeSeq,
      Animated.stagger(
        32,
        particleAnims.map((a) =>
          Animated.timing(a, {
            toValue: 1,
            duration: 1480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();
  }, [flash, particleAnims, ring, scale, shakeX, xpPop]);

  useEffect(() => {
    if (!visible || !payload) return;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        scale.setValue(1);
        xpPop.setValue(1);
        return;
      }
      runEntrance();
    });
    return () => {
      cancelled = true;
    };
  }, [visible, payload, runEntrance, scale, xpPop]);

  const levelInfo = useMemo(() => {
    if (!payload) return null;
    const before = levelFromTotalXp(payload.xpGain.previousTotal);
    const after = levelFromTotalXp(payload.xpGain.newTotal);
    return {
      afterLevel: after.level,
      leveledUp: after.level > before.level,
      levelsGained: Math.max(0, after.level - before.level),
    };
  }, [payload]);

  const breakdownRows = useMemo(
    () => (payload ? xpBreakdownRowsFr(payload.xpGain.breakdown) : []),
    [payload],
  );

  const barAnim = useRef(new Animated.Value(0)).current;
  const [barLevel, setBarLevel] = useState(1);
  const [barXpIntoLabel, setBarXpIntoLabel] = useState(0);

  useEffect(() => {
    const id = barAnim.addListener(({ value }) => {
      setBarXpIntoLabel(Math.round(value * XP_PER_LEVEL));
    });
    return () => barAnim.removeListener(id);
  }, [barAnim]);

  useEffect(() => {
    if (!visible || !payload) return;
    let cancelled = false;

    const segments = xpBarSegmentsFromTotals(payload.xpGain.previousTotal, payload.xpGain.newTotal);
    const start = levelFromTotalXp(payload.xpGain.previousTotal);

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        const end = levelFromTotalXp(payload.xpGain.newTotal);
        setBarLevel(end.level);
        barAnim.setValue(end.xpIntoLevel / XP_PER_LEVEL);
        return;
      }

      setBarLevel(start.level);
      barAnim.setValue(start.xpIntoLevel / XP_PER_LEVEL);

      const runSeg = (i: number) => {
        if (cancelled || i >= segments.length) return;
        const seg = segments[i]!;
        setBarLevel(seg.level);
        barAnim.setValue(seg.fromPct);
        Animated.timing(barAnim, {
          toValue: seg.toPct,
          duration: Math.abs(seg.toPct - seg.fromPct) < 1e-6 ? 0 : 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished && !cancelled) runSeg(i + 1);
        });
      };
      runSeg(0);
    });

    return () => {
      cancelled = true;
      barAnim.stopAnimation();
    };
  }, [visible, payload, barAnim]);

  if (!payload) return null;

  const { xpGain, badgesUnlocked } = payload;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <GlassScrim
          overlayColor={palette.overlay}
          intensity={scrimGlass.intensity}
          tint={scrimGlass.tint}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colorWithAlpha(palette.gold, 0.36),
              opacity: flash,
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringBurst,
            {
              opacity: ring.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.75, 0.45, 0] }),
              transform: [
                {
                  scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.1] }),
                },
              ],
            },
          ]}
        />

        {meta.map((m, i) => {
          const a = particleAnims[i]!;
          const t = a.interpolate({ inputRange: [0, 1], outputRange: [0, m.y] });
          const x = a.interpolate({
            inputRange: [0, 0.45, 1],
            outputRange: [0, m.x * 0.55, m.x],
          });
          const rot = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${m.spin}deg`] });
          const op = a.interpolate({ inputRange: [0, 0.12, 0.92, 1], outputRange: [0, 1, 1, 0] });
          const left = SCREEN_W / 2 - m.w / 2;
          return (
            <Animated.View
              key={m.id}
              pointerEvents="none"
              style={[
                styles.confetti,
                {
                  left,
                  width: m.w,
                  height: m.h,
                  backgroundColor: `hsl(${m.hue} 82% 52%)`,
                  opacity: op,
                  transform: [{ translateX: x }, { translateY: t }, { rotate: rot }],
                },
              ]}
            />
          );
        })}

        <Animated.View
          style={[styles.cardWrap, { maxHeight: CARD_MAX_H, transform: [{ scale }, { translateX: shakeX }] }]}
        >
          {/**
           * Coque sans dégradé : porte l'ombre / l'élévation. Le `LinearGradient` reste à l'intérieur
           * avec `overflow: hidden` uniquement — évite les artefacts Android (dégradé + elevation).
           */}
          <View style={styles.cardShadowShell}>
            <LinearGradient
              colors={rewardCardGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradientRoot}
            >
            <View style={styles.cardHero}>
              <Text style={styles.kicker}>{rewardUi.completedTitle}</Text>

              {levelInfo?.leveledUp ? (
                <View style={styles.levelBanner}>
                  <Text style={styles.levelKicker}>Niveau atteint</Text>
                  <Text style={styles.levelNum}>{levelInfo.afterLevel}</Text>
                  {levelInfo.levelsGained > 1 ? (
                    <Text style={styles.levelSub}>+{levelInfo.levelsGained} niveaux d'un coup !</Text>
                  ) : (
                    <Text style={styles.levelSubMuted}>Palier de progression débloqué</Text>
                  )}
                </View>
              ) : null}

              <Animated.Text
                style={[
                  styles.xpBig,
                  {
                    transform: [
                      {
                        scale: xpPop.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                +{xpGain.gained} XP
              </Animated.Text>
              <Text style={styles.totalLine}>
                Total {xpGain.previousTotal} → <Text style={styles.totalBold}>{xpGain.newTotal}</Text>
              </Text>

              <View style={styles.progressBox} accessibilityRole="summary">
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLevelLabel}>Niveau {barLevel}</Text>
                  <Text style={styles.progressMeta}>
                    {barXpIntoLabel}/{XP_PER_LEVEL} XP dans ce niveau
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: barAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <ScrollView
              style={{ maxHeight: SCROLL_MAX_H }}
              contentContainerStyle={styles.cardScrollContent}
              showsVerticalScrollIndicator
              bounces
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.rulesBox}>
                <Text style={styles.rulesTitle}>Détail XP</Text>
                {breakdownRows.map((row) => (
                  <View key={row.key} style={styles.ruleRowCompact}>
                    <Text style={styles.ruleCardLabel} numberOfLines={2}>
                      {row.label}
                    </Text>
                    <Text style={styles.ruleCardValue}>{row.value}</Text>
                  </View>
                ))}
              </View>

              {badgesUnlocked.length > 0 ? (
                <View style={styles.badgeBlock}>
                  <Text style={styles.badgeKicker}>Nouveaux badges</Text>
                  {badgesUnlocked.map((b) => (
                    <View key={b.id} style={styles.badgeRow}>
                      <View style={styles.badgeIconWrap}>
                        <UiLucideIcon name={b.placeholderIcon} size={24} color={palette.orange} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.badgeTitle} numberOfLines={2}>
                          {b.title}
                        </Text>
                        <Text style={styles.badgeCrit} numberOfLines={2}>
                          {b.criteria}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>

            <Pressable style={styles.cta} onPress={onContinue} accessibilityRole="button">
              <LinearGradient
                colors={[palette.orange, palette.gold]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.ctaGrad}
              >
                <Text style={styles.ctaText}>Continuer →</Text>
              </LinearGradient>
            </Pressable>
            </LinearGradient>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function buildRewardStyles(p: ThemePalette, themeId: string | null | undefined) {
  const panelText = themePanelText(themeId, p);
  const panelMuted = themePanelMuted(themeId, p);
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    ringBurst: {
      position: 'absolute',
      alignSelf: 'center',
      width: 200,
      height: 200,
      borderRadius: 200,
      borderWidth: 3,
      borderColor: colorWithAlpha(p.cyan, 0.55),
      top: '24%',
    },
    confetti: {
      position: 'absolute',
      top: '30%',
      borderRadius: 2,
      shadowColor: p.card,
      shadowOpacity: 0.45,
      shadowRadius: 1,
    },
    cardWrap: {
      position: 'relative',
      zIndex: 3,
      width: '100%',
      maxWidth: Math.min(SCREEN_W - 28, 400),
      alignSelf: 'center',
    },
    cardShadowShell: {
      borderRadius: 24,
      alignSelf: 'stretch',
      shadowColor: p.orange,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.4,
      shadowRadius: 28,
      elevation: elevationAndroidSafe(14),
    },
    cardGradientRoot: {
      borderRadius: 24,
      padding: 0,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.orange, 0.42),
      overflow: 'hidden',
    },
    cardHero: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 4,
    },
    cardScrollContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 10,
    },
    levelBanner: {
      marginBottom: 8,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.gold, 0.55),
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor:
        themeId && themeId !== 'default'
          ? colorWithAlpha(p.surface, 0.96)
          : colorWithAlpha(p.cardCream, 0.95),
      alignItems: 'center',
    },
    levelKicker: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
      color: p.gold,
    },
    levelNum: {
      marginTop: 2,
      fontSize: 32,
      fontWeight: '900',
      color: p.linkOnBg,
    },
    levelSub: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '800',
      color: panelText,
    },
    levelSubMuted: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '600',
      color: panelMuted,
    },
    kicker: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      color: panelText,
      textAlign: 'center',
      marginBottom: 6,
    },
    xpBig: {
      fontSize: 38,
      fontWeight: '900',
      color: panelText,
      textAlign: 'center',
    },
    totalLine: {
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 10,
      fontSize: 13,
      color: panelMuted,
      fontWeight: '600',
    },
    totalBold: { color: p.linkOnBg, fontWeight: '900' },
    progressBox: {
      marginBottom: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colorWithAlpha(p.cyan, 0.4),
      padding: 10,
      backgroundColor: colorWithAlpha(p.cyan, 0.07),
    },
    progressHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 8,
    },
    progressLevelLabel: { fontSize: 12, fontWeight: '900', color: p.linkOnBg },
    progressMeta: { fontSize: 11, fontWeight: '700', color: panelMuted },
    progressTrack: {
      marginTop: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: p.trackMuted,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colorWithAlpha(p.cyan, 0.35),
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: p.cyan,
    },
    progressHint: {
      marginTop: 8,
      fontSize: 10,
      fontWeight: '600',
      lineHeight: 14,
      color: panelMuted,
    },
    rulesBox: {
      backgroundColor: themeId && themeId !== 'default' ? p.card : p.cardCream,
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: p.borderCyan,
      marginBottom: 10,
      gap: 6,
    },
    rulesTitle: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.4,
      color: p.linkOnBg,
      marginBottom: 4,
    },
    ruleRowCompact: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colorWithAlpha(p.cyan, 0.28),
      backgroundColor: colorWithAlpha(p.card, themeId && themeId !== 'default' ? 0.88 : 0.94),
    },
    ruleCardLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: p.linkOnBg,
      flex: 1,
      minWidth: 0,
    },
    ruleCardValue: { fontSize: 12, fontWeight: '900', color: panelText },
    badgeBlock: { marginBottom: 4, gap: 8 },
    badgeKicker: {
      fontSize: 10,
      fontWeight: '900',
      color: p.orange,
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    badgeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    badgeIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colorWithAlpha(p.orange, 0.12),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.orange, 0.22),
    },
    badgeTitle: { fontSize: 13, fontWeight: '900', color: panelText },
    badgeCrit: { fontSize: 11, color: panelMuted, marginTop: 2, fontWeight: '600' },
    cta: {
      borderRadius: 14,
      overflow: 'hidden',
      marginHorizontal: 14,
      marginBottom: 12,
      marginTop: 4,
    },
    ctaGrad: { paddingVertical: 13, alignItems: 'center' },
    ctaText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  });
}
