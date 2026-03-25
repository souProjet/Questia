import type { PersonalityVector, PsychologicalCategory, QuestModel } from '@questia/shared';
import { QUEST_CATEGORY_LABEL_FR } from '@questia/shared';

const BIG_KEYS: (keyof PersonalityVector)[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'emotionalStability',
];

const TRAIT_FR: Record<string, string> = {
  openness: 'Ouverture (curiosité, nouveauté)',
  conscientiousness: 'Conscience (structure, fiabilité)',
  extraversion: 'Extraversion (contact, énergie sociale)',
  agreeableness: 'Agréabilité (chaleur, coopération)',
  emotionalStability: 'Stabilité émotionnelle (calme, résilience)',
};

function band(v: number): string {
  if (v < 0.35) return 'plutôt basse';
  if (v > 0.65) return 'plutôt haute';
  return 'modérée';
}

/** Résumé lisible des traits déclarés + écarts avec l’historique de quêtes (sans jargon clinique). */
export function buildPersonalityPromptBlock(
  declared: PersonalityVector,
  exhibited: PersonalityVector,
  congruenceDelta: number,
): string {
  const lines: string[] = [];
  lines.push('TENDANCES DÉCLARÉES (ce que la personne dit de soi) :');
  for (const k of BIG_KEYS) {
    lines.push(`- ${TRAIT_FR[k]} : ${band(declared[k] ?? 0.5)}`);
  }

  const hasHistory = BIG_KEYS.some((k) => (exhibited[k] ?? 0) > 0.02);
  if (!hasHistory) {
    lines.push(
      'HISTORIQUE DE QUÊTES : peu de données — mets l’accent sur le profil déclaré et la famille de quête ci-dessous.',
    );
  } else {
    lines.push('TENDANCES OBSERVÉES (comportements récents via quêtes complétées / acceptées) :');
    for (const k of BIG_KEYS) {
      lines.push(`- ${TRAIT_FR[k]} : ${band(exhibited[k] ?? 0)}`);
    }
    const gaps: string[] = [];
    for (const k of BIG_KEYS) {
      const d = declared[k] ?? 0.5;
      const e = exhibited[k] ?? 0;
      if (Math.abs(d - e) > 0.15) {
        if (d > e) gaps.push(`tu te déclares plus ${k === 'extraversion' ? 'sociable' : 'marqué·e'} sur ${TRAIT_FR[k]} que ne le suggèrent tes récentes actions`);
        else gaps.push(`tes actions récentes montrent plus de ${TRAIT_FR[k]} que tu ne le déclares`);
      }
    }
    if (gaps.length > 0) {
      lines.push(`ÉCARTS POSSIBLES (à respecter sans moraliser) : ${gaps.slice(0, 3).join(' ; ')}.`);
    }
  }

  let deltaHint: string;
  if (congruenceDelta < 0.15) {
    deltaHint =
      'Écart identité–actions : faible — la mission peut affiner un détail concret, sans surcharger.';
  } else if (congruenceDelta < 0.35) {
    deltaHint =
      'Écart identité–actions : modéré — une action du jour peut rapprocher un peu ce que la personne veut être de ce qu’elle fait.';
  } else {
    deltaHint =
      'Écart identité–actions : marqué — la mission doit être réaliste et encourageante, sans culpabiliser.';
  }
  lines.push(`INDICATEUR DE COHÉRENCE (0 = proche, 1 = plus d’écart) : ${congruenceDelta.toFixed(2)}. ${deltaHint}`);

  return lines.join('\n');
}

export function archetypeCategoryLabelFr(category: PsychologicalCategory): string {
  return QUEST_CATEGORY_LABEL_FR[category] ?? category;
}

/** Axes psychologiques ciblés par l’archétype (pour aligner le ton et les verbes). */
export function describeArchetypeTargetTraits(q: QuestModel): string {
  const t = q.targetTraits;
  if (!t || Object.keys(t).length === 0) return 'équilibre général';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(t)) {
    if (typeof v !== 'number') continue;
    const label = TRAIT_FR[k] ?? k;
    const strength = v >= 0.75 ? 'fort' : v >= 0.45 ? 'modéré' : 'léger';
    parts.push(`${label} (${strength})`);
  }
  return parts.join(' ; ');
}
