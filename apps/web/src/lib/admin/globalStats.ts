import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const QUEST_STATUSES = [
  'pending',
  'accepted',
  'completed',
  'rejected',
  'replaced',
  'abandoned',
] as const;

export type ShopMetricsMode = 'eur' | 'qc';

export type GlobalStatsPayload = {
  from: string;
  to: string;
  dayLabels: string[];
  signupsPerDay: number[];
  signupsCumulativeEndOfDay: number[];
  questsByStatusPerDay: Array<Record<(typeof QUEST_STATUSES)[number], number>>;
  questsTotalsInRange: Record<string, number>;
  /** Mode demandé pour la boutique (voir séries ci-dessous). */
  shopMode: ShopMetricsMode;
  /**
   * EUR : centimes d'argent réel par jour (Stripe uniquement : `amount_cents > 0`).
   * QC : Quest Coins dépensés par jour (achats `coin_purchase` payés).
   */
  shopPrimaryPerDay: number[];
  /** EUR : total centimes réels. QC : total QC dépensés sur la période. */
  shopTotalPrimary: number;
  /** Nombre de transactions payées comptées dans la série (EUR ou QC selon le mode). */
  shopPaidTransactionCount: number;
  /** EUR : montants en centimes par SKU. QC : QC dépensés par SKU. */
  shopBySku: { sku: string; label: string; count: number; amount: number }[];
};

function enumerateDaysUtc(fromStr: string, toStr: string): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const y = fy;
  const m = fm;
  const d = fd;
  const end = new Date(Date.UTC(ty, tm - 1, td));
  let cur = new Date(Date.UTC(y, m - 1, d));
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 1));
  }
  return out;
}

function rangeFromPreset(days: number): { fromStr: string; toStr: string; from: Date; toExclusive: Date } {
  const end = new Date();
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));
  const startDay = new Date(endDay);
  startDay.setUTCDate(startDay.getUTCDate() - (days - 1));
  startDay.setUTCHours(0, 0, 0, 0);
  const toExclusive = new Date(endDay);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  toExclusive.setUTCHours(0, 0, 0, 0);
  return {
    fromStr: startDay.toISOString().slice(0, 10),
    toStr: endDay.toISOString().slice(0, 10),
    from: startDay,
    toExclusive,
  };
}

function parseIsoDay(s: string | null): string | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return null;
  return s.trim();
}

/**
 * Agrégations pour la console admin (PostgreSQL).
 */
