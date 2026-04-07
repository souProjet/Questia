import React from 'react';
import { PostHogProvider } from 'posthog-react-native';
import { ClerkSessionAnalytics } from './ClerkSessionAnalytics';
import { PostHogClientRegister } from './PostHogClientRegister';
import { PostHogIdentity } from './PostHogIdentity';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

export function PostHogRoot({ children }: { children: React.ReactNode }) {
  if (!apiKey) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={apiKey}
      options={{
        host,
        enableSessionReplay: false,
        captureAppLifecycleEvents: true,
      }}
      autocapture={false}
    >
      <PostHogClientRegister />
      <PostHogIdentity />
      <ClerkSessionAnalytics />
      {children}
    </PostHogProvider>
  );
}
