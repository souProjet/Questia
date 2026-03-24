import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { DisplayBadge, XpBreakdown } from '@questia/shared';
import { DA } from '@questia/ui';

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

export function QuestRewardOverlay({ visible, payload, onContinue }: Props) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const xpPop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !payload) return;
    scale.setValue(0.88);
    xpPop.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(xpPop, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, payload, scale, xpPop]);

  if (!payload) return null;

  const { xpGain, badgesUnlocked } = payload;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <View style={styles.glowRing} />
        <Animated.View style={[styles.cardWrap, { transform: [{ scale }] }]}>
          <LinearGradient
            colors={['#fff7ed', '#ecfeff', '#fffbeb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.kicker}>✨ Quête validée</Text>
            <Animated.Text
              style={[
                styles.xpBig,
                {
                  transform: [
                    {
                      scale: xpPop.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1],
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
                colors={['#f97316', '#fbbf24']}
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  glowRing: {
    position: 'absolute',
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 200,
    backgroundColor: '#22d3ee',
    opacity: 0.45,
    top: '22%',
  },
  cardWrap: {
    position: 'relative',
    zIndex: 2,
  },
  card: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 2,
    borderColor: 'rgba(249,115,22,0.35)',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#0e7490',
    textAlign: 'center',
    marginBottom: 8,
  },
  xpBig: {
    fontSize: 44,
    fontWeight: '900',
    color: DA.text,
    textAlign: 'center',
  },
  totalLine: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    color: DA.muted,
    fontWeight: '600',
  },
  totalBold: { color: '#0e7490', fontWeight: '900' },
  rulesBox: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
    marginBottom: 14,
    gap: 4,
  },
  rulesTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#0e7490',
    marginBottom: 6,
  },
  ruleLine: { fontSize: 12, color: '#0f172a', fontWeight: '600' },
  ruleLineMuted: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  badgeBlock: { marginBottom: 14, gap: 10 },
  badgeKicker: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f97316',
    letterSpacing: 1,
    marginBottom: 4,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badgeEmoji: { fontSize: 28 },
  badgeTitle: { fontSize: 15, fontWeight: '900', color: DA.text },
  badgeCrit: { fontSize: 12, color: DA.muted, marginTop: 2, fontWeight: '600' },
  cta: { borderRadius: 16, overflow: 'hidden' },
  ctaGrad: { paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
