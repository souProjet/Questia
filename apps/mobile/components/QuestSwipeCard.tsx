import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  ScrollView,
  Pressable as RNPressable,
} from 'react-native';
import { Gesture, GestureDetector, Pressable } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { questDisplayEmoji, questFamilyLabel, type AppLocale } from '@questia/shared';
import { colorWithAlpha, questCardFaceGradient, UiLucideIcon, type ThemePalette } from '@questia/ui';
import { hapticSuccess, hapticWarning } from '../lib/haptics';
import { QuestDestinationMapWebView } from './QuestDestinationMapWebView';

const SWIPE_THRESHOLD = 120;
/** Au-delà de ce déplacement, on fige soit le swipe horizontal, soit le vertical (pas les deux). */
const AXIS_LOCK_PX = 14;
const ROTATION_DEG = 12;
/** Retour au centre au relâchement : court, sans rebond (évite le « délai » du double spring bump → retour). */
const SNAP_MS = 115;
const SNAP_EASING = Easing.out(Easing.cubic);
const snapToCenter = { duration: SNAP_MS, easing: SNAP_EASING } as const;

export interface SwipeCardQuest {
  emoji: string;
  title: string;
  /** Accroche courte fournie par le serveur — ne pas résumer côté client. */
  hook?: string;
  mission: string;
  archetypeCategory?: string;
  questPace?: 'instant' | 'planned';
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced' | 'abandoned';
  streak: number;
  day: number;
  duration: string;
  isOutdoor: boolean;
  safetyNote?: string | null;
  deferredSocialUntil?: string | null;
  destination?: { label: string; lat: number | null; lon: number | null } | null;
}

interface Props {
  quest: SwipeCardQuest;
  locale: AppLocale;
  palette: ThemePalette;
  canReroll: boolean;
  onAccept: () => void;
  onReroll: () => void;
  onValidate: () => void;
  onShare: () => void;
  /** Quête planifiée : reporter (relance) — uniquement si défini. */
  onReport?: () => void;
  onAbandon: () => void;
  strings: {
    swipeAccept: string;
    swipeChange: string;
    validateCta: string;
    swipeValidateOverlay: string;
    shareCta: string;
    completedTitle: string;
    completedSub: string;
    abandonedTitle: string;
    abandonedSub: string;
    paceToday: string;
    pacePlanned: string;
    /** Court libellé au-dessus du texte de mission (ex. « Ta mission »). */
    missionEyebrow: string;
    outdoorTag: string;
    destinationLabel: string;
    destinationHint: string;
    safetyLabel: string;
    reportCta: string;
    abandonCta: string;
    reportPlannedHint: string;
    reportNoRerollsHint: string;
    mapOpenInMaps: string;
    mapOpenDirections: string;
    mapRouteFailed: string;
    mapNoGeocodeTitle: string;
    mapNoGeocodeBody: string;
    mapRendezvous: string;
    mapUserHere: string;
  };
  /** Position GPS récente (même logique que le site : itinéraire OSRM + marqueur). */
  userPosition?: { lat: number; lon: number } | null;
  /** Relance en cours : voile aligné sur la carte (même cadre que le swipe). */
  rerolling?: boolean;
  rerollLoadingLabel?: string;
  /** Thème actif (dégradé + formes décoratives). */
  themeId?: string | null;
}

