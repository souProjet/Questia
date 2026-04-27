/**
 * Profil Aura Visuelle — mappe le vecteur de personnalité de l'utilisateur
 * vers des teintes chromatiques pour les orbes de fond (home, carte quête).
 *
 * Chaque dimension du Big Five + Sensation Seeking est associée à une famille
 * de teintes. Les 3 orbes (TR / BL / TL) reflètent respectivement :
 *   TR — énergie sociale (extraversion + thrillSeeking)   → orange ↔ rouge
 *   BL — créativité / harmonie (openness + agreeableness) → violet ↔ vert
 *   TL — ancrage / calme (conscientiousness + emotionalStability) → bleu ↔ or
 *
 * L'intensité visuelle est proportionnelle à la déviation par rapport à la
 * valeur neutre 0.5 : un profil parfaitement moyen donne les teintes du thème
 * par défaut ; un profil marqué renforce la couleur dominante.
 */

import type { PersonalityVector } from '@questia/shared';
import type { ThemePalette } from './themePalettes';
import { homeScreenBackdropOrbTints } from './themePalettes';

// ─── Helpers HSL ─────────────────────────────────────────────────────────────

/** Convertit HSL (H en degrés, S et L en [0,1]) + alpha vers rgba(). */
function hslToRgba(h: number, s: number, l: number, a: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)        { r = c; g = x; b = 0; }
  else if (h < 120)  { r = x; g = c; b = 0; }
  else if (h < 180)  { r = 0; g = c; b = x; }
  else if (h < 240)  { r = 0; g = x; b = c; }
  else if (h < 300)  { r = x; g = 0; b = c; }
  else               { r = c; g = 0; b = x; }
  return `rgba(${Math.round((r + m) * 255)},${Math.round((g + m) * 255)},${Math.round((b + m) * 255)},${a.toFixed(3)})`;
}

/**
 * Mélange circulaire de deux teintes (en degrés) pondérées.
 * Gère correctement le saut 0°/360° via projection sur vecteur unitaire.
 */
