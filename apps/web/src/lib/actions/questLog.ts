'use server';

import { prisma } from '../db';
import type { EscalationPhase } from '@dopamode/shared';

export async function createQuestLog(data: {
  userId: string;
  questId: number;
  congruenceDeltaAtAssignment: number;
  phaseAtAssignment: EscalationPhase;
  wasRerolled?: boolean;
  wasFallback?: boolean;
  safetyConsentGiven?: boolean;
}) {
  return prisma.questLog.create({
    data: {
      userId: data.userId,
      questId: data.questId,
      congruenceDeltaAtAssignment: data.congruenceDeltaAtAssignment,
      phaseAtAssignment: data.phaseAtAssignment,
      wasRerolled: data.wasRerolled ?? false,
      wasFallback: data.wasFallback ?? false,
      safetyConsentGiven: data.safetyConsentGiven ?? false,
    },
  });
}

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

export async function getRecentQuestLogs(userId: string, limit = 10) {
  return prisma.questLog.findMany({
    where: { userId },
    orderBy: { assignedAt: 'desc' },
    take: limit,
  });
}
