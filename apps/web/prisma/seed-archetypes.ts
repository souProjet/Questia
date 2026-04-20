/**
 * Seed d'amorçage de la taxonomie des archétypes de quête.
 *
 * Usage (depuis `apps/web`) : `npm run db:seed-archetypes`.
 *
 * IMPORTANT :
 *  - La source unique des archétypes est `@questia/shared` (`QUEST_ARCHETYPES_SEED`).
 *    Aucun JSON n'est plus maintenu en parallèle — la BDD est canonique après le
 *    premier run.
 *  - Une fois l'environnement amorcé, toute modification de taxonomie se fait via
 *    l'UI admin (`/admin/quests`) ou l'API `POST|PATCH /api/admin/quest-archetypes`.
 *  - Ce script fait des `upsert` par id : relancer est sûr, mais cela ÉCRASE les
 *    champs connus. Ne pas le relancer en prod une fois la taxonomie éditée via
 *    l'admin sans accord explicite.
 */
import { PrismaClient } from '@prisma/client';
import {
  QUEST_ARCHETYPES_SEED,
  QUEST_ARCHETYPES_SEED_FALLBACK_ID,
} from '@questia/shared';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const items = QUEST_ARCHETYPES_SEED;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('QUEST_ARCHETYPES_SEED vide ou invalide — rien à seed.');
  }

  for (const q of items) {
    await prisma.questArchetype.upsert({
      where: { id: q.id },
      create: {
        id: q.id,
        title: q.title,
        description: q.description,
        titleEn: q.titleEn,
        descriptionEn: q.descriptionEn,
        category: q.category,
        targetTraits: q.targetTraits ?? {},
        comfortLevel: q.comfortLevel,
        requiresOutdoor: q.requiresOutdoor,
        requiresSocial: q.requiresSocial,
        minimumDurationMinutes: q.minimumDurationMinutes,
        fallbackQuestId: q.fallbackQuestId ?? null,
        questPace: q.questPace === 'planned' ? 'planned' : 'instant',
        published: true,
      },
      update: {
        title: q.title,
        description: q.description,
        titleEn: q.titleEn,
        descriptionEn: q.descriptionEn,
        category: q.category,
        targetTraits: q.targetTraits ?? {},
        comfortLevel: q.comfortLevel,
        requiresOutdoor: q.requiresOutdoor,
        requiresSocial: q.requiresSocial,
        minimumDurationMinutes: q.minimumDurationMinutes,
        fallbackQuestId: q.fallbackQuestId ?? null,
        questPace: q.questPace === 'planned' ? 'planned' : 'instant',
      },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: 'default_fallback_archetype_id' },
    create: {
      key: 'default_fallback_archetype_id',
      value: String(QUEST_ARCHETYPES_SEED_FALLBACK_ID),
    },
    update: {},
  });

  console.log(
    `OK — ${items.length} archétypes upsertés, fallback id = ${QUEST_ARCHETYPES_SEED_FALLBACK_ID}.`,
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
