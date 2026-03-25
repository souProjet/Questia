import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminRequest } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * GET /api/admin/profile?clerkId= — lecture seule d’un profil (debug / support).
 * Sans `clerkId` : profil de l’admin connecté.
 */
export async function GET(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const clerkId = request.nextUrl.searchParams.get('clerkId')?.trim() || gate.userId;
  const profile = await prisma.profile.findUnique({
    where: { clerkId },
  });
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  }

  const today = todayIsoUtc();
  const questToday = await prisma.questLog.findUnique({
    where: { profileId_questDate: { profileId: profile.id, questDate: today } },
    select: {
      id: true,
      status: true,
      archetypeId: true,
      questDate: true,
      wasRerolled: true,
      generatedTitle: true,
    },
  });

  return NextResponse.json({
    clerkId: profile.clerkId,
    role: profile.role,
    explorerAxis: profile.explorerAxis,
    riskAxis: profile.riskAxis,
    currentDay: profile.currentDay,
    currentPhase: profile.currentPhase,
    congruenceDelta: profile.congruenceDelta,
    streakCount: profile.streakCount,
    rerollsRemaining: profile.rerollsRemaining,
    bonusRerollCredits: profile.bonusRerollCredits,
    lastQuestDate: profile.lastQuestDate,
    totalXp: profile.totalXp,
    coinBalance: profile.coinBalance,
    xpBonusCharges: profile.xpBonusCharges,
    badgesEarned: profile.badgesEarned,
    flagNextQuestAfterReroll: profile.flagNextQuestAfterReroll,
    flagNextQuestInstantOnly: profile.flagNextQuestInstantOnly,
    deferredSocialUntil: profile.deferredSocialUntil,
    activeThemeId: profile.activeThemeId,
    ownedThemes: profile.ownedThemes,
    activeNarrationPackId: profile.activeNarrationPackId,
    ownedNarrationPacks: profile.ownedNarrationPacks,
    ownedTitleIds: profile.ownedTitleIds,
    equippedTitleId: profile.equippedTitleId,
    reminderPushEnabled: profile.reminderPushEnabled,
    reminderEmailEnabled: profile.reminderEmailEnabled,
    reminderTimeMinutes: profile.reminderTimeMinutes,
    reminderTimezone: profile.reminderTimezone,
    lastReminderPushDate: profile.lastReminderPushDate,
    lastReminderEmailDate: profile.lastReminderEmailDate,
    refinementSchemaVersion: profile.refinementSchemaVersion,
    refinementCompletedAt: profile.refinementCompletedAt,
    refinementSkippedAt: profile.refinementSkippedAt,
    refinementConsentAt: profile.refinementConsentAt,
    refinementAnswers: profile.refinementAnswers,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    questToday,
  });
}
