import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SHARE_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await context.params;
  if (!SHARE_ID_RE.test(shareId)) {
    return NextResponse.json({ error: 'Identifiant de partage invalide.' }, { status: 400 });
  }

  const log = await prisma.questLog.findUnique({
    where: { shareId },
    select: {
      questDate: true,
      generatedEmoji: true,
      generatedTitle: true,
      generatedMission: true,
      generatedHook: true,
      generatedDuration: true,
      status: true,
    },
  });
  if (!log || log.status !== 'completed') {
    return NextResponse.json({ error: 'Carte partagée introuvable.' }, { status: 404 });
  }

  return NextResponse.json({
    shareId,
    questDate: log.questDate,
    emoji: log.generatedEmoji,
    title: log.generatedTitle,
    mission: log.generatedMission,
    hook: log.generatedHook,
    duration: log.generatedDuration,
  });
}
