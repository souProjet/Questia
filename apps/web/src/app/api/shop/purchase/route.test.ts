import { describe, expect, it, vi, beforeEach } from 'vitest';
import { auth } from '@clerk/nextjs/server';
import { POST } from './route';

vi.mock('@/lib/shop/fulfill', () => ({
  applyGrantsToProfile: vi.fn().mockResolvedValue(undefined),
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('POST /api/shop/purchase', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    prismaMock.$transaction.mockReset();
  });

  it('401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await POST(
      new Request('http://localhost/api/shop/purchase', {
        method: 'POST',
        body: JSON.stringify({ sku: 'title_scout' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('400 SKU vide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const res = await POST(
      new Request('http://localhost/api/shop/purchase', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('400 pack coins (Stripe)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const res = await POST(
      new Request('http://localhost/api/shop/purchase', {
        method: 'POST',
        body: JSON.stringify({ sku: 'coin_pack_500' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('400 article inconnu', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const res = await POST(
      new Request('http://localhost/api/shop/purchase', {
        method: 'POST',
        body: JSON.stringify({ sku: 'nope' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('404 profil introuvable dans transaction', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        profile: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        shopTransaction: { create: vi.fn(), count: vi.fn() },
      }),
    );
    const res = await POST(
      new Request('http://localhost/api/shop/purchase', {
        method: 'POST',
        body: JSON.stringify({ sku: 'title_scout' }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('200 achat titre', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        profile: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'p1',
            clerkId: 'u1',
            ownedThemes: [],
            ownedNarrationPacks: [],
            ownedTitleIds: [],
            coinBalance: 99999,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        shopTransaction: {
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(0),
        },
      }),
    );
    const res = await POST(
      new Request('http://localhost/api/shop/purchase', {
        method: 'POST',
        body: JSON.stringify({ sku: 'title_scout' }),
      }),
    );
    expect(res.status).toBe(200);
  });
});
