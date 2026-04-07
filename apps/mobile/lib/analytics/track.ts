import type { PostHogEventProperties } from '@posthog/core';
import type { PostHog } from 'posthog-react-native';

const POSTHOG_DISABLED =
  process.env.EXPO_PUBLIC_POSTHOG_DISABLED === '1' ||
  process.env.EXPO_PUBLIC_POSTHOG_DISABLED === 'true';

let client: PostHog | null = null;

/** Enregistré par PostHogClientRegister (sous PostHogProvider). */
export function setMobilePostHog(ph: PostHog | null): void {
  client = ph;
}

export function trackMobileEvent(eventName: string, params?: PostHogEventProperties): void {
  if (POSTHOG_DISABLED || !process.env.EXPO_PUBLIC_POSTHOG_KEY) return;
  try {
    client?.capture(eventName, params);
  } catch {
    /* ignore */
  }
}
