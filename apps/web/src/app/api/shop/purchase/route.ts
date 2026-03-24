import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { Prisma } from '@prisma/client';
import { getShopItem, getCoinPack, hasAllPermanentBundleGrants } from '@questia/shared';
import type { ShopCatalogEntry } from '@questia/shared';
import { applyGrantsToProfile } from '@/lib/shop/fulfill';
import { prisma } from '@/lib/db';
import { parseStringArray } from '@/lib/shop/parse';

function isFullyOwned(
  profile: { ownedThemes: unknown; ownedNarrationPacks: unknown; ownedTitleIds?: unknown },
  item: ShopCatalogEntry,
): boolean {
  if (item.kind === 'reroll_pack' || item.kind === 'xp_booster') return false;
  const themes = parseStringArray(profile.ownedThemes);
  const packs = parseStringArray(profile.ownedNarrationPacks);
  const titles = parseStringArray(profile.ownedTitleIds);

  if (item.kind === 'theme_pack') {
    return item.grants.themes?.every((t) => themes.includes(t)) ?? false;
  }
  if (item.kind === 'title') {
    return item.grants.titles?.every((t) => titles.includes(t)) ?? false;
  }
  if (item.kind === 'narration_pack') {
    return item.grants.narrationPacks?.every((p) => packs.includes(p)) ?? false;
  }
  return false;
}

/** Achat in-app avec Quest Coins uniquement */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { sku?: string };
  const sku = body.sku?.trim();
  if (!sku) return NextResponse.json({ error: 'SKU requis' }, { status: 400 });

  if (getCoinPack(sku)) {
    return NextResponse.json(
      { error: 'Les packs de coins s’achètent avec Stripe (section Recharge), pas en Quest Coins.' },
      { status: 400 },
    );
  }

  const item = getShopItem(sku);
  if (!item) return NextResponse.json({ error: 'Article inconnu' }, { status: 400 });

  const price = item.priceCoins;
  if (price <= 0) return NextResponse.json({ error: 'Prix invalide' }, { status: 400 });

  try {
    type Out =
      | { ok: true; coinBalance: number }
      | { ok: false; message: string; code?: 'insufficient_coins' };

    const result = await prisma.$transaction(async (tx): Promise<Out> => {
      const profile = await tx.profile.findUnique({ where: { clerkId: userId } });
      if (!profile) return { ok: false, message: 'Profil introuvable' };

      const themes = parseStringArray(profile.ownedThemes);
      const packs = parseStringArray(profile.ownedNarrationPacks);
      const titles = parseStringArray((profile as { ownedTitleIds?: unknown }).ownedTitleIds);

      if (item.kind === 'bundle') {
        if (hasAllPermanentBundleGrants(item, themes, packs, titles)) {
          const already = await tx.shopTransaction.count({
            where: {
              profileId: profile.id,
              primarySku: item.sku,
              status: 'paid',
              entryKind: 'coin_purchase',
            },
          });
          if (already > 0) {
            return {
              ok: false,
              message:
                'Tu as déjà acheté ce bundle. Les bonus qu’il contient (dont les charges XP) ne sont appliqués qu’une fois.',
            };
          }
        }
      } else if (isFullyOwned(profile, item)) {
        return { ok: false, message: 'Tu possèdes déjà cet article.' };
      }

      const balance = (profile as { coinBalance?: number | null }).coinBalance ?? 0;
      if (balance < price) {
        return {
          ok: false,
          code: 'insufficient_coins',
          message: `Pas assez de Quest Coins (solde : ${balance}, prix : ${price}).`,
        };
      }

      const newBalance = balance - price;

      await tx.profile.update({
        where: { id: profile.id },
        data: { coinBalance: newBalance } as unknown as Prisma.ProfileUpdateInput,
      });

      await tx.shopTransaction.create({
        data: {
          profileId: profile.id,
          entryKind: 'coin_purchase',
          coinsDelta: -price,
          coinBalanceAfter: newBalance,
          amountCents: 0,
          currency: 'eur',
          status: 'paid',
          primarySku: sku,
          label: item.name,
          lineItems: [{ sku, priceCoins: price }] as unknown as Prisma.InputJsonValue,
        } as unknown as Prisma.ShopTransactionCreateInput,
      });

      await applyGrantsToProfile(profile.id, [item], tx);

      return { ok: true, coinBalance: newBalance };
    });

    if (!result.ok) {
      if (result.message === 'Profil introuvable') {
        return NextResponse.json({ error: result.message }, { status: 404 });
      }
      const status = result.code === 'insufficient_coins' ? 402 : 400;
      return NextResponse.json({ error: result.message, code: result.code }, { status });
    }

    return NextResponse.json({
      success: true,
      coinBalance: result.coinBalance,
      sku,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    return NextResponse.json({ error: msg || 'Achat impossible' }, { status: 500 });
  }
}
