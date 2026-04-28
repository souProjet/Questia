import { themeUsesLightStatusBar } from '@questia/ui';

export type ModalSheetGlass = {
  /** `expo-blur` : thème clair → flou « light », Minuit → flou « dark » pour matcher la feuille. */
  sheetBlurTint: 'light' | 'dark';
  sheetBlurIntensity: number;
  /** Voile semi-transparent par-dessus le flou (`colorWithAlpha(palette.card, α)`). */
  sheetVeilAlpha: number;
};

/**
 * Paramètres de glassmorphisme pour les feuilles modales (bas de écran, sélecteurs).
 * Évite le flou « light » sur fond déjà sombre (thème Minuit).
 */
export function getModalSheetGlass(themeId: string): ModalSheetGlass {
  if (themeUsesLightStatusBar(themeId)) {
    return { sheetBlurTint: 'dark', sheetBlurIntensity: 48, sheetVeilAlpha: 0.74 };
  }
  return { sheetBlurTint: 'light', sheetBlurIntensity: 56, sheetVeilAlpha: 0.62 };
}

/** Flou + teinte du scrim plein écran (`GlassScrim` derrière cartes / overlays). */
export function getScrimGlass(themeId: string): { intensity: number; tint: 'light' | 'dark' } {
  if (themeUsesLightStatusBar(themeId)) {
    return { intensity: 52, tint: 'dark' };
  }
  return { intensity: 58, tint: 'light' };
}
