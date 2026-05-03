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

  it('POST 404 profil absent', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: 'ExponentPushToken[xx]' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('POST 400 corps JSON invalide → token vide', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('DELETE 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ token: 'x' }),
    });
    expect((await DELETE(req)).status).toBe(401);
  });

  it('DELETE 400 sans token', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
    expect((await DELETE(req)).status).toBe(400);
  });

  it('DELETE 404 profil absent', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ token: 'ExponentPushToken[z]' }),
    });
    expect((await DELETE(req)).status).toBe(404);
  });

  it('POST 200 enregistre avec platform longue tronquée', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.pushDevice.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.pushDevice.create.mockImplementation(async ({ data }: { data: { platform: string | null } }) => {
      expect(data.platform?.length).toBeLessThanOrEqual(32);
      return {};
    });
    const req = new NextRequest('http://localhost/api/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({
        token: 'ExponentPushToken[abc]',
        platform: 'x'.repeat(40),
      }),
    });
    expect((await POST(req)).status).toBe(200);
  });

  it('POST 200 enregistre (jeton + plateforme)', async () => {
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
