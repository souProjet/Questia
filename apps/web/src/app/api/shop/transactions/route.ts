import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { HISTORY_PAGE_SIZE } from '@questia/shared';

function parseOffset(sp: URLSearchParams): number {
  const raw = sp.get('offset');
  if (raw == null) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Historique : recharges Stripe et achats en QC. Sans `limit` : jusqu’à 80 entrées (boutique). Avec pagination : `limit` + `offset` + `hasMore`. */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const { searchParams } = request.nextUrl;
  const offset = parseOffset(searchParams);
  const limitRaw = searchParams.get('limit');
  const limit =
    limitRaw != null
      ? Math.min(200, Math.max(1, Number.parseInt(limitRaw, 10) || HISTORY_PAGE_SIZE))
      : 80;

  const rows = await prisma.shopTransaction.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  type Row = (typeof page)[number] & {
    entryKind?: string;
    coinsDelta?: number | null;
    coinBalanceAfter?: number | null;
  };

  return NextResponse.json({
    transactions: page.map((r) => {
      const x = r as Row;
      return {
        id: x.id,
        entryKind: x.entryKind ?? 'legacy_stripe_product',
        coinsDelta: x.coinsDelta ?? null,
        coinBalanceAfter: x.coinBalanceAfter ?? null,
        amountCents: x.amountCents,
        currency: x.currency,
        status: x.status,
        primarySku: x.primarySku,
        label: x.label,
        createdAt: x.createdAt,
      };
    }),
    hasMore,
  });
}
