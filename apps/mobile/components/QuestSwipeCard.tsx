import React, { useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';
import { questDisplayEmoji, questFamilyLabel, type AppLocale } from '@questia/shared';
import type { ThemePalette } from '@questia/ui';
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics';

const SWIPE_THRESHOLD = 120;
const SWIPE_UP_THRESHOLD = 80;
const ROTATION_DEG = 12;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

export interface SwipeCardQuest {
  emoji: string;
  title: string;
  mission: string;
  archetypeCategory?: string;
  questPace?: 'instant' | 'planned';
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced' | 'abandoned';
  streak: number;
  day: number;
  duration: string;
  isOutdoor: boolean;
}

interface Props {
  quest: SwipeCardQuest;
  locale: AppLocale;
  palette: ThemePalette;
  canReroll: boolean;
  onAccept: () => void;
  onReroll: () => void;
  onOpenDetails: () => void;
  onValidate: () => void;
  onShare: () => void;
  strings: {
    swipeAccept: string;
    swipeChange: string;
    tapDetails: string;
    validateCta: string;
    shareCta: string;
    completedTitle: string;
    completedSub: string;
    abandonedTitle: string;
    abandonedSub: string;
    paceToday: string;
    pacePlanned: string;
  };
}

export function QuestSwipeCard({
  quest,
  locale,
  palette: p,
  canReroll,
  onAccept,
  onReroll,
  onOpenDetails,
  onValidate,
  onShare,
  strings: s,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const isPending = quest.status === 'pending';
  const isAccepted = quest.status === 'accepted';
  const isCompleted = quest.status === 'completed';
  const isAbandoned = quest.status === 'abandoned';

  const triggerAccept = useCallback(() => {
    hapticSuccess();
    onAccept();
  }, [onAccept]);

  const triggerReroll = useCallback(() => {
    hapticWarning();
    onReroll();
  }, [onReroll]);

  const triggerDetails = useCallback(() => {
    hapticLight();
    onOpenDetails();
  }, [onOpenDetails]);

  const pan = Gesture.Pan()
    .enabled(isPending)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(screenWidth * 1.2, { duration: 280 });
        runOnJS(triggerAccept)();
      } else if (e.translationX < -SWIPE_THRESHOLD && canReroll) {
        translateX.value = withTiming(-screenWidth * 1.2, { duration: 280 });
        runOnJS(triggerReroll)();
      } else if (e.translationY < -SWIPE_UP_THRESHOLD) {
        translateY.value = withSpring(0, SPRING_CONFIG);
        translateX.value = withSpring(0, SPRING_CONFIG);
        runOnJS(triggerDetails)();
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(triggerDetails)();
  });

  const composed = isPending ? Gesture.Race(pan, tap) : Gesture.Tap().onEnd(() => runOnJS(triggerDetails)());

  const cardAnimStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-screenWidth * 0.5, 0, screenWidth * 0.5],
      [-ROTATION_DEG, 0, ROTATION_DEG],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
        { scale: cardScale.value },
      ],
    };
  });

  const acceptOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const rerollOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -SWIPE_THRESHOLD], [0, canReroll ? 1 : 0.3], Extrapolation.CLAMP),
  }));

  const detailHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, -SWIPE_UP_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const family = quest.archetypeCategory ? questFamilyLabel(quest.archetypeCategory, locale) : null;
  const paceLabel = quest.questPace === 'planned' ? s.pacePlanned : s.paceToday;
  const cardHeight = Math.min(screenHeight * 0.62, 520);

  if (isAbandoned) {
    return (
      <View style={[styles.abandonedBox, { backgroundColor: p.card, borderColor: p.borderCyan }]}>
        <Text style={[styles.abandonedTitle, { color: p.muted }]}>{s.abandonedTitle}</Text>
        <Text style={[styles.abandonedSub, { color: p.muted }]}>{s.abandonedSub}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.cardContainer, { height: cardHeight }]}>
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: p.card,
              borderColor: isCompleted
                ? 'rgba(16,185,129,0.5)'
                : isAccepted
                  ? 'rgba(16,185,129,0.3)'
                  : `${p.orange}44`,
              shadowColor: p.orange,
            },
            cardAnimStyle,
          ]}
        >
          {isPending && (
            <>
              <Animated.View style={[styles.overlayAccept, acceptOverlayStyle]}>
                <Text style={styles.overlayAcceptText}>{s.swipeAccept}</Text>
              </Animated.View>
              <Animated.View style={[styles.overlayReroll, rerollOverlayStyle]}>
                <Text style={styles.overlayRerollText}>{s.swipeChange}</Text>
              </Animated.View>
              <Animated.View style={[styles.overlayDetail, detailHintStyle]}>
                <Text style={styles.overlayDetailText}>{s.tapDetails}</Text>
              </Animated.View>
            </>
          )}

          <View style={styles.cardInner}>
            <Text style={styles.emoji}>{questDisplayEmoji(quest.emoji)}</Text>
            <Text style={[styles.title, { color: p.text }]} numberOfLines={2}>
              {quest.title}
            </Text>

            <View style={styles.badges}>
              {family ? (
                <View style={[styles.badge, { borderColor: `${p.muted}33`, backgroundColor: `${p.muted}11` }]}>
                  <Text style={[styles.badgeText, { color: p.muted }]}>{family}</Text>
                </View>
              ) : null}
              <View style={[styles.badge, { borderColor: `${p.linkOnBg}44`, backgroundColor: `${p.linkOnBg}11` }]}>
                <Text style={[styles.badgeText, { color: p.linkOnBg }]}>{paceLabel}</Text>
              </View>
              {quest.isOutdoor ? (
                <View style={[styles.badge, { borderColor: `${p.green}44`, backgroundColor: `${p.green}11` }]}>
                  <Text style={[styles.badgeText, { color: p.green }]}>Exterieur</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.missionPreview, { color: p.muted }]} numberOfLines={3}>
              {quest.mission}
            </Text>

            <Text style={[styles.duration, { color: p.muted }]}>
              {quest.duration}
            </Text>
          </View>

          {isPending && (
            <View style={styles.fallbackActions}>
              <Pressable
                style={[styles.fallbackBtn, { backgroundColor: `${p.green}18`, borderColor: `${p.green}44` }]}
                onPress={onAccept}
                accessibilityRole="button"
                accessibilityLabel={s.swipeAccept}
              >
                <Text style={[styles.fallbackBtnText, { color: p.green }]}>{s.swipeAccept}</Text>
              </Pressable>
              {canReroll ? (
                <Pressable
                  style={[styles.fallbackBtn, { backgroundColor: `${p.orange}18`, borderColor: `${p.orange}44` }]}
                  onPress={onReroll}
                  accessibilityRole="button"
                  accessibilityLabel={s.swipeChange}
                >
                  <Text style={[styles.fallbackBtnText, { color: p.orange }]}>{s.swipeChange}</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {isAccepted && (
            <Pressable
              style={[styles.validateBtn, { backgroundColor: p.green }]}
              onPress={onValidate}
            >
              <Text style={styles.validateText}>{s.validateCta}</Text>
            </Pressable>
          )}

          {isCompleted && (
            <View style={styles.completedFooter}>
              <Text style={[styles.completedTitle, { color: p.green }]}>{s.completedTitle}</Text>
              <Text style={[styles.completedSub, { color: p.muted }]}>{s.completedSub}</Text>
              <Pressable
                style={[styles.shareBtn, { borderColor: `${p.cyan}55` }]}
                onPress={onShare}
              >
                <Text style={[styles.shareBtnText, { color: p.linkOnBg }]}>{s.shareCta}</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    flex: 1,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  missionPreview: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  duration: {
    fontSize: 12,
    fontWeight: '600',
  },
  fallbackActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fallbackBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  fallbackBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  overlayAccept: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,185,129,0.22)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayAcceptText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 1,
    transform: [{ rotate: '-12deg' }],
  },
  overlayReroll: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249,115,22,0.22)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayRerollText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#c2410c',
    letterSpacing: 1,
    transform: [{ rotate: '12deg' }],
  },
  overlayDetail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayDetailText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 0.5,
  },
  validateBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  validateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  completedFooter: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 6,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  completedSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  shareBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  abandonedBox: {
    marginHorizontal: 20,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  abandonedTitle: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  abandonedSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
