import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';
import { invalidateQuestTaxonomyCache } from '@/lib/quest-taxonomy/cache';
import type { QuestArchetypePace, QuestComfortLevel, QuestPsychologicalCategory } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = String(body.description).trim();
  if (body.titleEn !== undefined) data.titleEn = String(body.titleEn).trim();
  if (body.descriptionEn !== undefined) data.descriptionEn = String(body.descriptionEn).trim();
  if (body.category !== undefined) data.category = String(body.category) as QuestPsychologicalCategory;
  if (body.targetTraits !== undefined) data.targetTraits = body.targetTraits as object;
  if (body.comfortLevel !== undefined) data.comfortLevel = String(body.comfortLevel) as QuestComfortLevel;
  if (body.requiresOutdoor !== undefined) data.requiresOutdoor = Boolean(body.requiresOutdoor);
  if (body.requiresSocial !== undefined) data.requiresSocial = Boolean(body.requiresSocial);
  if (body.minimumDurationMinutes !== undefined) {
    data.minimumDurationMinutes = Math.max(5, Math.min(1440, Number(body.minimumDurationMinutes) || 45));
  }
  if (body.fallbackQuestId !== undefined) {
    data.fallbackQuestId =
      body.fallbackQuestId === null ? null : Number(body.fallbackQuestId);
  }
  if (body.questPace !== undefined) {
    data.questPace = String(body.questPace) === 'planned' ? 'planned' : ('instant' as QuestArchetypePace);
  }
  if (body.published !== undefined) data.published = Boolean(body.published);

  const row = await prisma.questArchetype.update({
    where: { id },
    data: data as never,
  });
  invalidateQuestTaxonomyCache();
  return NextResponse.json(row);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  await prisma.questArchetype.update({
    where: { id },
    data: { published: false },
  });
  invalidateQuestTaxonomyCache();
  return NextResponse.json({ ok: true });
}
