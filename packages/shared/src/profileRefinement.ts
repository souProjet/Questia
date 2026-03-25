import type { PsychologicalCategory } from './types';

/** Incrémenter pour reproposer le questionnaire (nouvelles questions / recalibrage). */
export const REFINEMENT_SCHEMA_VERSION = 1;

/** Jour d’aventure minimum avant éligibilité (sauf si assez de complétions). */
export const REFINEMENT_MIN_DAY = 8;

/** Complétions minimum si jour encore bas. */
export const REFINEMENT_MIN_COMPLETIONS = 5;

/** Jours avant de reproposer après « plus tard ». */
export const REFINEMENT_SKIP_COOLDOWN_DAYS = 14;

export interface RefinementOption {
  id: string;
  label: string;
}

export interface RefinementQuestion {
  id: string;
  prompt: string;
  helpText?: string;
  options: RefinementOption[];
}

export const REFINEMENT_QUESTIONS: readonly RefinementQuestion[] = [
  {
    id: 'social_mode',
    prompt: 'Pour tes quêtes au quotidien, tu préfères plutôt…',
    helpText: 'On adaptera les missions sociales ou solo.',
    options: [
      { id: 'solo', label: 'Du temps pour moi, peu de monde' },
      { id: 'balanced', label: 'Un mélange équilibré' },
      { id: 'social', label: 'Rencontrer, échanger, bouger vers les autres' },
    ],
  },
  {
    id: 'romance_topics',
    prompt: 'Les quêtes centrées sur le couple ou l’engagement romantique te semblent…',
    helpText:
      'Ça calibre surtout les missions « vie à deux » ou engagement — pas les défis de rencontre ou de séduction légère si tu es plutôt aventureux·se socialement.',
    options: [
      { id: 'avoid', label: 'Plutôt à éviter pour l’instant' },
      { id: 'neutral', label: 'Ça dépend du jour' },
      { id: 'ok', label: 'OK si c’est proposé avec tact' },
    ],
  },
  {
    id: 'food_missions',
    prompt: 'Les missions autour d’un café, d’un marché ou d’un repas partagé…',
    options: [
      { id: 'love', label: "J'aime bien, ça me motive" },
      { id: 'neutral', label: 'Parfois oui, parfois non' },
      { id: 'avoid', label: 'Je préfère d’autres types de défis' },
    ],
  },
  {
    id: 'energy_peak',
    prompt: 'Tu as plutôt de l’énergie pour un défi un peu costaud…',
    options: [
      { id: 'morning', label: 'Le matin' },
      { id: 'afternoon', label: "L'après-midi" },
      { id: 'evening', label: 'Le soir' },
      { id: 'varies', label: 'Ça varie' },
    ],
  },
  {
    id: 'crowds',
    prompt: 'Lieux très fréquentés (gare, centre très bondé…) tu ressens plutôt…',
    options: [
      { id: 'draining', label: 'Épuisant — je préfère le calme' },
      { id: 'neutral', label: 'Neutre, ça dépend' },
      { id: 'energizing', label: 'Plutôt stimulant' },
    ],
  },
] as const;

const ALL_CATEGORIES: PsychologicalCategory[] = [
  'spatial_adventure',
  'public_introspection',
  'sensory_deprivation',
  'exploratory_sociability',
  'physical_existential',
  'async_discipline',
  'dopamine_detox',
  'active_empathy',
  'temporal_projection',
  'hostile_immersion',
  'spontaneous_altruism',
  'relational_vulnerability',
  'unconditional_service',
];

function emptyBias(): Partial<Record<PsychologicalCategory, number>> {
  return {};
}

function addBias(
  acc: Partial<Record<PsychologicalCategory, number>>,
  delta: Partial<Record<PsychologicalCategory, number>>,
): void {
  for (const k of ALL_CATEGORIES) {
    const d = delta[k];
    if (d === undefined) continue;
    acc[k] = (acc[k] ?? 0) + d;
  }
}

function clampBias(acc: Partial<Record<PsychologicalCategory, number>>): Partial<Record<PsychologicalCategory, number>> {
  const out: Partial<Record<PsychologicalCategory, number>> = {};
  for (const k of ALL_CATEGORIES) {
    const v = acc[k];
    if (v === undefined) continue;
    out[k] = Math.max(-0.14, Math.min(0.14, v));
  }
  return out;
}

