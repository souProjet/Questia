import { NextResponse } from 'next/server';
import { SHOP_CATALOG, COIN_PACKS } from '@questia/shared';

/** Catalogue public : articles en Quest Coins + packs rechargeables (prix EUR) */
export async function GET() {
  return NextResponse.json({ items: SHOP_CATALOG, coinPacks: COIN_PACKS });
}
