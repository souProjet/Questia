import type { AppLocale, QuestCandidate, QuestModel } from '@questia/shared';
import { promptSeedIndex, questLocalizedText } from '@questia/shared';
import { clampToOneSentence } from './validation';
import type { GeneratedQuest } from './types';

/** Hooks de secours stables (sélection déterministe par jour + archétype). */
const FALLBACK_HOOKS_FR: string[] = [
  "Aujourd'hui, un petit pas suffit à ouvrir une porte.",
  'La curiosité est un muscle : fais une série.',
  "Le brouillard se lève quand tu avances d'un mètre.",
  "Choisis l'inconfort léger plutôt que la rumination.",
  "L'énergie vient souvent après le premier pas.",
  'Un détail changé, et toute la journée penche différemment.',
  "Aujourd'hui, écris une ligne nouvelle dans ton histoire.",
  "Le hasard aime ceux qui bougent les pieds.",
  "Tu n'as pas à impressionner — seulement à te sentir vivant·e.",
  'Pas besoin d\'être prêt·e : commence, puis ajuste.',
];

const FALLBACK_HOOKS_EN: string[] = [
  'Today, one small step is enough to open a door.',
  'Curiosity is a muscle — do a set.',
  'Fog lifts when you move one meter.',
  'Choose light discomfort over rumination.',
  'Energy often comes after the first step.',
  'Change one detail, and the whole day tilts.',
  'Today, write a new line in your story.',
  'Luck likes people who move their feet.',
  "You don't need to impress — only feel alive.",
  "You don't need to be ready: start, then adjust.",
];

function pickHook(seed: string, locale: AppLocale): string {
  const list = locale === 'en' ? FALLBACK_HOOKS_EN : FALLBACK_HOOKS_FR;
  return list[promptSeedIndex(seed, 'fallback-hook', list.length)]!;
}

/**
 * Quête de secours : utilise le top candidate, son texte canon (paraphrasé),
 * un hook déterministe. Préférable à un échec dur.
 */
export function buildFallbackQuest(
  topCandidate: QuestCandidate,
  locale: AppLocale,
  context: { questDateIso: string; hasUserLocation: boolean; isOutdoorFriendly: boolean },
): GeneratedQuest {
  const archetype = topCandidate.archetype;
  const localized = questLocalizedText(archetype, locale);
  const computedIsOutdoor =
    archetype.requiresOutdoor && context.hasUserLocation && context.isOutdoorFriendly;
  const hookSeed = `${context.questDateIso}|${archetype.id}`;
  return {
    archetypeId: archetype.id,
    icon: defaultIconForArchetype(archetype),
    title: localized.title,
    mission: clampToOneSentence(localized.description),
    hook: pickHook(hookSeed, locale),
    duration: `${archetype.minimumDurationMinutes} min`,
    isOutdoor: computedIsOutdoor,
    safetyNote: computedIsOutdoor
      ? locale === 'en'
        ? 'Prefer busy, well-lit public places.'
        : 'Privilégie les lieux fréquentés et bien éclairés.'
      : null,
    destinationLabel: null,
    destinationQuery: null,
    selectionReason: null,
    selfFitScore: null,
    wasFallback: true,
  };
}

function defaultIconForArchetype(archetype: QuestModel): string {
  switch (archetype.category) {
    case 'spatial_adventure':
      return 'Compass';
    case 'public_introspection':
      return 'BookOpen';
    case 'sensory_deprivation':
      return 'Leaf';
    case 'exploratory_sociability':
      return 'MapPin';
    case 'physical_existential':
      return 'TreePine';
    case 'async_discipline':
      return 'Target';
    case 'dopamine_detox':
      return 'Sparkles';
    case 'active_empathy':
      return 'Mic';
    case 'temporal_projection':
      return 'BookOpen';
    case 'hostile_immersion':
      return 'Drama';
    case 'spontaneous_altruism':
      return 'Coffee';
    case 'relational_vulnerability':
      return 'Flower';
    case 'unconditional_service':
      return 'UtensilsCrossed';
    default:
      return 'Target';
  }
}
