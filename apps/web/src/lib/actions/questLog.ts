'use server';

import { prisma } from '../db';
import type { EscalationPhase } from '@dopamode/shared';

export async function updateQuestLogStatus(
  logId: string,
  status: 'accepted' | 'completed' | 'rejected' | 'replaced',
) {
  return prisma.questLog.update({
    where: { id: logId },
    data: {
      status,
      ...(status === 'completed' && { completedAt: new Date() }),
    },
  });
}

export async function getRecentQuestLogs(profileId: string, limit = 10) {
  return prisma.questLog.findMany({
    where: { profileId },
    orderBy: { assignedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      questDate: true,
      archetypeId: true,
      generatedTitle: true,
      generatedEmoji: true,
      status: true,
      assignedAt: true,
      phaseAtAssignment: true,
    },
  });
}

// Legacy alias kept for backward compat
export async function createQuestLog(data: {
  profileId: string;
  archetypeId?: number;
  questDate?: string;
  congruenceDeltaAtTime?: number;
  phaseAtAssignment: EscalationPhase;
  wasRerolled?: boolean;
  wasFallback?: boolean;
  safetyConsentGiven?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return prisma.questLog.create({
    data: {
      profileId:            data.profileId,
      archetypeId:          data.archetypeId ?? 1,
      questDate:            data.questDate ?? today,
      congruenceDeltaAtTime: data.congruenceDeltaAtTime ?? 0,
      phaseAtAssignment:    data.phaseAtAssignment,
      wasRerolled:          data.wasRerolled ?? false,
      wasFallback:          data.wasFallback ?? false,
      safetyConsentGiven:   data.safetyConsentGiven ?? false,
    },
  });
}
