import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDailyQuestLoadingLines,
  resolveQuestLoaderSession,
  QUEST_LOADER_DAY_STORAGE_KEY,
} from '@questia/shared';
import { useAppLocale } from '../contexts/AppLocaleContext';
import { useAppTheme } from '../contexts/AppThemeContext';
import { UiLucideIcon, type ThemePalette } from '@questia/ui';

function buildStyles(p: ThemePalette) {
  return StyleSheet.create({
    outer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingVertical: 28,
    },
    glow: {
      position: 'absolute',
      top: '16%',
      alignSelf: 'center',
      width: 360,
      height: 360,
      borderRadius: 999,
      backgroundColor: 'rgba(34,211,238,0.11)',
    },
    glowOrange: {
      position: 'absolute',
      top: '22%',
      right: '-8%',
      width: 220,
      height: 220,
      borderRadius: 999,
      backgroundColor: 'rgba(251,146,60,0.08)',
    },
    floatCol: {
      alignItems: 'center',
      maxWidth: 400,
      width: '100%',
    },
    iconCluster: {
      marginBottom: 28,
      alignItems: 'center',
      justifyContent: 'center',
      height: 100,
      width: 100,
    },
    iconSparklesWrap: {
      position: 'absolute',
      top: 4,
      right: 8,
    },
    primary: {
      fontSize: 21,
      fontWeight: '900',
      color: '#115e59',
      textAlign: 'center',
      lineHeight: 29,
      letterSpacing: -0.35,
    },
    primaryCompact: {
      fontSize: 19,
      lineHeight: 27,
    },
    secondary: {
      marginTop: 14,
      fontSize: 14,
      fontWeight: '600',
      color: p.onCreamMuted,
      textAlign: 'center',
      lineHeight: 21,
      paddingHorizontal: 4,
    },
    textPlaceholder: {
      minHeight: 92,
    },
    barTrack: {
      marginTop: 26,
      height: 3,
      width: '72%',
      maxWidth: 200,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: 'rgba(15,23,42,0.08)',
    },
    barFill: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: '38%',
      borderRadius: 999,
    },
    dots: {
      flexDirection: 'row',
      gap: 7,
      marginTop: 24,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 999,
    },
  });
}

type Props = { compact?: boolean };

export function QuestHomeLoading({ compact }: Props) {
  const { locale: appLocale } = useAppLocale();
  const { palette } = useAppTheme();
  const styles = React.useMemo(() => buildStyles(palette), [palette]);
  /** Une seule mise à jour après AsyncStorage — évite deux messages différents. */
  const [lines, setLines] = useState<{ primary: string; secondary: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    void (async () => {
      try {
        const last = await AsyncStorage.getItem(QUEST_LOADER_DAY_STORAGE_KEY);
        const session = resolveQuestLoaderSession(last, today);
        if (!cancelled) setLines(getDailyQuestLoadingLines(undefined, session, appLocale));
      } catch {
        if (!cancelled) setLines(getDailyQuestLoadingLines(undefined, 'first-today', appLocale));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appLocale]);

  const enter = useRef(new Animated.Value(0)).current;
  const barPos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 58,
    }).start();
  }, [enter]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(barPos, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(barPos, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [barPos]);

  const floatStyle = {
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [0, 1],
          outputRange: [22, 0],
        }),
      },
    ],
  };

  const barLeft = barPos.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '62%'],
  });

  return (
    <View style={styles.outer}>
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.glowOrange} pointerEvents="none" />
      <Animated.View style={[styles.floatCol, floatStyle]}>
        <View style={styles.iconCluster}>
          <View style={styles.iconSparklesWrap} accessibilityElementsHidden>
            <UiLucideIcon name="Sparkles" size={22} color="rgba(245, 158, 11, 0.88)" strokeWidth={1.8} />
          </View>
          <UiLucideIcon name="Compass" size={52} color="#115e59" strokeWidth={1.35} />
        </View>
        {lines ? (
          <>
            <Text style={[styles.primary, compact && styles.primaryCompact]}>{lines.primary}</Text>
            <Text style={styles.secondary}>{lines.secondary}</Text>
          </>
        ) : (
          <View style={styles.textPlaceholder} accessibilityElementsHidden />
        )}

        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                left: barLeft,
                backgroundColor: palette.cyan,
                shadowColor: palette.cyan,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.45,
                shadowRadius: 8,
              },
            ]}
          />
        </View>

        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          <View style={[styles.dot, { backgroundColor: palette.cyan }]} />
          <View style={[styles.dot, { backgroundColor: palette.orange, opacity: 0.9 }]} />
          <View style={[styles.dot, { backgroundColor: palette.gold, opacity: 0.85 }]} />
        </View>
      </Animated.View>
    </View>
  );
}
