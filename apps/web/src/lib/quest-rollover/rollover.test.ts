import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { QuestModel } from '@questia/shared';
import type { QuestLog as PrismaQuestLog } from '@prisma/client';
import {
  classifyStaleLog,
  rolloverStaleLogs,
  CARRYOVER_GRACE_MS,
} from './rollover';

// ── Fixtures ────────────────────────────────────────────────────────────────

const INSTANT_ARCHETYPE: QuestModel = {
  id: 10,
  title: 'Instant',
  description: '',
  titleEn: '',
  descriptionEn: '',
  category: 'dopamine_detox',
  targetTraits: {},
  comfortLevel: 'low',
  requiresOutdoor: false,
  requiresSocial: false,
  minimumDurationMinutes: 15,
  fallbackQuestId: 9,
  questPace: 'instant',
};

const PLANNED_ARCHETYPE: QuestModel = {
  ...INSTANT_ARCHETYPE,
  id: 20,
  title: 'Planned',
  questPace: 'planned',
  minimumDurationMinutes: 180,
};

const NOW = new Date('2026-04-20T09:00:00Z');
const TODAY = '2026-04-20';
const YESTERDAY = '2026-04-19';

function makeLog(overrides: Partial<PrismaQuestLog> = {}): PrismaQuestLog {
  return {
    id: 'log-' + Math.random().toString(36).slice(2),
    profileId: 'p1',
    questDate: YESTERDAY,
    archetypeId: INSTANT_ARCHETYPE.id,
    generatedEmoji: '',
    generatedTitle: '',
    generatedMission: '',
    generatedHook: '',
    generatedDuration: '',
    generatedSafetyNote: null,
    isOutdoor: false,
    destinationLabel: null,
    destinationLat: null,
    destinationLon: null,
    locationCity: null,
    weatherDescription: null,
    weatherTemp: null,
    status: 'pending',
    shareId: null,
    completedAt: null,
    graceDeadline: null,
    safetyConsentGiven: false,
    wasRerolled: false,
    wasFallback: false,
    xpAwarded: null,
    xpBreakdown: null,
    phaseAtAssignment: 'calibration',
    congruenceDeltaAtTime: 0,
    assignedAt: new Date('2026-04-19T10:00:00Z'),
    ...overrides,
  } as PrismaQuestLog;
}

// ── classifyStaleLog : pure logic ───────────────────────────────────────────

describe('classifyStaleLog', () => {
  it('keep : log du jour', () => {
    const log = makeLog({ questDate: TODAY, status: 'pending' });
    expect(
      classifyStaleLog({ log, today: TODAY, archetype: INSTANT_ARCHETYPE, now: NOW }).kind,
    ).toBe('keep');
  });

  it.each(['completed', 'abandoned', 'rejected', 'replaced'] as const)(
    'keep : status terminal %s',
    (status) => {
      const log = makeLog({ status });
      expect(
        classifyStaleLog({ log, today: TODAY, archetype: INSTANT_ARCHETYPE, now: NOW }).kind,
      ).toBe('keep');
    },
  );

  it('pending-rejected : quête jamais acceptée', () => {
    const log = makeLog({ status: 'pending' });
    expect(
      classifyStaleLog({ log, today: TODAY, archetype: INSTANT_ARCHETYPE, now: NOW }).kind,
    ).toBe('pending-rejected');
  });

  it('instant-abandoned : accepted + instant', () => {
    const log = makeLog({ status: 'accepted' });
    expect(
      classifyStaleLog({ log, today: TODAY, archetype: INSTANT_ARCHETYPE, now: NOW }).kind,
    ).toBe('instant-abandoned');
  });

  it('planned-carryover-start : accepted + planned, première fois', () => {
    const log = makeLog({ status: 'accepted', archetypeId: PLANNED_ARCHETYPE.id, graceDeadline: null });
    const decision = classifyStaleLog({
      log,
      today: TODAY,
      archetype: PLANNED_ARCHETYPE,
      now: NOW,
    });
    expect(decision.kind).toBe('planned-carryover-start');
    if (decision.kind === 'planned-carryover-start') {
      expect(decision.graceDeadline.getTime()).toBe(NOW.getTime() + CARRYOVER_GRACE_MS);
    }
  });

  it('planned-carryover-active : grâce toujours valide', () => {
    const graceDeadline = new Date(NOW.getTime() + 5 * 3600 * 1000);
    const log = makeLog({
      status: 'accepted',
      archetypeId: PLANNED_ARCHETYPE.id,
      graceDeadline,
    });
    expect(
      classifyStaleLog({ log, today: TODAY, archetype: PLANNED_ARCHETYPE, now: NOW }).kind,
    ).toBe('planned-carryover-active');
  });

  it('planned-expired : grâce dépassée', () => {
    const graceDeadline = new Date(NOW.getTime() - 60 * 1000);
    const log = makeLog({
      status: 'accepted',
      archetypeId: PLANNED_ARCHETYPE.id,
      graceDeadline,
    });
    expect(
      classifyStaleLog({ log, today: TODAY, archetype: PLANNED_ARCHETYPE, now: NOW }).kind,
    ).toBe('planned-expired');
  });

  it('accepted sans archetype connu → instant-abandoned (défensif)', () => {
    const log = makeLog({ status: 'accepted' });
    expect(
      classifyStaleLog({ log, today: TODAY, archetype: null, now: NOW }).kind,
    ).toBe('instant-abandoned');
  });
});

// ── rolloverStaleLogs : wrapper Prisma ──────────────────────────────────────

type PrismaMock = {
  questLog: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  profile: {
    update: ReturnType<typeof vi.fn>;
  };
};

