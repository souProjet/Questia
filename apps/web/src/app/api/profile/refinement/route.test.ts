import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GET, POST } from './route';

const prismaMock = vi.hoisted(() => ({
  profile: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  questLog: {
    count: vi.fn(),
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
  currentDay: 10,
  refinementSchemaVersion: 0,
  refinementSkippedAt: null as string | null,
};

const validAnswers = {
  social_mode: 'balanced',
  romance_topics: 'neutral',
  food_missions: 'neutral',
  energy_peak: 'varies',
  crowds: 'neutral',
};

describe('/api/profile/refinement', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.profile.update.mockReset();
    prismaMock.questLog.count.mockReset();
  });

  it('GET 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET 404', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('GET 200', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    prismaMock.questLog.count.mockResolvedValue(0);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('due');
  });

  it('POST 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await POST(
      new NextRequest('http://localhost/api/profile/refinement', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('POST 404', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const res = await POST(
      new NextRequest('http://localhost/api/profile/refinement', {
        method: 'POST',
        body: JSON.stringify({ skip: true }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('POST skip', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    prismaMock.profile.update.mockResolvedValue({ ...baseProfile, refinementSkippedAt: '2026-01-01' });
    const res = await POST(
      new NextRequest('http://localhost/api/profile/refinement', {
        method: 'POST',
        body: JSON.stringify({ skip: true }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
  });

  it('POST 400 sans consentement', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    const res = await POST(
      new NextRequest('http://localhost/api/profile/refinement', {
        method: 'POST',
        body: JSON.stringify({ consent: false, answers: validAnswers }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST 400 réponses invalides', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    const res = await POST(
      new NextRequest('http://localhost/api/profile/refinement', {
        method: 'POST',
        body: JSON.stringify({ consent: true, answers: { social_mode: 'nope' } }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST 200 enregistrement', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(baseProfile);
    prismaMock.profile.update.mockResolvedValue(baseProfile);
    const res = await POST(
      new NextRequest('http://localhost/api/profile/refinement', {
        method: 'POST',
        body: JSON.stringify({ consent: true, answers: validAnswers }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.saved).toBe(true);
  });
});
