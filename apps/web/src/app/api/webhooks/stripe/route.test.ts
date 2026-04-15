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
    create: vi.fn(),
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
    prismaMock.shopTransaction.create.mockReset();
    prismaMock.profile.findUnique.mockReset();
    prismaMock.profile.update.mockReset();
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

  it('200 checkout sans métadonnées coin_pack — ignoré', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_skip',
          metadata: { type: 'subscription' },
        },
      },
    });
    const res = await POST(
      new Request('http://localhost/webhook', {
        method: 'POST',
        body: 'raw',
        headers: { 'stripe-signature': 'sig' },
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.shopTransaction.findUnique).not.toHaveBeenCalled();
  });

  it('200 checkout coin_pack avec SKU inconnu', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_bad_sku',
          metadata: {
            type: 'coin_pack',
            profileId: 'p1',
            sku: 'coin_pack_unknown',
          },
        },
      },
    });
    const res = await POST(
      new Request('http://localhost/webhook', {
        method: 'POST',
        body: 'raw',
        headers: { 'stripe-signature': 'sig' },
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.shopTransaction.findUnique).not.toHaveBeenCalled();
  });

  it('200 crédite le profil et enregistre la transaction', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_credit',
          metadata: {
            type: 'coin_pack',
            profileId: 'p1',
            sku: 'coin_pack_500',
            coinsGranted: '500',
          },
          amount_total: 499,
          currency: 'EUR',
          payment_intent: { id: 'pi_from_object' },
        },
      },
    });
    prismaMock.shopTransaction.findUnique.mockResolvedValue(null);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1', coinBalance: 10 });
    prismaMock.profile.update.mockResolvedValue({});
    prismaMock.shopTransaction.create.mockResolvedValue({ id: 't1' });
    prismaMock.$transaction.mockImplementation(async (fn: (tx: {
      profile: { findUnique: typeof prismaMock.profile.findUnique; update: typeof prismaMock.profile.update };
      shopTransaction: { create: typeof prismaMock.shopTransaction.create };
    }) => Promise<void>) => {
      await fn({
        profile: prismaMock.profile,
        shopTransaction: prismaMock.shopTransaction,
      });
    });
    const res = await POST(
      new Request('http://localhost/webhook', {
        method: 'POST',
        body: 'raw',
        headers: { 'stripe-signature': 'sig' },
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.profile.update).toHaveBeenCalled();
    expect(prismaMock.shopTransaction.create).toHaveBeenCalled();
  });

  it('200 utilise payment_intent string', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_pi_str',
          metadata: {
            type: 'coin_pack',
            profileId: 'p1',
            sku: 'coin_pack_500',
          },
          amount_total: 100,
          currency: 'eur',
          payment_intent: 'pi_string',
        },
      },
    });
    prismaMock.shopTransaction.findUnique.mockResolvedValue(null);
    prismaMock.profile.findUnique.mockResolvedValue({ id: 'p1', coinBalance: 0 });
    prismaMock.$transaction.mockImplementation(async (fn: (tx: {
      profile: typeof prismaMock.profile;
      shopTransaction: typeof prismaMock.shopTransaction;
    }) => Promise<void>) => {
      await fn({
        profile: prismaMock.profile,
        shopTransaction: prismaMock.shopTransaction,
      });
    });
    const res = await POST(
      new Request('http://localhost/webhook', {
        method: 'POST',
        body: 'raw',
        headers: { 'stripe-signature': 'sig' },
      }),
    );
    expect(res.status).toBe(200);
    const createArg = prismaMock.shopTransaction.create.mock.calls[0]?.[0];
    expect(createArg?.data?.stripePaymentIntentId).toBe('pi_string');
  });

  it('200 si contrainte unique en base (idempotence)', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_dup',
          metadata: {
            type: 'coin_pack',
            profileId: 'p1',
            sku: 'coin_pack_500',
          },
          amount_total: 100,
          currency: 'eur',
          payment_intent: null,
        },
      },
    });
    prismaMock.shopTransaction.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockRejectedValue(new Error('Unique constraint failed on shop_transaction'));
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
});
