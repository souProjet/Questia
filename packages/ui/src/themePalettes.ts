/**
 * Palettes d’app mobile alignées sur apps/web globals.css (data-theme).
 */
export type ThemePalette = {
  bg: string;
  surface: string;
  card: string;
  cardCream: string;
  border: string;
  borderCyan: string;
  text: string;
  muted: string;
  /** Texte tertiaire (équivalent --subtle) */
  subtle: string;
  /** Accents / liens sur fond aventure (équivalent --link-on-bg) */
  linkOnBg: string;
  /** Fonds champs / surfaces saisie (équivalent --input-bg) */
  inputBg: string;
  /** Texte sur panneaux toujours clairs — inchangé par thème (équivalent --on-cream) */
  onCream: string;
  onCreamMuted: string;
  cyan: string;
  orange: string;
  gold: string;
  green: string;
  overlay: string;
  divider: string;
  trackMuted: string;
};

const defaultPalette: ThemePalette = {
  bg: '#e8f8ff',
  surface: '#f5fbff',
  card: '#ffffff',
  cardCream: '#fffdf5',
  border: 'rgba(19,33,45,0.12)',
  borderCyan: 'rgba(34,211,238,0.25)',
  text: '#13212d',
  muted: '#4d7187',
  subtle: '#8bb9d1',
  linkOnBg: '#155e75',
  inputBg: '#ffffff',
  onCream: '#13212d',
  onCreamMuted: '#4d6570',
  cyan: '#22d3ee',
  orange: '#f97316',
  gold: '#fbbf24',
  green: '#10b981',
  overlay: 'rgba(19, 33, 45, 0.45)',
  divider: 'rgba(19, 33, 45, 0.12)',
  trackMuted: 'rgba(15, 23, 42, 0.12)',
};

const midnightPalette: ThemePalette = {
  bg: '#0a101c',
  surface: '#111b2e',
  card: '#152238',
  cardCream: '#f1f5f9',
  border: 'rgba(232, 241, 250, 0.14)',
  borderCyan: 'rgba(56, 189, 248, 0.4)',
  text: '#f1f5f9',
  muted: '#b4c4d8',
  subtle: '#94a8bc',
  linkOnBg: '#7dd3fc',
  inputBg: '#0f1729',
  onCream: '#13212d',
  onCreamMuted: '#4d6570',
  cyan: '#38bdf8',
  orange: '#fb923c',
  gold: '#fcd34d',
  green: '#34d399',
  overlay: 'rgba(0, 0, 0, 0.58)',
  divider: 'rgba(232, 241, 250, 0.12)',
  trackMuted: 'rgba(255, 255, 255, 0.14)',
};

const auroraPalette: ThemePalette = {
  bg: '#fdf4ff',
  surface: '#fff7fb',
  card: '#ffffff',
  cardCream: '#fffdf8',
  border: 'rgba(59, 7, 100, 0.12)',
  borderCyan: 'rgba(192, 38, 211, 0.32)',
  text: '#3b0764',
  muted: '#6b21a8',
  subtle: '#9333b8',
  linkOnBg: '#6d28d9',
  inputBg: '#ffffff',
  onCream: '#13212d',
  onCreamMuted: '#4d6570',
  cyan: '#c026d3',
  orange: '#ea580c',
  gold: '#fbbf24',
  green: '#059669',
  overlay: 'rgba(59, 7, 100, 0.42)',
  divider: 'rgba(59, 7, 100, 0.12)',
  trackMuted: 'rgba(59, 7, 100, 0.1)',
};

const parchmentPalette: ThemePalette = {
  bg: '#f5f0e6',
  surface: '#faf6ee',
  card: '#fffdf8',
  cardCream: '#fffdf5',
  border: 'rgba(61, 52, 40, 0.12)',
  borderCyan: 'rgba(13, 148, 136, 0.3)',
  text: '#3d3428',
  muted: '#6b5d4a',
  subtle: '#8a7b68',
  linkOnBg: '#92400e',
  inputBg: '#fffdf8',
  onCream: '#13212d',
  onCreamMuted: '#4d6570',
  cyan: '#0d9488',
  orange: '#c2410c',
  gold: '#ca8a04',
  green: '#15803d',
  overlay: 'rgba(61, 52, 40, 0.45)',
  divider: 'rgba(61, 52, 40, 0.12)',
  trackMuted: 'rgba(61, 52, 40, 0.14)',
};

export function getThemePalette(themeId: string | null | undefined): ThemePalette {
  switch (themeId) {
    case 'midnight':
      return midnightPalette;
    case 'aurora':
      return auroraPalette;
    case 'parchment':
      return parchmentPalette;
    default:
      return defaultPalette;
  }
}

export function themeUsesLightStatusBar(themeId: string): boolean {
  return themeId === 'midnight';
}

/** rgba() à partir d’un hex #RRGGBB (pour teinter l’accent du thème sans couleurs figées). */
export function colorWithAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Texte « panneau » : crème (#onCream) en thème clair par défaut, sinon couleurs du thème actif. */
export function themePanelText(themeId: string | null | undefined, p: ThemePalette): string {
  return themeId && themeId !== 'default' ? p.text : p.onCream;
}

export function themePanelMuted(themeId: string | null | undefined, p: ThemePalette): string {
  return themeId && themeId !== 'default' ? p.muted : p.onCreamMuted;
}

export function heroBandGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return ['#fffbeb', '#ffffff', 'rgba(236,254,255,0.92)'];
  }
  return [colorWithAlpha(p.gold, 0.22), p.card, colorWithAlpha(p.cyan, 0.12)];
}

export function shopBalanceGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return ['#fffbeb', '#ffffff', '#fef3c7'];
  }
  return [colorWithAlpha(p.gold, 0.22), p.surface, colorWithAlpha(p.gold, 0.14)];
}

export function questSliderEmbeddedGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return ['#fff7df', '#fff3c6', '#d7f5f9'];
  }
  return [colorWithAlpha(p.gold, 0.2), p.card, colorWithAlpha(p.cyan, 0.14)];
}

export function missionBlockGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return ['#ffffff', 'rgba(224,242,254,0.55)', '#ffffff'];
  }
  return [p.card, colorWithAlpha(p.cyan, 0.1), p.surface];
}

export function questDayStripGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return ['rgba(255,247,237,0.98)', 'rgba(255,255,255,0.96)', 'rgba(254,243,199,0.55)'];
  }
  return [colorWithAlpha(p.orange, 0.12), p.card, colorWithAlpha(p.gold, 0.1)];
}

/** Fond sous les boutons d’action (valider, relancer, etc.) */
export function questActionsFooterGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return ['rgba(255,255,255,0.88)', 'rgba(255,251,235,0.55)', 'rgba(236,254,255,0.45)'];
  }
  return [colorWithAlpha(p.surface, 0.98), colorWithAlpha(p.card, 0.95), colorWithAlpha(p.cyan, 0.12)];
}
