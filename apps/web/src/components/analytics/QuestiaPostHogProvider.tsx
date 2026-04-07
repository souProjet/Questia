'use client';

import { useEffect } from 'react';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import posthog from 'posthog-js';
import { analyticsConfig } from '@/config/analytics';
import { initPostHogBrowser } from '@/lib/analytics/posthog-web';

/**
 * Initialise PostHog (opt-out par défaut, synchronisé avec le bandeau cookies via posthog-web).
 */
export function QuestiaPostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHogBrowser();
  }, []);

  if (!analyticsConfig.posthogKey) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
