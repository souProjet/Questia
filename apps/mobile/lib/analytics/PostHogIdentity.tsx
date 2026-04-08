import { useEffect } from 'react';
import { useUser } from '@clerk/expo';
import { usePostHog } from 'posthog-react-native';

/** Associe l'utilisateur Clerk (distinct_id) — pas d'email dans les propriétés. */
export function PostHogIdentity() {
  const { user } = useUser();
  const posthog = usePostHog();

  useEffect(() => {
    if (!user) {
      posthog.reset();
      return;
    }
    posthog.identify(user.id, { app: 'questia_mobile' });
  }, [user, posthog]);

  return null;
}
