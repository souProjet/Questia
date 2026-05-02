import { getThemePalette as getThemePaletteInner, type ThemePalette as ThemePaletteInner } from './themePalettes';

/**
 * Palette DA Questia — papier chaud, accents terreux (peu de « template » vitré / néon).
 * Valeur par défaut ; les thèmes boutique utilisent `getThemePalette`.
 */
export const DA = {
  bg: '#ebe8e0',
  surface: '#f2efe8',
  card: '#faf8f4',
  cardCream: '#fdfaf5',
  border: 'rgba(28, 25, 23, 0.09)',
  borderCyan: 'rgba(19, 78, 74, 0.22)',
  text: '#1c1917',
  muted: '#57534e',
  cyan: '#134e4a',
  orange: '#c2410c',
  gold: '#92400e',
  green: '#166534',
  overlay: 'rgba(12, 10, 9, 0.42)',
  divider: 'rgba(28, 25, 23, 0.1)',
  trackMuted: 'rgba(28, 25, 23, 0.12)',
} as const;

export type ThemePalette = ThemePaletteInner;

export function getThemePalette(themeId: string | null | undefined): ThemePalette {
  return getThemePaletteInner(themeId);
}

export {
  themeUsesLightStatusBar,
  colorWithAlpha,
  themePanelText,
  themePanelMuted,
  heroBandGradient,
  shopBalanceGradient,
  questSliderEmbeddedGradient,
  questRewardModalCardGradient,
  shareScreenPhotoAddGradient,
  missionBlockGradient,
  questDayStripGradient,
  questActionsFooterGradient,
  questCardFaceGradient,
  homeScreenBackdropGradient,
  homeScreenBackdropOrbTints,
} from './themePalettes';
