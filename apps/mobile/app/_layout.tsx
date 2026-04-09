import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DA } from '@questia/ui';
import { AppLocaleProvider } from '../contexts/AppLocaleContext';
import { AppThemeProvider, useAppTheme } from '../contexts/AppThemeContext';
import { setupNotificationHandler } from '../lib/pushNotifications';
import { PostHogRoot } from '../lib/analytics/PostHogRoot';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={errStyles.container}>
      <Text style={errStyles.title}>Erreur</Text>
      <Text style={errStyles.message}>{error.message}</Text>
      <Pressable style={errStyles.btn} onPress={retry}>
        <Text style={errStyles.btnText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

const errStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DA.bg, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#ef4444', marginBottom: 12 },
  message: { fontSize: 14, color: DA.text, fontFamily: 'monospace', marginBottom: 16 },
  hint: { fontSize: 13, color: DA.muted, marginBottom: 24, lineHeight: 20 },
  btn: { backgroundColor: '#f97316', paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

function InitialLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { statusBarStyle } = useAppTheme();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const segs = segments as string[];
    const first = segs[0];
    const inAuthGroup = first === '(auth)';
    const path = pathname || '/';
    const atIndexGate = path === '/' || path === '';
    const atOnboarding = atIndexGate || path === '/onboarding' || path.startsWith('/onboarding/');
    if (isSignedIn && (inAuthGroup || atOnboarding)) {
      router.replace('/home');
    } else if (!isSignedIn && !inAuthGroup && !atOnboarding) {
      router.replace('/(auth)' as never);
    }
  }, [isSignedIn, isLoaded, segments, pathname, router]);

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void setupNotificationHandler();
  }, []);

  if (!PUBLISHABLE_KEY) {
    return (
      <View style={errStyles.container}>
        <Text style={errStyles.title}>Configuration manquante</Text>
        <Text style={errStyles.message}>
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY est vide dans apps/mobile/.env
        </Text>
        <Text style={errStyles.hint}>
          Copie la clé depuis apps/web/.env, redémarre Expo (Ctrl+C puis npx expo start).
        </Text>
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <AppLocaleProvider>
          <AppThemeProvider>
            <PostHogRoot>
              <InitialLayout />
            </PostHogRoot>
          </AppThemeProvider>
        </AppLocaleProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
