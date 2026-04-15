import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';
import { invalidateQuestTaxonomyCache } from '@/lib/quest-taxonomy/cache';
import type { QuestArchetypePace, QuestComfortLevel, QuestPsychologicalCategory } from '@prisma/client';

export async function GET() {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const rows = await prisma.questArchetype.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const body = (await request.json()) as Record<string, unknown>;
  const maxRow = await prisma.questArchetype.aggregate({ _max: { id: true } });
  const nextId = (maxRow._max.id ?? 0) + 1;
  const id = typeof body.id === 'number' && body.id > 0 ? body.id : nextId;

  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const titleEn = String(body.titleEn ?? '').trim();
  const descriptionEn = String(body.descriptionEn ?? '').trim();
  if (!title || !description || !titleEn || !descriptionEn) {
    return NextResponse.json({ error: 'Champs titre/description FR+EN requis.' }, { status: 400 });
  }

  const row = await prisma.questArchetype.create({
    data: {
      id,
      title,
      description,
      titleEn,
      descriptionEn,
      category: String(body.category) as QuestPsychologicalCategory,
      targetTraits: (body.targetTraits ?? {}) as object,
      comfortLevel: String(body.comfortLevel ?? 'moderate') as QuestComfortLevel,
      requiresOutdoor: Boolean(body.requiresOutdoor),
      requiresSocial: Boolean(body.requiresSocial),
      minimumDurationMinutes: Math.max(5, Math.min(1440, Number(body.minimumDurationMinutes) || 45)),
      fallbackQuestId:
        body.fallbackQuestId === null || body.fallbackQuestId === undefined
          ? null
          : Number(body.fallbackQuestId),
      questPace: (String(body.questPace) === 'planned' ? 'planned' : 'instant') as QuestArchetypePace,
      published: body.published === undefined ? true : Boolean(body.published),
    },
  });

  invalidateQuestTaxonomyCache();
  return NextResponse.json(row, { status: 201 });
}
