import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { QUADRANT_DEFAULTS, getBadgeCatalogForUi, getThemeIds, TITLE_IDS } from '@questia/shared';
import type { ExplorerAxis, RiskAxis } from '@questia/shared';
import { parseAppLocaleFromRequest } from '@/lib/requestLocale';
import { progressionFields, serializeBadges } from '@/lib/progression';
import { parseStringArray } from '@/lib/shop/parse';
import { isValidIanaTimeZone } from '@/lib/reminders/time';

function shopPayload(profile: {
  rerollsRemaining: number;
  bonusRerollCredits: number;
  activeThemeId: string;
  ownedThemes: unknown;
  ownedNarrationPacks: unknown;
  activeNarrationPackId: string | null;
  coinBalance?: number | null;
  ownedTitleIds?: unknown;
  equippedTitleId?: string | null;
  xpBonusCharges?: number | null;
}) {
  const ownedNarrationPacks = parseStringArray(profile.ownedNarrationPacks);
  const activePack = profile.activeNarrationPackId;
  const narrationActive =
    activePack && ownedNarrationPacks.includes(activePack) ? activePack : null;
  const ownedTitles = parseStringArray(profile.ownedTitleIds);
  let equipped = profile.equippedTitleId ?? null;
  if (equipped && !ownedTitles.includes(equipped)) equipped = null;
  return {
    coinBalance: profile.coinBalance ?? 0,
    rerollsRemaining: profile.rerollsRemaining,
    bonusRerollCredits: profile.bonusRerollCredits ?? 0,
    activeThemeId: profile.activeThemeId ?? 'default',
    ownedThemes: parseStringArray(profile.ownedThemes),
    ownedNarrationPacks,
    activeNarrationPackId: narrationActive,
    ownedTitleIds: ownedTitles,
    equippedTitleId: equipped,
    xpBonusCharges: profile.xpBonusCharges ?? 0,
  };
}

/** GET /api/profile — returns the current user's profile + progression (XP, badges) */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const locale = parseAppLocaleFromRequest(request);

  const profile = await prisma.profile.findUnique({
    where: { clerkId: userId },
  });

  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  const totalXp = profile.totalXp ?? 0;
  return NextResponse.json({
    ...profile,
    shop: shopPayload(profile),
    progression: {
      ...progressionFields(totalXp),
      badges: serializeBadges(profile.badgesEarned, locale),
      badgeCatalog: getBadgeCatalogForUi(profile.badgesEarned, locale),
    },
  });
}

/** PATCH /api/profile — thème actif & pack narration (contenu boutique) */
export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const locale = parseAppLocaleFromRequest(request);

  const body = await request.json().catch(() => ({})) as {
    activeThemeId?: string;
    activeNarrationPackId?: string | null;
    equippedTitleId?: string | null;
    reminderPushEnabled?: boolean;
    reminderEmailEnabled?: boolean;
    reminderTimeMinutes?: number;
    reminderTimezone?: string;
  };

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const ownedThemes = parseStringArray(profile.ownedThemes);
  const ownedPacks = parseStringArray(profile.ownedNarrationPacks);
  const ownedTitles = parseStringArray((profile as { ownedTitleIds?: unknown }).ownedTitleIds);
  const allowedThemes = new Set(getThemeIds());
  const allowedTitleIds = new Set(TITLE_IDS);

  const data: {
    activeThemeId?: string;
    activeNarrationPackId?: string | null;
    equippedTitleId?: string | null;
    reminderPushEnabled?: boolean;
    reminderEmailEnabled?: boolean;
    reminderTimeMinutes?: number;
    reminderTimezone?: string;
  } = {};

  if (body.activeThemeId !== undefined) {
    const tid = body.activeThemeId.trim();
    if (!allowedThemes.has(tid)) {
      return NextResponse.json({ error: 'Thème inconnu' }, { status: 400 });
    }
    if (!ownedThemes.includes(tid)) {
      return NextResponse.json({ error: 'Tu ne possèdes pas ce thème' }, { status: 400 });
    }
    data.activeThemeId = tid;
  }

  if (body.activeNarrationPackId !== undefined) {
    if (body.activeNarrationPackId === null || body.activeNarrationPackId === '') {
      data.activeNarrationPackId = null;
    } else {
      const pid = String(body.activeNarrationPackId).trim();
      if (!ownedPacks.includes(pid)) {
        return NextResponse.json({ error: 'Tu ne possèdes pas ce pack narration' }, { status: 400 });
      }
      data.activeNarrationPackId = pid;
    }
  }

  if (body.equippedTitleId !== undefined) {
    if (body.equippedTitleId === null || body.equippedTitleId === '') {
      data.equippedTitleId = null;
    } else {
      const tid = String(body.equippedTitleId).trim();
      if (!allowedTitleIds.has(tid)) {
        return NextResponse.json({ error: 'Titre inconnu' }, { status: 400 });
      }
      if (!ownedTitles.includes(tid)) {
        return NextResponse.json({ error: 'Tu ne possèdes pas ce titre' }, { status: 400 });
      }
      data.equippedTitleId = tid;
    }
  }

  if (body.reminderPushEnabled !== undefined) {
    data.reminderPushEnabled = Boolean(body.reminderPushEnabled);
  }
  if (body.reminderEmailEnabled !== undefined) {
    data.reminderEmailEnabled = Boolean(body.reminderEmailEnabled);
  }
  if (body.reminderTimeMinutes !== undefined) {
    const m = Number(body.reminderTimeMinutes);
    if (!Number.isFinite(m) || m < 0 || m > 1439 || Math.floor(m) !== m) {
      return NextResponse.json({ error: 'Heure invalide (minutes 0–1439)' }, { status: 400 });
    }
    data.reminderTimeMinutes = m;
  }
  if (body.reminderTimezone !== undefined) {
    const tz = String(body.reminderTimezone).trim();
    if (!isValidIanaTimeZone(tz)) {
      return NextResponse.json({ error: 'Fuseau horaire invalide' }, { status: 400 });
    }
    data.reminderTimezone = tz;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: data as unknown as import('@prisma/client').Prisma.ProfileUpdateInput,
  });

  const totalXp = updated.totalXp ?? 0;
  return NextResponse.json({
    ...updated,
    shop: shopPayload(updated),
    progression: {
      ...progressionFields(totalXp),
      badges: serializeBadges(updated.badgesEarned, locale),
      badgeCatalog: getBadgeCatalogForUi(updated.badgesEarned, locale),
    },
  });
}

/** POST /api/profile — get-or-create the current user's profile */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  // Try to find existing profile
  const existing = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (existing) return NextResponse.json(existing);

  // Create new profile from the quadrant passed by the client (from localStorage)
  const body = await request.json().catch(() => ({})) as {
    explorerAxis?: ExplorerAxis;
    riskAxis?: RiskAxis;
  };
  const explorerAxis: ExplorerAxis = body.explorerAxis ?? 'explorer';
  const riskAxis: RiskAxis = body.riskAxis ?? 'risktaker';

  const key = `${explorerAxis}_${riskAxis}` as keyof typeof QUADRANT_DEFAULTS;
  const declaredPersonality = QUADRANT_DEFAULTS[key];

  const profile = await prisma.profile.create({
    data: {
      clerkId: userId,
      explorerAxis,
      riskAxis,
      declaredPersonality: declaredPersonality as unknown as Record<string, number>,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
