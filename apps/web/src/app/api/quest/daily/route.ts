import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  QUEST_TAXONOMY,
  selectQuest,
  computeExhibitedPersonality,
  computeCongruenceDelta,
  getEffectivePhase,
  FALLBACK_QUEST_ID,
  computeCompletionXp,
  evaluateNewBadges,
  levelFromTotalXp,
  getBadgeCatalogForUi,
  XP_SHOP_BONUS_PER_CHARGE,
} from '@questia/shared';
import type { EscalationPhase, ExplorerAxis, RiskAxis, PersonalityVector, QuestLog } from '@questia/shared';
import { generateDailyQuest } from '@/lib/actions/ai';
import { getQuestContext } from '@/lib/actions/weather';
import { geocodeNominatim } from '@/lib/geocode';
import { Prisma } from '@prisma/client';
import { badgeIdsSet, parseBadgesEarned, serializeBadges } from '@/lib/progression';
import { parseStringArray } from '@/lib/shop/parse';
import { getNarrationDirectiveForPack } from '@/lib/narrationPack';

export const dynamic = 'force-dynamic';

// ── Today's date in YYYY-MM-DD ─────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Champs boutique / relances pour le client (thème, packs, crédits) */
function shopClientPayload(profile: {
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

function progressionPayload(profile: { totalXp: number; badgesEarned: unknown }) {
  const safe = Math.max(0, Math.floor(profile.totalXp ?? 0));
  return {
    totalXp: safe,
    ...levelFromTotalXp(safe),
    badges: serializeBadges(profile.badgesEarned),
    badgeCatalog: getBadgeCatalogForUi(profile.badgesEarned),
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const url = new URL(request.url);
  const lat = url.searchParams.get('lat') ? parseFloat(url.searchParams.get('lat')!) : undefined;
  const lon = url.searchParams.get('lon') ? parseFloat(url.searchParams.get('lon')!) : undefined;
  const requestedQuestDate = url.searchParams.get('questDate') ?? url.searchParams.get('date');

  // Get profile
  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable. Complète l\'onboarding.' }, { status: 404 });

  const today = todayStr();

  // ── Quête d’un autre jour (ex. carte partage / deeplink) ────────────────────
  if (requestedQuestDate && requestedQuestDate !== today) {
    const historical = await prisma.questLog.findUnique({
      where: { profileId_questDate: { profileId: profile.id, questDate: requestedQuestDate } },
    });
    if (!historical) {
      return NextResponse.json({ error: 'Aucune quête pour cette date.' }, { status: 404 });
    }
    const context =
      historical.weatherDescription != null
        ? {
            weatherIcon: '',
            weatherDescription: historical.weatherDescription,
            temp: Math.round(historical.weatherTemp ?? 18),
            city: historical.locationCity ?? '',
          }
        : undefined;
    return NextResponse.json({
      ...toQuestResponse(historical),
      fromCache: true,
      day: profile.currentDay,
      streak: profile.streakCount,
      phase: profile.currentPhase,
      ...shopClientPayload(profile),
      progression: progressionPayload(profile),
      ...(context ? { context } : {}),
    });
  }

  // ── Check if quest already generated today ──────────────────────────────────
  const existing = await prisma.questLog.findUnique({
    where: { profileId_questDate: { profileId: profile.id, questDate: today } },
  });

  if (existing) {
    return NextResponse.json({
      ...toQuestResponse(existing),
      fromCache: true,
      day: profile.currentDay,
      streak: profile.streakCount,
      phase: profile.currentPhase,
      ...shopClientPayload(profile),
      progression: progressionPayload(profile),
    });
  }

  // ── Generate a new quest ────────────────────────────────────────────────────

  // Get weather + location context
  const context = await getQuestContext(lat, lon);

  // Get recent logs for Delta de congruence
  const recentLogs = await prisma.questLog.findMany({
    where: { profileId: profile.id },
    orderBy: { assignedAt: 'desc' },
    take: 14,
    select: { archetypeId: true, status: true },
  });

  const engineLogs: QuestLog[] = recentLogs.map((r) => ({
    id: '',
    userId: profile.clerkId,
    questId: r.archetypeId,
    assignedAt: '',
    status: r.status as QuestLog['status'],
    congruenceDeltaAtAssignment: 0,
    phaseAtAssignment: profile.currentPhase as EscalationPhase,
    wasRerolled: false,
    wasFallback: false,
    safetyConsentGiven: false,
  }));

  const declaredPersonality = profile.declaredPersonality as unknown as PersonalityVector;
  const exhibited = computeExhibitedPersonality(engineLogs);
  const congruenceDelta = computeCongruenceDelta(declaredPersonality, exhibited);
  const effectivePhase = getEffectivePhase(profile.currentDay, engineLogs);
  const recentIds = recentLogs.slice(0, 7).map((r) => r.archetypeId);

  // Select archetype via moteur Delta de congruence
  let archetype = selectQuest(
    declaredPersonality,
    effectivePhase,
    recentIds,
    context.isOutdoorFriendly,
  );

  // Fallback météo si quête extérieure non recommandée
  let wasWeatherFallback = false;
  if (archetype?.requiresOutdoor && !context.isOutdoorFriendly) {
    wasWeatherFallback = true;
    archetype = QUEST_TAXONOMY.find((q) => q.id === (archetype!.fallbackQuestId ?? FALLBACK_QUEST_ID)) ?? archetype;
  }
  if (!archetype) {
    archetype = QUEST_TAXONOMY.find((q) => q.id === FALLBACK_QUEST_ID) ?? QUEST_TAXONOMY[0];
  }

  const ownedPacks = parseStringArray(profile.ownedNarrationPacks);
  const activePack = profile.activeNarrationPackId;
  const narrationDirective =
    activePack && ownedPacks.includes(activePack)
      ? getNarrationDirectiveForPack(activePack)
      : undefined;

  // Generate the quest via OpenAI
  const generated = await generateDailyQuest(
    {
      phase: profile.currentPhase as EscalationPhase,
      day: profile.currentDay,
      delta: profile.congruenceDelta,
      explorerAxis: profile.explorerAxis as ExplorerAxis,
      riskAxis: profile.riskAxis as RiskAxis,
      questDateIso: today,
      narrationDirective,
    },
    archetype,
    context,
  );

  let destinationLabel: string | null = null;
  let destinationLat: number | null = null;
  let destinationLon: number | null = null;
  if (generated.isOutdoor) {
    const rawLabel = generated.destinationLabel?.trim() || null;
    const area = [context.city, context.country].filter(Boolean).join(', ') || 'France';
    const searchQuery =
      generated.destinationQuery?.trim() ||
      (rawLabel ? `${rawLabel}, ${area}` : area);
    destinationLabel = rawLabel ?? (context.city !== 'ta ville' ? context.city : 'Lieu de la quête');
    const geo = await geocodeNominatim(searchQuery);
    if (geo) {
      destinationLat = geo.lat;
      destinationLon = geo.lon;
    }
  }

  // Compute updated day and phase progression
  const lastDate = profile.lastQuestDate;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const isConsecutive = lastDate === yesterdayStr;
  const newStreak = isConsecutive ? profile.streakCount + 1 : 1;
  const newDay = profile.currentDay + (lastDate !== today ? 1 : 0);
  const newPhase: EscalationPhase = newDay <= 3 ? 'calibration' : newDay <= 10 ? 'expansion' : 'rupture';

  const assignAfterReroll = profile.flagNextQuestAfterReroll;

  // Save quest log + update profile atomically
  const [questLog] = await prisma.$transaction([
    prisma.questLog.create({
      data: {
        profileId:          profile.id,
        questDate:          today,
        archetypeId:        archetype.id,
        generatedEmoji:     generated.icon,
        generatedTitle:     generated.title,
        generatedMission:   generated.mission,
        generatedHook:      generated.hook,
        generatedDuration:  generated.duration,
        generatedSafetyNote: generated.safetyNote ?? undefined,
        isOutdoor:          generated.isOutdoor,
        destinationLabel,
        destinationLat,
        destinationLon,
        locationCity:       context.city,
        weatherDescription: context.weatherDescription,
        weatherTemp:        context.temp,
        phaseAtAssignment:  profile.currentPhase as EscalationPhase,
        congruenceDeltaAtTime: profile.congruenceDelta,
        wasRerolled:        assignAfterReroll,
        wasFallback:        wasWeatherFallback,
      },
    }),
    prisma.profile.update({
      where: { id: profile.id },
      data: {
        currentDay:       newDay,
        currentPhase:     newPhase,
        streakCount:      newStreak,
        lastQuestDate:    today,
        rerollsRemaining: 1,
        congruenceDelta:  congruenceDelta,
        flagNextQuestAfterReroll: false,
      },
    }),
  ]);

  const freshProfile = await prisma.profile.findUnique({ where: { id: profile.id } });
  const p = freshProfile ?? profile;

  return NextResponse.json({
    ...toQuestResponse(questLog),
    fromCache: false,
    day: newDay,
    streak: newStreak,
    phase: newPhase,
    context,
    ...shopClientPayload(p),
    progression: progressionPayload(p),
  }, { status: 201 });
}

// ── POST: accept the quest OR reroll ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    questDate?: string;
    safetyConsentGiven?: boolean;
    action?: 'reroll' | 'replace' | 'complete';
  };

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const today = body.questDate ?? todayStr();

  // ── Reroll: relance quotidienne ou crédit bonus (boutique) ──────────────────
  if (body.action === 'reroll' || body.action === 'replace') {
    const existing = await prisma.questLog.findUnique({
      where: { profileId_questDate: { profileId: profile.id, questDate: today } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Aucune quête à relancer.' }, { status: 400 });
    }

    const daily = profile.rerollsRemaining;
    const bonus = profile.bonusRerollCredits ?? 0;

    if (daily <= 0 && bonus <= 0) {
      return NextResponse.json(
        { error: 'Plus de relances disponibles. La boutique propose des packs de relances bonus.' },
        { status: 400 },
      );
    }

    const updatedProfile =
      daily > 0
        ? await prisma.$transaction(async (tx) => {
            await tx.questLog.delete({
              where: { profileId_questDate: { profileId: profile.id, questDate: today } },
            });
            return tx.profile.update({
              where: { id: profile.id },
              data: {
                rerollsRemaining: Math.max(0, daily - 1),
                flagNextQuestAfterReroll: true,
              },
            });
          })
        : await prisma.$transaction(async (tx) => {
            await tx.questLog.delete({
              where: { profileId_questDate: { profileId: profile.id, questDate: today } },
            });
            return tx.profile.update({
              where: { id: profile.id },
              data: {
                bonusRerollCredits: bonus - 1,
                flagNextQuestAfterReroll: true,
              },
            });
          });

    return NextResponse.json({
      rerolled: true,
      ...shopClientPayload(updatedProfile),
      progression: progressionPayload(updatedProfile),
    });
  }

  // ── Complete: quête faite aujourd'hui (après acceptation) ───────────────────
  if (body.action === 'complete') {
    const existing = await prisma.questLog.findUnique({
      where: { profileId_questDate: { profileId: profile.id, questDate: today } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Aucune quête pour cette date.' }, { status: 404 });
    }
    if (existing.status !== 'accepted') {
      return NextResponse.json(
        { error: existing.status === 'completed' ? 'Quête déjà validée.' : 'Accepte la quête avant de la valider.' },
        { status: 400 },
      );
    }

    const completedBefore = await prisma.questLog.count({
      where: { profileId: profile.id, status: 'completed' },
    });
    const outdoorBefore = await prisma.questLog.count({
      where: { profileId: profile.id, status: 'completed', isOutdoor: true },
    });

    const { total: xpGained, breakdown } = computeCompletionXp({
      phaseAtAssignment: existing.phaseAtAssignment as EscalationPhase,
      streakCount: profile.streakCount,
      isOutdoor: existing.isOutdoor,
      explorerAxis: profile.explorerAxis as ExplorerAxis,
      riskAxis: profile.riskAxis as RiskAxis,
      wasRerolled: existing.wasRerolled,
      wasFallback: existing.wasFallback,
    });

    const pShop = profile as { xpBonusCharges?: number | null };
    let xpBonusChargesAfter = pShop.xpBonusCharges ?? 0;
    let shopBonusXp = 0;
    if (xpBonusChargesAfter > 0) {
      shopBonusXp = XP_SHOP_BONUS_PER_CHARGE;
      xpBonusChargesAfter -= 1;
    }
    const totalXpGained = xpGained + shopBonusXp;
    const breakdownWithShop = {
      ...breakdown,
      ...(shopBonusXp > 0 ? { shopBonusXp } : {}),
    };

    const totalCompletions = completedBefore + 1;
    const outdoorCompletions = outdoorBefore + (existing.isOutdoor ? 1 : 0);

    const existingBadgeIds = badgeIdsSet(profile.badgesEarned);
    const newBadges = evaluateNewBadges(existingBadgeIds, {
      totalCompletions,
      outdoorCompletions,
      currentStreak: profile.streakCount,
      currentDay: profile.currentDay,
      currentPhase: profile.currentPhase as EscalationPhase,
      explorerAxis: profile.explorerAxis as ExplorerAxis,
      riskAxis: profile.riskAxis as RiskAxis,
    });

    const priorEarned = parseBadgesEarned(profile.badgesEarned);
    const mergedBadges = [
      ...priorEarned,
      ...newBadges.map((b) => ({ id: b.id, unlockedAt: b.unlockedAt })),
    ];

    const newTotalXp = (profile.totalXp ?? 0) + totalXpGained;

    const [updated, profileAfter] = await prisma.$transaction([
      prisma.questLog.update({
        where: { profileId_questDate: { profileId: profile.id, questDate: today } },
        data: {
          status: 'completed',
          completedAt: new Date(),
          xpAwarded: totalXpGained,
          xpBreakdown: breakdownWithShop as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.profile.update({
        where: { id: profile.id },
        data: {
          totalXp: newTotalXp,
          badgesEarned: mergedBadges as unknown as Prisma.InputJsonValue,
          xpBonusCharges: xpBonusChargesAfter,
        } as unknown as Prisma.ProfileUpdateInput,
      }),
    ]);

    const prog = progressionPayload(profileAfter);
    const badgesUnlocked = serializeBadges(
      newBadges.map((b) => ({ id: b.id, unlockedAt: b.unlockedAt })),
    );

    return NextResponse.json({
      ...toQuestResponse(updated),
      progression: prog,
      ...shopClientPayload(profileAfter),
      xpGain: {
        gained: totalXpGained,
        breakdown: breakdownWithShop,
        previousTotal: profile.totalXp ?? 0,
        newTotal: newTotalXp,
      },
      badgesUnlocked,
    });
  }

  // ── Accept: mark as accepted ─────────────────────────────────────────────────
  const logForAccept = await prisma.questLog.findUnique({
    where: { profileId_questDate: { profileId: profile.id, questDate: today } },
  });
  if (!logForAccept) {
    return NextResponse.json({ error: 'Aucune quête à accepter.' }, { status: 404 });
  }
  if (logForAccept.status === 'completed') {
    return NextResponse.json({ error: 'Quête déjà validée.' }, { status: 400 });
  }
  if (logForAccept.status === 'accepted') {
    return NextResponse.json({
      ...toQuestResponse(logForAccept),
      ...shopClientPayload(profile),
    });
  }

  const { safetyConsentGiven } = body;
  const updated = await prisma.questLog.update({
    where: { profileId_questDate: { profileId: profile.id, questDate: today } },
    data: {
      status: 'accepted',
      safetyConsentGiven: safetyConsentGiven ?? false,
    },
  });

  return NextResponse.json({
    ...toQuestResponse(updated),
    ...shopClientPayload(profile),
  });
}

// ── Helper: shape the response ─────────────────────────────────────────────────

function toQuestResponse(log: {
  questDate: string;
  archetypeId: number;
  generatedEmoji: string;
  generatedTitle: string;
  generatedMission: string;
  generatedHook: string;
  generatedDuration: string;
  generatedSafetyNote: string | null;
  isOutdoor: boolean;
  destinationLabel: string | null;
  destinationLat: number | null;
  destinationLon: number | null;
  locationCity: string | null;
  weatherDescription: string | null;
  weatherTemp: number | null;
  status: string;
  wasRerolled?: boolean;
  wasFallback?: boolean;
  xpAwarded?: number | null;
}) {
  const archetype = QUEST_TAXONOMY.find((q) => q.id === log.archetypeId);
  const destination =
    log.destinationLabel && log.isOutdoor
      ? {
          label: log.destinationLabel,
          lat: log.destinationLat,
          lon: log.destinationLon,
        }
      : null;
  return {
    questDate: log.questDate,
    archetypeId: log.archetypeId,
    archetypeName: archetype?.title ?? '',
    archetypeCategory: archetype?.category ?? '',
    emoji: log.generatedEmoji,
    title: log.generatedTitle,
    mission: log.generatedMission,
    hook: log.generatedHook,
    duration: log.generatedDuration,
    safetyNote: log.generatedSafetyNote,
    isOutdoor: log.isOutdoor,
    destination,
    city: log.locationCity,
    weather: log.weatherDescription,
    weatherTemp: log.weatherTemp,
    status: log.status,
    wasRerolled: log.wasRerolled ?? false,
    wasFallback: log.wasFallback ?? false,
    xpAwarded: log.xpAwarded ?? null,
  };
}
