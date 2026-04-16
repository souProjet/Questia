'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '../db';
import { QUADRANT_DEFAULTS, applySociabilityAdjustment } from '@questia/shared';
import type { ExplorerAxis, RiskAxis, SociabilityLevel, PersonalityVector } from '@questia/shared';

export async function createProfile(
  clerkId: string,
  explorerAxis: ExplorerAxis,
  riskAxis: RiskAxis,
  sociability?: SociabilityLevel | null,
) {
  const key = `${explorerAxis}_${riskAxis}` as keyof typeof QUADRANT_DEFAULTS;
  const basePersonality = QUADRANT_DEFAULTS[key];
  const declaredPersonality = applySociabilityAdjustment(basePersonality, sociability);

  return prisma.profile.create({
    data: {
      clerkId,
      explorerAxis,
      riskAxis,
      ...(sociability && { sociability }),
      declaredPersonality: declaredPersonality as unknown as Record<string, number>,
    },
  });
}

export async function getProfileByClerkId(clerkId: string) {
  return prisma.profile.findUnique({
    where: { clerkId },
    include: {
      questLogs: {
        orderBy: { assignedAt: 'desc' },
        take: 10,
      },
    },
  });
}

/** Gets or creates the profile for the currently authenticated Clerk user. */
export async function getOrCreateCurrentProfile(
  explorerAxis: ExplorerAxis = 'explorer',
  riskAxis: RiskAxis = 'risktaker',
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Non authentifié');

  const existing = await getProfileByClerkId(userId);
  if (existing) return existing;

  return createProfile(userId, explorerAxis, riskAxis);
}

export async function getProfile(profileId: string) {
  return prisma.profile.findUnique({
    where: { id: profileId },
    include: { questLogs: { orderBy: { assignedAt: 'desc' }, take: 10 } },
  });
}

export async function updateProfileAfterQuest(
  profileId: string,
  updates: {
    currentDay?: number;
    currentPhase?: 'calibration' | 'expansion' | 'rupture';
    congruenceDelta?: number;
    exhibitedPersonality?: PersonalityVector;
    streakCount?: number;
    rerollsRemaining?: number;
  },
) {
  return prisma.profile.update({
    where: { id: profileId },
    data: {
      ...(updates.currentDay !== undefined && { currentDay: updates.currentDay }),
      ...(updates.currentPhase !== undefined && { currentPhase: updates.currentPhase }),
      ...(updates.congruenceDelta !== undefined && { congruenceDelta: updates.congruenceDelta }),
      ...(updates.exhibitedPersonality !== undefined && {
        exhibitedPersonality: updates.exhibitedPersonality as unknown as Record<string, number>,
      }),
      ...(updates.streakCount !== undefined && { streakCount: updates.streakCount }),
      ...(updates.rerollsRemaining !== undefined && { rerollsRemaining: updates.rerollsRemaining }),
    },
  });
}
