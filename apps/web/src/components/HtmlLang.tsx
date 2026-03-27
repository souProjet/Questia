'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

/** Synchronise `<html lang>` avec la locale active (FR sans préfixe, EN sous `/en`). */
export function HtmlLang() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
