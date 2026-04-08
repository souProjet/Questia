import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  profile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../db', () => ({
  prisma: prismaMock,
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import {
  createProfile,
  getOrCreateCurrentProfile,
  getProfile,
  getProfileByClerkId,
  updateProfileAfterQuest,
} from './profile';

describe('profile actions', () => {
  beforeEach(() => {
    prismaMock.profile.findUnique.mockReset();
    prismaMock.profile.create.mockReset();
    prismaMock.profile.update.mockReset();
  });

  it('createProfile insère explorer + risk', async () => {
    prismaMock.profile.create.mockResolvedValue({ id: 'new' });
    const r = await createProfile('clerk_1', 'explorer', 'risktaker');
    expect(r).toEqual({ id: 'new' });
    expect(prismaMock.profile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkId: 'clerk_1',
          explorerAxis: 'explorer',
          riskAxis: 'risktaker',
        }),
      }),
    );
  });

  it('getProfileByClerkId délègue à prisma', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1', questLogs: [] });
    const r = await getProfileByClerkId('clerk_x');
    expect(r).toEqual({ id: 'p1', questLogs: [] });
    expect(prismaMock.profile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clerkId: 'clerk_x' } }),
    );
  });

  it('getProfile par id', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'pid' });
    const r = await getProfile('pid');
    expect(r).toEqual({ id: 'pid' });
    expect(prismaMock.profile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pid' } }),
    );
  });

  it('getOrCreateCurrentProfile crée si absent', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'user_1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    prismaMock.profile.create.mockResolvedValue({ id: 'p1' });
    const p = await getOrCreateCurrentProfile('explorer', 'cautious');
    expect(p).toEqual({ id: 'p1' });
    expect(prismaMock.profile.create).toHaveBeenCalled();
  });

  it("getOrCreateCurrentProfile retourne l'existant sans créer", async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'user_1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'existing' });
    const p = await getOrCreateCurrentProfile();
    expect(p).toEqual({ id: 'existing' });
    expect(prismaMock.profile.create).not.toHaveBeenCalled();
  });

  it('getOrCreateCurrentProfile lance si non auth', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    await expect(getOrCreateCurrentProfile()).rejects.toThrow(/authentifié/);
  });

  it('updateProfileAfterQuest fusionne les champs fournis', async () => {
    prismaMock.profile.update.mockResolvedValue({ id: 'p1' });
    const exhibited = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      emotionalStability: 0.5,
      thrillSeeking: 0.5,
      boredomSusceptibility: 0.5,
    };
    await updateProfileAfterQuest('p1', {
      currentDay: 3,
      currentPhase: 'expansion',
      congruenceDelta: 1,
      exhibitedPersonality: exhibited,
      streakCount: 2,
      rerollsRemaining: 0,
    });
    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: expect.objectContaining({
        currentDay: 3,
        currentPhase: 'expansion',
        congruenceDelta: 1,
        streakCount: 2,
        rerollsRemaining: 0,
        exhibitedPersonality: exhibited,
      }),
    });
  });

  it('updateProfileAfterQuest sans champs optionnels', async () => {
    prismaMock.profile.update.mockResolvedValue({ id: 'p1' });
    await updateProfileAfterQuest('p1', {});
    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: {},
    });
  });
});
