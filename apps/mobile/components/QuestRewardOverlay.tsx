import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { DisplayBadge, XpBreakdown } from '@questia/shared';
import { levelFromTotalXp } from '@questia/shared';
import { colorWithAlpha, type ThemePalette } from '@questia/ui';
import { useAppTheme } from '../contexts/AppThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

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
  const { palette } = useAppTheme();
  const styles = useMemo(() => buildRewardStyles(palette), [palette]);

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

  if (!payload) return null;

  const { xpGain, badgesUnlocked } = payload;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(251, 191, 36, 0.38)',
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

        <Animated.View style={[styles.cardWrap, { transform: [{ scale }, { translateX: shakeX }] }]}>
          <LinearGradient
            colors={[palette.cardCream, palette.surface, '#fffbeb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.kicker}>✨ Quête validée</Text>

            {levelInfo?.leveledUp ? (
              <View style={styles.levelBanner}>
                <Text style={styles.levelKicker}>Niveau atteint</Text>
                <Text style={styles.levelNum}>{levelInfo.afterLevel}</Text>
                {levelInfo.levelsGained > 1 ? (
                  <Text style={styles.levelSub}>+{levelInfo.levelsGained} niveaux d’un coup !</Text>
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

            <View style={styles.rulesBox}>
              <Text style={styles.rulesTitle}>Détail</Text>
              <Text style={styles.ruleLine}>
                Base {xpGain.breakdown.basePhase} · {xpGain.breakdown.baseAfterArchetype} XP
              </Text>
              <Text style={styles.ruleLine}>
                Série · +{xpGain.breakdown.streakBonus} (×{xpGain.breakdown.streakDays} j.)
              </Text>
              {xpGain.breakdown.outdoorBonus > 0 ? (
                <Text style={styles.ruleLine}>Extérieur · +{xpGain.breakdown.outdoorBonus}</Text>
              ) : null}
              {xpGain.breakdown.fallbackPenalty > 0 ? (
                <Text style={styles.ruleLineMuted}>Repli météo · −{xpGain.breakdown.fallbackPenalty}</Text>
              ) : null}
              {xpGain.breakdown.afterReroll ? (
                <Text style={styles.ruleLineMuted}>Après relance · ×0,75 sur le sous-total</Text>
              ) : null}
              {xpGain.breakdown.shopBonusXp != null && xpGain.breakdown.shopBonusXp > 0 ? (
                <Text style={styles.ruleShopBonus}>Bonus boutique · +{xpGain.breakdown.shopBonusXp} XP</Text>
              ) : null}
            </View>

            {badgesUnlocked.length > 0 ? (
              <View style={styles.badgeBlock}>
                <Text style={styles.badgeKicker}>Nouveaux badges</Text>
                {badgesUnlocked.map((b) => (
                  <View key={b.id} style={styles.badgeRow}>
                    <Text style={styles.badgeEmoji}>{b.placeholderEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.badgeTitle}>{b.title}</Text>
                      <Text style={styles.badgeCrit}>{b.criteria}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

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
        </Animated.View>
      </View>
    </Modal>
  );
}

function buildRewardStyles(p: ThemePalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: p.overlay,
      justifyContent: 'center',
      padding: 20,
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
      shadowColor: '#fff',
      shadowOpacity: 0.4,
      shadowRadius: 1,
    },
    cardWrap: {
      position: 'relative',
      zIndex: 2,
    },
    card: {
      borderRadius: 28,
      padding: 22,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.orange, 0.42),
      shadowColor: p.orange,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.4,
      shadowRadius: 28,
      elevation: 14,
    },
    levelBanner: {
      marginBottom: 12,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.gold, 0.55),
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colorWithAlpha(p.cardCream, 0.95),
      alignItems: 'center',
    },
    levelKicker: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
      color: p.gold,
    },
    levelNum: {
      marginTop: 4,
      fontSize: 40,
      fontWeight: '900',
      color: p.linkOnBg,
    },
    levelSub: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '800',
      color: p.onCream,
    },
    levelSubMuted: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '600',
      color: p.onCreamMuted,
    },
    kicker: {
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 2,
      color: p.linkOnBg,
      textAlign: 'center',
      marginBottom: 8,
    },
    xpBig: {
      fontSize: 46,
      fontWeight: '900',
      color: p.onCream,
      textAlign: 'center',
    },
    totalLine: {
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 16,
      fontSize: 14,
      color: p.onCreamMuted,
      fontWeight: '600',
    },
    totalBold: { color: p.linkOnBg, fontWeight: '900' },
    rulesBox: {
      backgroundColor: p.cardCream,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: p.borderCyan,
      marginBottom: 14,
      gap: 4,
    },
    rulesTitle: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
      color: p.linkOnBg,
      marginBottom: 6,
    },
    ruleLine: { fontSize: 12, color: p.onCream, fontWeight: '600' },
    ruleLineMuted: { fontSize: 12, color: p.onCreamMuted, fontWeight: '600' },
    ruleShopBonus: { fontSize: 12, color: '#047857', fontWeight: '900' },
    badgeBlock: { marginBottom: 14, gap: 10 },
    badgeKicker: {
      fontSize: 11,
      fontWeight: '900',
      color: p.orange,
      letterSpacing: 1,
      marginBottom: 4,
    },
    badgeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    badgeEmoji: { fontSize: 28 },
    badgeTitle: { fontSize: 15, fontWeight: '900', color: p.onCream },
    badgeCrit: { fontSize: 12, color: p.onCreamMuted, marginTop: 2, fontWeight: '600' },
    cta: { borderRadius: 16, overflow: 'hidden' },
    ctaGrad: { paddingVertical: 16, alignItems: 'center' },
    ctaText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  });
}
