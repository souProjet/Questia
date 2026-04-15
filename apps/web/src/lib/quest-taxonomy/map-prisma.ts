import type { QuestArchetype } from '@prisma/client';
import type { ComfortLevel, PsychologicalCategory, QuestModel, QuestPace } from '@questia/shared';

export function prismaArchetypeToQuestModel(row: QuestArchetype): QuestModel {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    titleEn: row.titleEn,
    descriptionEn: row.descriptionEn,
    category: row.category as PsychologicalCategory,
    targetTraits: (row.targetTraits ?? {}) as QuestModel['targetTraits'],
    comfortLevel: row.comfortLevel as ComfortLevel,
    requiresOutdoor: row.requiresOutdoor,
    requiresSocial: row.requiresSocial,
    minimumDurationMinutes: row.minimumDurationMinutes,
    fallbackQuestId: row.fallbackQuestId ?? undefined,
    questPace: row.questPace === 'planned' ? 'planned' : ('instant' as QuestPace),
  };
}

export function findArchetypeById(taxonomy: QuestModel[], id: number): QuestModel | undefined {
  return taxonomy.find((q) => q.id === id);
}
