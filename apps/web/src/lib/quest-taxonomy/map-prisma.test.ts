import { describe, expect, it } from 'vitest';
import type { QuestArchetype } from '@prisma/client';
import { findArchetypeById, prismaArchetypeToQuestModel } from './map-prisma';
import { TEST_QUEST_TAXONOMY } from '@questia/shared';

const baseRow = {
  id: 1,
  title: 'T',
  description: 'D',
  titleEn: 'TE',
  descriptionEn: 'DE',
  category: 'exploratory_sociability',
  targetTraits: { openness: 0.5 },
  comfortLevel: 'moderate',
  requiresOutdoor: false,
  requiresSocial: false,
  minimumDurationMinutes: 45,
  fallbackQuestId: null,
  questPace: 'instant',
  published: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Partial<QuestArchetype>;

describe('prismaArchetypeToQuestModel', () => {
  it('mappe une ligne Prisma vers QuestModel', () => {
    const m = prismaArchetypeToQuestModel(baseRow as QuestArchetype);
    expect(m.id).toBe(1);
    expect(m.title).toBe('T');
    expect(m.questPace).toBe('instant');
    expect(m.fallbackQuestId).toBeUndefined();
  });
  it('questPace planned reste planned', () => {
    const m = prismaArchetypeToQuestModel({
      ...baseRow,
      questPace: 'planned',
    } as QuestArchetype);
    expect(m.questPace).toBe('planned');
  });
  it('fallbackQuestId numérique', () => {
    const m = prismaArchetypeToQuestModel({
      ...baseRow,
      fallbackQuestId: 9,
    } as QuestArchetype);
    expect(m.fallbackQuestId).toBe(9);
  });
});

describe('findArchetypeById', () => {
  it('trouve par id', () => {
    const q = findArchetypeById(TEST_QUEST_TAXONOMY, 1);
    expect(q?.id).toBe(1);
  });
  it('undefined si absent', () => {
    expect(findArchetypeById(TEST_QUEST_TAXONOMY, 999_999)).toBeUndefined();
  });
});
