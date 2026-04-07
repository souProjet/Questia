'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { analyticsConfig } from '@/config/analytics';
import { hasAnalyticsConsent } from '@/lib/analytics/consent';
import { AnalyticsEvent } from '@/lib/analytics/events';
import { identifyPostHogUser, resetPostHogUser } from '@/lib/analytics/posthog-web';
import { trackAnalyticsEvent } from '@/lib/analytics/track';

const SIGNUP_FLAG = 'questia_analytics_signup_done';
const LOGIN_SESSION = 'questia_analytics_login_session';

/**
 * login : une fois par onglet et par utilisateur (sessionStorage) après connexion Clerk.
 * sign_up : une fois par compte (localStorage) si le compte vient d’être créé (fenêtre 10 min).
 */
export function AnalyticsClerkTracker() {
  const { user, isLoaded } = useUser();
  /** Dernier user Clerk vu — pour ne reset PostHog qu’après déconnexion réelle, pas sur chaque vue anonyme. */
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      if (typeof window === 'undefined') return;

      if (!user) {
        const wasLoggedIn = typeof prevUserIdRef.current === 'string';
        prevUserIdRef.current = null;
        if (wasLoggedIn && analyticsConfig.posthogKey) {
          resetPostHogUser();
        }
        return;
      }

      const id = user.id;
      prevUserIdRef.current = id;

      if (analyticsConfig.posthogKey && hasAnalyticsConsent()) {
        identifyPostHogUser(id, { app: 'questia_web' });
      }

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

  useEffect(() => {
    if (typeof window === 'undefined' || !analyticsConfig.posthogKey) return;
    const onConsent = () => {
      if (!user || !hasAnalyticsConsent()) return;
      identifyPostHogUser(user.id, { app: 'questia_web' });
    };
    window.addEventListener('questia-consent-change', onConsent);
    return () => window.removeEventListener('questia-consent-change', onConsent);
  }, [user]);

  return null;
}
