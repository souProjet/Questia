import { ClerkProvider, useAuth } from '@clerk/expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

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
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    // segments[0] is the first route segment, cast to string to support route groups
    const inAuthGroup = (segments[0] as string) === '(auth)';
    if (isSignedIn && inAuthGroup) {
      router.replace('/dashboard');
    } else if (!isSignedIn && !inAuthGroup) {
      // Use the route group path with type assertion
      router.replace('/(auth)' as never);
    }
  }, [isSignedIn, isLoaded, segments, router]);

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <InitialLayout />
    </ClerkProvider>
  );
}
