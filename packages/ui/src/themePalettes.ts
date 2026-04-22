/**
 * Palettes d'app mobile alignées sur apps/web globals.css (data-theme).
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
  bg: '#ebe8e0',
  surface: '#f2efe8',
  card: '#faf8f4',
  cardCream: '#fdfaf5',
  border: 'rgba(28, 25, 23, 0.09)',
  borderCyan: 'rgba(19, 78, 74, 0.22)',
  text: '#1c1917',
  muted: '#57534e',
  subtle: '#78716c',
  linkOnBg: '#115e59',
  inputBg: '#ffffff',
  onCream: '#1c1917',
  onCreamMuted: '#57534e',
  cyan: '#134e4a',
  orange: '#c2410c',
  gold: '#92400e',
  green: '#166534',
  overlay: 'rgba(12, 10, 9, 0.42)',
  divider: 'rgba(28, 25, 23, 0.1)',
  trackMuted: 'rgba(28, 25, 23, 0.12)',
};

const midnightPalette: ThemePalette = {
  bg: '#0c0a09',
  surface: '#1c1917',
  card: '#292524',
  cardCream: '#f5f5f4',
  border: 'rgba(231, 229, 228, 0.1)',
  borderCyan: 'rgba(45, 212, 191, 0.25)',
  text: '#e7e5e4',
  muted: '#a8a29e',
  subtle: '#78716c',
  linkOnBg: '#5eead4',
  inputBg: '#1c1917',
  onCream: '#1c1917',
  onCreamMuted: '#57534e',
  cyan: '#2dd4bf',
  orange: '#fb923c',
  gold: '#fcd34d',
  green: '#4ade80',
  overlay: 'rgba(0, 0, 0, 0.55)',
  divider: 'rgba(231, 229, 228, 0.1)',
  trackMuted: 'rgba(255, 255, 255, 0.1)',
};

const auroraPalette: ThemePalette = {
  bg: '#e8e4e1',
  surface: '#f0ebe6',
  card: '#faf7f3',
  cardCream: '#fdfaf7',
  border: 'rgba(41, 37, 36, 0.09)',
  borderCyan: 'rgba(15, 118, 110, 0.2)',
  text: '#292524',
  muted: '#57534e',
  subtle: '#78716c',
  linkOnBg: '#115e59',
  inputBg: '#ffffff',
  onCream: '#1c1917',
  onCreamMuted: '#57534e',
  cyan: '#0f766e',
  orange: '#9a3412',
  gold: '#854d0e',
  green: '#166534',
  overlay: 'rgba(28, 25, 23, 0.4)',
  divider: 'rgba(41, 37, 36, 0.09)',
  trackMuted: 'rgba(41, 37, 36, 0.08)',
};

const parchmentPalette: ThemePalette = {
  bg: '#e7e2d8',
  surface: '#efe9df',
  card: '#faf6ee',
  cardCream: '#fffdf8',
  border: 'rgba(54, 47, 40, 0.1)',
  borderCyan: 'rgba(22, 101, 52, 0.2)',
  text: '#292524',
  muted: '#57534e',
  subtle: '#78716c',
  linkOnBg: '#14532d',
  inputBg: '#fffdf8',
  onCream: '#1c1917',
  onCreamMuted: '#57534e',
  cyan: '#166534',
  orange: '#9a3412',
  gold: '#854d0e',
  green: '#15803d',
  overlay: 'rgba(40, 32, 24, 0.4)',
  divider: 'rgba(54, 47, 40, 0.09)',
  trackMuted: 'rgba(54, 47, 40, 0.1)',
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

/** rgba() à partir d'un hex #RRGGBB (pour teinter l'accent du thème sans couleurs figées). */
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
    return ['rgba(255, 255, 255, 0.88)', p.card, colorWithAlpha(p.cyan, 0.08)];
  }
  return [colorWithAlpha(p.gold, 0.22), p.card, colorWithAlpha(p.cyan, 0.12)];
}

export function shopBalanceGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return [colorWithAlpha(p.gold, 0.18), p.surface, colorWithAlpha(p.gold, 0.1)];
  }
  return [colorWithAlpha(p.gold, 0.22), p.surface, colorWithAlpha(p.gold, 0.14)];
}

export function questSliderEmbeddedGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return [colorWithAlpha(p.gold, 0.14), p.card, colorWithAlpha(p.cyan, 0.1)];
  }
  return [colorWithAlpha(p.gold, 0.2), p.card, colorWithAlpha(p.cyan, 0.14)];
}

/**
 * Bloc « Ajouter une photo » (écran carte à partager) — sur minuit / aurore, dégradé plus doux
 * pour limiter le banding Android ; sur l’app, éviter elevation+overflow sur le même nœud que le gradient.
 */
export function shareScreenPhotoAddGradient(
  themeId: string | null | undefined,
  p: ThemePalette,
): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return [colorWithAlpha(p.gold, 0.12), p.card, colorWithAlpha(p.cyan, 0.08)];
  }
  if (themeId === 'midnight') {
    return [colorWithAlpha(p.cyan, 0.12), p.surface, colorWithAlpha(p.card, 1)];
  }
  if (themeId === 'aurora') {
    return [
      colorWithAlpha(p.card, 1),
      colorWithAlpha(p.cyan, 0.08),
      colorWithAlpha(p.surface, 1),
    ];
  }
  return questSliderEmbeddedGradient(themeId, p);
}

