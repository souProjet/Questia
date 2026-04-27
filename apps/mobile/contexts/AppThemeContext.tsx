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
import type { PersonalityVector } from '@questia/shared';

import { API_BASE_URL } from '../lib/api';

export type AppThemeContextValue = {
  palette: ThemePalette;
  themeId: string;
  /**
   * Personnalité exhibée (calculée depuis le comportement) ou déclarée
   * (saisie lors de l'onboarding), utilisée pour le Profil Aura Visuelle.
   * Null si le profil n'est pas encore chargé ou si l'utilisateur n'est pas connecté.
   */
  personality: PersonalityVector | null;
  refresh: () => Promise<void>;
  statusBarStyle: 'light' | 'dark';
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const [themeId, setThemeId] = useState('default');
  const [personality, setPersonality] = useState<PersonalityVector | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setThemeId('default');
      setPersonality(null);
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
      const j = (await res.json()) as {
        shop?: { activeThemeId?: string | null };
        exhibitedPersonality?: PersonalityVector | null;
        declaredPersonality?: PersonalityVector | null;
      };
      const id = j.shop?.activeThemeId ?? 'default';
      setThemeId(typeof id === 'string' && id.length > 0 ? id : 'default');
      // Préférer la personnalité exhibée (comportementale) ; sinon déclarée
      setPersonality(j.exhibitedPersonality ?? j.declaredPersonality ?? null);
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
    () => ({ palette, themeId, personality, refresh, statusBarStyle }),
    [palette, themeId, personality, refresh, statusBarStyle],
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