function blendHues(h1: number, w1: number, h2: number, w2: number): number {
  const r1 = (h1 * Math.PI) / 180;
  const r2 = (h2 * Math.PI) / 180;
  const x = w1 * Math.cos(r1) + w2 * Math.cos(r2);
  const y = w1 * Math.sin(r1) + w2 * Math.sin(r2);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─── Table de correspondance trait → teinte ──────────────────────────────────

/**
 * Chaque trait de personnalité est associé à une famille de teintes.
 * Les deux pôles (faible / élevé) ont des teintes opposées pour refléter
 * l'amplitude de la personnalité.
 */
const TRAIT_HUE: Record<keyof PersonalityVector, { low: number; high: number }> = {
  openness:               { low: 220, high: 280 }, // bleu terne → violet créatif
  conscientiousness:      { low: 35,  high: 210 }, // ambre → bleu ardoise
  extraversion:           { low: 200, high: 28  }, // cyan froid → orange chaleureux
  agreeableness:          { low: 20,  high: 130 }, // terracotta → vert tendre
  emotionalStability:     { low: 350, high: 50  }, // rouge anxieux → or serein
  thrillSeeking:          { low: 175, high: 0   }, // turquoise calme → rouge vif
  boredomSusceptibility:  { low: 130, high: 175 }, // vert → turquoise
};

/** Résout la teinte pour un trait donné en interpolant entre ses pôles. */
function traitHue(trait: keyof PersonalityVector, value: number): number {
  const { low, high } = TRAIT_HUE[trait];
  return blendHues(low, 1 - value, high, value);
}

// ─── Paramètres visuels par mode de thème ────────────────────────────────────

type AuraParams = {
  saturation: number;
  lightness: number;
  baseAlpha: number;
  /** Gain d'alpha quand le trait est très marqué (déviation max de 0.5). */
  intensityBoost: number;
};

function auraParams(themeId: string | null | undefined): AuraParams {
  if (themeId === 'midnight') {
    return { saturation: 0.70, lightness: 0.52, baseAlpha: 0.18, intensityBoost: 0.18 };
  }
  // Thèmes clairs (default, aurora, parchment) : plus affirmés
  return { saturation: 0.55, lightness: 0.64, baseAlpha: 0.13, intensityBoost: 0.14 };
}

// ─── Couleur d'un orbe ────────────────────────────────────────────────────────

/**
 * Calcule la couleur d'un orbe à partir de deux traits de personnalité.
 * Le trait dominant détermine la teinte ; l'intensité combinée règle l'opacité.
 */
function orbColor(
  t1: keyof PersonalityVector,
  t2: keyof PersonalityVector,
  pv: PersonalityVector,
  params: AuraParams,
): string {
  const v1 = pv[t1];
  const v2 = pv[t2];
  const total = v1 + v2;
  const w1 = total > 0 ? v1 / total : 0.5;
  const w2 = total > 0 ? v2 / total : 0.5;

  const h = blendHues(traitHue(t1, v1), w1, traitHue(t2, v2), w2);

  // Intensité = déviation moyenne par rapport à la neutralité (0.5)
  const avgValue = (v1 + v2) / 2;
  const intensity = Math.abs(avgValue - 0.5) * 2; // [0, 1]
  const alpha = params.baseAlpha + intensity * params.intensityBoost;

  return hslToRgba(h, params.saturation, params.lightness, alpha);
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Teintes des 3 orbes de fond (HomeBackdropShell + QuestSwipeCard)
 * basées sur la personnalité de l'utilisateur.
 *
 * Si `personality` est absent, délègue à `homeScreenBackdropOrbTints` (comportement thème).
 */
export function computeAuraOrbTints(
  personality: PersonalityVector | null | undefined,
  themeId: string | null | undefined,
  p: ThemePalette,
): { tr: string; bl: string; tl: string } {
  if (!personality) return homeScreenBackdropOrbTints(themeId, p);

  const params = auraParams(themeId);
  return {
    // TR — énergie/action : extraversion + thrillSeeking
    tr: orbColor('extraversion', 'thrillSeeking', personality, params),
    // BL — imaginaire/lien : openness + agreeableness
    bl: orbColor('openness', 'agreeableness', personality, params),
    // TL — ancrage/calme : conscientiousness + emotionalStability
    tl: orbColor('conscientiousness', 'emotionalStability', personality, params),
  };
}

/**
 * Teintes des blobs décoratifs sur la face de la carte quête.
 * Opacités plus faibles que les orbes du fond (surface blanche).
 *
 * Si `personality` est absent, retourne les teintes du thème par défaut.
 */
export function computeAuraCardBlobs(
  personality: PersonalityVector | null | undefined,
  themeId: string | null | undefined,
  p: ThemePalette,
  isDarkCard: boolean,
): { tr: string; bl: string; mid: string } {
  if (!personality) {
    return {
      tr:  `${p.orange}${isDarkCard ? '08' : '05'}`,
      bl:  `${p.cyan}${isDarkCard ? '07' : '04'}`,
      mid: `${p.gold}${isDarkCard ? '05' : '03'}`,
    };
  }

  const params: AuraParams = isDarkCard
    ? { saturation: 0.55, lightness: 0.56, baseAlpha: 0.055, intensityBoost: 0.04 }
    : { saturation: 0.45, lightness: 0.68, baseAlpha: 0.035, intensityBoost: 0.025 };

  return {
    tr:  orbColor('extraversion', 'thrillSeeking', personality, params),
    bl:  orbColor('openness', 'agreeableness', personality, params),
    mid: orbColor('conscientiousness', 'emotionalStability', personality, params),
  };
}

/**
 * Retourne les 3 teintes d'aura sous forme de variables CSS inline
 * (à injecter via style={{ '--aura-tr': ..., ... }} sur un élément web).
 *
 * Usage : `<div style={auraOrbCssVars(personality, themeId)} />`
 */
export function auraOrbCssVars(
  personality: PersonalityVector | null | undefined,
  themeId: string | null | undefined,
  p: ThemePalette,
): Record<string, string> {
  const tints = computeAuraOrbTints(personality, themeId, p);
  return {
    '--aura-tr': tints.tr,
    '--aura-bl': tints.bl,
    '--aura-tl': tints.tl,
  };
}
