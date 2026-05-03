import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TEST_FALLBACK_QUEST_ID, TEST_QUEST_TAXONOMY } from '@questia/shared';

vi.mock('@/lib/quest-taxonomy/cache', () => ({
  getQuestTaxonomy: vi.fn().mockResolvedValue(TEST_QUEST_TAXONOMY),
  getDefaultFallbackArchetypeId: vi.fn().mockResolvedValue(TEST_FALLBACK_QUEST_ID),
  invalidateQuestTaxonomyCache: vi.fn(),
  setDefaultFallbackArchetypeId: vi.fn(),
}));

vi.mock('@/lib/quest-gen/generateQuest', () => ({
  generateDailyQuest: vi.fn().mockResolvedValue({
    archetypeId: 1,
    psychologicalCategory: 'spatial_adventure',
    requiresSocial: false,
    icon: 'Target',
    title: 'Titre',
    mission: 'Mission',
    hook: 'Hook',
    duration: '1h',
    isOutdoor: false,
    safetyNote: null,
    destinationLabel: null,
    destinationQuery: null,
    selectionReason: 'top candidate',
    selfFitScore: 80,
    wasFallback: false,
  }),
}));

vi.mock('@/lib/actions/weather', () => ({
  getQuestContext: vi.fn().mockResolvedValue({
    city: 'Paris',
    country: 'FR',
    weatherDescription: 'Beau',
    weatherIcon: 'Sun',
    temp: 20,
    isOutdoorFriendly: true,
    hasUserLocation: true,
  }),
}));

vi.mock('@/lib/geocode', () => ({
  geocodeNominatim: vi.fn().mockResolvedValue(null),
}));

import { GET, POST } from './route';
import { generateDailyQuest } from '@/lib/quest-gen/generateQuest';
import { geocodeNominatim } from '@/lib/geocode';
import { getQuestTaxonomy } from '@/lib/quest-taxonomy/cache';

const taxonomyId7Only = TEST_QUEST_TAXONOMY.filter((q) => q.id === 7);

