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

import { getOrCreateCurrentProfile } from './profile';

describe('profile actions', () => {
  beforeEach(() => {
    prismaMock.profile.findUnique.mockReset();
    prismaMock.profile.create.mockReset();
    prismaMock.profile.update.mockReset();
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

  it('getOrCreateCurrentProfile lance si non auth', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    await expect(getOrCreateCurrentProfile()).rejects.toThrow(/authentifié/);
  });
});
