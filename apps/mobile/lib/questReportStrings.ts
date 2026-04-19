import type { AppLocale } from '@questia/shared';

/**
 * Textes « reporter / relance » alignés sur le namespace AppQuest du web (fr/en).
 */
export function getQuestReportStrings(locale: AppLocale) {
  if (locale === 'en') {
    return {
      reportModalTitle: 'Defer with a reroll',
      reportModalBody: (maxDays: number) =>
        `Like “Change quest,” this uses a today reroll or a bonus credit. You'll get a short quest you can do today. Pick a target date (within the next ${maxDays} days) for a bolder or social challenge — no obligation.`,
      reportDateLabel: 'Target date',
      reportShortQuest: 'Defer — short quest',
    };
  }
  return {
    reportModalTitle: 'Reporter avec une relance',
    reportModalBody: (maxDays: number) =>
      `Comme « Changer de quête », cela consomme une relance du jour ou un crédit bonus. Tu recevras une mission courte, faisable aujourd'hui. Choisis une date repère (dans les ${maxDays} prochains jours) pour un défi plus ambitieux ou social — sans obligation.`,
    reportDateLabel: 'Date repère',
    reportShortQuest: 'Reporter — quête courte',
  };
}