export async function buildGlobalStats(searchParams: URLSearchParams): Promise<GlobalStatsPayload> {
  const customFrom = parseIsoDay(searchParams.get('from'));
  const customTo = parseIsoDay(searchParams.get('to'));
  const presetDays = Math.min(730, Math.max(1, Number.parseInt(searchParams.get('days') ?? '30', 10) || 30));
  const shopMode: ShopMetricsMode = searchParams.get('shopMode') === 'qc' ? 'qc' : 'eur';

  let fromStr: string;
  let toStr: string;
  let from: Date;
  let toExclusive: Date;

  if (customFrom && customTo && customFrom <= customTo) {
    fromStr = customFrom;
    toStr = customTo;
    from = new Date(`${customFrom}T00:00:00.000Z`);
    const end = new Date(`${customTo}T23:59:59.999Z`);
    toExclusive = new Date(end);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    toExclusive.setUTCHours(0, 0, 0, 0);
  } else {
    const r = rangeFromPreset(presetDays);
    fromStr = r.fromStr;
    toStr = r.toStr;
    from = r.from;
    toExclusive = r.toExclusive;
  }

  const dayLabels = enumerateDaysUtc(fromStr, toStr);
  const n = dayLabels.length;
  const idx = new Map(dayLabels.map((d, i) => [d, i]));

  const signupsPerDay = new Array(n).fill(0);
  const signupsRows = await prisma.$queryRaw<Array<{ day: Date; c: bigint }>>(
    Prisma.sql`
      SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*)::bigint AS c
      FROM profiles
      WHERE created_at >= ${from} AND created_at < ${toExclusive}
      GROUP BY 1
      ORDER BY 1
    `,
  );
  for (const row of signupsRows) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    const i = idx.get(key);
    if (i !== undefined) signupsPerDay[i] = Number(row.c);
  }

  const beforeCount = await prisma.profile.count({
    where: { createdAt: { lt: from } },
  });

  const signupsCumulativeEndOfDay: number[] = [];
  let run = beforeCount;
  for (let i = 0; i < n; i++) {
    run += signupsPerDay[i];
    signupsCumulativeEndOfDay.push(run);
  }

  const statusMatrix: Record<(typeof QUEST_STATUSES)[number], number[]> = {
    pending: new Array(n).fill(0),
    accepted: new Array(n).fill(0),
    completed: new Array(n).fill(0),
    rejected: new Array(n).fill(0),
    replaced: new Array(n).fill(0),
    abandoned: new Array(n).fill(0),
  };

  const questRows = await prisma.$queryRaw<Array<{ quest_date: string; status: string; c: bigint }>>(
    Prisma.sql`
      SELECT quest_date, status::text AS status, COUNT(*)::bigint AS c
      FROM quest_logs
      WHERE quest_date >= ${fromStr} AND quest_date <= ${toStr}
      GROUP BY quest_date, status
    `,
  );

  const questsTotalsInRange: Record<string, number> = {
    pending: 0,
    accepted: 0,
    completed: 0,
    rejected: 0,
    replaced: 0,
    abandoned: 0,
  };

  for (const row of questRows) {
    const st = row.status as (typeof QUEST_STATUSES)[number];
    if (!QUEST_STATUSES.includes(st)) continue;
    const i = idx.get(row.quest_date);
    const c = Number(row.c);
    if (i !== undefined) {
      statusMatrix[st][i] += c;
    }
    questsTotalsInRange[st] = (questsTotalsInRange[st] ?? 0) + c;
  }

  const questsByStatusPerDay = dayLabels.map((_, i) => {
    const byStatus = {} as Record<(typeof QUEST_STATUSES)[number], number>;
    for (const st of QUEST_STATUSES) {
      byStatus[st] = statusMatrix[st][i];
    }
    return byStatus;
  });

  const shopPrimaryPerDay = new Array(n).fill(0);
  let shopTotalPrimary = 0;
  let shopPaidTransactionCount = 0;

  if (shopMode === 'eur') {
    const revRows = await prisma.$queryRaw<Array<{ day: Date; cents: bigint; tx: bigint }>>(
      Prisma.sql`
        SELECT
          (created_at AT TIME ZONE 'UTC')::date AS day,
          COALESCE(SUM(CASE WHEN status = 'paid' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0)::bigint AS cents,
          COUNT(*) FILTER (WHERE status = 'paid' AND amount_cents > 0)::bigint AS tx
        FROM shop_transactions
        WHERE created_at >= ${from} AND created_at < ${toExclusive}
        GROUP BY 1
        ORDER BY 1
      `,
    );

    for (const row of revRows) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      const i = idx.get(key);
      const cents = Number(row.cents);
      const tx = Number(row.tx);
      if (i !== undefined) {
        shopPrimaryPerDay[i] = cents;
      }
      shopTotalPrimary += cents;
      shopPaidTransactionCount += tx;
    }

    const skuRows = await prisma.$queryRaw<Array<{ primary_sku: string; label: string; c: bigint; cents: bigint }>>(
      Prisma.sql`
        SELECT primary_sku, label, COUNT(*)::bigint AS c,
          COALESCE(SUM(amount_cents), 0)::bigint AS cents
        FROM shop_transactions
        WHERE created_at >= ${from} AND created_at < ${toExclusive}
          AND status = 'paid'
          AND amount_cents > 0
        GROUP BY primary_sku, label
        ORDER BY cents DESC
      `,
    );

    const shopBySku = skuRows.map((r) => ({
      sku: r.primary_sku,
      label: r.label,
      count: Number(r.c),
      amount: Number(r.cents),
    }));

    return {
      from: fromStr,
      to: toStr,
      dayLabels,
      signupsPerDay,
      signupsCumulativeEndOfDay,
      questsByStatusPerDay,
      questsTotalsInRange,
      shopMode,
      shopPrimaryPerDay,
      shopTotalPrimary,
      shopPaidTransactionCount,
      shopBySku,
    };
  }

  const qcRows = await prisma.$queryRaw<Array<{ day: Date; coins: bigint; tx: bigint }>>(
    Prisma.sql`
      SELECT
        (created_at AT TIME ZONE 'UTC')::date AS day,
        COALESCE(SUM(CASE
          WHEN status = 'paid' AND entry_kind = 'coin_purchase' AND coins_delta IS NOT NULL
          THEN ABS(coins_delta)
          ELSE 0
        END), 0)::bigint AS coins,
        COUNT(*) FILTER (
          WHERE status = 'paid' AND entry_kind = 'coin_purchase'
        )::bigint AS tx
      FROM shop_transactions
      WHERE created_at >= ${from} AND created_at < ${toExclusive}
      GROUP BY 1
      ORDER BY 1
    `,
  );

  for (const row of qcRows) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    const i = idx.get(key);
    const coins = Number(row.coins);
    const tx = Number(row.tx);
    if (i !== undefined) {
      shopPrimaryPerDay[i] = coins;
    }
    shopTotalPrimary += coins;
    shopPaidTransactionCount += tx;
  }

  const skuRowsQc = await prisma.$queryRaw<Array<{ primary_sku: string; label: string; c: bigint; coins: bigint }>>(
    Prisma.sql`
      SELECT primary_sku, label, COUNT(*)::bigint AS c,
        COALESCE(SUM(ABS(coins_delta)), 0)::bigint AS coins
      FROM shop_transactions
      WHERE created_at >= ${from} AND created_at < ${toExclusive}
        AND status = 'paid'
        AND entry_kind = 'coin_purchase'
      GROUP BY primary_sku, label
      ORDER BY coins DESC
    `,
  );

  const shopBySku = skuRowsQc.map((r) => ({
    sku: r.primary_sku,
    label: r.label,
    count: Number(r.c),
    amount: Number(r.coins),
  }));

  return {
    from: fromStr,
    to: toStr,
    dayLabels,
    signupsPerDay,
    signupsCumulativeEndOfDay,
    questsByStatusPerDay,
    questsTotalsInRange,
    shopMode,
    shopPrimaryPerDay,
    shopTotalPrimary,
    shopPaidTransactionCount,
    shopBySku,
  };
}
