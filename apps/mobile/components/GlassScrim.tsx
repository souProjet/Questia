import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

type Tint = 'light' | 'dark' | 'default';

export type GlassScrimProps = {
  /** Voile par-dessus le flou (ex. palette.overlay ou rgba). */
  overlayColor: string;
  intensity?: number;
  tint?: Tint;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fond type glassmorphisme (flou natif iOS/Android via expo-blur + voile).
 * Sur web Expo, repli : voile seul.
 */
export function GlassScrim({
  overlayColor,
  intensity = 50,
  tint = 'dark',
  onPress,
  accessibilityLabel,
  style,
}: GlassScrimProps) {
  const blur =
    Platform.OS === 'web' ? null : (
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFillObject} />
    );

  const veil = (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor }]}
    />
  );

  if (onPress) {
    return (
      <Pressable
        style={[StyleSheet.absoluteFillObject, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {blur}
        {veil}
      </Pressable>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, style]}>
      {blur}
      {veil}
    </View>
  );
}