export function missionBlockGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return [p.card, colorWithAlpha(p.cyan, 0.08), p.surface];
  }
  return [p.card, colorWithAlpha(p.cyan, 0.1), p.surface];
}

export function questDayStripGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return [colorWithAlpha(p.orange, 0.1), p.card, colorWithAlpha(p.gold, 0.12)];
  }
  return [colorWithAlpha(p.orange, 0.12), p.card, colorWithAlpha(p.gold, 0.1)];
}

/** Fond sous les boutons d'action (valider, relancer, etc.) */
export function questActionsFooterGradient(themeId: string | null | undefined, p: ThemePalette): [string, string, string] {
  if (!themeId || themeId === 'default') {
    return [colorWithAlpha(p.card, 0.92), colorWithAlpha(p.surface, 0.88), colorWithAlpha(p.cyan, 0.06)];
  }
  return [colorWithAlpha(p.surface, 0.98), colorWithAlpha(p.card, 0.95), colorWithAlpha(p.cyan, 0.12)];
}

/**
 * Dégradé de surface pour la carte quête (accueil) — reste lisible sur tous les thèmes.
 * 4 stops pour un halo doux cyan / chaud sans masquer le texte.
 */
export function questCardFaceGradient(
  themeId: string | null | undefined,
  p: ThemePalette,
): [string, string, string, string] {
  if (!themeId || themeId === 'default') {
    return [p.card, colorWithAlpha(p.gold, 0.05), colorWithAlpha(p.cyan, 0.07), p.surface];
  }
  if (themeId === 'midnight') {
    return [
      p.card,
      colorWithAlpha(p.cyan, 0.14),
      colorWithAlpha(p.orange, 0.1),
      p.surface,
    ];
  }
  if (themeId === 'aurora') {
    return [
      p.card,
      colorWithAlpha(p.cyan, 0.1),
      colorWithAlpha(p.gold, 0.08),
      p.surface,
    ];
  }
  if (themeId === 'parchment') {
    return [
      p.card,
      colorWithAlpha(p.cyan, 0.09),
      colorWithAlpha(p.orange, 0.07),
      p.surface,
    ];
  }
  return [p.card, colorWithAlpha(p.cyan, 0.1), colorWithAlpha(p.orange, 0.06), p.surface];
}

/** Fond plein écran derrière la carte (accueil) — 5 stops, lisible sur chaque thème. */
export function homeScreenBackdropGradient(
  themeId: string | null | undefined,
  p: ThemePalette,
): [string, string, string, string, string] {
  if (!themeId || themeId === 'default') {
    return [
      colorWithAlpha(p.cyan, 0.07),
      p.surface,
      colorWithAlpha(p.gold, 0.04),
      p.bg,
      colorWithAlpha(p.card, 0.45),
    ];
  }
  if (themeId === 'midnight') {
    return [
      '#060a12',
      colorWithAlpha(p.cyan, 0.08),
      p.bg,
      colorWithAlpha(p.orange, 0.045),
      '#04060c',
    ];
  }
  if (themeId === 'aurora') {
    return [
      colorWithAlpha(p.cyan, 0.08),
      p.surface,
      colorWithAlpha(p.gold, 0.06),
      p.bg,
      colorWithAlpha(p.cyan, 0.05),
    ];
  }
  if (themeId === 'parchment') {
    return [
      '#faf6ee',
      p.bg,
      colorWithAlpha(p.cyan, 0.06),
      colorWithAlpha(p.gold, 0.05),
      '#ebe4d6',
    ];
  }
  return [
    p.surface,
    colorWithAlpha(p.cyan, 0.08),
    p.bg,
    colorWithAlpha(p.gold, 0.05),
    p.surface,
  ];
}

/** Halos circulaires derrière la carte (accueil), en teintes du thème. */
export function homeScreenBackdropOrbTints(
  themeId: string | null | undefined,
  p: ThemePalette,
): { tr: string; bl: string; tl: string } {
  if (!themeId || themeId === 'default') {
    return {
      tr: colorWithAlpha(p.gold, 0.1),
      bl: colorWithAlpha(p.cyan, 0.11),
      tl: colorWithAlpha(p.text, 0.05),
    };
  }
  if (themeId === 'midnight') {
    return {
      tr: colorWithAlpha(p.orange, 0.1),
      bl: colorWithAlpha(p.cyan, 0.14),
      tl: colorWithAlpha(p.cyan, 0.07),
    };
  }
  if (themeId === 'aurora') {
    return {
      tr: colorWithAlpha(p.gold, 0.1),
      bl: colorWithAlpha(p.cyan, 0.12),
      tl: colorWithAlpha(p.cyan, 0.08),
    };
  }
  if (themeId === 'parchment') {
    return {
      tr: colorWithAlpha(p.gold, 0.09),
      bl: colorWithAlpha(p.cyan, 0.1),
      tl: colorWithAlpha(p.gold, 0.08),
    };
  }
  return {
    tr: colorWithAlpha(p.gold, 0.1),
    bl: colorWithAlpha(p.cyan, 0.12),
    tl: colorWithAlpha(p.cyan, 0.08),
  };
}
