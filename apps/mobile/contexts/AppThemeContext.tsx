import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useSegments } from 'expo-router';
import { getThemePalette, themeUsesLightStatusBar, type ThemePalette } from '@questia/ui';

import { API_BASE_URL } from '../lib/api';

export type AppThemeContextValue = {
  palette: ThemePalette;
  themeId: string;
  refresh: () => Promise<void>;
  statusBarStyle: 'light' | 'dark';
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const [themeId, setThemeId] = useState('default');

  const refresh = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setThemeId('default');
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return;
      const j = (await res.json()) as { shop?: { activeThemeId?: string | null } };
      const id = j.shop?.activeThemeId ?? 'default';
      setThemeId(typeof id === 'string' && id.length > 0 ? id : 'default');
    } catch {
      /* ignore */
    }
  }, [getToken, isSignedIn, isLoaded]);

  useEffect(() => {
    void refresh();
  }, [refresh, segments]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const palette = useMemo(() => getThemePalette(themeId), [themeId]);

  const statusBarStyle: 'light' | 'dark' = themeUsesLightStatusBar(themeId) ? 'light' : 'dark';

  const value = useMemo(
    () => ({ palette, themeId, refresh, statusBarStyle }),
    [palette, themeId, refresh, statusBarStyle],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme doit être utilisé dans AppThemeProvider');
  }
  return ctx;
}
