import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GET } from './route';

const prismaMock = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  questLog: { findMany: vi.fn() },
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('GET /api/quest/history', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.questLog.findMany.mockReset();
  });

  it('401 sans auth', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const req = new NextRequest('http://localhost/api/quest/history');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('404 sans profil', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/quest/history');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('200 avec historique', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.questLog.findMany.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/quest/history?limit=10&offset=0');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.quests).toEqual([]);
  });
});
