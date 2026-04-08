import type { EscalationPhase, ExplorerAxis, RiskAxis } from '../types';

/**
 * Règles d'XP (référence unique pour l'API et l'UI).
 *
 * - **Base** : dépend de la phase **au moment de l'assignation** (alignée calibration → expansion → rupture).
 * - **Série** : bonus par jour de série actuel, plafonné (évite l'explosion si série très longue).
 * - **Extérieur** : bonus fixe si la quête complétée est marquée extérieure.
 * - **Archétype (quadrant)** : léger multiplicateur sur la base seulement — explorer / casanier, prudent / audacieux.
 * - **Relance (skip)** : si la quête du jour a été obtenue après une relance, malus multiplicatif sur le sous-total (avant plafond).
 * - **Fallback météo** : petite pénalité plate (quête de repli).
 * - **Plafond** : aucune complétion ne dépasse `XP_PER_QUEST_CAP` XP.
 */

export const XP_BASE_BY_PHASE: Record<EscalationPhase, number> = {
  calibration: 12,
  expansion: 22,
  rupture: 38,
};

/** +3 XP par jour de série, max +18 XP */
export const XP_STREAK_PER_DAY = 3;
export const XP_STREAK_BONUS_CAP = 18;

export const XP_OUTDOOR_BONUS = 8;

export const XP_EXPLORER_BASE_MULT = 1.1;
export const XP_HOMEBODY_BASE_MULT = 1.0;

export const XP_RISKTAKER_BASE_MULT = 1.05;
export const XP_CAUTIOUS_BASE_MULT = 1.0;

/** Après une relance : le sous-total (base ajustée + série + extérieur − pénalités) est multiplié par ce facteur */
export const XP_AFTER_REROLL_MULT = 0.75;

export const XP_FALLBACK_FLAT_PENALTY = 5;

/** Plafond dur par quête complétée */
export const XP_PER_QUEST_CAP = 120;

export interface XpBreakdown {
  basePhase: EscalationPhase;
  baseRaw: number;
  baseAfterArchetype: number;
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  streakDays: number;
  streakBonus: number;
  outdoorBonus: number;
  fallbackPenalty: number;
  afterReroll: boolean;
  subtotalBeforeReroll: number;
  subtotalAfterReroll: number;
  cappedTotal: number;
  /** Bonus boutique (charges XP) — optionnel */
  shopBonusXp?: number;
}

export function archetypeBaseMultiplier(
  explorerAxis: ExplorerAxis,
  riskAxis: RiskAxis,
): number {
  const e = explorerAxis === 'explorer' ? XP_EXPLORER_BASE_MULT : XP_HOMEBODY_BASE_MULT;
  const r = riskAxis === 'risktaker' ? XP_RISKTAKER_BASE_MULT : XP_CAUTIOUS_BASE_MULT;
  return e * r;
}

export function streakBonusFor(streakCount: number): number {
  const raw = streakCount * XP_STREAK_PER_DAY;
  return Math.min(raw, XP_STREAK_BONUS_CAP);
}

export function computeCompletionXp(input: {
  phaseAtAssignment: EscalationPhase;
  streakCount: number;
  isOutdoor: boolean;
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  wasRerolled: boolean;
  wasFallback: boolean;
}): { total: number; breakdown: XpBreakdown } {
  const baseRaw = XP_BASE_BY_PHASE[input.phaseAtAssignment];
  const archMult = archetypeBaseMultiplier(input.explorerAxis, input.riskAxis);
  const baseAfterArchetype = Math.round(baseRaw * archMult);
  const streak = streakBonusFor(Math.max(0, input.streakCount));
  const outdoor = input.isOutdoor ? XP_OUTDOOR_BONUS : 0;
  const fallbackPenalty = input.wasFallback ? XP_FALLBACK_FLAT_PENALTY : 0;

  let subtotal = baseAfterArchetype + streak + outdoor - fallbackPenalty;
  subtotal = Math.max(0, subtotal);

  const subtotalBeforeReroll = subtotal;
  if (input.wasRerolled) {
    subtotal = Math.round(subtotal * XP_AFTER_REROLL_MULT);
  }

  const capped = Math.min(subtotal, XP_PER_QUEST_CAP);

  const breakdown: XpBreakdown = {
    basePhase: input.phaseAtAssignment,
    baseRaw,
    baseAfterArchetype,
    explorerAxis: input.explorerAxis,
    riskAxis: input.riskAxis,
    streakDays: input.streakCount,
    streakBonus: streak,
    outdoorBonus: outdoor,
    fallbackPenalty,
    afterReroll: input.wasRerolled,
    subtotalBeforeReroll,
    subtotalAfterReroll: subtotal,
    cappedTotal: capped,
  };

  return { total: capped, breakdown };
}

/** Niveau = tranches de 100 XP (simple, lisible). */
export const XP_PER_LEVEL = 100;

/** Plafond interne du calcul de niveau (évite des niveaux à 3 chiffres en UI). */
const MAX_LEVEL_INTERNAL = 99;

export function levelFromTotalXp(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpToNext: number;
  xpPerLevel: number;
} {
  const safe = Math.max(0, Math.floor(totalXp));
  const xpPerLevel = XP_PER_LEVEL;
  const level = Math.min(MAX_LEVEL_INTERNAL, Math.floor(safe / xpPerLevel) + 1);
  const xpIntoLevel = safe % xpPerLevel;
  const xpToNext = xpPerLevel - xpIntoLevel;
  return { level, xpIntoLevel, xpToNext, xpPerLevel };
}

/** Un segment d'animation : barre du niveau `level`, remplissage de `fromPct` à `toPct` (0–1). */
export type XpBarSegment = { level: number; fromPct: number; toPct: number };

/**
 * Segments pour animer la barre « XP dans ce niveau » (comme l'accueil), entre deux totaux XP.
 * Gère les montées de niveau (y compris plusieurs paliers d'un coup).
 */
export function xpBarSegmentsFromTotals(previousTotal: number, newTotal: number): XpBarSegment[] {
  const before = levelFromTotalXp(previousTotal);
  const after = levelFromTotalXp(newTotal);
  const pl = XP_PER_LEVEL;

  if (after.level < before.level) {
    return [{ level: after.level, fromPct: after.xpIntoLevel / pl, toPct: after.xpIntoLevel / pl }];
  }
  if (after.level === before.level) {
    return [{ level: before.level, fromPct: before.xpIntoLevel / pl, toPct: after.xpIntoLevel / pl }];
  }

  const segments: XpBarSegment[] = [];
  let curLevel = before.level;
  let fromPct = before.xpIntoLevel / pl;

  segments.push({ level: curLevel, fromPct, toPct: 1 });
  curLevel++;

  while (curLevel < after.level) {
    segments.push({ level: curLevel, fromPct: 0, toPct: 1 });
    curLevel++;
  }
  segments.push({ level: after.level, fromPct: 0, toPct: after.xpIntoLevel / pl });
  return segments;
}
