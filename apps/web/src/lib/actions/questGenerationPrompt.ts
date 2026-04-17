import type {
  AppLocale,
  EscalationPhase,
  PersonalityVector,
  PsychologicalCategory,
  QuestModel,
} from '@questia/shared';
import {
  EXHIBITED_BASELINE,
  QUEST_CATEGORY_LABEL_EN,
  QUEST_CATEGORY_LABEL_FR,
  hasExhibitedSignal,
  promptSeedIndex,
} from '@questia/shared';

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
  boredomSusceptibility: 'Sensibilité à l\u2019ennui',
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
  if (v < 0.35) return 'plut\u00f4t basse';
  if (v > 0.65) return 'plut\u00f4t haute';
  return 'mod\u00e9r\u00e9e';
}

/** R\u00e9sum\u00e9 lisible des traits (FR ou EN). */
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
    const hasHistory = hasExhibitedSignal(exhibited);
    if (!hasHistory) {
      lines.push(
        'QUEST HISTORY: little data \u2014 lean on the declared profile and the quest family below.',
      );
    } else {
      lines.push('OBSERVED TENDENCIES (recent behavior from completed/accepted quests):');
      for (const k of BIG_KEYS) {
        lines.push(`- ${traitLabel(k)}: ${band(exhibited[k] ?? EXHIBITED_BASELINE, 'en')}`);
      }
      const gaps: string[] = [];
      for (const k of BIG_KEYS) {
        const d = declared[k] ?? 0.5;
        const e = exhibited[k] ?? EXHIBITED_BASELINE;
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
        'Identity\u2013action gap: small \u2014 the mission can refine one concrete detail without overload.';
    } else if (congruenceDelta < 0.35) {
      deltaHint =
        'Identity\u2013action gap: moderate \u2014 today\u2019s action can slightly bridge what they want to be and what they do.';
    } else {
      deltaHint =
        'Identity\u2013action gap: large \u2014 the mission must stay realistic and encouraging, no guilt.';
    }
    lines.push(
      `COHERENCE INDICATOR (0 = close, 1 = more drift): ${congruenceDelta.toFixed(2)}. ${deltaHint}`,
    );
    return lines.join('\n');
  }

  lines.push('TENDANCES D\u00c9CLAR\u00c9ES (ce que la personne dit de soi) :');
  for (const k of BIG_KEYS) {
    lines.push(`- ${traitLabel(k)} : ${band(declared[k] ?? 0.5, 'fr')}`);
  }

  const hasHistory = hasExhibitedSignal(exhibited);
  if (!hasHistory) {
    lines.push(
      'HISTORIQUE DE QU\u00caTES : peu de donn\u00e9es \u2014 mets l\u2019accent sur le profil d\u00e9clar\u00e9 et la famille de qu\u00eate ci-dessous.',
    );
  } else {
    lines.push('TENDANCES OBSERV\u00c9ES (comportements r\u00e9cents via qu\u00eates compl\u00e9t\u00e9es / accept\u00e9es) :');
    for (const k of BIG_KEYS) {
      lines.push(`- ${traitLabel(k)} : ${band(exhibited[k] ?? EXHIBITED_BASELINE, 'fr')}`);
    }
    const gaps: string[] = [];
    for (const k of BIG_KEYS) {
      const d = declared[k] ?? 0.5;
      const e = exhibited[k] ?? EXHIBITED_BASELINE;
      if (Math.abs(d - e) > 0.15) {
        if (d > e)
          gaps.push(
            `tu te d\u00e9clares plus ${k === 'extraversion' ? 'sociable' : 'marqu\u00e9\u00b7e'} sur ${traitLabel(k)} que ne le sugg\u00e8rent tes r\u00e9centes actions`,
          );
        else gaps.push(`tes actions r\u00e9centes montrent plus de ${traitLabel(k)} que tu ne le d\u00e9clares`);
      }
    }
    if (gaps.length > 0) {
      lines.push(`\u00c9CARTS POSSIBLES (\u00e0 respecter sans moraliser) : ${gaps.slice(0, 3).join(' ; ')}.`);
    }
  }

  let deltaHint: string;
  if (congruenceDelta < 0.15) {
    deltaHint =
      '\u00c9cart identit\u00e9\u2013actions : faible \u2014 la mission peut affiner un d\u00e9tail concret, sans surcharger.';
  } else if (congruenceDelta < 0.35) {
    deltaHint =
      '\u00c9cart identit\u00e9\u2013actions : mod\u00e9r\u00e9 \u2014 une action du jour peut rapprocher un peu ce que la personne veut \u00eatre de ce qu\u2019elle fait.';
  } else {
    deltaHint =
      '\u00c9cart identit\u00e9\u2013actions : marqu\u00e9 \u2014 la mission doit \u00eatre r\u00e9aliste et encourageante, sans culpabiliser.';
  }
  lines.push(`INDICATEUR DE COH\u00c9RENCE (0 = proche, 1 = plus d\u2019\u00e9cart) : ${congruenceDelta.toFixed(2)}. ${deltaHint}`);

  return lines.join('\n');
}

