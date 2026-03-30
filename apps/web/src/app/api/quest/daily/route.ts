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
  REFINEMENT_SCHEMA_VERSION,
  refinementAnswersToCategoryBias,
  parseValidRefinementAnswers,
  buildRefinementContextForPrompt,
  isValidReportDeferredDate,
  isValidQuestDateIso,
  getQuestCalendarDateNow,
} from '@questia/shared';
import type {
  AppLocale,
  EscalationPhase,
  ExplorerAxis,
  RiskAxis,
  PersonalityVector,
  PsychologicalCategory,
  QuestLog,
} from '@questia/shared';
import { generateDailyQuest } from '@/lib/actions/ai';
import { getQuestContext } from '@/lib/actions/weather';
import { geocodeNominatim, shortenDisplayName } from '@/lib/geocode';
import { Prisma } from '@prisma/client';
import { parseAppLocaleFromRequest } from '@/lib/requestLocale';
import { badgeIdsSet, parseBadgesEarned, serializeBadges } from '@/lib/progression';
import { parseStringArray } from '@/lib/shop/parse';
import { getNarrationDirectiveForPack } from '@/lib/narrationPack';
import { getRefinementSurveyPayload } from '@/lib/refinementPayload';

export const dynamic = 'force-dynamic';

/** Relances successives : cumul des archétypes déjà proposés (JSON + ancienne colonne seule). */
function parseRerollExcludedArchetypeIds(profile: {
  rerollExcludeArchetypeId: number | null;
  rerollExcludeArchetypeIds?: Prisma.JsonValue | null;
}): number[] {
  const raw = profile.rerollExcludeArchetypeIds;
  const fromJson = Array.isArray(raw)
    ? raw.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
    : [];
  const legacy = profile.rerollExcludeArchetypeId != null ? [profile.rerollExcludeArchetypeId] : [];
  return Array.from(new Set([...legacy, ...fromJson]));
}

function mergeRerollExcludedArchetypeIds(
  profile: { rerollExcludeArchetypeId: number | null; rerollExcludeArchetypeIds?: Prisma.JsonValue | null },
  archetypeId: number,
): number[] {
  return Array.from(new Set([...parseRerollExcludedArchetypeIds(profile), archetypeId]));
}

/** Moins on retombe sur le même « thème » (catégorie psychologique) après plusieurs relances. */
function buildCategoryPenaltyFromExcludedIds(
  excludedIds: number[],
): Partial<Record<PsychologicalCategory, number>> {
  const penalty: Partial<Record<PsychologicalCategory, number>> = {};
  for (const id of excludedIds) {
    const q = QUEST_TAXONOMY.find((x) => x.id === id);
    if (!q) continue;
    penalty[q.category] = (penalty[q.category] ?? 0) + 0.18;
  }
  return penalty;
}

/** Libellés génériques renvoyés par le modèle ou des prompts — à ignorer au profit du géocodage. */
function isPlaceholderDestinationLabel(s: string): boolean {
  const t = s.trim().toLowerCase();
  if (t.length < 2) return true;
  if (t === 'lieu de la quête' || t === 'nom court du lieu' || t === 'lieu') return true;
  if (/^nom (court )?du lieu$/i.test(t)) return true;
  if (/^lieu (public|de la quête|suggéré)$/i.test(t)) return true;
  return false;
}

/** Évite d’afficher « null » / « undefined » (JSON ou bugs modèle). */
function sanitizeDestinationLabelForStorage(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  if (!t || /^null$/i.test(t) || /^undefined$/i.test(t)) return null;
  return t;
}

/**
 * Mission qui évoque un déplacement large ou une autre zone : recherche géo moins contrainte
 * (viewbox plus large ; le fallback sans viewbox reste possible).
 */