function makePrismaMock(): PrismaMock {
  return {
    questLog: {
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    profile: {
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

const TAXONOMY: QuestModel[] = [INSTANT_ARCHETYPE, PLANNED_ARCHETYPE];

describe('rolloverStaleLogs', () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = makePrismaMock();
  });

  it('no-op : aucun log stale', async () => {
    prisma.questLog.findMany.mockResolvedValue([]);
    const res = await rolloverStaleLogs({
      profileId: 'p1',
      today: TODAY,
      taxonomy: TAXONOMY,
      now: NOW,
      prisma: prisma as never,
    });
    expect(res.carryoverLog).toBeNull();
    expect(res.streakReset).toBe(false);
    expect(prisma.questLog.update).not.toHaveBeenCalled();
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it('pending → rejected, pas de streak reset', async () => {
    const log = makeLog({ status: 'pending' });
    prisma.questLog.findMany.mockResolvedValue([log]);
    const res = await rolloverStaleLogs({
      profileId: 'p1',
      today: TODAY,
      taxonomy: TAXONOMY,
      now: NOW,
      prisma: prisma as never,
    });
    expect(res.carryoverLog).toBeNull();
    expect(res.streakReset).toBe(false);
    expect(prisma.questLog.update).toHaveBeenCalledWith({
      where: { id: log.id },
      data: { status: 'rejected' },
    });
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it('accepted instant → abandoned + streak reset', async () => {
    const log = makeLog({ status: 'accepted', archetypeId: INSTANT_ARCHETYPE.id });
    prisma.questLog.findMany.mockResolvedValue([log]);
    const res = await rolloverStaleLogs({
      profileId: 'p1',
      today: TODAY,
      taxonomy: TAXONOMY,
      now: NOW,
      prisma: prisma as never,
    });
    expect(res.streakReset).toBe(true);
    expect(res.carryoverLog).toBeNull();
    expect(prisma.questLog.update).toHaveBeenCalledWith({
      where: { id: log.id },
      data: { status: 'abandoned' },
    });
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { streakCount: 0 },
    });
  });

  it('accepted planned, première fois → carryover actif, grâce posée', async () => {
    const log = makeLog({
      status: 'accepted',
      archetypeId: PLANNED_ARCHETYPE.id,
      graceDeadline: null,
    });
    prisma.questLog.findMany.mockResolvedValue([log]);
    const res = await rolloverStaleLogs({
      profileId: 'p1',
      today: TODAY,
      taxonomy: TAXONOMY,
      now: NOW,
      prisma: prisma as never,
    });
    expect(res.carryoverLog).not.toBeNull();
    expect(res.carryoverLog?.id).toBe(log.id);
    expect(res.streakReset).toBe(false);
    expect(prisma.questLog.update).toHaveBeenCalledWith({
      where: { id: log.id },
      data: { graceDeadline: expect.any(Date) },
    });
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it('accepted planned, grâce encore valide → carryover sans re-poser', async () => {
    const graceDeadline = new Date(NOW.getTime() + 3600 * 1000);
    const log = makeLog({
      status: 'accepted',
      archetypeId: PLANNED_ARCHETYPE.id,
      graceDeadline,
    });
    prisma.questLog.findMany.mockResolvedValue([log]);
    const res = await rolloverStaleLogs({
      profileId: 'p1',
      today: TODAY,
      taxonomy: TAXONOMY,
      now: NOW,
      prisma: prisma as never,
    });
    expect(res.carryoverLog?.id).toBe(log.id);
    expect(prisma.questLog.update).not.toHaveBeenCalled();
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it('accepted planned, grâce expirée → abandoned + streak reset', async () => {
    const graceDeadline = new Date(NOW.getTime() - 60 * 1000);
    const log = makeLog({
      status: 'accepted',
      archetypeId: PLANNED_ARCHETYPE.id,
      graceDeadline,
    });
    prisma.questLog.findMany.mockResolvedValue([log]);
    const res = await rolloverStaleLogs({
      profileId: 'p1',
      today: TODAY,
      taxonomy: TAXONOMY,
      now: NOW,
      prisma: prisma as never,
    });
    expect(res.carryoverLog).toBeNull();
    expect(res.streakReset).toBe(true);
    expect(prisma.questLog.update).toHaveBeenCalledWith({
      where: { id: log.id },
      data: { status: 'abandoned' },
    });
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { streakCount: 0 },
    });
  });

  it('multi-logs : le plus récent planned actif gagne le carry-over, les plus vieux pending sont rejetés', async () => {
    const logRecentPlanned = makeLog({
      id: 'recent',
      questDate: YESTERDAY,
      status: 'accepted',
      archetypeId: PLANNED_ARCHETYPE.id,
      graceDeadline: null,
    });
    const logOlderPending = makeLog({
      id: 'older',
      questDate: '2026-04-17',
      status: 'pending',
    });
    // findMany renvoie trié desc par questDate
    prisma.questLog.findMany.mockResolvedValue([logRecentPlanned, logOlderPending]);

    const res = await rolloverStaleLogs({
      profileId: 'p1',
      today: TODAY,
      taxonomy: TAXONOMY,
      now: NOW,
      prisma: prisma as never,
    });
    expect(res.carryoverLog?.id).toBe('recent');
    expect(res.streakReset).toBe(false);
    expect(prisma.questLog.update).toHaveBeenCalledWith({
      where: { id: 'recent' },
      data: { graceDeadline: expect.any(Date) },
    });
    expect(prisma.questLog.update).toHaveBeenCalledWith({
      where: { id: 'older' },
      data: { status: 'rejected' },
    });
  });
});
