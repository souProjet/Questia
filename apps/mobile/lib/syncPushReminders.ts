import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { registerForExpoPushTokenAsync } from './pushNotifications';

import { API_BASE_URL } from './api';
const PUSH_TOKEN_STORAGE_KEY = 'questia_expo_push_token';

function deviceTimeZoneIana(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    if (!tz) return null;
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/**
 * Demande la permission système si besoin, enregistre le jeton Expo et active les rappels push côté profil.
 * Aucune UI Questia — uniquement les dialogues natifs.
 */
export async function syncPushRemindersWithServer(getToken: () => Promise<string | null>): Promise<void> {
  const authToken = await getToken();
  if (!authToken) return;

  const expoToken = await registerForExpoPushTokenAsync();
  if (!expoToken) return;

  const reg = await fetch(`${API_BASE_URL}/api/notifications/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token: expoToken, platform: Platform.OS }),
  });
  if (!reg.ok) return;

  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expoToken);

  const tz = deviceTimeZoneIana();
  const body: Record<string, unknown> = { reminderPushEnabled: true };
  if (tz) body.reminderTimezone = tz;

  await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });
}
