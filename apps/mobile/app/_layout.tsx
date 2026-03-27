import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { DA } from '@questia/ui';
import { AppLocaleProvider } from '../contexts/AppLocaleContext';
import { AppThemeProvider, useAppTheme } from '../contexts/AppThemeContext';
import { setupNotificationHandler } from '../lib/pushNotifications';
import { hasOnboardingAnswers } from '../lib/onboardingGate';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={errStyles.container}>
      <Text style={errStyles.title}>Erreur</Text>
      <Text style={errStyles.message}>{error.message}</Text>
      <Text style={errStyles.hint}>
        Vérifie que .env contient EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY et redémarre Expo (Ctrl+C puis npx expo start).
      </Text>
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

const tokenCache = {
  async getToken(key: string) {
    try { return await SecureStore.getItemAsync(key); }
    catch { return null; }
  },
  async saveToken(key: string, value: string) {
    try { await SecureStore.setItemAsync(key, value); }
    catch {}
  },
  async clearToken(key: string) {
    try { await SecureStore.deleteItemAsync(key); }
    catch {}
  },
};

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

function InitialLayout() {
  const { userId, isLoaded } = useAuth();
  const { statusBarStyle } = useAppTheme();
  const segments = useSegments();
  const router = useRouter();
  const authed = Boolean(userId);

  useEffect(() => {
    if (!isLoaded) return;
    const segs = (segments ?? []) as string[];
    const first = segs[0];
    const inAuthGroup = first === '(auth)';
    // `segs.length === 0` : transition Expo Router — ne pas traiter comme « hors zone protégée ».
    const atOnboarding = segs.length === 0 || first === 'index';

    if (authed && inAuthGroup) {
      router.replace('/home');
      return;
    }

    if (authed && atOnboarding) {
      let cancelled = false;
      void (async () => {
        const ok = await hasOnboardingAnswers();
        if (!cancelled && ok) router.replace('/home');
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!authed && !inAuthGroup && !atOnboarding) {
      router.replace('/(auth)' as never);
    }
  }, [authed, isLoaded, segments, router]);

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
            <InitialLayout />
          </AppThemeProvider>
        </AppLocaleProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
