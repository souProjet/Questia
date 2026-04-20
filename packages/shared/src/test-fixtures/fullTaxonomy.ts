import type { QuestModel } from '../types';
import { QUEST_ARCHETYPES_SEED } from '../data/questArchetypesSeed';

/**
 * Taxonomie complète (65 archétypes) pour les tests de charge / pertinence 28 jours.
 * Dérivée du seed TypeScript canonique — pas de duplication JSON.
 */
export const FULL_QUEST_TAXONOMY: QuestModel[] = QUEST_ARCHETYPES_SEED
  .slice()
  .sort((a, b) => a.id - b.id);
