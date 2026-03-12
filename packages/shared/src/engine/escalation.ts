import type { EscalationPhase, UserProfile, QuestLog } from '../types';

/**
 * Phase boundaries (day numbers):
 * - Calibration: Days 1–3
 * - Expansion:   Days 4–10
 * - Rupture:     Day 11+
 */
export const PHASE_BOUNDARIES = {
  calibration: { start: 1, end: 3 },
  expansion:   { start: 4, end: 10 },
  rupture:     { start: 11, end: Infinity },
} as const;

/**
 * Determines the escalation phase based on the user's current day.
 */
export function getPhaseForDay(day: number): EscalationPhase {
  if (day <= PHASE_BOUNDARIES.calibration.end) return 'calibration';
  if (day <= PHASE_BOUNDARIES.expansion.end) return 'expansion';
  return 'rupture';
}

/**
 * Checks if the user should be downgraded to a lower phase
 * after a quest rejection during rupture phase.
 *
 * If the user rejects 2+ quests in the last 3 days during rupture,
 * the system temporarily downgrades to expansion difficulty.
 */
export function shouldDowngrade(
  currentPhase: EscalationPhase,
  recentLogs: QuestLog[],
): boolean {
  if (currentPhase !== 'rupture') return false;

  const recentRejections = recentLogs.filter(
    (log) => log.status === 'rejected'
  ).length;

  return recentRejections >= 2;
}

/**
 * Computes the effective phase considering potential downgrade.
 */
export function getEffectivePhase(
  day: number,
  recentLogs: QuestLog[],
): EscalationPhase {
  const naturalPhase = getPhaseForDay(day);

  if (shouldDowngrade(naturalPhase, recentLogs)) {
    return 'expansion';
  }

  return naturalPhase;
}

/**
 * Updates the user profile after a quest interaction.
 * Returns a partial profile with updated fields.
 */
export function computeProfileUpdate(
  profile: UserProfile,
  questCompleted: boolean,
): Partial<UserProfile> {
  const newDay = profile.currentDay + 1;
  const newStreak = questCompleted ? profile.streakCount + 1 : 0;
  const newPhase = getPhaseForDay(newDay);

  return {
    currentDay: newDay,
    currentPhase: newPhase,
    streakCount: newStreak,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Default number of free rerolls per day.
 */
export const DAILY_FREE_REROLLS = 1;

/**
 * Max rerolls purchasable per day.
 */
export const MAX_REROLLS_PER_DAY = 3;