const prismaMock = vi.hoisted(() => ({
  profile: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  questLog: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

const profileRow = {
  id: 'p1',
  clerkId: 'u1',
  currentDay: 2,
  currentPhase: 'calibration',
  streakCount: 0,
  lastQuestDate: null,
  declaredPersonality: {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    emotionalStability: 0.5,
    thrillSeeking: 0.5,
    boredomSusceptibility: 0.5,
  },
  congruenceDelta: 0,
  explorerAxis: 'explorer',
  riskAxis: 'cautious',
  rerollsRemaining: 1,
  bonusRerollCredits: 0,
  activeThemeId: 'default',
  ownedThemes: ['default'],
  coinBalance: 0,
  ownedTitleIds: [],
  equippedTitleId: null,
  xpBonusCharges: 0,
  badgesEarned: [],
  totalXp: 0,
  flagNextQuestAfterReroll: false,
  rerollExcludeArchetypeIds: [],
  refinementSchemaVersion: 0,
  refinementSkippedAt: null,
  refinementAnswers: {},
  flagNextQuestInstantOnly: false,
  deferredSocialUntil: null,
};

const logRow = {
  id: 'log1',
  questDate: '2026-03-24',
  archetypeId: 9,
  generatedEmoji: 'Swords',
  generatedTitle: 'T',
  generatedMission: 'M',
  generatedHook: 'H',
  generatedDuration: '1h',
  generatedSafetyNote: null,
  isOutdoor: false,
  destinationLabel: null,
  destinationLat: null,
  destinationLon: null,
  locationCity: null,
  weatherDescription: null,
  weatherTemp: null,
  status: 'pending',
  wasRerolled: false,
  wasFallback: false,
  phaseAtAssignment: 'calibration',
  profileId: 'p1',
};

describe('/api/quest/daily', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T12:00:00.000Z'));
    vi.mocked(auth).mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.questLog.findUnique.mockReset();
    prismaMock.questLog.findMany.mockReset();
    prismaMock.questLog.count.mockReset();
    prismaMock.questLog.count.mockResolvedValue(0);
    prismaMock.$transaction.mockReset();
    prismaMock.questLog.create.mockReset();
    prismaMock.questLog.update.mockReset();
    prismaMock.questLog.delete.mockReset();
    prismaMock.profile.update.mockReset();
    vi.mocked(getQuestTaxonomy).mockReset();
    vi.mocked(getQuestTaxonomy).mockResolvedValue(TEST_QUEST_TAXONOMY);
  });

  it('GET 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await GET(new NextRequest('http://localhost/api/quest/daily'));
    expect(res.status).toBe(401);
  });

  it('GET 404 profil', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/quest/daily'));
    expect(res.status).toBe(404);
  });

  it('GET 400 questDate invalide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    const res = await GET(
      new NextRequest('http://localhost/api/quest/daily?questDate=not-a-date'),
    );
    expect(res.status).toBe(400);
  });

  it('GET 404 date historique sans quête', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValueOnce(null);
    const res = await GET(
      new NextRequest('http://localhost/api/quest/daily?questDate=2026-01-01'),
    );
    expect(res.status).toBe(404);
  });

  it('GET 200 quête historique avec contexte météo', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-01-10',
      weatherDescription: 'Couvert',
      weatherTemp: 11,
      locationCity: 'Lyon',
    });
    const res = await GET(
      new NextRequest('http://localhost/api/quest/daily?questDate=2026-01-10'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fromCache).toBe(true);
    expect(json.context?.weatherDescription).toBe('Couvert');
    expect(json.context?.temp).toBe(11);
  });

  it('GET 200 génère une nouvelle quête (pas de log du jour)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique
      .mockResolvedValueOnce({
        ...profileRow,
        lastQuestDate: null,
        flagNextQuestAfterReroll: false,
        flagNextQuestInstantOnly: false,
        rerollExcludeArchetypeIds: [],
      })
      .mockResolvedValueOnce({
        ...profileRow,
        currentDay: 3,
        streakCount: 1,
        lastQuestDate: new Date('2026-03-24'),
        rerollsRemaining: 1,
      });
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    prismaMock.questLog.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockResolvedValue([
      {
        id: 'new-log',
        questDate: '2026-03-24',
        archetypeId: 1,
        generatedEmoji: 'Target',
        generatedTitle: 'Titre',
        generatedMission: 'Mission',
        generatedHook: 'Hook',
        generatedDuration: '1h',
        generatedSafetyNote: null,
        isOutdoor: false,
        destinationLabel: null,
        destinationLat: null,
        destinationLon: null,
        locationCity: 'Paris',
        weatherDescription: 'Beau',
        weatherTemp: 20,
        status: 'pending',
        wasRerolled: false,
        wasFallback: false,
        phaseAtAssignment: 'calibration',
        profileId: 'p1',
      },
      {},
    ]);

    const res = await GET(
      new NextRequest('http://localhost/api/quest/daily?lat=48.85&lon=2.35'),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.fromCache).toBe(false);
    expect(json.title).toBe('Titre');
  });

  it('GET 201 génère une quête outdoor et géocode la destination', async () => {
    vi.mocked(generateDailyQuest).mockResolvedValueOnce({
      archetypeId: 2,
      psychologicalCategory: 'spatial_adventure',
      requiresSocial: false,
      icon: 'MapPin',
      title: 'Outdoor title',
      mission: 'Marche 20 minutes vers un lieu vert à Paris.',
      hook: 'Air et pas.',
      duration: '40 min',
      isOutdoor: true,
      safetyNote: null,
      destinationLabel: 'Parc Montsouris',
      destinationQuery: 'Parc Montsouris, Paris',
      selectionReason: 'test outdoor',
      selfFitScore: 70,
      wasFallback: false,
    });
    vi.mocked(geocodeNominatim).mockResolvedValueOnce({
      lat: 48.82,
      lon: 2.34,
      displayName: 'Parc Montsouris, 75014 Paris, France',
    });

    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique
      .mockResolvedValueOnce({
        ...profileRow,
        lastQuestDate: null,
        flagNextQuestAfterReroll: false,
        flagNextQuestInstantOnly: false,
        rerollExcludeArchetypeIds: [],
      })
      .mockResolvedValueOnce({
        ...profileRow,
        currentDay: 3,
        streakCount: 1,
        lastQuestDate: new Date('2026-03-24'),
        rerollsRemaining: 1,
      });
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    prismaMock.questLog.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockResolvedValue([
      {
        id: 'new-log-outdoor',
        questDate: '2026-03-24',
        archetypeId: 2,
        generatedEmoji: 'MapPin',
        generatedTitle: 'Outdoor title',
        generatedMission: 'Marche 20 minutes vers un lieu vert à Paris.',
        generatedHook: 'Air et pas.',
        generatedDuration: '40 min',
        generatedSafetyNote: null,
        isOutdoor: true,
        destinationLabel: 'Parc Montsouris',
        destinationLat: 48.82,
        destinationLon: 2.34,
        locationCity: 'Paris',
        weatherDescription: 'Beau',
        weatherTemp: 20,
        status: 'pending',
        wasRerolled: false,
        wasFallback: false,
        phaseAtAssignment: 'calibration',
        profileId: 'p1',
      },
      {},
    ]);

    const res = await GET(
      new NextRequest('http://localhost/api/quest/daily?lat=48.85&lon=2.35'),
    );
    expect(res.status).toBe(201);
    expect(geocodeNominatim).toHaveBeenCalled();
    const json = await res.json();
    expect(json.isOutdoor).toBe(true);
    expect(json.destination?.lat).toBe(48.82);
    expect(json.destination?.label).toBeTruthy();
  });

  it('GET 200 cache quête du jour', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique
      .mockResolvedValueOnce({
        ...logRow,
        questDate: '2026-03-24',
        status: 'pending',
      })
      .mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/quest/daily'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fromCache).toBe(true);
  });

  it('POST 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'complete' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('POST complete accorde XP', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({
      ...profileRow,
      streakCount: 1,
      currentDay: 5,
      badgesEarned: [],
      totalXp: 100,
    });
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'accepted',
      phaseAtAssignment: 'expansion',
      isOutdoor: false,
      wasRerolled: false,
      wasFallback: false,
    });
    prismaMock.questLog.count.mockResolvedValue(0);
    prismaMock.$transaction.mockResolvedValue([
      { id: 'log1' },
      {
        ...profileRow,
        totalXp: 150,
        badgesEarned: [],
      },
    ]);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'complete', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('POST report consomme une relance et pose les flags', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({
      ...profileRow,
      rerollsRemaining: 1,
      bonusRerollCredits: 0,
    });
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      archetypeId: 4,
      questDate: '2026-03-24',
      status: 'pending',
    });
    prismaMock.questLog.delete.mockResolvedValue({});
    prismaMock.profile.update.mockResolvedValue({
      ...profileRow,
      rerollsRemaining: 0,
      flagNextQuestAfterReroll: true,
      flagNextQuestInstantOnly: true,
      deferredSocialUntil: '2026-03-30',
    });
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: {
        questLog: { delete: typeof prismaMock.questLog.delete };
        profile: { update: typeof prismaMock.profile.update };
      }) => Promise<unknown>) =>
        fn({
          questLog: { delete: prismaMock.questLog.delete },
          profile: { update: prismaMock.profile.update },
        }),
    );

    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({
          action: 'report',
          questDate: '2026-03-24',
          deferredUntil: '2026-03-30',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reported).toBe(true);
    expect(json.deferredUntil).toBe('2026-03-30');
  });

  it('POST abandon met le statut abandoned et série à 0', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ ...profileRow, streakCount: 3 });
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'pending',
    });
    prismaMock.$transaction.mockResolvedValue([
      { ...logRow, status: 'abandoned' },
      { ...profileRow, streakCount: 0, deferredSocialUntil: null },
    ]);

    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'abandon', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.abandoned).toBe(true);
    expect(json.status).toBe('abandoned');
  });

  it('GET 503 taxonomie vide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    vi.mocked(getQuestTaxonomy).mockResolvedValueOnce([]);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/quest/daily'));
    expect(res.status).toBe(503);
  });

  it('GET 201 emergency si instantOnly et aucun archétype instant éligible', async () => {
    vi.mocked(getQuestTaxonomy).mockResolvedValueOnce(taxonomyId7Only);
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique
      .mockResolvedValueOnce({
        ...profileRow,
        lastQuestDate: null,
        flagNextQuestAfterReroll: false,
        flagNextQuestInstantOnly: true,
        rerollExcludeArchetypeIds: [],
      })
      .mockResolvedValueOnce({
        ...profileRow,
        currentDay: 3,
        streakCount: 1,
        lastQuestDate: new Date('2026-03-24'),
        rerollsRemaining: 1,
        flagNextQuestInstantOnly: false,
      });
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    prismaMock.questLog.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockResolvedValue([
      {
        id: 'emergency-log',
        questDate: '2026-03-24',
        archetypeId: 7,
        generatedEmoji: 'Target',
        generatedTitle: 'Titre',
        generatedMission: 'Mission',
        generatedHook: 'Hook',
        generatedDuration: '1h',
        generatedSafetyNote: null,
        isOutdoor: false,
        destinationLabel: null,
        destinationLat: null,
        destinationLon: null,
        locationCity: 'Paris',
        weatherDescription: 'Beau',
        weatherTemp: 20,
        status: 'pending',
        wasRerolled: false,
        wasFallback: false,
        phaseAtAssignment: 'calibration',
        profileId: 'p1',
      },
      {},
    ]);
    const res = await GET(new NextRequest('http://localhost/api/quest/daily'));
    expect(res.status).toBe(201);
    expect(generateDailyQuest).toHaveBeenCalled();
  });

  it('POST report 400 date report invalide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({
          action: 'report',
          questDate: '2026-03-24',
          deferredUntil: '2026-03-20',
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST report 400 quête absente ou non pending', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({
          action: 'report',
          questDate: '2026-03-24',
          deferredUntil: '2026-03-30',
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST report 400 quête instant (pas reportable)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({
      ...profileRow,
      rerollsRemaining: 1,
    });
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      archetypeId: 2,
      questDate: '2026-03-24',
      status: 'pending',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({
          action: 'report',
          questDate: '2026-03-24',
          deferredUntil: '2026-03-30',
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST report 400 sans relances', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({
      ...profileRow,
      rerollsRemaining: 0,
      bonusRerollCredits: 0,
    });
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      archetypeId: 4,
      questDate: '2026-03-24',
      status: 'pending',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({
          action: 'report',
          questDate: '2026-03-24',
          deferredUntil: '2026-03-30',
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST report 200 consomme un crédit bonus', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({
      ...profileRow,
      rerollsRemaining: 0,
      bonusRerollCredits: 1,
    });
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      archetypeId: 4,
      questDate: '2026-03-24',
      status: 'pending',
    });
    prismaMock.questLog.delete.mockResolvedValue({});
    prismaMock.profile.update.mockResolvedValue({
      ...profileRow,
      rerollsRemaining: 0,
      bonusRerollCredits: 0,
      flagNextQuestAfterReroll: true,
      flagNextQuestInstantOnly: true,
      deferredSocialUntil: '2026-03-30',
    });
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: {
        questLog: { delete: typeof prismaMock.questLog.delete };
        profile: { update: typeof prismaMock.profile.update };
      }) => Promise<unknown>) =>
        fn({
          questLog: { delete: prismaMock.questLog.delete },
          profile: { update: prismaMock.profile.update },
        }),
    );
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({
          action: 'report',
          questDate: '2026-03-24',
          deferredUntil: '2026-03-30',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reported).toBe(true);
  });

  it('POST reroll 400 sans quête du jour', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'reroll', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST reroll 400 sans relances', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({
      ...profileRow,
      rerollsRemaining: 0,
      bonusRerollCredits: 0,
    });
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'pending',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'reroll', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST replace 200 consomme crédit bonus', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({
      ...profileRow,
      rerollsRemaining: 0,
      bonusRerollCredits: 1,
    });
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'pending',
    });
    prismaMock.questLog.delete.mockResolvedValue({});
    prismaMock.profile.update.mockResolvedValue({
      ...profileRow,
      bonusRerollCredits: 0,
      flagNextQuestAfterReroll: true,
    });
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: {
        questLog: { delete: typeof prismaMock.questLog.delete };
        profile: { update: typeof prismaMock.profile.update };
      }) => Promise<unknown>) =>
        fn({
          questLog: { delete: prismaMock.questLog.delete },
          profile: { update: prismaMock.profile.update },
        }),
    );
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'replace', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rerolled).toBe(true);
  });

  it('POST abandon 404', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'abandon', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('POST abandon 400 déjà complétée', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'completed',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'abandon', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST abandon 400 déjà abandonnée', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'abandoned',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'abandon', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST complete 404', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'complete', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('POST complete 400 si abandoned', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'abandoned',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'complete', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST complete 400 si pending', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'pending',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'complete', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST complete 400 si déjà completed', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'completed',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'complete', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST complete 200 avec bonus XP boutique', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({
      ...profileRow,
      streakCount: 1,
      totalXp: 50,
      xpBonusCharges: 1,
      badgesEarned: [],
    });
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'accepted',
      phaseAtAssignment: 'expansion',
    });
    prismaMock.questLog.count.mockResolvedValue(0);
    prismaMock.$transaction.mockResolvedValue([
      { ...logRow, status: 'completed', xpAwarded: 99 },
      {
        ...profileRow,
        totalXp: 149,
        badgesEarned: [],
        xpBonusCharges: 0,
      },
    ]);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ action: 'complete', questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.xpGain?.breakdown?.shopBonusXp).toBeDefined();
  });

  it('POST accept 404 sans quête', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('POST accept 400 si completed', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'completed',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST accept 200 idempotent si déjà accepted', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'accepted',
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({ questDate: '2026-03-24' }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('POST accept 200 pending → accepted', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(profileRow);
    prismaMock.questLog.findUnique.mockResolvedValue({
      ...logRow,
      questDate: '2026-03-24',
      status: 'pending',
    });
    prismaMock.questLog.update.mockResolvedValue({
      ...logRow,
      status: 'accepted',
      safetyConsentGiven: true,
    });
    const res = await POST(
      new NextRequest('http://localhost/api/quest/daily', {
        method: 'POST',
        body: JSON.stringify({
          questDate: '2026-03-24',
          safetyConsentGiven: true,
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.questLog.update).toHaveBeenCalled();
  });
});
