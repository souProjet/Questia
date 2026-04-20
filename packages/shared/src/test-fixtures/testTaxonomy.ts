import type { QuestModel } from '../types';
import {
  QUEST_ARCHETYPES_SEED,
  QUEST_ARCHETYPES_SEED_FALLBACK_ID,
} from '../data/questArchetypesSeed';

/**
 * Sous-ensemble stable de la taxonomie pour les tests unitaires rapides (premiers ids par
 * ordre croissant). Dérivé du seed TypeScript canonique — PAS de JSON figé à côté.
 */
const TINY_IDS = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);

export const TEST_QUEST_TAXONOMY: QuestModel[] = QUEST_ARCHETYPES_SEED
  .filter((q) => TINY_IDS.has(q.id))
  .slice()
  .sort((a, b) => a.id - b.id);

export const TEST_FALLBACK_QUEST_ID = QUEST_ARCHETYPES_SEED_FALLBACK_ID;
