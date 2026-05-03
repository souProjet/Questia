import type { AppLocale, EscalationPhase, QuestParameters } from '@questia/shared';
import {
  questLocalizedText,
  QUEST_CATEGORY_LABEL_EN,
  QUEST_CATEGORY_LABEL_FR,
} from '@questia/shared';
import type { GenerationContext } from './types';

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

const PHASE_SNAPSHOT_FR: Record<EscalationPhase, string> = {
  calibration: 'calibration (rituel doux, proche du confort)',
  expansion: 'expansion (petit pas hors routine)',
  rupture: 'rupture (défi marquant mais sûr)',
};

const PHASE_SNAPSHOT_EN: Record<EscalationPhase, string> = {
  calibration: 'calibration (gentle ritual, near comfort)',
  expansion: 'expansion (small stretch beyond routine)',
  rupture: 'rupture (memorable edge, still safe)',
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

type CreativeContextSlice = Pick<
  GenerationContext,
  | 'questDateIso'
  | 'city'
  | 'country'
  | 'weatherDescription'
  | 'weatherIcon'
  | 'temp'
  | 'isOutdoorFriendly'
  | 'hasUserLocation'
>;

function buildDaySnapshot(
  locale: AppLocale,
  context: CreativeContextSlice,
  phase: EscalationPhase,
): string {
  const phaseLine =
    locale === 'en' ? PHASE_SNAPSHOT_EN[phase] : PHASE_SNAPSHOT_FR[phase];
  const temp = Math.round(context.temp);
  if (!context.hasUserLocation) {
    return locale === 'en'
      ? `Snapshot: **${formatWeekday(context.questDateIso, locale)}** — weather (area): ${context.weatherIcon} ${context.weatherDescription}, ~${temp}°C. Journey phase: **${phaseLine}**.`
      : `Instantané : **${formatWeekday(context.questDateIso, locale)}** — météo (zone) : ${context.weatherIcon} ${context.weatherDescription}, ~${temp}°C. Phase de parcours : **${phaseLine}**.`;
  }
  const outdoor =
    locale === 'en'
      ? context.isOutdoorFriendly
        ? 'outdoor OK'
        : 'outdoor not ideal'
      : context.isOutdoorFriendly
        ? 'extérieur OK'
        : 'extérieur peu adapté';
  return locale === 'en'
    ? `Snapshot: **${context.city}** (${context.country}) — ${context.weatherIcon} ${context.weatherDescription}, ${temp}°C (${outdoor}). Journey phase: **${phaseLine}**.`
    : `Instantané : à **${context.city}** (${context.country}) — ${context.weatherIcon} ${context.weatherDescription}, ${temp}°C — ${outdoor}. Phase de parcours : **${phaseLine}**.`;
}

/**
 * Consignes créatives du jour : résumé contexte + famille, intensité, durée, inspirations taxonomie.
 */
export function buildCreativeConstraints(
  params: QuestParameters,
  locale: AppLocale,
  context: CreativeContextSlice,
  phase: EscalationPhase,
): string {
  const catLabels = locale === 'en' ? QUEST_CATEGORY_LABEL_EN : QUEST_CATEGORY_LABEL_FR;
  const comfortLabels = locale === 'en' ? COMFORT_LABEL_EN : COMFORT_LABEL_FR;
  const primaryLabel = catLabels[params.primaryCategory] ?? params.primaryCategory;
  const secondaryLines = params.secondaryCategories
    .map((c) => catLabels[c] ?? c)
    .filter(Boolean);
  const intensity = comfortLabels[params.targetComfort] ?? params.targetComfort;
  const weekday = formatWeekday(context.questDateIso, locale);
  const snapshot = buildDaySnapshot(locale, context, phase);

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

${snapshot}

- Calendar weekday: **${weekday}** (${context.questDateIso}).
- Psychological family for TODAY: **${primaryLabel}** (internal id: ${params.primaryCategory}).
- Secondary families if you need a subtle echo (optional): ${secondaryLines.join(', ') || '—'}.
- Target intensity for this phase: **${intensity}** (comfort zone exit: ${params.targetComfort}).
- Ideal duration: **${params.idealDurationMinutes} minutes** (stay within the user's min/max duration band in CONTEXT).

Taxonomy theme sparks (inspiration only — invent new wording and a new micro-situation):
${themeLines.join('\n')}`;
  }

  return `CONSIGNE CRÉATIVE (moteur — ne recopie pas les titres ; invente une quête neuve) :

${snapshot}

- Jour calendaire : **${weekday}** (${context.questDateIso}).
- Famille psychologique du JOUR : **${primaryLabel}** (id interne : ${params.primaryCategory}).
- Familles secondaires possibles en filigrane (optionnel) : ${secondaryLines.join(', ') || '—'}.
- Intensité ciblée pour cette phase : **${intensity}** (sortie de zone : ${params.targetComfort}).
- Durée idéale : **${params.idealDurationMinutes} minutes** (reste dans la plage min/max du CONTEXTE).

Étincelles taxonomie (inspiration seulement — reformule entièrement) :
${themeLines.join('\n')}`;
}