function inferWideDestinationSearch(mission: string): boolean {
  const m = mission.toLowerCase();
  return (
    /\b(autre ville|autre région|autre commune|ailleurs|loin|voyage|explorer loin|déplacement|km|kilomètre|kilometre|pays|hors de la ville|autre département)\b/i.test(
      m,
    ) || /\b(road trip|week-end|weekend)\b/i.test(m)
  );
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

function progressionPayload(profile: { totalXp: number; badgesEarned: unknown }, locale: AppLocale) {
  const safe = Math.max(0, Math.floor(profile.totalXp ?? 0));
  return {
    totalXp: safe,
    ...levelFromTotalXp(safe),
    badges: serializeBadges(profile.badgesEarned, locale),
    badgeCatalog: getBadgeCatalogForUi(profile.badgesEarned, locale),
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const url = new URL(request.url);
  const questLocale = parseAppLocaleFromRequest(request);
  const lat = url.searchParams.get('lat') ? parseFloat(url.searchParams.get('lat')!) : undefined;
  const lon = url.searchParams.get('lon') ? parseFloat(url.searchParams.get('lon')!) : undefined;
  const requestedQuestDate = url.searchParams.get('questDate') ?? url.searchParams.get('date');
  if (requestedQuestDate && !isValidQuestDateIso(requestedQuestDate)) {
    return NextResponse.json(
      { error: 'Paramètre questDate invalide (format AAAA-MM-JJ attendu).' },
      { status: 400 },
    );
  }

  // Get profile
  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable. Complète l\'onboarding.' }, { status: 404 });

  const completedQuestCount = await prisma.questLog.count({
    where: { profileId: profile.id, status: 'completed' },
  });
  const refinementSurvey = getRefinementSurveyPayload(
    {
      currentDay: profile.currentDay,
      refinementSchemaVersion: profile.refinementSchemaVersion ?? 0,
      refinementSkippedAt: profile.refinementSkippedAt ?? null,
    },
    completedQuestCount,
  );

  const today = getQuestCalendarDateNow();

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
      ...toQuestResponse(historical, profile),
      fromCache: true,
      day: profile.currentDay,
      streak: profile.streakCount,
      phase: profile.currentPhase,
      deferredSocialUntil: profile.deferredSocialUntil ?? null,
      ...shopClientPayload(profile),
      progression: progressionPayload(profile, questLocale),
      refinement: refinementSurvey,
      ...(context ? { context } : {}),
    });
  }

  // ── Check if quest already generated today ──────────────────────────────────
  const existing = await prisma.questLog.findUnique({
    where: { profileId_questDate: { profileId: profile.id, questDate: today } },
  });

  if (existing) {
    return NextResponse.json({
      ...toQuestResponse(existing, profile),
      fromCache: true,
      day: profile.currentDay,
      streak: profile.streakCount,
      phase: profile.currentPhase,
      deferredSocialUntil: profile.deferredSocialUntil ?? null,
      ...shopClientPayload(profile),
      progression: progressionPayload(profile, questLocale),
      refinement: refinementSurvey,
    });
  }

  // ── Generate a new quest ────────────────────────────────────────────────────

  // Get weather + location context
  const context = await getQuestContext(lat, lon);
  /** Sans GPS : pas d’archétype extérieur ni de lieu nommé / carte */
  const allowOutdoorQuests = context.isOutdoorFriendly && context.hasUserLocation;

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
  /** Après relance/report, les archétypes déjà proposés aujourd’hui ne sont plus dans l’historique BDD — on les cumule ici. */
  const extraExclude = parseRerollExcludedArchetypeIds(profile);
  const recentIdsForSelect = Array.from(new Set([...recentIds, ...extraExclude]));
  const categoryRerollPenalty = buildCategoryPenaltyFromExcludedIds(extraExclude);

  const storedRefinementAnswers =
    (profile.refinementSchemaVersion ?? 0) >= REFINEMENT_SCHEMA_VERSION
      ? parseValidRefinementAnswers(profile.refinementAnswers)
      : null;
  const categoryBias = refinementAnswersToCategoryBias(storedRefinementAnswers);
  const refinementContext = buildRefinementContextForPrompt(storedRefinementAnswers);

  const instantOnly = profile.flagNextQuestInstantOnly === true;
  /** Chaque relance a une graine distincte (liste d’archétypes exclus cumulés). */
  const regenTier =
    profile.flagNextQuestAfterReroll === true
      ? `reroll:${extraExclude.slice().sort((a, b) => a - b).join(',')}`
      : 'first';

  // Select archetype via moteur Delta de congruence (+ biais questionnaire)
  let archetype = selectQuest(
    declaredPersonality,
    effectivePhase,
    recentIdsForSelect,
    allowOutdoorQuests,
    categoryBias,
    instantOnly,
    {
      exhibited,
      congruenceDelta,
      selectionSeed: `${profile.id}:${today}:${effectivePhase}:${profile.currentDay}:${regenTier}`,
      diversityWindow: 7,
      categoryScorePenalty: categoryRerollPenalty,
    },
  );

  if (!archetype && instantOnly) {
    const pool = QUEST_TAXONOMY.filter(
      (q) =>
        q.questPace === 'instant' &&
        !recentIdsForSelect.includes(q.id) &&
        (allowOutdoorQuests || !q.requiresOutdoor),
    );
    archetype =
      pool[0] ??
      QUEST_TAXONOMY.find((q) => q.id === FALLBACK_QUEST_ID) ??
      QUEST_TAXONOMY[0] ??
      null;
  }

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

  // Generate the quest via OpenAI (phase effective + delta calculés = alignés avec le choix d’archétype)
  const generated = await generateDailyQuest(
    {
      phase: effectivePhase,
      day: profile.currentDay,
      congruenceDelta,
      explorerAxis: profile.explorerAxis as ExplorerAxis,
      riskAxis: profile.riskAxis as RiskAxis,
      questDateIso: today,
      generationSeed: `${profile.id}:${today}:${effectivePhase}:${regenTier}`,
      narrationDirective,
      declaredPersonality,
      exhibitedPersonality: exhibited,
      isRerollGeneration: profile.flagNextQuestAfterReroll === true,
      substitutedInstantAfterDefer: instantOnly,
      refinementContext,
      locale: questLocale,
    },
    archetype,
    context,
  );

  let destinationLabel: string | null = null;
  let destinationLat: number | null = null;
  let destinationLon: number | null = null;
  if (generated.isOutdoor && context.hasUserLocation) {
    let rawLabel = generated.destinationLabel?.trim() || null;
    if (rawLabel && isPlaceholderDestinationLabel(rawLabel)) {
      rawLabel = null;
    }
    rawLabel = sanitizeDestinationLabelForStorage(rawLabel);
    const area = [context.city, context.country].filter(Boolean).join(', ') || 'France';
    const searchQuery =
      sanitizeDestinationLabelForStorage(generated.destinationQuery?.trim()) ||
      (rawLabel ? `${rawLabel}, ${area}` : area);
    const wideSearch = inferWideDestinationSearch(generated.mission);
    const viewboxDeltaDeg = wideSearch ? 1.05 : 0.32;
    const geo = await geocodeNominatim(searchQuery, {
      nearLat: lat,
      nearLon: lon,
      viewboxDeltaDeg,
    });
    const cityFallback = context.city !== 'ta ville' ? context.city : null;
    if (geo) {
      destinationLat = geo.lat;
      destinationLon = geo.lon;
      destinationLabel =
        rawLabel ??
        (geo.displayName ? shortenDisplayName(geo.displayName) : null) ??
        cityFallback ??
        'Lieu suggéré';
    } else {
      destinationLabel = rawLabel ?? cityFallback ?? 'Lieu suggéré';
    }
    destinationLabel = sanitizeDestinationLabelForStorage(destinationLabel) ?? 'Lieu suggéré';
  }

  // Compute updated day and phase progression
  const lastDate = profile.lastQuestDate;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const isSameDayRegen = lastDate === today;
  const isConsecutive = lastDate === yesterdayStr;
  const newStreak = isSameDayRegen
    ? profile.streakCount
    : isConsecutive
      ? profile.streakCount + 1
      : 1;
  const newDay = profile.currentDay + (lastDate !== today ? 1 : 0);
  const newPhase: EscalationPhase = newDay <= 3 ? 'calibration' : newDay <= 10 ? 'expansion' : 'rupture';

  const assignAfterReroll = profile.flagNextQuestAfterReroll;

  // Après relance/report, le POST a déjà décrémenté les relances — ne pas remettre 1 ici (sinon l’UI reste bloquée à 1/2).
  const rerollsAfterQuestCreate = assignAfterReroll ? profile.rerollsRemaining : 1;

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
        locationCity:       context.hasUserLocation ? context.city : null,
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
        rerollsRemaining: rerollsAfterQuestCreate,
        congruenceDelta:  congruenceDelta,
        flagNextQuestAfterReroll: false,
        flagNextQuestInstantOnly: false,
        rerollExcludeArchetypeId: null,
        rerollExcludeArchetypeIds: [],
      },
    }),
  ]);

  const freshProfile = await prisma.profile.findUnique({ where: { id: profile.id } });
  const p = freshProfile ?? profile;

  return NextResponse.json({
    ...toQuestResponse(questLog, p),
    fromCache: false,
    day: newDay,
    streak: newStreak,
    phase: newPhase,
    deferredSocialUntil: p.deferredSocialUntil ?? null,
    context,
    ...shopClientPayload(p),
    progression: progressionPayload(p, questLocale),
    refinement: getRefinementSurveyPayload(
      {
        currentDay: newDay,
        refinementSchemaVersion: p.refinementSchemaVersion ?? 0,
        refinementSkippedAt: p.refinementSkippedAt ?? null,
      },
      completedQuestCount,
    ),
  }, { status: 201 });
}

