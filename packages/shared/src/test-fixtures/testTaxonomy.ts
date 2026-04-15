import type { QuestModel } from '../types';
import raw from './tiny-quest-taxonomy.json';

/** Sous-ensemble de taxonomie pour les tests unitaires (pas de liste en dur complète). */
export const TEST_QUEST_TAXONOMY = raw as QuestModel[];

export const TEST_FALLBACK_QUEST_ID = 9;
