import type { AppLocale, PersonalityVector, PsychologicalCategory, QuestModel } from '@questia/shared';
import { QUEST_CATEGORY_LABEL_EN, QUEST_CATEGORY_LABEL_FR } from '@questia/shared';

const BIG_KEYS: (keyof PersonalityVector)[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'emotionalStability',
  'thrillSeeking',
  'boredomSusceptibility',
];

const TRAIT_FR: Record<string, string> = {
  openness: 'Ouverture (curiosité, nouveauté)',
  conscientiousness: 'Conscience (structure, fiabilité)',
  extraversion: 'Extraversion (contact, énergie sociale)',
  agreeableness: 'Agréabilité (chaleur, coopération)',
  emotionalStability: 'Stabilité émotionnelle (calme, résilience)',
  thrillSeeking: 'Recherche de sensations',
  boredomSusceptibility: 'Sensibilité à l’ennui',
};

const TRAIT_EN: Record<string, string> = {
  openness: 'Openness (curiosity, novelty)',
  conscientiousness: 'Conscientiousness (structure, reliability)',
  extraversion: 'Extraversion (social energy)',
  agreeableness: 'Agreeableness (warmth, cooperation)',
  emotionalStability: 'Emotional stability (calm, resilience)',
  thrillSeeking: 'Thrill seeking',
  boredomSusceptibility: 'Boredom susceptibility',
};

function band(v: number, locale: AppLocale): string {
  if (locale === 'en') {
    if (v < 0.35) return 'rather low';
    if (v > 0.65) return 'rather high';
    return 'moderate';
  }
  if (v < 0.35) return 'plutôt basse';
  if (v > 0.65) return 'plutôt haute';
  return 'modérée';
}