// ── POST: accept the quest OR reroll ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const questLocale = parseAppLocaleFromRequest(request);

  const body = await request.json().catch(() => ({})) as {
    questDate?: string;
    safetyConsentGiven?: boolean;
    action?: 'reroll' | 'replace' | 'complete' | 'abandon' | 'report';
    deferredUntil?: string;
  };

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const today = body.questDate ?? getQuestCalendarDateNow();

  // ── Report: relance + quête instantanée + date de reprise (consomme une relance) ──
  if (body.action === 'report') {
    const deferredUntil = typeof body.deferredUntil === 'string' ? body.deferredUntil.trim() : '';
    if (!isValidReportDeferredDate(deferredUntil, today)) {
      return NextResponse.json(
        {
          error: `Choisis une date entre aujourd’hui et ${today} + 14 jours (format AAAA-MM-JJ).`,
        },
        { status: 400 },
      );
    }

    const existing = await prisma.questLog.findUnique({
      where: { profileId_questDate: { profileId: profile.id, questDate: today } },
    });
    if (!existing || existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Reporter n’est possible que tant que la quête n’est pas acceptée.' },
        { status: 400 },
      );
    }

    const reportArchetype = QUEST_TAXONOMY.find((q) => q.id === existing.archetypeId);
    if (!reportArchetype || reportArchetype.questPace === 'instant') {
      return NextResponse.json(
        {
          error:
            'Reporter sert à échanger une quête « à caler » contre une mission courte. Pour une autre quête du jour, utilise « Changer de quête ».',
        },
        { status: 400 },
      );
    }

    const daily = profile.rerollsRemaining;
    const bonus = profile.bonusRerollCredits ?? 0;

    if (daily <= 0 && bonus <= 0) {
      return NextResponse.json(
        { error: 'Plus de relances disponibles. La boutique propose des packs de relances bonus.' },
        { status: 400 },
      );
    }

    const excludeArchetypeId = existing.archetypeId;
    const mergedExclude = mergeRerollExcludedArchetypeIds(profile, excludeArchetypeId);

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
                flagNextQuestInstantOnly: true,
                deferredSocialUntil: deferredUntil,
                rerollExcludeArchetypeId: null,
                rerollExcludeArchetypeIds: mergedExclude,
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
                flagNextQuestInstantOnly: true,
                deferredSocialUntil: deferredUntil,
                rerollExcludeArchetypeId: null,
                rerollExcludeArchetypeIds: mergedExclude,
              },
            });
          });

    return NextResponse.json({
      reported: true,
      deferredUntil,
      ...shopClientPayload(updatedProfile),
      progression: progressionPayload(updatedProfile, questLocale),
      deferredSocialUntil: updatedProfile.deferredSocialUntil ?? null,
    });
  }

  // ── Abandon: sans pénalité XP — série remise à zéro ────────────────────────
  if (body.action === 'abandon') {
    const existing = await prisma.questLog.findUnique({
      where: { profileId_questDate: { profileId: profile.id, questDate: today } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Aucune quête pour cette date.' }, { status: 404 });
    }
    if (existing.status === 'completed' || existing.status === 'abandoned') {
      return NextResponse.json(
        { error: existing.status === 'completed' ? 'Quête déjà validée.' : 'Quête déjà passée.' },
        { status: 400 },
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.questLog.update({
        where: { profileId_questDate: { profileId: profile.id, questDate: today } },
        data: { status: 'abandoned' },
      }),
      prisma.profile.update({
        where: { id: profile.id },
        data: {
          streakCount: 0,
          deferredSocialUntil: null,
        },
      }),
    ]);

    const profileAfter = await prisma.profile.findUnique({ where: { id: profile.id } });
    const p = profileAfter ?? profile;

    return NextResponse.json({
      ...toQuestResponse(updated, p),
      abandoned: true,
      streak: p.streakCount,
      deferredSocialUntil: null,
      ...shopClientPayload(p),
      progression: progressionPayload(p, questLocale),
    });
  }

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

    const excludeArchetypeId = existing.archetypeId;
    const mergedExclude = mergeRerollExcludedArchetypeIds(profile, excludeArchetypeId);

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
                rerollExcludeArchetypeId: null,
                rerollExcludeArchetypeIds: mergedExclude,
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
                rerollExcludeArchetypeId: null,
                rerollExcludeArchetypeIds: mergedExclude,
              },
            });
          });

    return NextResponse.json({
      rerolled: true,
      ...shopClientPayload(updatedProfile),
      progression: progressionPayload(updatedProfile, questLocale),
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
    if (existing.status === 'abandoned') {
      return NextResponse.json({ error: 'Cette quête a été passée.' }, { status: 400 });
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
          deferredSocialUntil: null,
        } as unknown as Prisma.ProfileUpdateInput,
      }),
    ]);

    const prog = progressionPayload(profileAfter, questLocale);
    const badgesUnlocked = serializeBadges(
      newBadges.map((b) => ({ id: b.id, unlockedAt: b.unlockedAt })),
      questLocale,
    );

    return NextResponse.json({
      ...toQuestResponse(updated, profileAfter),
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
  if (logForAccept.status === 'abandoned') {
    return NextResponse.json({ error: 'Cette quête a été passée. Demain une nouvelle carte t’attend.' }, { status: 400 });
  }
  if (logForAccept.status === 'accepted') {
    return NextResponse.json({
      ...toQuestResponse(logForAccept, profile),
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
    ...toQuestResponse(updated, profile),
    ...shopClientPayload(profile),
  });
}

// ── Helper: shape the response ─────────────────────────────────────────────────

function toQuestResponse(
  log: {
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
  },
  profile?: { deferredSocialUntil?: string | null } | null,
) {
  const archetype = QUEST_TAXONOMY.find((q) => q.id === log.archetypeId);
  const hasCoords =
    log.destinationLat != null &&
    log.destinationLon != null &&
    Number.isFinite(log.destinationLat) &&
    Number.isFinite(log.destinationLon);
  const storedLabel = sanitizeDestinationLabelForStorage(log.destinationLabel);
  const destination =
    log.isOutdoor && hasCoords
      ? {
          label: storedLabel ?? 'Lieu sur la carte',
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
    questPace: archetype?.questPace ?? 'instant',
    deferredSocialUntil: profile?.deferredSocialUntil ?? null,
  };
}
