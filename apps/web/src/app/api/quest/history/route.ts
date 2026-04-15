import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { HISTORY_PAGE_SIZE } from '@questia/shared';
import { getQuestTaxonomy } from '@/lib/quest-taxonomy/cache';
import { findArchetypeById } from '@/lib/quest-taxonomy/map-prisma';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  }

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get('limit');
  const offsetRaw = url.searchParams.get('offset');
  const limit = Math.min(
    100,
    Math.max(1, limitRaw ? parseInt(limitRaw, 10) || HISTORY_PAGE_SIZE : HISTORY_PAGE_SIZE),
  );
  const offset = Math.max(0, offsetRaw ? parseInt(offsetRaw, 10) || 0 : 0);

  const rows = await prisma.questLog.findMany({
    where: { profileId: profile.id },
    orderBy: { questDate: 'desc' },
    skip: offset,
    take: limit + 1,
    select: {
      id: true,
      questDate: true,
      archetypeId: true,
      generatedEmoji: true,
      generatedTitle: true,
      generatedMission: true,
      generatedHook: true,
      generatedDuration: true,
      isOutdoor: true,
      destinationLabel: true,
      locationCity: true,
      weatherDescription: true,
      status: true,
      assignedAt: true,
      completedAt: true,
      phaseAtAssignment: true,
      wasRerolled: true,
      xpAwarded: true,
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const taxonomy = await getQuestTaxonomy();

  const quests = page.map((log) => {
    const arch = findArchetypeById(taxonomy, log.archetypeId);
    return {
      id: log.id,
      questDate: log.questDate,
      archetypeId: log.archetypeId,
      archetypeTitle: arch?.title ?? null,
      emoji: log.generatedEmoji,
      title: log.generatedTitle,
      mission: log.generatedMission,
      hook: log.generatedHook,
      duration: log.generatedDuration,
      isOutdoor: log.isOutdoor,
      destinationLabel: log.destinationLabel,
      locationCity: log.locationCity,
      weatherDescription: log.weatherDescription,
      status: log.status,
      assignedAt: log.assignedAt.toISOString(),
      completedAt: log.completedAt?.toISOString() ?? null,
      phase: log.phaseAtAssignment,
      wasRerolled: log.wasRerolled,
      xpAwarded: log.xpAwarded ?? null,
    };
  });

  return NextResponse.json({ quests, hasMore });
}