/** Résumé lisible des traits (FR ou EN). */
export function buildPersonalityPromptBlock(
  declared: PersonalityVector,
  exhibited: PersonalityVector,
  congruenceDelta: number,
  locale: AppLocale = 'fr',
): string {
  const traitLabel = (k: string) => (locale === 'en' ? TRAIT_EN[k] ?? k : TRAIT_FR[k] ?? k);
  const lines: string[] = [];

  if (locale === 'en') {
    lines.push('DECLARED TENDENCIES (what the person says about themselves):');
    for (const k of BIG_KEYS) {
      lines.push(`- ${traitLabel(k)}: ${band(declared[k] ?? 0.5, 'en')}`);
    }
    const hasHistory = BIG_KEYS.some((k) => (exhibited[k] ?? 0) > 0.02);
    if (!hasHistory) {
      lines.push(
        'QUEST HISTORY: little data — lean on the declared profile and the quest family below.',
      );
    } else {
      lines.push('OBSERVED TENDENCIES (recent behavior from completed/accepted quests):');
      for (const k of BIG_KEYS) {
        lines.push(`- ${traitLabel(k)}: ${band(exhibited[k] ?? 0, 'en')}`);
      }
      const gaps: string[] = [];
      for (const k of BIG_KEYS) {
        const d = declared[k] ?? 0.5;
        const e = exhibited[k] ?? 0;
        if (Math.abs(d - e) > 0.15) {
          if (d > e)
            gaps.push(
              `you report higher ${k === 'extraversion' ? 'sociability' : 'signal'} on ${traitLabel(k)} than recent actions suggest`,
            );
          else gaps.push(`recent actions show more ${traitLabel(k)} than you declare`);
        }
      }
      if (gaps.length > 0) {
        lines.push(`POSSIBLE GAPS (respect without moralizing): ${gaps.slice(0, 3).join(' ; ')}.`);
      }
    }
    let deltaHint: string;
    if (congruenceDelta < 0.15) {
      deltaHint =
        'Identity–action gap: small — the mission can refine one concrete detail without overload.';
    } else if (congruenceDelta < 0.35) {
      deltaHint =
        'Identity–action gap: moderate — today’s action can slightly bridge what they want to be and what they do.';
    } else {
      deltaHint =
        'Identity–action gap: large — the mission must stay realistic and encouraging, no guilt.';
    }
    lines.push(
      `COHERENCE INDICATOR (0 = close, 1 = more drift): ${congruenceDelta.toFixed(2)}. ${deltaHint}`,
    );
    return lines.join('\n');
  }

  lines.push('TENDANCES DÉCLARÉES (ce que la personne dit de soi) :');
  for (const k of BIG_KEYS) {
    lines.push(`- ${traitLabel(k)} : ${band(declared[k] ?? 0.5, 'fr')}`);
  }

  const hasHistory = BIG_KEYS.some((k) => (exhibited[k] ?? 0) > 0.02);
  if (!hasHistory) {
    lines.push(
      'HISTORIQUE DE QUÊTES : peu de données — mets l’accent sur le profil déclaré et la famille de quête ci-dessous.',
    );
  } else {
    lines.push('TENDANCES OBSERVÉES (comportements récents via quêtes complétées / acceptées) :');
    for (const k of BIG_KEYS) {
      lines.push(`- ${traitLabel(k)} : ${band(exhibited[k] ?? 0, 'fr')}`);
    }
    const gaps: string[] = [];
    for (const k of BIG_KEYS) {
      const d = declared[k] ?? 0.5;
      const e = exhibited[k] ?? 0;
      if (Math.abs(d - e) > 0.15) {
        if (d > e)
          gaps.push(
            `tu te déclares plus ${k === 'extraversion' ? 'sociable' : 'marqué·e'} sur ${traitLabel(k)} que ne le suggèrent tes récentes actions`,
          );
        else gaps.push(`tes actions récentes montrent plus de ${traitLabel(k)} que tu ne le déclares`);
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

/**
 * Pistes opérationnelles pour différencier les missions (sans jargon clinique).
 * Utilise un mélange déclaré / observé quand l’historique existe.
 */
export function buildPersonalityMissionHints(
  declared: PersonalityVector,
  exhibited: PersonalityVector,
  locale: AppLocale = 'fr',
): string {
  const hasHistory = BIG_KEYS.some((k) => (exhibited[k] ?? 0) > 0.02);
  const m = (k: keyof PersonalityVector) =>
    hasHistory
      ? (declared[k] ?? 0.5) * 0.55 + (exhibited[k] ?? 0) * 0.45
      : declared[k] ?? 0.5;

  if (locale === 'en') {
    const lines: string[] = ['MISSION TUNING (make this day feel personal, not generic):'];
    const ex = m('extraversion');
    if (ex < 0.38) {
      lines.push(
        '- Social vibe: quiet — solo or very light contact; avoid “big group energy”.',
      );
    } else if (ex > 0.62) {
      lines.push('- Social vibe: lively — a small real interaction can carry the mission.');
    } else {
      lines.push('- Social vibe: balanced — optional light contact; no forced extroversion.');
    }
    const op = m('openness');
    const co = m('conscientiousness');
    if (op > 0.58 && co < 0.45) {
      lines.push('- Lean into a fresh angle or unusual detail; structure can stay loose.');
    } else if (op < 0.4 && co > 0.58) {
      lines.push('- Prefer a clear, repeatable micro-step over a vague “explore”.');
    } else {
      lines.push('- Mix one concrete novelty with one clear completion signal.');
    }
    const bore = m('boredomSusceptibility');
    const thrill = m('thrillSeeking');
    if (bore > 0.55 || thrill > 0.55) {
      lines.push('- Pace: needs a bit of spice — a crisp constraint, twist, or time-box.');
    } else {
      lines.push('- Pace: steady — reward calm focus over hype.');
    }
    if (m('agreeableness') > 0.58) {
      lines.push('- Tone: warm — small kindness or gentle connection fits the grain.');
    }
    return lines.join('\n');
  }

  const lines: string[] = ['ACCROCHE MISSION (différencier ce jour — éviter la « quête générique ») :'];
  const ex = m('extraversion');
  if (ex < 0.38) {
    lines.push(
      '- Registre social : plutôt calme — solo ou contact très léger ; pas d’énergie « grand groupe ».',
    );
  } else if (ex > 0.62) {
    lines.push('- Registre social : plutôt vif — une petite interaction réelle peut porter la mission.');
  } else {
    lines.push('- Registre social : équilibré — contact léger possible, sans forcer l’extraversion.');
  }
  const op = m('openness');
  const co = m('conscientiousness');
  if (op > 0.58 && co < 0.45) {
    lines.push('- Mise sur un angle neuf ou un détail inusité ; la structure peut rester souple.');
  } else if (op < 0.4 && co > 0.58) {
    lines.push('- Privilégie une micro-étape claire et répétable plutôt qu’un vague « explore ».');
  } else {
    lines.push('- Combine une nouveauté concrète avec un signal de fin net (c’est fait quand…).');
  }
  const bore = m('boredomSusceptibility');
  const thrill = m('thrillSeeking');
  if (bore > 0.55 || thrill > 0.55) {
    lines.push('- Rythme : il faut un peu de mordant — contrainte ludique, twist ou créneau horaire court.');
  } else {
    lines.push('- Rythme : posé — valorise l’attention calme plutôt que le buzz.');
  }
  if (m('agreeableness') > 0.58) {
    lines.push('- Ton : chaleureux — petite bienveillance ou lien doux dans le grain.');
  }
  return lines.join('\n');
}

export function archetypeCategoryLabel(category: PsychologicalCategory, locale: AppLocale = 'fr'): string {
  const map = locale === 'en' ? QUEST_CATEGORY_LABEL_EN : QUEST_CATEGORY_LABEL_FR;
  return map[category] ?? category;
}

/** Axes psychologiques ciblés par l’archétype (pour aligner le ton et les verbes). */
export function describeArchetypeTargetTraits(q: QuestModel, locale: AppLocale = 'fr'): string {
  const t = q.targetTraits;
  if (!t || Object.keys(t).length === 0) {
    return locale === 'en' ? 'general balance' : 'équilibre général';
  }
  const parts: string[] = [];
  const traitLabel = (k: string) => (locale === 'en' ? TRAIT_EN[k] ?? k : TRAIT_FR[k] ?? k);
  for (const [k, v] of Object.entries(t)) {
    if (typeof v !== 'number') continue;
    const label = traitLabel(k);
    const strength =
      locale === 'en'
        ? v >= 0.75
          ? 'strong'
          : v >= 0.45
            ? 'moderate'
            : 'light'
        : v >= 0.75
          ? 'fort'
          : v >= 0.45
            ? 'modéré'
            : 'léger';
    parts.push(`${label} (${strength})`);
  }
  return parts.join(' ; ');
}
