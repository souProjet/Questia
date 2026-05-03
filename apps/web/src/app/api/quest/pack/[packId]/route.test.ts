import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GET, POST } from './route';

const prismaMock = vi.hoisted(() => ({
  profile: {
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

const PACK_ID = 'pack_couple';
const SLOT_C1 = 'chapter_1.c1_q1';
const SLOT_C2 = 'chapter_2.c2_q1';

const ownedProfile = {
  id: 'p1',
  clerkId: 'u1',
  ownedQuestPackIds: [PACK_ID] as unknown,
  questPackProgress: {} as unknown,
  ownedTitleIds: [] as unknown,
  coinBalance: 10,
  totalXp: 100,
};

function ctx(packId: string = PACK_ID) {
  return { params: Promise.resolve({ packId }) };
}

describe('/api/quest/pack/[packId]', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.profile.update.mockReset();
  });

  describe('GET', () => {
    it('401 sans auth', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never);
      const res = await GET(new NextRequest('http://localhost/x'), ctx());
      expect(res.status).toBe(401);
    });

    it('404 pack inconnu', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      const res = await GET(new NextRequest('http://localhost/x'), ctx('nope_pack'));
      expect(res.status).toBe(404);
    });

    it('404 profil manquant', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      prismaMock.profile.findUnique.mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/x'), ctx());
      expect(res.status).toBe(404);
    });

    it('403 pack non possédé', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      prismaMock.profile.findUnique.mockResolvedValue({
        ...ownedProfile,
        ownedQuestPackIds: [],
      });
      const res = await GET(new NextRequest('http://localhost/x'), ctx());
      expect(res.status).toBe(403);
    });

    it('200 avec arc et state', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      prismaMock.profile.findUnique.mockResolvedValue({ ...ownedProfile });
      const res = await GET(new NextRequest('http://localhost/x'), ctx());
      expect(res.status).toBe(200);
      const json = (await res.json()) as { arc: { packId: string }; state: unknown };
      expect(json.arc.packId).toBe(PACK_ID);
      expect(json.state).toBeDefined();
    });
  });

  describe('POST', () => {
    it('401 sans auth', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never);
      const res = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: JSON.stringify({ slotKey: SLOT_C1 }),
        }),
        ctx(),
      );
      expect(res.status).toBe(401);
    });

    it('404 pack inconnu', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      const res = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: JSON.stringify({ slotKey: SLOT_C1 }),
        }),
        ctx('missing'),
      );
      expect(res.status).toBe(404);
    });

    it('400 slot inconnu', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      prismaMock.profile.findUnique.mockResolvedValue({ ...ownedProfile });
      const res = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: JSON.stringify({ slotKey: 'nope.bad' }),
        }),
        ctx(),
      );
      expect(res.status).toBe(400);
    });

    it('400 slotKey absent ou JSON invalide', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      prismaMock.profile.findUnique.mockResolvedValue({ ...ownedProfile });
      const resEmpty = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
        ctx(),
      );
      expect(resEmpty.status).toBe(400);

      const resBadJson = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: 'not-json',
        }),
        ctx(),
      );
      expect(resBadJson.status).toBe(400);
    });

    it('404 profil manquant', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      prismaMock.profile.findUnique.mockResolvedValue(null);
      const res = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: JSON.stringify({ slotKey: SLOT_C1 }),
        }),
        ctx(),
      );
      expect(res.status).toBe(404);
    });

    it('403 pack non possédé', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      prismaMock.profile.findUnique.mockResolvedValue({
        ...ownedProfile,
        ownedQuestPackIds: [],
      });
      const res = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: JSON.stringify({ slotKey: SLOT_C1 }),
        }),
        ctx(),
      );
      expect(res.status).toBe(403);
    });

    it('400 chapitre précédent incomplet', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      prismaMock.profile.findUnique.mockResolvedValue({ ...ownedProfile });
      const res = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: JSON.stringify({ slotKey: SLOT_C2 }),
        }),
        ctx(),
      );
      expect(res.status).toBe(400);
    });

    it('200 complète un slot du chapitre 1', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      prismaMock.profile.findUnique
        .mockResolvedValueOnce({ ...ownedProfile })
        .mockResolvedValueOnce({
          ...ownedProfile,
          questPackProgress: { [PACK_ID]: { completed: [SLOT_C1] } },
          totalXp: 100 + 30,
        });
      prismaMock.profile.update.mockResolvedValue({});

      const res = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: JSON.stringify({ slotKey: SLOT_C1 }),
        }),
        ctx(),
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as { xpEarned: number; state: unknown };
      expect(json.xpEarned).toBe(30);
      expect(json.state).toBeDefined();
      expect(prismaMock.profile.update).toHaveBeenCalled();
    });

    it('200 idempotent si slot déjà complété', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
      const progress = { [PACK_ID]: { completed: [SLOT_C1] } };
      prismaMock.profile.findUnique
        .mockResolvedValueOnce({
          ...ownedProfile,
          questPackProgress: progress,
        })
        .mockResolvedValueOnce({
          ...ownedProfile,
          questPackProgress: progress,
        });
      prismaMock.profile.update.mockResolvedValue({});

      const res = await POST(
        new NextRequest('http://localhost/x', {
          method: 'POST',
          body: JSON.stringify({ slotKey: SLOT_C1 }),
        }),
        ctx(),
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as { xpEarned: number };
      expect(json.xpEarned).toBe(0);
    });
  });
});
