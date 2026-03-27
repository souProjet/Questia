import type { AppLocale } from './types';

/**
 * Affiche une date de quête (YYYY-MM-DD) en français, ex. « 24 mars 2026 ».
 */
export function formatQuestDateFr(isoDate: string): string {
  return formatQuestDateForLocale(isoDate, 'fr');
}

/** Date de quête lisible selon la locale (FR / EN). */
export function formatQuestDateForLocale(isoDate: string, locale: AppLocale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return isoDate;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  if (Number.isNaN(d.getTime())) return isoDate;
  try {
    return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}
