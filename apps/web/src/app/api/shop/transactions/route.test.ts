import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GET } from './route';

const prismaMock = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  shopTransaction: { findMany: vi.fn() },
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('GET /api/shop/transactions', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.shopTransaction.findMany.mockReset();
  });

  it('401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await GET(new NextRequest('http://localhost/api/shop/transactions'));
    expect(res.status).toBe(401);
  });

  it('404', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/shop/transactions'));
    expect(res.status).toBe(404);
  });

  it('200', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.shopTransaction.findMany.mockResolvedValue([]);
    const res = await GET(new NextRequest('http://localhost/api/shop/transactions'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.transactions).toEqual([]);
  });
});
