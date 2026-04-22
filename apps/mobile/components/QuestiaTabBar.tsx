import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/AppThemeContext';
import { colorWithAlpha } from '@questia/ui';
import { hapticSelection } from '../lib/haptics';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<
  string,
  { inactive: IonName; active: IonName }
> = {
  home: { inactive: 'home-outline', active: 'home' },
  shop: { inactive: 'cart-outline', active: 'cart' },
  /** Liste / fil d'historique — plus homogène avec home · cart · person que journal-outline */
  history: { inactive: 'list-outline', active: 'list' },
  profile: { inactive: 'person-outline', active: 'person' },
};

const FALLBACK_ICONS: { inactive: IonName; active: IonName } = {
  inactive: 'ellipse-outline',
  active: 'ellipse',
};

/**
 * Barre d'onglets maison : libellés toujours visibles (sous l'icône),
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
          paddingTop: 8,
          borderTopWidth: 2,
          borderTopColor: colorWithAlpha(palette.cyan, 0.52),
        },
        Platform.select({
          ios: {
            shadowColor: palette.text,
            shadowOpacity: 0.12,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: -5 },
          },
          android: { elevation: 14 },
        }),
      ]}
    >
      {Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: colorWithAlpha(palette.surface, 0.94) }]}
        />
      ) : (
        <BlurView
          pointerEvents="none"
          intensity={Platform.OS === 'ios' ? 96 : 72}
          tint="light"
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colorWithAlpha(palette.card, Platform.OS === 'ios' ? 0.42 : 0.62) },
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const title = options.title ?? route.name;
        const label =
          typeof options.tabBarLabel === 'string' ? options.tabBarLabel : String(title);

        const icons = TAB_ICONS[route.name] ?? FALLBACK_ICONS;
        const iconColor = focused ? palette.orange : palette.muted;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            hapticSelection();
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
            <View style={styles.iconWrap} importantForAccessibility="no">
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={24}
                color={iconColor}
              />
            </View>
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
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    borderTopWidth: 0,
    paddingTop: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    minHeight: 48,
  },
  tabPressed: { opacity: 0.85 },
  iconWrap: {
    height: 26,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
