import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const prismaMock = vi.hoisted(() => ({
  questLog: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('/api/quest/share/[shareId] GET', () => {
  beforeEach(() => {
    prismaMock.questLog.findUnique.mockReset();
  });

  it('400 si identifiant invalide', async () => {
    const res = await GET(new NextRequest('http://localhost/api/quest/share/!'), {
      params: Promise.resolve({ shareId: '!' }),
    });
    expect(res.status).toBe(400);
  });

  it('404 si introuvable', async () => {
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/quest/share/abc12345'), {
      params: Promise.resolve({ shareId: 'abc12345' }),
    });
    expect(res.status).toBe(404);
  });

  it('200 avec payload public', async () => {
    prismaMock.questLog.findUnique.mockResolvedValue({
      questDate: '2026-03-28',
      generatedEmoji: '⚔️',
      generatedTitle: 'Titre',
      generatedMission: 'Mission',
      generatedHook: 'Hook',
      generatedDuration: '30 min',
      status: 'completed',
    });
    const res = await GET(new NextRequest('http://localhost/api/quest/share/abc12345'), {
      params: Promise.resolve({ shareId: 'abc12345' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.shareId).toBe('abc12345');
    expect(json.title).toBe('Titre');
  });
});
