import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../contexts/AppThemeContext';
import { colorWithAlpha } from '@questia/ui';

const ICONS: Record<string, string> = {
  home: '⚔️',
  shop: '🛒',
  history: '📜',
  profile: '👤',
};

/**
 * Barre d’onglets maison : libellés toujours visibles (sous l’icône),
 * sans dépendre du calcul de hauteur interne de React Navigation.
 */
export function QuestiaTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const bottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 6);

  return (
    <View
      style={[
        styles.outer,
        {
          paddingBottom: bottom,
          backgroundColor: palette.cardCream,
          borderTopColor: colorWithAlpha(palette.cyan, 0.35),
        },
        Platform.select({
          ios: {
            shadowColor: palette.text,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
          },
          android: { elevation: 12 },
        }),
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const title = options.title ?? route.name;
        const label =
          typeof options.tabBarLabel === 'string' ? options.tabBarLabel : String(title);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.dispatch({
              ...CommonActions.navigate(route),
              target: state.key,
            });
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
          >
            <Text style={styles.icon} importantForAccessibility="no">
              {ICONS[route.name] ?? '·'}
            </Text>
            <Text
              style={[
                styles.label,
                { color: focused ? palette.orange : palette.muted },
              ]}
              numberOfLines={1}
              allowFontScaling
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    minHeight: 48,
  },
  tabPressed: { opacity: 0.85 },
  icon: {
    fontSize: 22,
    lineHeight: 26,
    marginBottom: 4,
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
});
