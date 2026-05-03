import type { AppLocale, QuestParameters } from '@questia/shared';
import {
  questLocalizedText,
  QUEST_CATEGORY_LABEL_EN,
  QUEST_CATEGORY_LABEL_FR,
} from '@questia/shared';

const COMFORT_LABEL_FR: Record<string, string> = {
  low: 'douce',
  moderate: 'modérée',
  high: 'élevée',
  extreme: 'très intense',
};

const COMFORT_LABEL_EN: Record<string, string> = {
  low: 'gentle',
  moderate: 'moderate',
  high: 'high',
  extreme: 'very intense',
};

function formatWeekday(questDateIso: string, locale: AppLocale): string {
  try {
    const d = new Date(`${questDateIso}T12:00:00.000Z`);
    return locale === 'en'
      ? d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
      : d.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  } catch {
    return questDateIso;
  }
}

/**
 * Consignes créatives du jour : pas de liste d'archétypes — règles + inspiration taxonomie.
 */
export function buildCreativeConstraints(
  params: QuestParameters,
  locale: AppLocale,
  questDateIso: string,
): string {
  const catLabels = locale === 'en' ? QUEST_CATEGORY_LABEL_EN : QUEST_CATEGORY_LABEL_FR;
  const comfortLabels = locale === 'en' ? COMFORT_LABEL_EN : COMFORT_LABEL_FR;
  const primaryLabel = catLabels[params.primaryCategory] ?? params.primaryCategory;
  const secondaryLines = params.secondaryCategories
    .map((c) => catLabels[c] ?? c)
    .filter(Boolean);
  const intensity = comfortLabels[params.targetComfort] ?? params.targetComfort;
  const weekday = formatWeekday(questDateIso, locale);

  const themeLines =
    locale === 'en'
      ? params.themeInspirations.map((q, i) => {
          const loc = questLocalizedText(q, 'en');
          return `   ${i + 1}. (${q.comfortLevel}) ${loc.title} — ${loc.description.trim().slice(0, 160)}${loc.description.trim().length > 160 ? '…' : ''}`;
        })
      : params.themeInspirations.map((q, i) => {
          const loc = questLocalizedText(q, 'fr');
          return `   ${i + 1}. (${q.comfortLevel}) ${loc.title} — ${loc.description.trim().slice(0, 160)}${loc.description.trim().length > 160 ? '…' : ''}`;
        });

  if (locale === 'en') {
    return `CREATIVE BRIEF (engine — do not copy titles verbatim; invent a fresh quest):
- Psychological family for TODAY: **${primaryLabel}** (internal id: ${params.primaryCategory}).
- Secondary families if you need a subtle echo (optional): ${secondaryLines.join(', ') || '—'}.
- Target intensity for this phase: **${intensity}** (comfort zone exit: ${params.targetComfort}).
- Ideal duration: **${params.idealDurationMinutes} minutes** (stay within the user's min/max duration band in CONTEXT).
- Calendar: **${weekday}**, date ${questDateIso}.

Taxonomy theme sparks (inspiration only — invent new wording and a new micro-situation):
${themeLines.join('\n')}`;
  }

  return `CONSIGNE CRÉATIVE (moteur — ne recopie pas les titres ; invente une quête neuve) :
- Famille psychologique du JOUR : **${primaryLabel}** (id interne : ${params.primaryCategory}).
- Familles secondaires possibles en filigrane (optionnel) : ${secondaryLines.join(', ') || '—'}.
- Intensité ciblée pour cette phase : **${intensity}** (sortie de zone : ${params.targetComfort}).
- Durée idéale : **${params.idealDurationMinutes} minutes** (reste dans la plage min/max du CONTEXTE).
- Calendrier : **${weekday}**, date ${questDateIso}.

Étincelles taxonomie (inspiration seulement — reformule entièrement) :
${themeLines.join('\n')}`;
}