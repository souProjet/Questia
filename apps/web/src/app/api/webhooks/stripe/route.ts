import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { getCoinPack } from '@questia/shared';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET manquant' }, { status: 500 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Signature absente' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, whSecret);
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const type = session.metadata?.type;
    const profileId = session.metadata?.profileId;
    const sku = session.metadata?.sku;

    if (type !== 'coin_pack' || !profileId || !sku) {
      return NextResponse.json({ received: true });
    }

    const pack = getCoinPack(sku);
    if (!pack) {
      return NextResponse.json({ received: true });
    }

    const coinsGranted =
      parseInt(session.metadata?.coinsGranted ?? '', 10) || pack.coinsGranted;

    const existing = await prisma.shopTransaction.findUnique({
      where: { stripeCheckoutSessionId: session.id },
    });
    if (existing) {
      return NextResponse.json({ received: true });
    }

    const amountTotal = session.amount_total ?? 0;
    const currency = (session.currency ?? 'eur').toLowerCase();
    const pi =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent && typeof session.payment_intent === 'object'
          ? session.payment_intent.id
          : null;

    try {
      await prisma.$transaction(async (tx) => {
        const profile = await tx.profile.findUnique({ where: { id: profileId } });
        if (!profile) return;

        const newBalance = ((profile as { coinBalance?: number | null }).coinBalance ?? 0) + coinsGranted;

        await tx.profile.update({
          where: { id: profileId },
          data: { coinBalance: newBalance } as unknown as Prisma.ProfileUpdateInput,
        });

        await tx.shopTransaction.create({
          data: {
            profileId,
            entryKind: 'stripe_coin_topup',
            coinsDelta: coinsGranted,
            coinBalanceAfter: newBalance,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: pi,
            amountCents: amountTotal,
            currency,
            status: 'paid',
            primarySku: sku,
            label: `Recharge : ${pack.name}`,
            lineItems: [{ sku, coinsGranted }] as unknown as Prisma.InputJsonValue,
          } as unknown as Prisma.ShopTransactionCreateInput,
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Unique constraint') || msg.includes('unique constraint')) {
        return NextResponse.json({ received: true });
      }
      throw e;
    }
  }

  return NextResponse.json({ received: true });
}
