import type { EscalationPhase, QuestLog } from '../types';

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

/** Rejection thresholds per phase — higher threshold for expansion (less punitive). */
const DOWNGRADE_REJECTION_THRESHOLD: Partial<Record<EscalationPhase, number>> = {
  rupture: 2,
  expansion: 3,
};

const DOWNGRADE_WINDOW_DAYS = 3;

const PREV_PHASE: Partial<Record<EscalationPhase, EscalationPhase>> = {
  rupture: 'expansion',
  expansion: 'calibration',
};

/**
 * Checks if the user should be downgraded to a lower phase
 * after repeated quest rejections.
 *
 * - rupture   → expansion  when 2+ rejections in last 3 calendar days
 * - expansion → calibration when 3+ rejections in last 3 calendar days
 * - calibration → (no change — already at minimum)
 *
 * @param todayIso — YYYY-MM-DD used as reference for the 3-day window.
 *   When omitted the function falls back to the legacy behaviour
 *   (counts all logs regardless of date).
 */
export function shouldDowngrade(
  currentPhase: EscalationPhase,
  recentLogs: QuestLog[],
  todayIso?: string,
): boolean {
  const threshold = DOWNGRADE_REJECTION_THRESHOLD[currentPhase];
  if (threshold === undefined) return false;

  let logsInWindow = recentLogs;

  if (todayIso) {
    const refMs = Date.parse(`${todayIso}T12:00:00.000Z`);
    if (!Number.isNaN(refMs)) {
      const cutoffMs = refMs - DOWNGRADE_WINDOW_DAYS * 86_400_000;
      logsInWindow = recentLogs.filter((log) => {
        if (!log.questDate) return false;
        const logMs = Date.parse(`${log.questDate}T12:00:00.000Z`);
        return !Number.isNaN(logMs) && logMs >= cutoffMs;
      });
    }
  }

  const recentRejections = logsInWindow.filter(
    (log) => log.status === 'rejected',
  ).length;

  return recentRejections >= threshold;
}

/**
 * Minimum consecutive completions (no rejection/abandon in between)
 * required to upscale one phase early.
 */
const UPSCALE_STREAK_THRESHOLD = 3;

/** Only count completions within this window to avoid stale upscales after inactivity. */
const UPSCALE_WINDOW_DAYS = 7;

/**
 * Checks if the user earned an early promotion to the next phase
 * thanks to a strong recent completion streak.
 *
 * - calibration → expansion  when 3+ consecutive completions within 7 days
 * - expansion   → rupture    when 3+ consecutive completions within 7 days
 * - rupture     → (no change — already at max)
 *
 * @param todayIso — YYYY-MM-DD. When provided, only completions within the
 *   last 7 calendar days count (prevents stale upscales after inactivity).
 */
export function shouldUpscale(
  currentPhase: EscalationPhase,
  recentLogs: QuestLog[],
  todayIso?: string,
): boolean {
  if (currentPhase === 'rupture') return false;

  let logsInWindow = recentLogs;

  if (todayIso) {
    const refMs = Date.parse(`${todayIso}T12:00:00.000Z`);
    if (!Number.isNaN(refMs)) {
      const cutoffMs = refMs - UPSCALE_WINDOW_DAYS * 86_400_000;
      logsInWindow = recentLogs.filter((log) => {
        if (!log.questDate) return false;
        const logMs = Date.parse(`${log.questDate}T12:00:00.000Z`);
        return !Number.isNaN(logMs) && logMs >= cutoffMs;
      });
    }
  }

  let consecutive = 0;
  for (const log of logsInWindow) {
    if (log.status === 'completed') {
      consecutive++;
      if (consecutive >= UPSCALE_STREAK_THRESHOLD) return true;
    } else if (log.status === 'rejected' || log.status === 'abandoned') {
      break;
    }
  }
  return false;
}

const NEXT_PHASE: Record<EscalationPhase, EscalationPhase> = {
  calibration: 'expansion',
  expansion: 'rupture',
  rupture: 'rupture',
};

/**
 * Computes the effective phase considering potential downgrade
 * or early upscale.
 *
 * Priority: downgrade wins over upscale (safety first).
 *
 * @param todayIso — YYYY-MM-DD forwarded to `shouldDowngrade` and
 *   `shouldUpscale` for time-windowed evaluation.
 */
export function getEffectivePhase(
  day: number,
  recentLogs: QuestLog[],
  todayIso?: string,
): EscalationPhase {
  const naturalPhase = getPhaseForDay(day);

  if (shouldDowngrade(naturalPhase, recentLogs, todayIso)) {
    return PREV_PHASE[naturalPhase]!;
  }

  if (shouldUpscale(naturalPhase, recentLogs, todayIso)) {
    return NEXT_PHASE[naturalPhase];
  }

  return naturalPhase;
}


/**
 * Default number of free rerolls per day.
 */
export const DAILY_FREE_REROLLS = 1;

/**
 * Max rerolls purchasable per day.
 */
export const MAX_REROLLS_PER_DAY = 3;
