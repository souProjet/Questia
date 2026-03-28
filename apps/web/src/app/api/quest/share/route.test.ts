import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { POST } from './route';

const prismaMock = vi.hoisted(() => ({
  profile: {
    findUnique: vi.fn(),
  },
  questLog: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('/api/quest/share POST', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.questLog.findUnique.mockReset();
    prismaMock.questLog.update.mockReset();
  });

  it('401 si non authentifie', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/share', {
        method: 'POST',
        body: JSON.stringify({ questDate: '2026-03-28' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('400 si date invalide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/share', {
        method: 'POST',
        body: JSON.stringify({ questDate: 'bad-date' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('retourne le lien existant si shareId deja cree', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.questLog.findUnique.mockResolvedValue({
      id: 'q1',
      status: 'completed',
      shareId: 'abc123',
    });

    const res = await POST(
      new NextRequest('http://localhost/api/quest/share', {
        method: 'POST',
        body: JSON.stringify({ questDate: '2026-03-28' }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.shareId).toBe('abc123');
    expect(json.webUrl).toContain('/q/abc123');
  });

  it('genere un shareId si absent', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.questLog.findUnique.mockResolvedValue({
      id: 'q1',
      status: 'completed',
      shareId: null,
    });
    prismaMock.questLog.update.mockResolvedValue({ shareId: 'newshareid' });

    const res = await POST(
      new NextRequest('http://localhost/api/quest/share', {
        method: 'POST',
        body: JSON.stringify({ questDate: '2026-03-28' }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.shareId).toBe('newshareid');
    expect(prismaMock.questLog.update).toHaveBeenCalledTimes(1);
  });

  it('400 si la quete nest pas completee', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.questLog.findUnique.mockResolvedValue({
      id: 'q1',
      status: 'pending',
      shareId: null,
    });

    const res = await POST(
      new NextRequest('http://localhost/api/quest/share', {
        method: 'POST',
        body: JSON.stringify({ questDate: '2026-03-28' }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
