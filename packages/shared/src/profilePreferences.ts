export const REMINDER_CADENCES = ['daily', 'weekly', 'monthly'] as const;
export type ReminderCadence = (typeof REMINDER_CADENCES)[number];

export function parseReminderCadence(raw: string | null | undefined): ReminderCadence {
  const s = String(raw ?? 'daily').trim().toLowerCase();
  if (s === 'weekly' || s === 'monthly') return s;
  return 'daily';
}

export const QUEST_DURATION_MIN_ALLOWED = 5;
export const QUEST_DURATION_MAX_ALLOWED = 1440;

/** Fréquence souhaitée pour quêtes « déplacement / à organiser » (sélection + prompt). */
export const HEAVY_QUEST_PREFERENCES = ['low', 'balanced', 'high'] as const;
export type HeavyQuestPreference = (typeof HEAVY_QUEST_PREFERENCES)[number];

export function parseHeavyQuestPreference(raw: string | null | undefined): HeavyQuestPreference {
  const s = String(raw ?? 'balanced').trim().toLowerCase();
  if (s === 'low' || s === 'high') return s;
  return 'balanced';
}

export function clampQuestDurationBounds(
  minMinutes: number,
  maxMinutes: number,
): { questDurationMinMinutes: number; questDurationMaxMinutes: number } {
  let lo = Math.trunc(Number(minMinutes));
  let hi = Math.trunc(Number(maxMinutes));
  if (!Number.isFinite(lo)) lo = QUEST_DURATION_MIN_ALLOWED;
  if (!Number.isFinite(hi)) hi = QUEST_DURATION_MAX_ALLOWED;
  lo = Math.min(QUEST_DURATION_MAX_ALLOWED, Math.max(QUEST_DURATION_MIN_ALLOWED, lo));
  hi = Math.min(QUEST_DURATION_MAX_ALLOWED, Math.max(QUEST_DURATION_MIN_ALLOWED, hi));
  if (lo > hi) {
    const t = lo;
    lo = hi;
    hi = t;
  }
  return { questDurationMinMinutes: lo, questDurationMaxMinutes: hi };
}
