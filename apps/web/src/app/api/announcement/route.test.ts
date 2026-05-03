import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { IN_APP_ANNOUNCEMENT_SETTING_KEY } from '@questia/shared';
import { GET } from './route';

const prismaMock = vi.hoisted(() => ({
  appSetting: { findUnique: vi.fn() },
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('GET /api/announcement', () => {
  beforeEach(() => {
    prismaMock.appSetting.findUnique.mockReset();
  });

  it('announcement null si paramètre setting absent', async () => {
    prismaMock.appSetting.findUnique.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/announcement'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ announcement: null });
    expect(prismaMock.appSetting.findUnique).toHaveBeenCalledWith({
      where: { key: IN_APP_ANNOUNCEMENT_SETTING_KEY },
    });
  });

  it('announcement null si value vide', async () => {
    prismaMock.appSetting.findUnique.mockResolvedValue({ value: '' });
    const res = await GET(new NextRequest('http://localhost/api/announcement'));
    expect(await res.json()).toEqual({ announcement: null });
  });

  it('announcement null si JSON invalide', async () => {
    prismaMock.appSetting.findUnique.mockResolvedValue({ value: 'not-json' });
    const res = await GET(new NextRequest('http://localhost/api/announcement'));
    expect(await res.json()).toEqual({ announcement: null });
  });

  it('announcement null si payload invalide après parse', async () => {
    prismaMock.appSetting.findUnique.mockResolvedValue({
      value: JSON.stringify({ id: '', title: 'x', body: '', enabled: true }),
    });
    const res = await GET(new NextRequest('http://localhost/api/announcement'));
    expect(await res.json()).toEqual({ announcement: null });
  });

  it('renvoie l’annonce active sur web par défaut', async () => {
    const payload = {
      id: 'a1',
      title: 'Hello',
      body: 'World',
      enabled: true,
    };
    prismaMock.appSetting.findUnique.mockResolvedValue({
      value: JSON.stringify(payload),
    });
    const res = await GET(new NextRequest('http://localhost/api/announcement'));
    const json = (await res.json()) as { announcement: typeof payload };
    expect(json.announcement).toMatchObject(payload);
  });

  it('respecte ?platform=ios', async () => {
    const payload = {
      id: 'a1',
      title: 'Hello',
      body: '',
      enabled: true,
      platforms: ['ios'] as const,
    };
    prismaMock.appSetting.findUnique.mockResolvedValue({
      value: JSON.stringify(payload),
    });
    const res = await GET(new NextRequest('http://localhost/api/announcement?platform=ios'));
    expect((await res.json()).announcement).toMatchObject({ id: 'a1' });
  });

  it('filtre plateforme : web ne voit pas une annonce ios-only', async () => {
    const payload = {
      id: 'a1',
      title: 'Hello',
      body: '',
      enabled: true,
      platforms: ['ios'],
    };
    prismaMock.appSetting.findUnique.mockResolvedValue({
      value: JSON.stringify(payload),
    });
    const res = await GET(new NextRequest('http://localhost/api/announcement?platform=web'));
    expect(await res.json()).toEqual({ announcement: null });
  });

  it('parse platform android et fallback web', async () => {
    const payload = {
      id: 'a1',
      title: 'T',
      body: '',
      enabled: true,
    };
    prismaMock.appSetting.findUnique.mockResolvedValue({
      value: JSON.stringify(payload),
    });
    const r1 = await GET(new NextRequest('http://localhost/api/announcement?platform=ANDROID'));
    expect((await r1.json()).announcement).toBeTruthy();
    const r2 = await GET(new NextRequest('http://localhost/api/announcement?platform=unknown'));
    expect((await r2.json()).announcement).toBeTruthy();
  });
});
