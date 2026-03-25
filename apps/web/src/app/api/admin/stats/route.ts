import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth/admin';
import { buildGlobalStats } from '@/lib/admin/globalStats';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats — séries temporelles pour graphiques (admin uniquement).
 * Query : `days` (1–730, défaut 30) ou `from` + `to` (YYYY-MM-DD).
 * `shopMode` : `eur` (encaissements Stripe réels, défaut) ou `qc` (dépenses Quest Coins en boutique).
 */
export async function GET(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  try {
    const stats = await buildGlobalStats(request.nextUrl.searchParams);
    return NextResponse.json(stats);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
