import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { REFINEMENT_SCHEMA_VERSION, parseValidRefinementAnswers } from '@questia/shared';
import { getRefinementSurveyPayload } from '@/lib/refinementPayload';

export const dynamic = 'force-dynamic';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** GET — état du questionnaire de raffinement (mobile / web). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const completedQuestCount = await prisma.questLog.count({
    where: { profileId: profile.id, status: 'completed' },
  });
  const payload = getRefinementSurveyPayload(
    {
      currentDay: profile.currentDay,
      refinementSchemaVersion: profile.refinementSchemaVersion ?? 0,
      refinementSkippedAt: profile.refinementSkippedAt ?? null,
    },
    completedQuestCount,
  );

  return NextResponse.json(payload);
}

/** POST — soumettre les réponses (consentement requis) ou « plus tard ». */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    skip?: boolean;
    consent?: boolean;
    answers?: Record<string, string>;
  };

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  if (body.skip === true) {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { refinementSkippedAt: todayStr() },
    });
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (!body.consent) {
    return NextResponse.json(
      { error: 'Le consentement est requis pour enregistrer tes préférences.' },
      { status: 400 },
    );
  }

  const answers = parseValidRefinementAnswers(body.answers);
  if (!answers) {
    return NextResponse.json({ error: 'Réponses invalides ou incomplètes.' }, { status: 400 });
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      refinementAnswers: answers as unknown as Record<string, never>,
      refinementSchemaVersion: REFINEMENT_SCHEMA_VERSION,
      refinementCompletedAt: new Date(),
      refinementConsentAt: new Date(),
      refinementSkippedAt: null,
    },
  });

  return NextResponse.json({ ok: true, saved: true });
}
