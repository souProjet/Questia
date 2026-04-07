import { useEffect } from 'react';
import { usePostHog } from 'posthog-react-native';
import { setMobilePostHog } from './track';

/** Expose le client PostHog au module track.ts (hors hooks). */
export function PostHogClientRegister() {
  const posthog = usePostHog();
  useEffect(() => {
    setMobilePostHog(posthog);
    return () => setMobilePostHog(null);
  }, [posthog]);
  return null;
}
