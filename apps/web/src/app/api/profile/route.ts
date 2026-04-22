import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  QUADRANT_DEFAULTS,
  applySociabilityAdjustment,
  isValidSociabilityLevel,
  getBadgeCatalogForUi,
  getThemeIds,
  effectiveOwnedThemes,
  TITLE_IDS,
} from '@questia/shared';
import type { ExplorerAxis, RiskAxis, SociabilityLevel } from '@questia/shared';
import { parseAppLocaleFromRequest } from '@/lib/requestLocale';
import { progressionFields, serializeBadges } from '@/lib/progression';
import { parseStringArray } from '@/lib/shop/parse';
import { isValidIanaTimeZone } from '@/lib/reminders/time';
import {
  REMINDER_CADENCES,
  HEAVY_QUEST_PREFERENCES,
  clampQuestDurationBounds,
  type ReminderCadence,
  type HeavyQuestPreference,
} from '@questia/shared';
import { notifyAdminNewUser } from '@/lib/admin/notifyNewUser';

function shopPayload(profile: {
  rerollsRemaining: number;
  bonusRerollCredits: number;
  activeThemeId: string;
  ownedThemes: unknown;
  coinBalance?: number | null;
  ownedTitleIds?: unknown;
  equippedTitleId?: string | null;
  xpBonusCharges?: number | null;
}) {
  const ownedTitles = parseStringArray(profile.ownedTitleIds);
  let equipped = profile.equippedTitleId ?? null;
  if (equipped && !ownedTitles.includes(equipped)) equipped = null;
  return {
    coinBalance: profile.coinBalance ?? 0,
    rerollsRemaining: profile.rerollsRemaining,
    bonusRerollCredits: profile.bonusRerollCredits ?? 0,
    activeThemeId: profile.activeThemeId ?? 'default',
    ownedThemes: parseStringArray(profile.ownedThemes),
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

/** PATCH /api/profile — thème actif & titre (contenu boutique) */
export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const locale = parseAppLocaleFromRequest(request);

  const body = await request.json().catch(() => ({})) as {
    activeThemeId?: string;
    equippedTitleId?: string | null;
    reminderPushEnabled?: boolean;
    reminderEmailEnabled?: boolean;
    reminderTimeMinutes?: number;
    reminderTimezone?: string;
    reminderCadence?: string;
    questDurationMinMinutes?: number;
    questDurationMaxMinutes?: number;
    heavyQuestPreference?: string;
  };

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const ownedThemes = effectiveOwnedThemes(parseStringArray(profile.ownedThemes));
  const ownedTitles = parseStringArray((profile as { ownedTitleIds?: unknown }).ownedTitleIds);
  const allowedThemes = new Set(getThemeIds());
  const allowedTitleIds = new Set(TITLE_IDS);

  const data: {
    activeThemeId?: string;
    equippedTitleId?: string | null;
    reminderPushEnabled?: boolean;
    reminderEmailEnabled?: boolean;
    reminderTimeMinutes?: number;
    reminderTimezone?: string;
    reminderCadence?: ReminderCadence;
    questDurationMinMinutes?: number;
    questDurationMaxMinutes?: number;
    heavyQuestPreference?: HeavyQuestPreference;
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

  if (body.reminderCadence !== undefined) {
    const c = String(body.reminderCadence).trim().toLowerCase();
    if (!(REMINDER_CADENCES as readonly string[]).includes(c)) {
      return NextResponse.json({ error: 'Cadence de rappel invalide' }, { status: 400 });
    }
    data.reminderCadence = c as ReminderCadence;
  }

  if (body.heavyQuestPreference !== undefined) {
    const h = String(body.heavyQuestPreference).trim().toLowerCase();
    if (!(HEAVY_QUEST_PREFERENCES as readonly string[]).includes(h)) {
      return NextResponse.json({ error: 'Préférence quêtes déplacement invalide' }, { status: 400 });
    }
    data.heavyQuestPreference = h as HeavyQuestPreference;
  }

  if (body.questDurationMinMinutes !== undefined || body.questDurationMaxMinutes !== undefined) {
    const curLo = profile.questDurationMinMinutes ?? 5;
    const curHi = profile.questDurationMaxMinutes ?? 1440;
    const nextLo = body.questDurationMinMinutes !== undefined ? body.questDurationMinMinutes : curLo;
    const nextHi = body.questDurationMaxMinutes !== undefined ? body.questDurationMaxMinutes : curHi;
    const { questDurationMinMinutes, questDurationMaxMinutes } = clampQuestDurationBounds(nextLo, nextHi);
    data.questDurationMinMinutes = questDurationMinMinutes;
    data.questDurationMaxMinutes = questDurationMaxMinutes;
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
    sociability?: SociabilityLevel;
  };
  const VALID_EXPLORER: ExplorerAxis[] = ['homebody', 'explorer'];
  const VALID_RISK: RiskAxis[] = ['cautious', 'risktaker'];

  const explorerAxis: ExplorerAxis = VALID_EXPLORER.includes(body.explorerAxis as ExplorerAxis)
    ? body.explorerAxis!
    : 'explorer';
  const riskAxis: RiskAxis = VALID_RISK.includes(body.riskAxis as RiskAxis)
    ? body.riskAxis!
    : 'risktaker';
  const sociability: SociabilityLevel | null =
    isValidSociabilityLevel(body.sociability) ? body.sociability : null;

  const key = `${explorerAxis}_${riskAxis}` as keyof typeof QUADRANT_DEFAULTS;
  const basePersonality = QUADRANT_DEFAULTS[key];
  const declaredPersonality = applySociabilityAdjustment(basePersonality, sociability);

  const profile = await prisma.profile.create({
    data: {
      clerkId: userId,
      explorerAxis,
      riskAxis,
      ...(sociability && { sociability }),
      declaredPersonality: declaredPersonality as unknown as Record<string, number>,
    },
  });

  void notifyAdminNewUser(profile.id, explorerAxis, riskAxis).catch(() => {});

  return NextResponse.json(profile, { status: 201 });
}
