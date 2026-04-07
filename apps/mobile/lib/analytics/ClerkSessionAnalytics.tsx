import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/expo';
import { AnalyticsEvent } from '@questia/shared';
import { trackMobileEvent } from './track';

const SIGNUP_FLAG = 'questia_analytics_signup_done';

/**
 * Aligné sur le web : login une fois par « session » app (tant que l’écran reste monté),
 * sign_up si le compte a moins de 10 min et pas déjà signalé pour cet id.
 */
export function ClerkSessionAnalytics() {
  const { user, isLoaded } = useUser();
  const loginSent = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      loginSent.current = false;
      return;
    }
    if (!loginSent.current) {
      loginSent.current = true;
      trackMobileEvent(AnalyticsEvent.login, { method: 'clerk' });
    }

    const id = user.id;
    const created = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    const recent = Date.now() - created < 10 * 60 * 1000;
    if (!recent) return;

    void (async () => {
      try {
        const k = `${SIGNUP_FLAG}_${id}`;
        const done = await AsyncStorage.getItem(k);
        if (done) return;
        trackMobileEvent(AnalyticsEvent.signUp, { method: 'clerk' });
        await AsyncStorage.setItem(k, '1');
      } catch {
        /* ignore */
      }
    })();
  }, [isLoaded, user]);

  return null;
}