/**
 * Pistes op\u00e9rationnelles pour diff\u00e9rencier les missions (sans jargon clinique).
 * Utilise un m\u00e9lange d\u00e9clar\u00e9 / observ\u00e9 quand l\u2019historique existe.
 */
export function buildPersonalityMissionHints(
  declared: PersonalityVector,
  exhibited: PersonalityVector,
  locale: AppLocale = 'fr',
): string {
  const hasHistory = hasExhibitedSignal(exhibited);
  const m = (k: keyof PersonalityVector) =>
    hasHistory
      ? (declared[k] ?? 0.5) * 0.55 + (exhibited[k] ?? EXHIBITED_BASELINE) * 0.45
      : declared[k] ?? 0.5;

  const gentle =
    (1 - m('extraversion')) * 0.30 +
    (1 - m('thrillSeeking')) * 0.25 +
    (1 - m('openness')) * 0.20 +
    m('emotionalStability') * 0.10 +
    (1 - m('boredomSusceptibility')) * 0.15;

  if (locale === 'en') {
    const lines: string[] = ['MISSION TUNING (make this day feel personal, not generic):'];

    if (gentle > 0.6) {
      lines.push(
        '- EFFORT LEVEL: very light \u2014 the mission should feel like a natural extension of the day, not a separate event. Prefer a micro-action (5\u201315 min) that plugs into something they already do (a meal, a commute, a break). Start from what they would do anyway and add one small twist.',
      );
      lines.push(
        '- FRICTION: near zero \u2014 the person should think "I can do this right now without changing my plans." Never frame it as a challenge or a leap of faith.',
      );
    } else if (gentle > 0.45) {
      lines.push(
        '- EFFORT LEVEL: moderate \u2014 a short but distinct action (20\u201340 min) that asks for a small routine break. Frame it as a gentle invitation, not a demand.',
      );
    } else {
      lines.push(
        '- EFFORT LEVEL: significant \u2014 this person enjoys being pushed. A real schedule change, an unusual detour, or a bold social move fits well.',
      );
    }

    const ex = m('extraversion');
    if (ex < 0.38) {
      lines.push(
        '- Social vibe: quiet \u2014 solo or very light contact; avoid "big group energy".',
      );
    } else if (ex > 0.62) {
      lines.push('- Social vibe: lively \u2014 a small real interaction can carry the mission.');
    } else {
      lines.push('- Social vibe: balanced \u2014 optional light contact; no forced extroversion.');
    }
    const op = m('openness');
    const co = m('conscientiousness');
    if (op > 0.58 && co < 0.45) {
      lines.push('- Lean into a fresh angle or unusual detail; structure can stay loose.');
    } else if (op < 0.4 && co > 0.58) {
      lines.push('- Prefer a clear, repeatable micro-step over a vague "explore".');
    } else {
      lines.push('- Mix one concrete novelty with one clear completion signal.');
    }
    const bore = m('boredomSusceptibility');
    const thrill = m('thrillSeeking');
    if (bore > 0.55 || thrill > 0.55) {
      lines.push('- Pace: needs a bit of spice \u2014 a crisp constraint, twist, or time-box.');
    } else {
      lines.push('- Pace: steady \u2014 reward calm focus over hype.');
    }
    if (m('agreeableness') > 0.58) {
      lines.push('- Tone: warm \u2014 small kindness or gentle connection fits the grain.');
    }
    return lines.join('\n');
  }

  const lines: string[] = ['ACCROCHE MISSION (diff\u00e9rencier ce jour \u2014 \u00e9viter la \u00ab qu\u00eate g\u00e9n\u00e9rique \u00bb) :'];

  if (gentle > 0.6) {
    lines.push(
      '- INVESTISSEMENT DEMAND\u00c9 : tr\u00e8s l\u00e9ger \u2014 la mission doit sembler un prolongement naturel de la journ\u00e9e, pas un \u00e9v\u00e9nement \u00e0 part. Pr\u00e9f\u00e8re une micro-action (5\u201315 min) qui se greffe sur un moment existant (repas, trajet, pause, routine du soir). Pars de ce que la personne fait d\u00e9j\u00e0 et ajoute un seul petit twist.',
    );
    lines.push(
      '- FRICTION : quasi nulle \u2014 la personne doit se dire \u00ab je peux faire \u00e7a tout de suite sans changer mes plans \u00bb. Ne formule jamais la mission comme un d\u00e9fi ou un saut dans le vide.',
    );
  } else if (gentle > 0.45) {
    lines.push(
      '- INVESTISSEMENT DEMAND\u00c9 : mod\u00e9r\u00e9 \u2014 une action courte mais distincte (20\u201340 min) qui demande un l\u00e9ger \u00e9cart de routine. Formule comme une invitation douce, pas une injonction.',
    );
  } else {
    lines.push(
      '- INVESTISSEMENT DEMAND\u00c9 : significatif \u2014 cette personne aime \u00eatre pouss\u00e9e. Un vrai changement de programme, un d\u00e9tour inhabituel ou un geste social audacieux lui convient.',
    );
  }

  const ex = m('extraversion');
  if (ex < 0.38) {
    lines.push(
      '- Registre social : plut\u00f4t calme \u2014 solo ou contact tr\u00e8s l\u00e9ger ; pas d\u2019\u00e9nergie \u00ab grand groupe \u00bb.',
    );
  } else if (ex > 0.62) {
    lines.push('- Registre social : plut\u00f4t vif \u2014 une petite interaction r\u00e9elle peut porter la mission.');
  } else {
    lines.push('- Registre social : \u00e9quilibr\u00e9 \u2014 contact l\u00e9ger possible, sans forcer l\u2019extraversion.');
  }
  const op = m('openness');
  const co = m('conscientiousness');
  if (op > 0.58 && co < 0.45) {
    lines.push('- Mise sur un angle neuf ou un d\u00e9tail inusit\u00e9 ; la structure peut rester souple.');
  } else if (op < 0.4 && co > 0.58) {
    lines.push('- Privil\u00e9gie une micro-\u00e9tape claire et r\u00e9p\u00e9table plut\u00f4t qu\u2019un vague \u00ab explore \u00bb.');
  } else {
    lines.push('- Combine une nouveaut\u00e9 concr\u00e8te avec un signal de fin net (c\u2019est fait quand\u2026).');
  }
  const bore = m('boredomSusceptibility');
  const thrill = m('thrillSeeking');
  if (bore > 0.55 || thrill > 0.55) {
    lines.push('- Rythme : il faut un peu de mordant \u2014 contrainte ludique, twist ou cr\u00e9neau horaire court.');
  } else {
    lines.push('- Rythme : pos\u00e9 \u2014 valorise l\u2019attention calme plut\u00f4t que le buzz.');
  }
  if (m('agreeableness') > 0.58) {
    lines.push('- Ton : chaleureux \u2014 petite bienveillance ou lien doux dans le grain.');
  }
  return lines.join('\n');
}

