import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

let Notifications: typeof import('expo-notifications') | null = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function getNotificationsModule() {
  if (Notifications) return Notifications;
  if (isExpoGo()) return null;
  try {
    Notifications = await import('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
}

/**
 * Configure le handler de notification (appeler une seule fois, au mount de l'app).
 * No-op dans Expo Go.
 */
export async function setupNotificationHandler() {
  const mod = await getNotificationsModule();
  if (!mod) return;
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function resolveProjectId(): string | undefined {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const raw = fromEnv ?? fromConfig;
  if (!raw || String(raw).startsWith('REPLACE')) return undefined;
  return String(raw);
}

/**
 * Demande la permission et renvoie un jeton Expo Push, ou null (simulateur, refus, projet non configuré, Expo Go).
 */
export async function registerForExpoPushTokenAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const mod = await getNotificationsModule();
  if (!mod) return null;

  const { status: existing } = await mod.getPermissionsAsync();
  if (existing === 'denied') {
    return null;
  }
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await mod.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await mod.setNotificationChannelAsync('default', {
      name: 'default',
      importance: mod.AndroidImportance.DEFAULT,
    });
  }

  const projectId = resolveProjectId();
  if (!projectId) return null;

  try {
    const token = await mod.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}
