import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { QUEST_TAXONOMY, HISTORY_PAGE_SIZE } from '@questia/shared';

function archetypeTitle(id: number): string | null {
  return QUEST_TAXONOMY.find((q) => q.id === id)?.title ?? null;
}

function parseOffset(sp: URLSearchParams): number {
  const raw = sp.get('offset');
  if (raw == null) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Sans `limit` : une seule requête jusqu’à 200 entrées (comportement historique). Avec `limit` + `offset` : pagination. */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const { searchParams } = request.nextUrl;
  const offset = parseOffset(searchParams);
  const limitRaw = searchParams.get('limit');
  const limit =
    limitRaw != null
      ? Math.min(200, Math.max(1, Number.parseInt(limitRaw, 10) || HISTORY_PAGE_SIZE))
      : 200;

  const rows = await prisma.questLog.findMany({
    where: { profileId: profile.id },
    orderBy: { assignedAt: 'desc' },
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

  return NextResponse.json({
    quests: page.map((r) => ({
      id: r.id,
      questDate: r.questDate,
      archetypeId: r.archetypeId,
      archetypeTitle: archetypeTitle(r.archetypeId),
      emoji: r.generatedEmoji,
      title: r.generatedTitle,
      mission: r.generatedMission,
      hook: r.generatedHook,
      duration: r.generatedDuration,
      isOutdoor: r.isOutdoor,
      destinationLabel: r.destinationLabel,
      locationCity: r.locationCity,
      weatherDescription: r.weatherDescription,
      status: r.status,
      assignedAt: r.assignedAt,
      completedAt: r.completedAt,
      phase: r.phaseAtAssignment,
      wasRerolled: r.wasRerolled,
      xpAwarded: r.xpAwarded,
    })),
    hasMore,
  });
}