const NARRATIVE_COLOR_FR: readonly string[] = [
  'Couleur du texte : un soupçon de cinéma du quotidien — lumière, bruit de fond, texture du trottoir ou de la table.',
  'Couleur du texte : comme une carte postale qu’on s’envoie à soi-même — image nette, phrase qui résonne.',
  'Couleur du texte : ton complice, légèrement taquin·e, jamais moqueur·se ; on sourit en lisant.',
  'Couleur du texte : rythme de phrase varié (coupe courte + reprise) sans alourdir.',
  'Couleur du texte : ancrage dans un moment vérifiable (matin, pause, retour, veilleuse).',
  'Couleur du texte : chaleur humaine — on sent que quelqu’un de vrai a écrit pour un humain de vrai.',
];

const NARRATIVE_COLOR_EN: readonly string[] = [
  'Text color: a hint of everyday cinema — light, background sound, texture of pavement or table.',
  'Text color: like a postcard to yourself — crisp image, resonant line.',
  'Text color: warm witty confidant tone — never mean; the reader almost smiles.',
  'Text color: varied sentence rhythm (short beat + glide) without heaviness.',
  'Text color: anchored in a checkable moment (morning, break, commute home, evening light).',
  'Text color: human warmth — it feels written by a real voice for a real person.',
];

