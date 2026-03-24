import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { POST, DELETE } from './route';

const prismaMock = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  pushDevice: { deleteMany: vi.fn(), create: vi.fn() },
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('push-token', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.pushDevice.deleteMany.mockReset();
    prismaMock.pushDevice.create.mockReset();
  });

  it('POST 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: 'ExponentPushToken[xx]' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('POST 400 jeton invalide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: 'bad' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('POST 201 enregistre', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.pushDevice.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.pushDevice.create.mockResolvedValue({});
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: 'ExponentPushToken[abc]', platform: 'ios' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('DELETE retire le jeton', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.pushDevice.deleteMany.mockResolvedValue({ count: 1 });
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ token: 'ExponentPushToken[abc]' }),
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
  });
});
