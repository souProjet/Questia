/**
 * Importe la taxonomie depuis prisma/data/quest-archetypes.json (upsert par id).
 * Usage (apps/web) : npm run db:seed-archetypes
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const jsonPath = join(__dirname, 'data/quest-archetypes.json');

function mapQuestPace(p) {
  return p === 'planned' ? 'planned' : 'instant';
}

async function main() {
  const raw = readFileSync(jsonPath, 'utf8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`Invalid JSON: ${jsonPath}`);
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
        questPace: mapQuestPace(q.questPace),
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
        questPace: mapQuestPace(q.questPace),
      },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: 'default_fallback_archetype_id' },
    create: { key: 'default_fallback_archetype_id', value: '9' },
    update: {},
  });

  console.log(`OK — ${items.length} archétypes upsertés, fallback id = 9.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
