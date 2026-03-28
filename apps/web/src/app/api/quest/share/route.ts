import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { isValidQuestDateIso, buildWebSharedQuestUrl } from '@questia/shared';
import { prisma } from '@/lib/db';
import { siteUrl } from '@/config/marketing';

export const dynamic = 'force-dynamic';

function generateShareId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { questDate?: string };
  const questDate = typeof body.questDate === 'string' ? body.questDate.trim() : '';
  if (!questDate || !isValidQuestDateIso(questDate)) {
    return NextResponse.json(
      { error: 'Paramètre questDate invalide (format AAAA-MM-JJ attendu).' },
      { status: 400 },
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

  const quest = await prisma.questLog.findUnique({
    where: { profileId_questDate: { profileId: profile.id, questDate } },
    select: { id: true, status: true, shareId: true },
  });
  if (!quest) return NextResponse.json({ error: 'Aucune quête pour cette date.' }, { status: 404 });
  if (quest.status !== 'completed') {
    return NextResponse.json(
      { error: 'Le partage public n’est disponible que pour une quête validée.' },
      { status: 400 },
    );
  }

  if (quest.shareId) {
    return NextResponse.json({
      shareId: quest.shareId,
      webUrl: buildWebSharedQuestUrl(siteUrl, quest.shareId),
    });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateShareId();
    try {
      const updated = await prisma.questLog.update({
        where: { id: quest.id },
        data: { shareId: candidate },
        select: { shareId: true },
      });
      return NextResponse.json({
        shareId: updated.shareId!,
        webUrl: buildWebSharedQuestUrl(siteUrl, updated.shareId!),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        continue;
      }
      throw error;
    }
  }

  return NextResponse.json(
    { error: 'Impossible de générer un lien de partage, réessaie.' },
    { status: 500 },
  );
}