/**
 * Voix narrative par phase + une touche de couleur tirée (stable pour une graine donnée).
 * Complète les hints « mission » sans les remplacer.
 */
export function buildNarrativeVoiceBlock(
  phase: EscalationPhase,
  locale: AppLocale,
  seed: string,
): string {
  const colors = locale === 'en' ? NARRATIVE_COLOR_EN : NARRATIVE_COLOR_FR;
  const idx = promptSeedIndex(seed, 'narrative-color', colors.length);
  const colorLine = colors[idx]!;

  if (locale === 'en') {
    const phaseLine: Record<EscalationPhase, string> = {
      calibration:
        'NARRATIVE VOICE (calibration): gentle, close, reassuring — like a friend’s note, not a coach shouting.',
      expansion:
        'NARRATIVE VOICE (expansion): curious, lightly adventurous — the day opens a little wider; still kind.',
      rupture:
        'NARRATIVE VOICE (rupture): bolder imagery and cadence, still grounded — opening scene of a short film about today, not a fantasy epic.',
    };
    return `${phaseLine[phase]}\n${colorLine}\nFORMAT: title + hook carry most of the “story breath”; mission stays one clear sentence (you may start with a short beat in the same sentence, then the main action).`;
  }

  const phaseLine: Record<EscalationPhase, string> = {
    calibration:
      'VOIX NARRATIVE (calibration) : douce, proche, rassurante — comme un mot d’un·e ami·e, pas un coach qui crie.',
    expansion:
      'VOIX NARRATIVE (expansion) : curieuse, légèrement aventureuse — la journée s’élargit un peu ; toujours bienveillante.',
    rupture:
      'VOIX NARRATIVE (rupture) : images et rythme plus affirmés, mais ancrés dans le réel — comme le début d’un court métrage sur aujourd’hui, pas un roman fantastique.',
  };
  return `${phaseLine[phase]}\n${colorLine}\nFORMAT : le titre et le hook portent le « souffle » du récit ; la mission reste **une** phrase claire (tu peux commencer par une courte incipit dans la même phrase, puis l’action principale).`;
}

export function archetypeCategoryLabel(category: PsychologicalCategory, locale: AppLocale = 'fr'): string {
  const map = locale === 'en' ? QUEST_CATEGORY_LABEL_EN : QUEST_CATEGORY_LABEL_FR;
  return map[category] ?? category;
}

/** Axes psychologiques cibl\u00e9s par l\u2019arch\u00e9type (pour aligner le ton et les verbes). */
export function describeArchetypeTargetTraits(q: QuestModel, locale: AppLocale = 'fr'): string {
  const t = q.targetTraits;
  if (!t || Object.keys(t).length === 0) {
    return locale === 'en' ? 'general balance' : '\u00e9quilibre g\u00e9n\u00e9ral';
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
            ? 'mod\u00e9r\u00e9'
            : 'l\u00e9ger';
    parts.push(`${label} (${strength})`);
  }
  return parts.join(' ; ');
}
