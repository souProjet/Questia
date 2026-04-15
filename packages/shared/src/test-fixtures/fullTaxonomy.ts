import type { QuestModel } from '../types';
import raw from './full-quest-taxonomy.json';

/** Taxonomie complète (65) pour tests de charge / pertinence. */
export const FULL_QUEST_TAXONOMY = raw as QuestModel[];
