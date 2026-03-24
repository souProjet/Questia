import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  questLog: {
    update: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../db', () => ({
  prisma: prismaMock,
}));

describe('questLog actions', () => {
  beforeEach(() => {
    prismaMock.questLog.update.mockReset();
    prismaMock.questLog.findMany.mockReset();
    prismaMock.questLog.create.mockReset();
  });

  it('updateQuestLogStatus complété', async () => {
    prismaMock.questLog.update.mockResolvedValue({});
    const { updateQuestLogStatus } = await import('./questLog');
    await updateQuestLogStatus('log1', 'completed');
    expect(prismaMock.questLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      }),
    );
  });

  it('getRecentQuestLogs', async () => {
    prismaMock.questLog.findMany.mockResolvedValue([]);
    const { getRecentQuestLogs } = await import('./questLog');
    await getRecentQuestLogs('pid');
    expect(prismaMock.questLog.findMany).toHaveBeenCalled();
  });

  it('createQuestLog', async () => {
    prismaMock.questLog.create.mockResolvedValue({ id: 'x' });
    const { createQuestLog } = await import('./questLog');
    await createQuestLog({
      profileId: 'p',
      phaseAtAssignment: 'calibration',
    });
    expect(prismaMock.questLog.create).toHaveBeenCalled();
  });
});
