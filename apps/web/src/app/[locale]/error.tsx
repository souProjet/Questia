'use client';

import { useEffect } from 'react';
import { AppErrorView } from '@/components/AppErrorView';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Questia]', error.digest ?? error.message, error);
  }, [error]);

  return <AppErrorView reset={reset} />;
}
