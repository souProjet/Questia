import { NextRequest, NextResponse } from 'next/server';
import type { Profile } from '@prisma/client';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { requireAdminRequest } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

function snapshotFromProfile(
  profile: Profile,
  questToday: {
    status: string;
    archetypeId: number;
    questDate: string;
    wasRerolled: boolean;
  } | null,
) {
  return {
    profileId: profile.id,
    streak: profile.streakCount,
    totalXp: profile.totalXp,
    currentDay: profile.currentDay,
    phase: profile.currentPhase,
    congruenceDelta: profile.congruenceDelta,
    xpBonusCharges: profile.xpBonusCharges,
    explorerAxis: profile.explorerAxis,
    riskAxis: profile.riskAxis,
    coins: profile.coinBalance,
    rerollsDaily: profile.rerollsRemaining,
    rerollsBonus: profile.bonusRerollCredits,
    lastQuestDate: profile.lastQuestDate,
    activeThemeId: profile.activeThemeId,
    refinementSchemaVersion: profile.refinementSchemaVersion,
    reminderPushEnabled: profile.reminderPushEnabled,
    reminderEmailEnabled: profile.reminderEmailEnabled,
    reminderTimeMinutes: profile.reminderTimeMinutes,
    reminderTimezone: profile.reminderTimezone,
    flags: {
      nextAfterReroll: profile.flagNextQuestAfterReroll,
      nextInstantOnly: profile.flagNextQuestInstantOnly,
      deferredSocialUntil: profile.deferredSocialUntil,
    },
    questToday,
  };
}

/** GET /api/admin/overview — KPIs globaux + snapshot du compte affiché (toi ou cible ?targetClerkId=). */
export async function GET(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const { userId, profile: adminProfile } = gate;
  const targetClerkId = request.nextUrl.searchParams.get('targetClerkId')?.trim() || null;

  let profileForSnapshot: Profile = adminProfile;
  let snapshotScope: 'self' | 'target' = 'self';
  let snapshotLabel: string | null = null;
  let snapshotClerkSuffix: string | null = null;

  if (targetClerkId) {
    const targetProfile = await prisma.profile.findUnique({
      where: { clerkId: targetClerkId },
    });
    if (!targetProfile) {
      return NextResponse.json(
        { error: "Aucun profil Questia pour ce compte — le joueur doit au moins une fois ouvrir l'app." },
        { status: 404 },
      );
    }
    profileForSnapshot = targetProfile;
    snapshotScope = 'target';
    snapshotClerkSuffix = targetClerkId.length > 8 ? `…${targetClerkId.slice(-8)}` : targetClerkId;
    try {
      const client = await clerkClient();
      const u = await client.users.getUser(targetClerkId);
      const full = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
      snapshotLabel = full || (u.username ? `@${u.username}` : null) || snapshotClerkSuffix;
    } catch {
      snapshotLabel = snapshotClerkSuffix;
    }
  }

  const today = todayIsoUtc();
  const since7 = new Date();
  since7.setUTCDate(since7.getUTCDate() - 7);

  const [
    totalProfiles,
    profilesLast7Days,
    questLogsForToday,
    completedToday,
    totalCompletedQuests,
    coinsSum,
    shopTransactionsCount,
    pushDevicesCount,
    adminProfilesCount,
    questStatusTodayRows,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { createdAt: { gte: since7 } } }),
    prisma.questLog.count({ where: { questDate: today } }),
    prisma.questLog.count({
      where: { questDate: today, status: 'completed' },
    }),
    prisma.questLog.count({ where: { status: 'completed' } }),
    prisma.profile.aggregate({ _sum: { coinBalance: true } }),
    prisma.shopTransaction.count(),
    prisma.pushDevice.count(),
    prisma.profile.count({ where: { role: 'admin' } }),
    prisma.questLog.groupBy({
      by: ['status'],
      where: { questDate: today },
      _count: true,
    }),
  ]);

  const questStatusToday: Record<string, number> = {};
  for (const row of questStatusTodayRows) {
    const c = row._count as number | { _all: number } | null | undefined;
    const n = typeof c === 'number' ? c : (c?._all ?? 0);
    questStatusToday[row.status] = n;
  }

  const myQuestToday = await prisma.questLog.findUnique({
    where: { profileId_questDate: { profileId: profileForSnapshot.id, questDate: today } },
    select: {
      status: true,
      archetypeId: true,
      questDate: true,
      wasRerolled: true,
    },
  });

  const snapshot = snapshotFromProfile(profileForSnapshot, myQuestToday);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    todayUtc: today,
    adminClerkIdSuffix: userId.length > 8 ? `…${userId.slice(-8)}` : userId,
    snapshotScope,
    snapshotLabel,
    snapshotClerkSuffix,
    snapshot,
    totalProfiles,
    profilesLast7Days,
    questLogsForToday,
    completedToday,
    totalCompletedQuests,
    totalCoinsInEconomy: coinsSum._sum.coinBalance ?? 0,
    shopTransactionsCount,
    pushDevicesCount,
    adminProfilesCount,
    questStatusToday,
  });
}
