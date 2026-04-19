import type { AppLocale, QuestCandidate } from '@questia/shared';
import { questLocalizedText, QUEST_CATEGORY_LABEL_EN, QUEST_CATEGORY_LABEL_FR } from '@questia/shared';

const TRAIT_LABEL_FR: Record<string, string> = {
  openness: 'curiosité',
  conscientiousness: 'organisation',
  extraversion: 'social',
  agreeableness: 'chaleur',
  emotionalStability: 'calme',
  thrillSeeking: 'sensations',
  boredomSusceptibility: 'rupture routine',
};

const TRAIT_LABEL_EN: Record<string, string> = {
  openness: 'openness',
  conscientiousness: 'structure',
  extraversion: 'social',
  agreeableness: 'warmth',
  emotionalStability: 'calm',
  thrillSeeking: 'thrill',
  boredomSusceptibility: 'novelty',
};

function describeTraits(traits: Partial<Record<string, number>>, locale: AppLocale): string {
  const labels = locale === 'en' ? TRAIT_LABEL_EN : TRAIT_LABEL_FR;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(traits)) {
    if (typeof v !== 'number') continue;
    const tag = v >= 0.7 ? '↑↑' : v >= 0.55 ? '↑' : v <= 0.3 ? '↓↓' : v <= 0.45 ? '↓' : '·';
    parts.push(`${labels[k] ?? k} ${tag}`);
  }
  return parts.join(', ') || (locale === 'en' ? 'general balance' : 'équilibre général');
}

const COMFORT_LABEL_FR: Record<string, string> = {
  low: 'doux',
  moderate: 'modéré',
  high: 'intense',
  extreme: 'extrême',
};

const COMFORT_LABEL_EN: Record<string, string> = {
  low: 'gentle',
  moderate: 'moderate',
  high: 'intense',
  extreme: 'extreme',
};

/**
 * Brief des candidats — un dossier de candidature par archétype.
 *
 * Chaque entrée : id, intent (titre + concept), catégorie, intensité, durée,
 * affinité scorée par le moteur, raison du moteur. Le LLM choisit ensuite.
 */
export function buildCandidatesBrief(
  candidates: QuestCandidate[],
  locale: AppLocale,
): string {
  const intro =
    locale === 'en'
      ? `CANDIDATE ARCHETYPES (you MUST pick exactly one — by archetypeId — and write the quest):`
      : `ARCHÉTYPES CANDIDATS (tu DOIS en choisir UN — par archetypeId — et rédiger la quête) :`;
  const lines: string[] = [intro];
  const catLabels = locale === 'en' ? QUEST_CATEGORY_LABEL_EN : QUEST_CATEGORY_LABEL_FR;
  const comfortLabels = locale === 'en' ? COMFORT_LABEL_EN : COMFORT_LABEL_FR;

  candidates.forEach((c, idx) => {
    const arch = c.archetype;
    const localized = questLocalizedText(arch, locale);
    const cat = catLabels[arch.category] ?? arch.category;
    const traits = describeTraits(arch.targetTraits, locale);
    const comfort = comfortLabels[arch.comfortLevel] ?? arch.comfortLevel;
    const concept = localized.description.trim();
    const social = arch.requiresSocial
      ? locale === 'en' ? ' · needs real social interaction' : ' · social interaction réelle requise'
      : '';
    const outdoor = arch.requiresOutdoor
      ? locale === 'en' ? ' · outdoor' : ' · extérieur'
      : '';
    const score = c.score;
    const scoreLine = `affinity=${score.affinity.toFixed(2)} phase=${score.phaseFit.toFixed(2)} fresh=${score.freshness.toFixed(2)} → total=${score.total.toFixed(2)}`;
    lines.push(
      `\n#${idx + 1} archetypeId=${arch.id} | family=${cat} | intensity=${comfort} | min ${arch.minimumDurationMinutes} min${social}${outdoor}`,
    );
    lines.push(
      `   intent: ${localized.title} — ${concept}`,
    );
    lines.push(`   target traits: ${traits}`);
    lines.push(`   engine reason: ${c.reason} | ${scoreLine}`);
  });

  return lines.join('\n');
}
