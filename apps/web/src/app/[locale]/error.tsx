'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AppErrorView } from '@/components/AppErrorView';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('ErrorPage');

  useEffect(() => {
    console.error('[Questia]', error.digest ?? error.message, error);
  }, [error]);

  return (
    <AppErrorView
      reset={reset}
      title={t('title')}
      description={t('description')}
      retryLabel={t('retry')}
      homeLabel={t('home')}
    />
  );
}