export function QuestSwipeCard({
  quest,
  locale,
  palette: p,
  canReroll,
  onAccept,
  onReroll,
  onValidate,
  onShare,
  onReport,
  onAbandon,
  strings: s,
  userPosition = null,
  rerolling = false,
  rerollLoadingLabel,
  themeId = null,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isDarkCard = themeId === 'midnight';
  /** Dégradé plus transparent + flou natif = glass sobre sur la carte. */
  const glassFaceColors = useMemo(() => {
    const base = questCardFaceGradient(themeId, p);
    const a = isDarkCard ? 0.72 : 0.66;
    return base.map((c) => (c.startsWith('#') ? colorWithAlpha(c, a) : c)) as [string, string, string, string];
  }, [themeId, p, isDarkCard]);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(1);
  /** Évite de lire des props React dans les worklets (Reanimated 4 / worklets) — crash Android possible au swipe sinon. */
  const layoutWidth = useSharedValue(screenWidth);
  const layoutHeight = useSharedValue(screenHeight);
  /** 0 = pas encore choisi, 1 = horizontal, 2 = vertical (détails) */
  const axisLock = useSharedValue(0);
  /** 0 = pending (swipe accepter / reroll / détails), 1 = accepted (swipe valider uniquement), 2 = autre */
  const panMode = useSharedValue(0);
  /** 1 = swipe gauche « relancer » autorisé — lu dans les worklets (pas la prop React seule). */
  const canRerollSV = useSharedValue(canReroll ? 1 : 0);

  const isPending = quest.status === 'pending';
  const isAccepted = quest.status === 'accepted';
  const isCompleted = quest.status === 'completed';
  const isAbandoned = quest.status === 'abandoned';
  const isPlannedQuest = quest.questPace === 'planned';
  const reportContextMessage =
    isPending && isPlannedQuest ? (canReroll ? s.reportPlannedHint : s.reportNoRerollsHint) : null;

  const triggerAccept = useCallback(() => {
    hapticSuccess();
    onAccept();
  }, [onAccept]);

  const triggerReroll = useCallback(() => {
    hapticWarning();
    onReroll();
  }, [onReroll]);

  const triggerValidate = useCallback(() => {
    hapticSuccess();
    onValidate();
  }, [onValidate]);

  useEffect(() => {
    if (isPending) panMode.value = 0;
    else if (isAccepted) panMode.value = 1;
    else panMode.value = 2;
  }, [isPending, isAccepted]);

  useEffect(() => {
    canRerollSV.value = canReroll ? 1 : 0;
  }, [canReroll, canRerollSV]);

  useEffect(() => {
    layoutWidth.value = screenWidth;
    layoutHeight.value = screenHeight;
  }, [screenWidth, screenHeight]);

  const pan = Gesture.Pan()
    .enabled(isPending || isAccepted)
    /** Laisse le scroll vertical du corps de carte sans déclencher le swipe horizontal. */
    .activeOffsetX([-AXIS_LOCK_PX, AXIS_LOCK_PX])
    .failOffsetY([-18, 18])
    .onBegin(() => {
      axisLock.value = 0;
    })
    .onUpdate((e) => {
      const mode = panMode.value;
      const tx = e.translationX;
      const ty = e.translationY;
      const ax = Math.abs(tx);
      const ay = Math.abs(ty);

      if (mode === 1) {
        if (axisLock.value === 0) {
          if (ax < AXIS_LOCK_PX && ay < AXIS_LOCK_PX) {
            translateX.value = 0;
            translateY.value = 0;
            return;
          }
          axisLock.value = ax > ay ? 1 : 2;
        }
        if (axisLock.value === 1) {
          translateX.value = Math.max(0, tx);
          translateY.value = 0;
        } else {
          translateX.value = 0;
          translateY.value = 0;
        }
        return;
      }

      if (axisLock.value === 0) {
        if (ax < AXIS_LOCK_PX && ay < AXIS_LOCK_PX) {
          translateX.value = 0;
          translateY.value = 0;
          return;
        }
        axisLock.value = mode === 0 ? 1 : ax > ay ? 1 : 2;
      }

      if (axisLock.value === 1) {
        const mode0 = panMode.value === 0;
        const txClamped =
          mode0 && canRerollSV.value === 0 ? Math.max(0, tx) : tx;
        translateX.value = txClamped;
        translateY.value = 0;
      } else {
        translateX.value = 0;
        translateY.value = mode === 0 ? 0 : Math.min(0, ty);
      }
    })
    .onEnd((e) => {
      const mode = panMode.value;
      const tx = e.translationX;
      const lock = axisLock.value;

      if (mode === 1) {
        if (lock === 1 && tx > SWIPE_THRESHOLD) {
          runOnJS(triggerValidate)();
        }
        translateX.value = withTiming(0, snapToCenter);
        translateY.value = withTiming(0, snapToCenter);
        return;
      }

      if (lock === 1) {
        if (tx > SWIPE_THRESHOLD) {
          runOnJS(triggerAccept)();
        } else if (tx < -SWIPE_THRESHOLD && canRerollSV.value === 1) {
          runOnJS(triggerReroll)();
        }
        translateX.value = withTiming(0, snapToCenter);
        translateY.value = withTiming(0, snapToCenter);
      } else {
        translateX.value = withTiming(0, snapToCenter);
        translateY.value = withTiming(0, snapToCenter);
      }
    })
    .onFinalize(() => {
      axisLock.value = 0;
    });

  const composed = pan;

  const cardAnimStyle = useAnimatedStyle(() => {
    const w = layoutWidth.value;
    const rotation = interpolate(
      translateX.value,
      [-w * 0.5, 0, w * 0.5],
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
    opacity: interpolate(
      translateX.value,
      [0, -SWIPE_THRESHOLD],
      [0, canRerollSV.value ? 1 : 0],
      Extrapolation.CLAMP,
    ),
  }));

  const family = quest.archetypeCategory ? questFamilyLabel(quest.archetypeCategory, locale) : null;
  const paceLabel = quest.questPace === 'planned' ? s.pacePlanned : s.paceToday;
  const metaLineParts = [family, paceLabel, quest.isOutdoor ? s.outdoorTag : null].filter(
    (x): x is string => Boolean(x),
  );
  const cardHeight = Math.min(screenHeight * 0.68, 580);
  const hookText = (quest.hook ?? '').trim();
  const safetyText = (quest.safetyNote ?? '').trim();
  if (isAbandoned) {
    return (
      <View style={[styles.abandonedBox, { backgroundColor: p.card, borderColor: p.borderCyan }]}>
        <Text style={[styles.abandonedTitle, { color: p.muted }]}>{s.abandonedTitle}</Text>
        <Text style={[styles.abandonedSub, { color: p.muted }]}>{s.abandonedSub}</Text>
      </View>
    );
  }

  const questBody = (
    <View style={styles.cardInner}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={styles.questIconSlot} accessibilityElementsHidden>
            <UiLucideIcon name={questDisplayEmoji(quest.emoji)} size={28} color={p.orange} strokeWidth={2} />
          </View>
          <Text style={[styles.title, { color: p.text }]} numberOfLines={3}>
            {quest.title}
          </Text>
        </View>
        {metaLineParts.length > 0 ? (
          <Text style={[styles.metaLine, { color: p.muted }]} numberOfLines={2}>
            {metaLineParts.join(' · ')}
          </Text>
        ) : null}
      </View>

      {hookText ? (
        <Text style={[styles.hookLine, { color: p.text, borderLeftColor: `${p.orange}99` }]}>{hookText}</Text>
      ) : null}

      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={styles.cardScrollContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.missionBlock, { borderTopColor: `${p.muted}22` }]}>
          <Text style={[styles.missionEyebrow, { color: p.muted }]}>{s.missionEyebrow}</Text>
          <Text style={[styles.missionFull, { color: p.text }]}>{quest.mission}</Text>
          <Text style={[styles.duration, { color: p.muted }]}>{quest.duration}</Text>
        </View>

        {reportContextMessage ? (
          <View style={[styles.infoBox, { borderColor: `${p.linkOnBg}33`, backgroundColor: `${p.linkOnBg}08` }]}>
            <Text style={[styles.infoBoxText, { color: p.linkOnBg }]}>{reportContextMessage}</Text>
          </View>
        ) : null}

        {quest.isOutdoor && quest.destination ? (
          <View style={styles.extraSection}>
            <Text style={[styles.sectionLabel, { color: p.orange }]}>{s.destinationLabel}</Text>
            <Text style={[styles.helpText, { color: p.muted }]}>{s.destinationHint}</Text>
            <View style={styles.mapBlock}>
              <QuestDestinationMapWebView
                destination={quest.destination}
                userPosition={userPosition}
                labels={{
                  openInMaps: s.mapOpenInMaps,
                  openDirections: s.mapOpenDirections,
                  routeFailed: s.mapRouteFailed,
                  noGeocodeTitle: s.mapNoGeocodeTitle,
                  noGeocodeBody: s.mapNoGeocodeBody,
                  rendezvous: s.mapRendezvous,
                  userHere: s.mapUserHere,
                }}
                borderColor={`${p.cyan}44`}
                cardBg={p.card}
                mutedColor={p.muted}
                linkColor={p.linkOnBg}
              />
            </View>
          </View>
        ) : null}

        {safetyText && isPending ? (
          <View style={[styles.safetyBox, { borderColor: `${p.orange}44` }]}>
            <Text style={[styles.sectionLabel, { color: p.orange }]}>{s.safetyLabel}</Text>
            <Text style={[styles.safetyText, { color: p.text }]}>{safetyText}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );

  const pendingSecondaryRow =
    isPending ? (
      <View style={styles.inlineSecondaryActions}>
        {quest.questPace === 'planned' && onReport && canReroll ? (
          <Pressable
            style={[styles.secondaryBtn, { borderColor: `${p.linkOnBg}33` }]}
            onPress={onReport}
            accessibilityRole="button"
            accessibilityLabel={s.reportCta}
          >
            <Text style={[styles.secondaryBtnText, { color: p.linkOnBg }]}>{s.reportCta}</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.secondaryBtn, { borderColor: `${p.muted}33` }]}
          onPress={onAbandon}
          accessibilityRole="button"
          accessibilityLabel={s.abandonCta}
        >
          <Text style={[styles.secondaryBtnText, { color: p.muted }]}>{s.abandonCta}</Text>
        </Pressable>
      </View>
    ) : null;

  return (
    <View style={[styles.cardContainer, { height: cardHeight }]}>
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
        {Platform.OS !== 'web' ? (
          <BlurView
            pointerEvents="none"
            intensity={isDarkCard ? 42 : 36}
            tint={isDarkCard ? 'dark' : 'light'}
            style={styles.cardFaceGradient}
          />
        ) : null}
        <LinearGradient
          pointerEvents="none"
          colors={glassFaceColors}
          locations={[0, 0.35, 0.68, 1]}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 0.94, y: 1 }}
          style={styles.cardFaceGradient}
        />
        <View pointerEvents="none" style={styles.cardDecorLayer}>
          <View
            style={[
              styles.cardBlob,
              styles.cardBlobTR,
              { backgroundColor: colorWithAlpha(p.orange, isDarkCard ? 0.052 : 0.034) },
            ]}
          />
          <View
            style={[
              styles.cardBlob,
              styles.cardBlobBL,
              { backgroundColor: colorWithAlpha(p.cyan, isDarkCard ? 0.045 : 0.028) },
            ]}
          />
          <View
            style={[
              styles.cardBlob,
              styles.cardBlobMid,
              { backgroundColor: colorWithAlpha(p.gold, isDarkCard ? 0.035 : 0.022) },
            ]}
          />
        </View>

        <View style={styles.cardContentLayer}>
        {/* Quête terminée : pas de GestureDetector (évite que le Tap RNGH bloque le bouton « Partager ta carte »). */}
        {isCompleted ? (
          <View style={styles.gestureArea} collapsable={false}>
            <View style={styles.gestureAreaTap}>{questBody}</View>
          </View>
        ) : (
        <View style={styles.gestureArea} collapsable={false}>
          {/*
            Pan horizontal uniquement sur le corps de la carte : si le GestureDetector
            englobe aussi les boutons, le geste gagne souvent en même temps que le Pressable
            → action du bouton + swipe mélangés.
          */}
          <GestureDetector gesture={composed}>
            <View style={styles.gestureSwipeBody} collapsable={false}>
              {questBody}
            </View>
          </GestureDetector>

            {pendingSecondaryRow}

            {isPending && (
              <View style={styles.fallbackActions}>
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
                <Pressable
                  style={[styles.fallbackBtn, { backgroundColor: `${p.green}18`, borderColor: `${p.green}44` }]}
                  onPress={onAccept}
                  accessibilityRole="button"
                  accessibilityLabel={s.swipeAccept}
                >
                  <Text style={[styles.fallbackBtnText, { color: p.green }]}>{s.swipeAccept}</Text>
                </Pressable>
              </View>
            )}

            {isPending && (
              <>
                <Animated.View pointerEvents="none" style={[styles.overlayAccept, acceptOverlayStyle]}>
                  <Text style={styles.overlayAcceptText}>{s.swipeAccept}</Text>
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.overlayReroll, rerollOverlayStyle]}>
                  <Text style={styles.overlayRerollLabel}>{s.swipeChange}</Text>
                </Animated.View>
              </>
            )}

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

        {isAccepted ? (
          <Animated.View pointerEvents="none" style={[styles.overlayAcceptFullCard, acceptOverlayStyle]}>
            <Text style={styles.overlayAcceptText}>{s.swipeValidateOverlay}</Text>
          </Animated.View>
        ) : null}

        {isCompleted && (
          <View style={styles.completedFooter}>
            <Text style={[styles.completedTitle, { color: p.green }]}>{s.completedTitle}</Text>
            <Text style={[styles.completedSub, { color: p.muted }]}>{s.completedSub}</Text>
            <RNPressable
              style={[styles.shareBtn, { borderColor: `${p.cyan}55` }]}
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel={s.shareCta}
            >
              <Text style={[styles.shareBtnText, { color: p.linkOnBg }]}>{s.shareCta}</Text>
            </RNPressable>
          </View>
        )}

        {rerolling ? (
          <View style={styles.rerollLoadingOverlay} pointerEvents="none" accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.rerollLoadingText}>{rerollLoadingLabel ?? '…'}</Text>
          </View>
        ) : null}
        </View>
      </Animated.View>
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
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.26,
    shadowRadius: 36,
    elevation: 14,
    flex: 1,
  },
  cardFaceGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardDecorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBlob: {
    position: 'absolute',
  },
  cardBlobTR: {
    top: -52,
    right: -58,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  cardBlobBL: {
    bottom: 36,
    left: -68,
    width: 248,
    height: 248,
    borderRadius: 124,
  },
  cardBlobMid: {
    top: '26%',
    left: '8%',
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.38,
  },
  cardContentLayer: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    zIndex: 1,
    position: 'relative',
  },
  gestureArea: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  /** Zone swipe / tap détails uniquement (pas les CTA du bas — évite double déclenchement). */
  gestureSwipeBody: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  /** Zone mission cliquable (quête terminée) — flex pour ne pas empiéter sur le footer. */
  gestureAreaTap: {
    flex: 1,
    minHeight: 0,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    minHeight: 0,
  },
  cardScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  cardScrollContent: {
    flexGrow: 1,
    paddingBottom: 4,
  },
  cardHeader: {
    alignItems: 'stretch',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  questIconSlot: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'left',
    lineHeight: 24,
  },
  metaLine: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'left',
    marginBottom: 2,
  },
  hookLine: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    textAlign: 'left',
    marginTop: 4,
    marginBottom: 6,
    paddingLeft: 10,
    paddingRight: 4,
    borderLeftWidth: 3,
    opacity: 0.92,
  },
  missionBlock: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    width: '100%',
  },
  missionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'left',
  },
  missionFull: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  duration: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'left',
  },
  extraSection: {
    marginTop: 16,
    width: '100%',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  mapBlock: {
    marginTop: 4,
    width: '100%',
  },
  safetyBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  safetyText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  inlineSecondaryActions: {
    marginTop: 2,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 18,
    width: '100%',
    paddingHorizontal: 20,
  },
  secondaryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
    opacity: 0.75,
  },
  /** Pas d'elevation ici : sur Android ça crée une couche ombrée / dégradés bizarres au-dessus du contenu. */
  rerollLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(18,18,20,0.88)',
    zIndex: 200,
    elevation: 0,
  },
  rerollLoadingText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 22,
    maxWidth: '92%',
    color: 'rgba(255,255,255,0.96)',
  },
  fallbackActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  fallbackBtn: {
    flex: 1,
    paddingVertical: 10,
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
    zIndex: 30,
  },
  /** Quête acceptée : couvre toute la carte y compris le bouton vert (overlay était limité au gestureArea). */
  overlayAcceptFullCard: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,185,129,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 45,
  },
  overlayAcceptText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 1,
    transform: [{ rotate: '-12deg' }],
  },
  /** Même principe que « Accepter » : voile + gros libellé, sans forme de bouton. */
  overlayReroll: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249,115,22,0.22)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  overlayRerollLabel: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 1,
    textAlign: 'center',
    maxWidth: '92%',
    transform: [{ rotate: '12deg' }],
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
    zIndex: 20,
    elevation: 20,
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
