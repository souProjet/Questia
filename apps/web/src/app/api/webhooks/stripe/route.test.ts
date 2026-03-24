import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';

const constructEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: (...args: unknown[]) => constructEvent(...args),
    },
  }),
}));

const prismaMock = vi.hoisted(() => ({
  shopTransaction: {
    findUnique: vi.fn(),
  },
  profile: { findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    constructEvent.mockReset();
    prismaMock.shopTransaction.findUnique.mockReset();
    prismaMock.$transaction.mockReset();
  });

  it('500 sans STRIPE_WEBHOOK_SECRET', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const res = await POST(
      new Request('http://localhost/webhook', { method: 'POST', body: 'x' }),
    );
    expect(res.status).toBe(500);
  });

  it('400 sans signature', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    const res = await POST(
      new Request('http://localhost/webhook', { method: 'POST', body: 'x' }),
    );
    expect(res.status).toBe(400);
  });

  it('400 signature invalide', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    const res = await POST(
      new Request('http://localhost/webhook', {
        method: 'POST',
        body: 'x',
        headers: { 'stripe-signature': 'sig' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('200 checkout.session.completed idempotent', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          metadata: {
            type: 'coin_pack',
            profileId: 'p1',
            sku: 'coin_pack_500',
            coinsGranted: '500',
          },
          amount_total: 499,
          currency: 'eur',
          payment_intent: null,
        },
      },
    });
    prismaMock.shopTransaction.findUnique.mockResolvedValue({ id: 'existing' });
    const res = await POST(
      new Request('http://localhost/webhook', {
        method: 'POST',
        body: 'raw',
        headers: { 'stripe-signature': 'sig' },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('200 autre événement', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    constructEvent.mockReturnValue({
      type: 'customer.created',
      data: { object: {} },
    });
    const res = await POST(
      new Request('http://localhost/webhook', {
        method: 'POST',
        body: 'raw',
        headers: { 'stripe-signature': 'sig' },
      }),
    );
    expect(res.status).toBe(200);
  });
});
