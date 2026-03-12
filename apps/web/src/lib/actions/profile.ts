'use server';

import { prisma } from '../db';
import { QUADRANT_DEFAULTS } from '@dopamode/shared';
import type { ExplorerAxis, RiskAxis, PersonalityVector } from '@dopamode/shared';

export async function createProfile(explorerAxis: ExplorerAxis, riskAxis: RiskAxis) {
  const key = `${explorerAxis}_${riskAxis}` as keyof typeof QUADRANT_DEFAULTS;
  const declaredPersonality = QUADRANT_DEFAULTS[key];

  const profile = await prisma.profile.create({
    data: {
      explorerAxis,
      riskAxis,
      declaredPersonality: declaredPersonality as unknown as Record<string, number>,
    },
  });

  return profile;
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
