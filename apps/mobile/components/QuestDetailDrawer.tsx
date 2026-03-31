import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { ThemePalette } from '@questia/ui';

export interface DetailQuest {
  title: string;
  mission: string;
  hook: string;
  duration: string;
  safetyNote: string | null;
  isOutdoor: boolean;
  questPace?: 'instant' | 'planned';
  deferredSocialUntil?: string | null;
  destination?: { label: string; lat: number | null; lon: number | null } | null;
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced' | 'abandoned';
}

interface Props {
  quest: DetailQuest;
  visible: boolean;
  palette: ThemePalette;
  canReroll: boolean;
  onClose: () => void;
  onReport?: () => void;
  onAbandon: () => void;
  strings: {
    missionHeading: string;
    hookLabel: string;
    destinationLabel: string;
    destinationHint: string;
    safetyLabel: string;
    reportCta: string;
    abandonCta: string;
    close: string;
    durationLabel: string;
    outdoorTag: string;
    reportHint: string;
  };
}

const SNAP_TOP = 0.18;
const SNAP_BOTTOM = 1.0;

export function QuestDetailDrawer({
  quest,
  visible,
  palette: p,
  canReroll,
  onClose,
  onReport,
  onAbandon,
  strings: s,
}: Props) {
  const progress = useSharedValue(SNAP_BOTTOM);
  const isPending = quest.status === 'pending';
  const isPlanned = quest.questPace === 'planned';

  useEffect(() => {
    progress.value = withSpring(visible ? SNAP_TOP : SNAP_BOTTOM, {
      damping: 22,
      stiffness: 180,
      mass: 0.9,
    });
  }, [visible, progress]);

  const dragGesture = Gesture.Pan()
    .onUpdate((e) => {
      const next = SNAP_TOP + e.translationY / 800;
      progress.value = Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, next));
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 600) {
        progress.value = withTiming(SNAP_BOTTOM, { duration: 250 });
        // runOnJS needed but we rely on visible prop from parent
      } else {
        progress.value = withSpring(SNAP_TOP, { damping: 22, stiffness: 180 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, 800], Extrapolation.CLAMP) }],
    opacity: interpolate(progress.value, [SNAP_TOP, SNAP_BOTTOM - 0.1, SNAP_BOTTOM], [1, 0.5, 0], Extrapolation.CLAMP),
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [SNAP_TOP, SNAP_BOTTOM], [1, 0], Extrapolation.CLAMP),
    pointerEvents: visible ? ('auto' as const) : ('none' as const),
  }));

  const openMap = () => {
    if (!quest.destination?.lat || !quest.destination?.lon) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${quest.destination.lat},${quest.destination.lon}`;
    void Linking.openURL(url);
  };

  return (
    <>
      <Animated.View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <GestureDetector gesture={dragGesture}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: p.card,
              borderColor: `${p.borderCyan}44`,
            },
            sheetStyle,
          ]}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: `${p.muted}44` }]} />
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={[styles.sectionLabel, { color: p.orange }]}>
              {s.missionHeading}
            </Text>
            <Text style={[styles.missionText, { color: p.text }]}>
              {quest.mission}
            </Text>

            {quest.deferredSocialUntil && isPending ? (
              <View style={[styles.infoBox, { borderColor: `${p.linkOnBg}33`, backgroundColor: `${p.linkOnBg}08` }]}>
                <Text style={[styles.infoBoxText, { color: p.linkOnBg }]}>
                  {s.reportHint}
                </Text>
              </View>
            ) : null}

            {quest.hook ? (
              <>
                <Text style={[styles.sectionLabel, { color: p.orange, marginTop: 22 }]}>
                  {s.hookLabel}
                </Text>
                <View style={[styles.hookCard, { borderColor: `${p.muted}22` }]}>
                  <Text style={[styles.hookText, { color: p.text }]}>
                    {'\u201C'}{quest.hook}{'\u201D'}
                  </Text>
                </View>
              </>
            ) : null}

            {quest.isOutdoor && quest.destination ? (
              <>
                <Text style={[styles.sectionLabel, { color: p.orange, marginTop: 22 }]}>
                  {s.destinationLabel}
                </Text>
                <Text style={[styles.helpText, { color: p.muted }]}>{s.destinationHint}</Text>
                <Pressable style={[styles.mapBtn, { borderColor: `${p.cyan}44` }]} onPress={openMap}>
                  <Text style={[styles.mapBtnText, { color: p.linkOnBg }]}>
                    {quest.destination.label}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {quest.safetyNote && isPending ? (
              <View style={[styles.safetyBox, { borderColor: `${p.orange}44` }]}>
                <Text style={[styles.sectionLabel, { color: p.orange }]}>{s.safetyLabel}</Text>
                <Text style={[styles.safetyText, { color: p.text }]}>{quest.safetyNote}</Text>
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: p.muted }]}>
                {s.durationLabel} {quest.duration}
              </Text>
              {quest.isOutdoor ? (
                <View style={[styles.outdoorTag, { borderColor: `${p.green}44`, backgroundColor: `${p.green}11` }]}>
                  <Text style={[styles.outdoorTagText, { color: p.green }]}>{s.outdoorTag}</Text>
                </View>
              ) : null}
            </View>

            {isPending ? (
              <View style={styles.secondaryActions}>
                {isPlanned && onReport ? (
                  <Pressable
                    style={[styles.secondaryBtn, { borderColor: `${p.linkOnBg}33` }]}
                    onPress={onReport}
                    disabled={!canReroll}
                  >
                    <Text style={[styles.secondaryBtnText, { color: p.linkOnBg }]}>
                      {s.reportCta}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.secondaryBtn, { borderColor: `${p.muted}33` }]}
                  onPress={onAbandon}
                >
                  <Text style={[styles.secondaryBtnText, { color: p.muted }]}>
                    {s.abandonCta}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    zIndex: 51,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 22,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  missionText: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
    marginBottom: 6,
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
  hookCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  hookText: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  mapBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  mapBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  safetyBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  safetyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  outdoorTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  outdoorTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  secondaryActions: {
    marginTop: 24,
    gap: 10,
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
