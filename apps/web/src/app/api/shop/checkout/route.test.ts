import { describe, expect, it, vi, beforeEach } from 'vitest';
import { auth } from '@clerk/nextjs/server';
import { POST } from './route';

const prismaMock = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
}));

const createSession = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: {
        create: createSession,
      },
    },
  })),
}));

describe('POST /api/shop/checkout', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('STRIPE_SECRET_KEY', `${'sk'}_${'test'}_${'x'.repeat(24)}`);
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
    vi.mocked(auth).mockReset();
    prismaMock.profile.findUnique.mockReset();
    createSession.mockResolvedValue({ url: 'https://checkout.test/s' });
  });

  it('401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const res = await POST(
      new Request('http://localhost/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({ sku: 'coin_pack_500' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('400 SKU manquant', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const res = await POST(
      new Request('http://localhost/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('400 pack inconnu', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const res = await POST(
      new Request('http://localhost/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({ sku: 'nope' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('404 sans profil', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue(null);
    const res = await POST(
      new Request('http://localhost/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({ sku: 'coin_pack_500' }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('200 URL session', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    const res = await POST(
      new Request('http://localhost/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({ sku: 'coin_pack_500' }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://checkout.test/s');
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: 'http://localhost:3000/app/shop?success=1',
        cancel_url: 'http://localhost:3000/app/shop?canceled=1',
      }),
    );
  });

  it('200 mobile : success_url https /app/shop (Stripe refuse questia://)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    const res = await POST(
      new Request('http://localhost/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({ sku: 'coin_pack_500', stripeReturnUrl: 'questia://shop' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          'http://localhost:3000/app/shop?stripe_success=1&session_id={CHECKOUT_SESSION_ID}&pack_sku=coin_pack_500',
        cancel_url:
          'http://localhost:3000/app/shop?stripe_canceled=1&pack_sku=coin_pack_500',
      }),
    );
  });

  it('400 si stripeReturnUrl non autorisée', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    const res = await POST(
      new Request('http://localhost/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({ sku: 'coin_pack_500', stripeReturnUrl: 'https://evil.example/phish' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('503 si getStripe lance', async () => {
    const { getStripe } = await import('@/lib/stripe');
    vi.mocked(getStripe).mockImplementationOnce(() => {
      throw new Error('STRIPE_SECRET_KEY manquant');
    });
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    const res = await POST(
      new Request('http://localhost/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({ sku: 'coin_pack_500' }),
      }),
    );
    expect(res.status).toBe(503);
  });

  it('502 sans url session', async () => {
    createSession.mockResolvedValueOnce({ url: null });
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1' });
    const res = await POST(
      new Request('http://localhost/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({ sku: 'coin_pack_500' }),
      }),
    );
    expect(res.status).toBe(502);
  });
});