/** Biais à soustraire au score selectQuest (plus la valeur est haute, plus la quête est favorisée). */
export function refinementAnswersToCategoryBias(
  answers: Record<string, string> | null | undefined,
): Partial<Record<PsychologicalCategory, number>> {
  if (!answers || typeof answers !== 'object') return {};

  const acc = emptyBias();

  switch (answers.social_mode) {
    case 'solo':
      addBias(acc, {
        dopamine_detox: 0.06,
        sensory_deprivation: 0.05,
        temporal_projection: 0.05,
        physical_existential: 0.04,
        exploratory_sociability: -0.06,
        active_empathy: -0.05,
        hostile_immersion: -0.06,
        spontaneous_altruism: -0.04,
      });
      break;
    case 'social':
      addBias(acc, {
        exploratory_sociability: 0.07,
        active_empathy: 0.06,
        spontaneous_altruism: 0.05,
        hostile_immersion: 0.04,
        dopamine_detox: -0.04,
        sensory_deprivation: -0.03,
      });
      break;
    default:
      break;
  }

  switch (answers.romance_topics) {
    case 'avoid':
      // Surtout les missions type lien stable / couple (relational_vulnerability). Ne pas pénaliser
      // hostile_immersion : confondu avec drague / mise en situation sociale « risquée ».
      addBias(acc, {
        relational_vulnerability: -0.09,
      });
      // Profils les plus ouverts au jeu social : compenser pour garder des quêtes type rencontre / séduction légère.
      if (answers.social_mode === 'social' || answers.crowds === 'energizing') {
        addBias(acc, {
          exploratory_sociability: 0.025,
          hostile_immersion: 0.022,
        });
      }
      break;
    case 'ok':
      addBias(acc, { relational_vulnerability: 0.04 });
      break;
    default:
      break;
  }

  switch (answers.food_missions) {
    case 'love':
      addBias(acc, {
        public_introspection: 0.05,
        unconditional_service: 0.05,
        exploratory_sociability: 0.03,
      });
      break;
    case 'avoid':
      addBias(acc, {
        public_introspection: -0.04,
        unconditional_service: -0.03,
      });
      break;
    default:
      break;
  }

  switch (answers.energy_peak) {
    case 'morning':
      addBias(acc, { async_discipline: 0.06, physical_existential: 0.03 });
      break;
    case 'afternoon':
      addBias(acc, { physical_existential: 0.04, exploratory_sociability: 0.02 });
      break;
    case 'evening':
      addBias(acc, {
        public_introspection: 0.03,
        exploratory_sociability: 0.03,
        active_empathy: 0.03,
      });
      break;
    default:
      break;
  }

  switch (answers.crowds) {
    case 'draining':
      addBias(acc, {
        spatial_adventure: -0.05,
        hostile_immersion: -0.05,
        exploratory_sociability: -0.04,
        public_introspection: -0.03,
        sensory_deprivation: 0.05,
        dopamine_detox: 0.04,
      });
      break;
    case 'energizing':
      addBias(acc, {
        spatial_adventure: 0.04,
        exploratory_sociability: 0.04,
        hostile_immersion: 0.03,
      });
      break;
    default:
      break;
  }

  return clampBias(acc);
}

export interface RefinementEligibilityInput {
  currentDay: number;
  completedQuestCount: number;
  refinementSchemaVersion: number;
  refinementSkippedAt: string | null | undefined;
}

function daysBetweenIso(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.floor((db.getTime() - da.getTime()) / (24 * 60 * 60 * 1000));
}

/** True si le questionnaire (version actuelle du schéma) doit être proposé. */
export function shouldPromptRefinementSurvey(input: RefinementEligibilityInput): boolean {
  const { currentDay, completedQuestCount, refinementSchemaVersion, refinementSkippedAt } = input;

  if (refinementSchemaVersion >= REFINEMENT_SCHEMA_VERSION) return false;

  const activeEnough = currentDay >= REFINEMENT_MIN_DAY || completedQuestCount >= REFINEMENT_MIN_COMPLETIONS;
  if (!activeEnough) return false;

  if (refinementSkippedAt) {
    const d = daysBetweenIso(refinementSkippedAt, new Date().toISOString().slice(0, 10));
    if (d < REFINEMENT_SKIP_COOLDOWN_DAYS) return false;
  }

  return true;
}

/** Valide les réponses pour la version courante du schéma. */
export function parseValidRefinementAnswers(
  raw: unknown,
): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const q of REFINEMENT_QUESTIONS) {
    const v = o[q.id];
    if (typeof v !== 'string') return null;
    const ok = q.options.some((opt) => opt.id === v);
    if (!ok) return null;
    out[q.id] = v;
  }
  return out;
}

/** Texte pour prompts IA (pas de scores, ton coaching). */
export function buildRefinementContextForPrompt(answers: Record<string, string> | null | undefined): string | null {
  if (!answers) return null;
  const parts: string[] = [];

  const sm = answers.social_mode;
  if (sm === 'solo') parts.push('privilégie des missions plutôt en solo ou calmes');
  else if (sm === 'social') parts.push('à l’aise avec des missions impliquant du lien ou des échanges');
  else parts.push('mix solo / social acceptable');

  const ro = answers.romance_topics;
  const adventurousSocial =
    answers.social_mode === 'social' || answers.crowds === 'energizing';
  if (ro === 'avoid') {
    if (adventurousSocial) {
      parts.push(
        'préfère éviter les missions centrées sur le couple ou l’engagement romantique ; peut encore apprécier des défis de rencontre, flirt ou mise en situation sociale légère',
      );
    } else {
      parts.push('préfère éviter les thèmes de couple ou d’engagement romantique dans les missions');
    }
  } else if (ro === 'ok') {
    parts.push('OK pour des missions touchant aux relations de couple avec tact');
  }

  const fd = answers.food_missions;
  if (fd === 'love') parts.push('apprécie les défis autour d’un repas, café ou marché');
  else if (fd === 'avoid') parts.push('préfère éviter les missions centrées sur la nourriture ou les lieux de restauration');

  const en = answers.energy_peak;
  if (en === 'morning') parts.push('énergie plutôt le matin pour les défis un peu costauds');
  else if (en === 'evening') parts.push('énergie plutôt le soir');
  else if (en === 'afternoon') parts.push('énergie plutôt l’après-midi');

  const cr = answers.crowds;
  if (cr === 'draining') parts.push('lieux très bondés plutôt fatigants — privilégier calme ou espaces modérés');
  else if (cr === 'energizing') parts.push('à l’aise dans les lieux animés');

  if (parts.length === 0) return null;
  return `Préférences utilisateur (questionnaire optionnel, ne pas citer comme tel) : ${parts.join(' ; ')}.`;
}
