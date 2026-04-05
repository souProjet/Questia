import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { GET } from './route';

function req(url = 'http://localhost/api/admin/overview') {
  return new NextRequest(url);
}

const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/admin', () => ({
  requireAdminRequest: requireAdminMock,
}));

const prismaMock = vi.hoisted(() => ({
  profile: {
    count: vi.fn(),
    aggregate: vi.fn(),
    findUnique: vi.fn(),
  },
  questLog: { count: vi.fn(), findUnique: vi.fn(), groupBy: vi.fn() },
  shopTransaction: { count: vi.fn() },
  pushDevice: { count: vi.fn() },
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('GET /api/admin/overview', () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    prismaMock.profile.count.mockReset();
    prismaMock.questLog.count.mockReset();
    prismaMock.profile.aggregate.mockReset();
    prismaMock.shopTransaction.count.mockReset();
    prismaMock.pushDevice.count.mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.questLog.findUnique.mockReset();
    prismaMock.questLog.groupBy.mockReset();
  });

  it('403 si non admin', async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'no' }, { status: 403 }),
    });
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  it('200 avec agrégats', async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      userId: 'user_admin_test',
      profile: {
        id: 'prof1',
        streakCount: 2,
        totalXp: 100,
        currentDay: 3,
        currentPhase: 'calibration',
        coinBalance: 50,
        rerollsRemaining: 1,
        bonusRerollCredits: 0,
        lastQuestDate: null,
        flagNextQuestAfterReroll: false,
        flagNextQuestInstantOnly: false,
        deferredSocialUntil: null,
        congruenceDelta: 0,
        xpBonusCharges: 0,
        explorerAxis: 'explorer',
        riskAxis: 'cautious',
        activeThemeId: 'default',
        refinementSchemaVersion: 0,
        reminderPushEnabled: false,
        reminderEmailEnabled: false,
        reminderTimeMinutes: 540,
        reminderTimezone: 'Europe/Paris',
      },
    });
    prismaMock.profile.count.mockResolvedValue(10);
    prismaMock.questLog.count.mockResolvedValue(0);
    prismaMock.profile.aggregate.mockResolvedValue({ _sum: { coinBalance: 500 } });
    prismaMock.shopTransaction.count.mockResolvedValue(3);
    prismaMock.pushDevice.count.mockResolvedValue(1);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    prismaMock.questLog.groupBy.mockResolvedValue([{ status: 'completed', _count: { _all: 3 } }]);

    const res = await GET(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalProfiles).toBe(10);
    expect(json.snapshot.profileId).toBe('prof1');
    expect(json.snapshotScope).toBe('self');
  });
});
