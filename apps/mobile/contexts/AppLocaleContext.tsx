import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLocale } from '@questia/shared';

const STORAGE_KEY = '@questia/app_locale';

export function systemFallbackLocale(): AppLocale {
  const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? 'fr';
  return tag.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

function parseStoredLocale(raw: string | null): AppLocale | null {
  if (raw === 'fr' || raw === 'en') return raw;
  return null;
}

type AppLocaleContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => Promise<void>;
};

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

export function AppLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(systemFallbackLocale);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = parseStoredLocale(raw);
        if (!cancelled && parsed) setLocaleState(parsed);
      } catch {
        /* garde la locale système */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    setLocaleState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* la préférence reste en mémoire pour la session */
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <AppLocaleContext.Provider value={value}>{children}</AppLocaleContext.Provider>;
}

export function useAppLocale(): AppLocaleContextValue {
  const ctx = useContext(AppLocaleContext);
  if (!ctx) {
    throw new Error('useAppLocale doit être utilisé dans un AppLocaleProvider');
  }
  return ctx;
}
