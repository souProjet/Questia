import type { AppLocale, PsychologicalCategory, QuestModel, QuestPace } from '../types';

/** Fenêtre max pour reporter une quête « planifiée » (choix de date côté client + API). */
export const REPORT_DEFER_MAX_DAYS = 14;

/**
 * Rythme d'archétype : social ou durée ≥ 6 h → planifiée ; sinon instantanée (faisable dans la journée).
 */
export function archetypeQuestPace(q: {
  requiresSocial: boolean;
  minimumDurationMinutes: number;
}): QuestPace {
  if (q.requiresSocial) return 'planned';
  if (q.minimumDurationMinutes >= 360) return 'planned';
  return 'instant';
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Date de report (YYYY-MM-DD) dans [today, today+REPORT_DEFER_MAX_DAYS] (référence midi UTC). */
export function isValidReportDeferredDate(dateIso: string, todayIso: string): boolean {
  if (!ISO_DATE.test(dateIso) || !ISO_DATE.test(todayIso)) return false;
  const t0 = Date.parse(`${todayIso}T12:00:00.000Z`);
  const t1 = Date.parse(`${dateIso}T12:00:00.000Z`);
  if (Number.isNaN(t0) || Number.isNaN(t1)) return false;
  const max = t0 + REPORT_DEFER_MAX_DAYS * 86400000;
  return t1 >= t0 && t1 <= max;
}

/** Titre + concept d'archétype selon la locale (taxonomie). */
export function questLocalizedText(
  q: QuestModel,
  locale: AppLocale,
): { title: string; description: string } {
  if (locale === 'en') {
    return { title: q.titleEn, description: q.descriptionEn };
  }
  return { title: q.title, description: q.description };
}

export function indoorQuestIds(taxonomy: QuestModel[]): number[] {
  return taxonomy.filter((q) => !q.requiresOutdoor).map((q) => q.id);
}

/** Famille de quête (moteur) — libellé court, distinct du titre généré par l'IA */
export const QUEST_CATEGORY_LABEL_FR: Record<PsychologicalCategory, string> = {
  spatial_adventure: 'Déplacement & exploration',
  public_introspection: 'Présence en public',
  sensory_deprivation: 'Immersion & calme',
  exploratory_sociability: 'Rencontre & lieu',
  physical_existential: 'Corps & perspective',
  async_discipline: 'Discipline & rythme',
  dopamine_detox: 'Rythme & écrans',
  active_empathy: 'Connexion & écoute',
  temporal_projection: 'Projection',
  hostile_immersion: 'Immersion sociale',
  spontaneous_altruism: 'Geste & chaleur',
  relational_vulnerability: 'Liens proches',
  unconditional_service: 'Don & partage',
};

export const QUEST_CATEGORY_LABEL_EN: Record<PsychologicalCategory, string> = {
  spatial_adventure: 'Travel & exploration',
  public_introspection: 'Presence in public',
  sensory_deprivation: 'Immersion & calm',
  exploratory_sociability: 'Meetups & places',
  physical_existential: 'Body & perspective',
  async_discipline: 'Discipline & rhythm',
  dopamine_detox: 'Rhythm & screens',
  active_empathy: 'Connection & listening',
  temporal_projection: 'Projection',
  hostile_immersion: 'Social immersion',
  spontaneous_altruism: 'Warm gestures',
  relational_vulnerability: 'Close ties',
  unconditional_service: 'Giving & sharing',
};

export function questFamilyLabel(category: string | undefined | null, locale: AppLocale = 'fr'): string | null {
  if (!category) return null;
  const k = category as PsychologicalCategory;
  const map = locale === 'en' ? QUEST_CATEGORY_LABEL_EN : QUEST_CATEGORY_LABEL_FR;
  return k in map ? map[k] : null;
}
