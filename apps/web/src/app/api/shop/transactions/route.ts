import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/** Historique : recharges Stripe (euros → coins) et achats en Quest Coins */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const rows = await prisma.shopTransaction.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 80,
  });

  type Row = (typeof rows)[number] & {
    entryKind?: string;
    coinsDelta?: number | null;
    coinBalanceAfter?: number | null;
  };

  return NextResponse.json({
    transactions: rows.map((r) => {
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
  });
}
