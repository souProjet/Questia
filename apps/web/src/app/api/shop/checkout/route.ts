import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoinPack } from '@questia/shared';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

/** True si l’origine peut servir de redirect Stripe (https prod ou localhost en test). */
function siteUrlAllowsStripeRedirect(siteUrl: string): boolean {
  const s = siteUrl.trim();
  if (s.startsWith('https://')) return true;
  return /^http:\/\/localhost(?::\d+)?$/i.test(s) || /^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(s);
}

/**
 * Valide que `stripeReturnUrl` vient bien de notre app (questia:// ou exp:// boutique).
 * Stripe n’accepte pas ces schémas en success_url (erreur url_invalid) : on redirige vers
 * `${NEXT_PUBLIC_SITE_URL}/app/shop?…` pour mobile une fois la requête validée.
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
      { error: 'URL de retour Stripe mobile invalide (attendu questia://shop, questia://app/shop ou exp://…/--/shop).' },
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

  const mobileRequested = Boolean(stripeReturnUrl.trim());

  if (mobileRequested && !siteUrlAllowsStripeRedirect(siteUrl)) {
    return NextResponse.json(
      {
        error:
          'NEXT_PUBLIC_SITE_URL doit être en https (ex. https://questia.fr) pour le paiement depuis l’app ; Stripe refuse les URLs questia://.',
      },
      { status: 400 },
    );
  }

  const encSku = encodeURIComponent(pack.sku);
  const success_url = mobileRequested
    ? `${siteUrl}/app/shop?stripe_success=1&session_id={CHECKOUT_SESSION_ID}&pack_sku=${encSku}`
    : `${siteUrl}/app/shop?success=1`;
  const cancel_url = mobileRequested
    ? `${siteUrl}/app/shop?stripe_canceled=1&pack_sku=${encSku}`
    : `${siteUrl}/app/shop?canceled=1`;

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    session = await stripe.checkout.sessions.create({
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/shop/checkout] Stripe checkout.sessions.create', msg);
    const hint =
      /test mode key/i.test(msg) || /live mode/i.test(msg)
        ? ' Vérifie STRIPE_SECRET_KEY sur le serveur : clé live (sk_live_…) pour les vrais paiements.'
        : '';
    const short = msg.length > 240 ? `${msg.slice(0, 237)}…` : msg;
    return NextResponse.json(
      { error: `Paiement Stripe indisponible : ${short}${hint}` },
      { status: 502 },
    );
  }

  if (!session.url) {
    return NextResponse.json({ error: 'Impossible de créer la session de paiement' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
