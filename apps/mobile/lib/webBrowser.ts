import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

/** Sur iOS/Android : vérifie le module natif avant tout import de `expo-web-browser`. Sur web, pas de module ExpoWebBrowser. */
export function isExpoWebBrowserNativeAvailable(): boolean {
  if (Platform.OS === 'web') return true;
  return requireOptionalNativeModule('ExpoWebBrowser') != null;
}

export async function maybeCompleteAuthSession(): Promise<void> {
  if (!isExpoWebBrowserNativeAvailable()) return;
  const WebBrowser = await import('expo-web-browser');
  WebBrowser.maybeCompleteAuthSession();
}
