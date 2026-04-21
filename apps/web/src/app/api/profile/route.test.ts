import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GET, PATCH, POST } from './route';

const prismaMock = vi.hoisted(() => ({
  profile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

const baseProfile = {
  id: 'p1',
  clerkId: 'u1',
  explorerAxis: 'explorer',
  riskAxis: 'cautious',
  declaredPersonality: {},
  totalXp: 0,
  badgesEarned: [],
  rerollsRemaining: 1,
  bonusRerollCredits: 0,
  activeThemeId: 'default',
  ownedThemes: ['default'],
  coinBalance: 0,
  ownedTitleIds: [],
  equippedTitleId: null,
  xpBonusCharges: 0,
  reminderCadence: 'daily',
  questDurationMinMinutes: 5,
  questDurationMaxMinutes: 1440,
  heavyQuestPreference: 'balanced',
};

describe('/api/profile', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.profile.create.mockReset();
    prismaMock.profile.update.mockReset();
  });

  it('GET 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await GET(new NextRequest('http://localhost/api/profile'));
    expect(res.status).toBe(401);
  });

  it('GET 404', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/profile'));
    expect(res.status).toBe(404);
  });

  it('GET 200', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    const res = await GET(new NextRequest('http://localhost/api/profile'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.shop).toBeDefined();
  });

  it('GET ?locale=en renvoie les titres de badges en anglais', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    const res = await GET(new NextRequest('http://localhost/api/profile?locale=en'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      progression: { badgeCatalog: { id: string; title: string }[] };
    };
    const row = json.progression.badgeCatalog.find((b) => b.id === 'serie_3');
    expect(row?.title).toBe('First momentum');
  });

  it('PATCH 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await PATCH(
      new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ activeThemeId: 'default' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('PATCH 400 aucune modification', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    const res = await PATCH(
      new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('PATCH 400 thème inconnu', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    const res = await PATCH(
      new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ activeThemeId: 'not_in_registry' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('PATCH 400 cadence invalide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    const res = await PATCH(
      new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ reminderCadence: 'hourly' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('PATCH 400 préférence quêtes lourdes invalide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    const res = await PATCH(
      new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ heavyQuestPreference: 'mega' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('PATCH 200 préférence quêtes déplacement', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    prismaMock.profile.update.mockResolvedValue({
      ...baseProfile,
      heavyQuestPreference: 'low',
    });
    const res = await PATCH(
      new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ heavyQuestPreference: 'low' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ heavyQuestPreference: 'low' }),
      }),
    );
  });

  it('PATCH 200 cadence et durées quête', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    prismaMock.profile.update.mockResolvedValue({
      ...baseProfile,
      reminderCadence: 'weekly',
      questDurationMinMinutes: 15,
      questDurationMaxMinutes: 120,
    });
    const res = await PATCH(
      new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          reminderCadence: 'weekly',
          questDurationMinMinutes: 15,
          questDurationMaxMinutes: 120,
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reminderCadence: 'weekly',
          questDurationMinMinutes: 15,
          questDurationMaxMinutes: 120,
        }),
      }),
    );
  });

  it('PATCH 200 thème valide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({
      ...baseProfile,
      ownedThemes: ['default', 'midnight'],
    });
    prismaMock.profile.update.mockResolvedValue({
      ...baseProfile,
      ownedThemes: ['default', 'midnight'],
      activeThemeId: 'midnight',
    });
    const res = await PATCH(
      new NextRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ activeThemeId: 'midnight' }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('POST 201 crée profil', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'new_user' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    prismaMock.profile.create.mockResolvedValue({ id: 'p2', clerkId: 'new_user' });
    const res = await POST(
      new NextRequest('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify({ explorerAxis: 'explorer', riskAxis: 'risktaker' }),
      }),
    );
    expect(res.status).toBe(201);
  });

  it('POST 200 profil existant', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    const res = await POST(
      new NextRequest('http://localhost/api/profile', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(200);
  });
});
