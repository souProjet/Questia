import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoinPack } from '@questia/shared';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

/**
 * URL de retour app native (expo-linking) pour fermer la session navigateur après Checkout.
 * Refus des URLs arbitraires (évite open redirect après paiement).
 */
function nativeStripeReturnBase(stripeReturnUrl: string): string | null {
  const trimmed = stripeReturnUrl.trim();
  if (!trimmed) return null;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol === 'questia:') {
    const onShopHost = u.hostname === 'shop';
    const pathNorm = (u.pathname || '').replace(/\/+/g, '/').replace(/\/$/, '') || '';
    const onShopPath = pathNorm === '/shop' || pathNorm.endsWith('/shop');
    if (onShopHost || onShopPath) {
      return trimmed.split('#')[0].split('?')[0];
    }
    return null;
  }
  if (u.protocol === 'exp:' && /\/--\/shop\/?$/.test(u.pathname)) {
    return trimmed.split('#')[0].split('?')[0];
  }
  return null;
}

/**
 * Crée une session Stripe **uniquement** pour l'achat de packs de Quest Coins (recharge en euros).
 * Les articles boutique se paient via POST /api/shop/purchase (coins).
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { sku?: string; stripeReturnUrl?: string };
  const sku = body.sku?.trim();
  const stripeReturnUrl = typeof body.stripeReturnUrl === 'string' ? body.stripeReturnUrl : '';
  if (!sku) return NextResponse.json({ error: 'SKU requis' }, { status: 400 });
  if (stripeReturnUrl.trim() && !nativeStripeReturnBase(stripeReturnUrl)) {
    return NextResponse.json(
      { error: 'URL de retour Stripe mobile invalide (attendu questia://shop ou exp://…/--/shop).' },
      { status: 400 },
    );
  }

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

  const nativeBase = stripeReturnUrl ? nativeStripeReturnBase(stripeReturnUrl) : null;
  const success_url = nativeBase
    ? `${nativeBase}?stripe_success=1&session_id={CHECKOUT_SESSION_ID}`
    : `${siteUrl}/app/shop?success=1`;
  const cancel_url = nativeBase ? `${nativeBase}?stripe_canceled=1` : `${siteUrl}/app/shop?canceled=1`;

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
    success_url,
    cancel_url,
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
