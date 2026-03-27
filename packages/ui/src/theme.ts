import { getThemePalette as getThemePaletteInner, type ThemePalette as ThemePaletteInner } from './themePalettes';

/**
 * Palette DA claire Questia (alignée sur docs/direction-artistique + apps/web globals).
 * Valeur par défaut ; les thèmes boutique utilisent `getThemePalette`.
 */
export const DA = {
  bg: '#e8f8ff',
  surface: '#f5fbff',
  card: '#ffffff',
  cardCream: '#fffdf5',
  border: 'rgba(19,33,45,0.12)',
  borderCyan: 'rgba(34,211,238,0.25)',
  text: '#13212d',
  muted: '#4d7187',
  cyan: '#22d3ee',
  orange: '#f97316',
  gold: '#fbbf24',
  green: '#10b981',
  /** Voile modales (lisible, pas noir pur) */
  overlay: 'rgba(19, 33, 45, 0.45)',
  divider: 'rgba(19, 33, 45, 0.12)',
  trackMuted: 'rgba(19, 33, 45, 0.15)',
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
  missionBlockGradient,
  questDayStripGradient,
  questActionsFooterGradient,
} from './themePalettes';
