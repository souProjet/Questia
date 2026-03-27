'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { AnalyticsEvent } from '@/lib/analytics/events';
import { trackAnalyticsEvent } from '@/lib/analytics/track';

const SIGNUP_FLAG = 'questia_analytics_signup_done';
const LOGIN_SESSION = 'questia_analytics_login_session';

/**
 * login : une fois par onglet et par utilisateur (sessionStorage) après connexion Clerk.
 * sign_up : une fois par compte (localStorage) si le compte vient d’être créé (fenêtre 10 min).
 */
export function AnalyticsClerkTracker() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const id = user.id;

    try {
      if (typeof window === 'undefined') return;

      if (sessionStorage.getItem(LOGIN_SESSION) !== id) {
        trackAnalyticsEvent(AnalyticsEvent.login, { method: 'clerk' });
        sessionStorage.setItem(LOGIN_SESSION, id);
      }

      const created = user.createdAt ? new Date(user.createdAt).getTime() : 0;
      const recent = Date.now() - created < 10 * 60 * 1000;
      if (recent && !localStorage.getItem(`${SIGNUP_FLAG}_${id}`)) {
        trackAnalyticsEvent(AnalyticsEvent.signUp, { method: 'clerk' });
        localStorage.setItem(`${SIGNUP_FLAG}_${id}`, '1');
      }
    } catch {
      /* quota / navigation privée */
    }
  }, [isLoaded, user]);

  return null;
}
