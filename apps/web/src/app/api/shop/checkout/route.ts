import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoinPack } from '@questia/shared';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

/**
 * Crée une session Stripe **uniquement** pour l'achat de packs de Quest Coins (recharge en euros).
 * Les articles boutique se paient via POST /api/shop/purchase (coins).
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { sku?: string };
  const sku = body.sku?.trim();
  if (!sku) return NextResponse.json({ error: 'SKU requis' }, { status: 400 });

  const pack = getCoinPack(sku);
  if (!pack) {
    return NextResponse.json(
      { error: 'Pack de coins inconnu. Utilise la boutique pour les thèmes et autres articles.' },
      { status: 400 },
    );
  }

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Paiement indisponible : configure STRIPE_SECRET_KEY dans l'environnement." },
      { status: 503 },
    );
  }

  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  if (!siteUrl && process.env.VERCEL_URL) {
    siteUrl = `https://${process.env.VERCEL_URL}`;
  }
  if (!siteUrl) siteUrl = 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: pack.currency,
          unit_amount: pack.priceCents,
          product_data: {
            name: pack.name,
            description: pack.description.slice(0, 450),
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/app/shop?success=1`,
    cancel_url: `${siteUrl}/app/shop?canceled=1`,
    metadata: {
      type: 'coin_pack',
      clerkId: userId,
      profileId: profile.id,
      sku: pack.sku,
      coinsGranted: String(pack.coinsGranted),
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Impossible de créer la session de paiement' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
