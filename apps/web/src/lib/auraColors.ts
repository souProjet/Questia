/**
 * Profil Aura Visuelle — version web (pas de dépendance React Native).
 * Calcule les couleurs CSS rgba() des orbes de fond à partir du vecteur
 * de personnalité de l'utilisateur.
 *
 * Partage le même modèle conceptuel que packages/ui/src/auraProfile.ts
 * (même table de correspondance trait → teinte, même formule d'intensité).
 */

import type { PersonalityVector } from '@questia/shared';

// ─── Helpers HSL ─────────────────────────────────────────────────────────────

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

function blendHues(h1: number, w1: number, h2: number, w2: number): number {
  const r1 = (h1 * Math.PI) / 180;
  const r2 = (h2 * Math.PI) / 180;
  const x = w1 * Math.cos(r1) + w2 * Math.cos(r2);
  const y = w1 * Math.sin(r1) + w2 * Math.sin(r2);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─── Table trait → teinte ────────────────────────────────────────────────────

const TRAIT_HUE: Record<keyof PersonalityVector, { low: number; high: number }> = {
  openness:               { low: 220, high: 280 },
  conscientiousness:      { low: 35,  high: 210 },
  extraversion:           { low: 200, high: 28  },
  agreeableness:          { low: 20,  high: 130 },
  emotionalStability:     { low: 350, high: 50  },
  thrillSeeking:          { low: 175, high: 0   },
  boredomSusceptibility:  { low: 130, high: 175 },
};

function traitHue(trait: keyof PersonalityVector, value: number): number {
  const { low, high } = TRAIT_HUE[trait];
  return blendHues(low, 1 - value, high, value);
}

// ─── Paramètres visuels ──────────────────────────────────────────────────────

type AuraParams = { saturation: number; lightness: number; baseAlpha: number; intensityBoost: number };

function auraParams(themeId: string | null | undefined): AuraParams {
  if (themeId === 'midnight') {
    // Thème sombre : couleurs plus vives + alpha généreux pour les radial-gradients CSS
    return { saturation: 0.72, lightness: 0.52, baseAlpha: 0.38, intensityBoost: 0.28 };
  }
  // Thèmes clairs : alpha affirmé, les radial-gradients n'ont pas de blur natif
  return { saturation: 0.58, lightness: 0.60, baseAlpha: 0.28, intensityBoost: 0.22 };
}

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
  const avgValue = (v1 + v2) / 2;
  const intensity = Math.abs(avgValue - 0.5) * 2;
  const alpha = params.baseAlpha + intensity * params.intensityBoost;
  return hslToRgba(h, params.saturation, params.lightness, alpha);
}

// ─── API publique ─────────────────────────────────────────────────────────────

export type AuraOrbColors = { tr: string; bl: string; tl: string };

/**
 * Calcule les 3 couleurs rgba() des orbes de fond pour le web.
 * Retourne null si `personality` est absent (les classes Tailwind par défaut s'appliquent).
 */
export function computeWebAuraColors(
  personality: PersonalityVector | null | undefined,
  themeId: string | null | undefined,
): AuraOrbColors | null {
  if (!personality) return null;
  const params = auraParams(themeId);
  return {
    tr: orbColor('extraversion', 'thrillSeeking', personality, params),
    bl: orbColor('openness', 'agreeableness', personality, params),
    tl: orbColor('conscientiousness', 'emotionalStability', personality, params),
  };
}
