import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  computeExhibitedPersonality,
  computeCongruenceDelta,
  getEffectivePhase,
  computeCompletionXp,
  evaluateNewBadges,
  levelFromTotalXp,
  getBadgeCatalogForUi,
  XP_SHOP_BONUS_PER_CHARGE,
  REFINEMENT_SCHEMA_VERSION,
  refinementAnswersToCategoryBias,
  parseValidRefinementAnswers,
  buildRefinementContextForPrompt,
  questPackBiasFromOwned,
  isValidReportDeferredDate,
  isValidQuestDateIso,
  getQuestCalendarDateNow,
  getPreviousQuestCalendarDate,
  softUpdateDeclaredPersonality,
  DAILY_FREE_REROLLS,
  DEFAULT_RECENT_EXCLUSION_DAYS,
  selectCandidates,
  isValidSociabilityLevel,
  clampQuestDurationBounds,
  parseHeavyQuestPreference,
  effectiveOwnedThemes,
} from '@questia/shared';
import type {
  AppLocale,
  EscalationPhase,
  ExplorerAxis,
  RiskAxis,
  PersonalityVector,
  ProfileSnapshot,
  QuestLog,
  QuestModel,
  ScoringQuestLog,
  SociabilityLevel,
} from '@questia/shared';
import { generateDailyQuest } from '@/lib/quest-gen/generateQuest';
import type { GenerationHistoryItem } from '@/lib/quest-gen/types';
import { getQuestContext } from '@/lib/actions/weather';
import { geocodeNominatim, shortenDisplayName } from '@/lib/geocode';
import { Prisma } from '@prisma/client';
import { parseAppLocaleFromRequest } from '@/lib/requestLocale';
import { badgeIdsSet, parseBadgesEarned, serializeBadges } from '@/lib/progression';
import { parseStringArray } from '@/lib/shop/parse';
import { getRefinementSurveyPayload } from '@/lib/refinementPayload';
import {
  getQuestTaxonomy,
  getDefaultFallbackArchetypeId,
} from '@/lib/quest-taxonomy/cache';
import { findArchetypeById } from '@/lib/quest-taxonomy/map-prisma';

export const dynamic = 'force-dynamic';

/** Fenêtre d'historique injectée au moteur (sélection + résumé pour le LLM). */
const HISTORY_WINDOW_LOGS = 28;
/** Profondeur d'historique narrée au LLM (pour la variété stylistique). */
const HISTORY_BRIEF_DEPTH = 5;

// ── Helpers profil ───────────────────────────────────────────────────────────

/** Relances successives : cumul des archétypes déjà proposés (JSON + ancienne colonne). */
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

/** Soft-update du profil déclaré durant les premiers jours (fire-and-forget). */
async function trySoftUpdateDeclared(
  profileId: string,
  declared: PersonalityVector,
  currentDay: number,
  archetypeId: number,
  reaction: 'accepted' | 'completed' | 'rejected' | 'abandoned',
  taxMap: Map<number, QuestModel>,
): Promise<void> {
  try {
    const archetype = taxMap.get(archetypeId);
    if (!archetype) return;
    const updated = softUpdateDeclaredPersonality(declared, archetype.category, reaction, currentDay);
    if (!updated) return;
    await prisma.profile.update({
      where: { id: profileId },
      data: { declaredPersonality: updated as unknown as Record<string, number> },
    });
  } catch { /* non-blocking */ }
}

function buildTaxonomyMap(taxonomy: QuestModel[]): Map<number, QuestModel> {
  return new Map(taxonomy.map((q) => [q.id, q]));
}

// ── Helpers génération ───────────────────────────────────────────────────────

/** Libellés génériques renvoyés par le modèle ou des prompts — à ignorer au profit du géocodage. */
function isPlaceholderDestinationLabel(s: string): boolean {
  const t = s.trim().toLowerCase();
  if (t.length < 2) return true;
  if (t === 'lieu de la quête' || t === 'nom court du lieu' || t === 'lieu') return true;
  if (/^nom (court )?du lieu$/i.test(t)) return true;
  if (/^lieu (public|de la quête|suggéré)$/i.test(t)) return true;
  return false;
}

function sanitizeDestinationLabelForStorage(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  if (!t || /^null$/i.test(t) || /^undefined$/i.test(t)) return null;
  return t;
}

/** Mission qui évoque un déplacement large : recherche géo moins contrainte. */
function inferWideDestinationSearch(mission: string): boolean {
  const m = mission.toLowerCase();
  return (
    /\b(autre ville|autre région|autre commune|ailleurs|loin|voyage|explorer loin|déplacement|km|kilomètre|kilometre|pays|hors de la ville|autre département)\b/i.test(
      m,
    ) || /\b(road trip|week-end|weekend)\b/i.test(m)
  );
}

// ── Helpers réponse ──────────────────────────────────────────────────────────

function shopClientPayload(profile: {
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
    ownedThemes: effectiveOwnedThemes(parseStringArray(profile.ownedThemes)),
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

// ── Route GET ────────────────────────────────────────────────────────────────

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

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) {
    return NextResponse.json(
      { error: 'Profil introuvable. Complète l\'onboarding.' },
      { status: 404 },
    );
  }

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
  const cachedTax = await getQuestTaxonomy();

  // ── Quête historique (deeplink / partage) ──────────────────────────────────
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
      ...(await toQuestResponse(historical, profile, cachedTax)),
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

  // ── Cache : quête déjà générée aujourd'hui ─────────────────────────────────
  const existing = await prisma.questLog.findUnique({
    where: { profileId_questDate: { profileId: profile.id, questDate: today } },
  });

  if (existing) {
    return NextResponse.json({
      ...(await toQuestResponse(existing, profile, cachedTax)),
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

  // ── Génération nouvelle quête ──────────────────────────────────────────────
  const context = await getQuestContext(lat, lon);
  const taxonomy = cachedTax;
  if (taxonomy.length === 0) {
    return NextResponse.json(
      { error: 'Aucun archétype publié en base. Exécute npm run db:seed-archetypes (apps/web).' },
      { status: 503 },
    );
  }

  const taxMap = buildTaxonomyMap(taxonomy);
  const fallbackDefault = await getDefaultFallbackArchetypeId();

  // Historique récent : pour le moteur (fenêtre courte) et pour le brief LLM (5 logs détaillés)
  const recentLogRows = await prisma.questLog.findMany({
    where: { profileId: profile.id },
    orderBy: { assignedAt: 'desc' },
    take: HISTORY_WINDOW_LOGS,
    select: {
      archetypeId: true,
      status: true,
      questDate: true,
      generatedTitle: true,
      generatedMission: true,
    },
  });

  const declaredPersonality = profile.declaredPersonality as unknown as PersonalityVector;
  const exhibitedPersonality = computeExhibitedPersonality(
    recentLogRows.map((r) => ({
      id: '',
      userId: profile.clerkId,
      questId: r.archetypeId,
      assignedAt: '',
      questDate: r.questDate,
      status: r.status as QuestLog['status'],
      congruenceDeltaAtAssignment: 0,
      phaseAtAssignment: profile.currentPhase as EscalationPhase,
      wasRerolled: false,
      wasFallback: false,
      safetyConsentGiven: false,
    })),
    taxonomy,
  );
  const congruenceDelta = computeCongruenceDelta(declaredPersonality, exhibitedPersonality);

  const phaseLogs: QuestLog[] = recentLogRows.map((r) => ({
    id: '',
    userId: profile.clerkId,
    questId: r.archetypeId,
    assignedAt: '',
    questDate: r.questDate,
    status: r.status as QuestLog['status'],
    congruenceDeltaAtAssignment: 0,
    phaseAtAssignment: profile.currentPhase as EscalationPhase,
    wasRerolled: false,
    wasFallback: false,
    safetyConsentGiven: false,
  }));
  const effectivePhase = getEffectivePhase(profile.currentDay, phaseLogs, today);

  // Préférences raffinement → biais catégoriel + texte pour le LLM
  const storedRefinementAnswers =
    (profile.refinementSchemaVersion ?? 0) >= REFINEMENT_SCHEMA_VERSION
      ? parseValidRefinementAnswers(profile.refinementAnswers)
      : null;
  const refinementBias = refinementAnswersToCategoryBias(storedRefinementAnswers);
  const refinementContext = buildRefinementContextForPrompt(storedRefinementAnswers);

  const ownedQuestPackIds = parseStringArray(
    (profile as { ownedQuestPackIds?: unknown }).ownedQuestPackIds,
  );
  const questPackBias = questPackBiasFromOwned(ownedQuestPackIds);

  // Exclusions cumulées (relances du jour)
  const lastQuestDateStr =
    profile.lastQuestDate == null ? null : String(profile.lastQuestDate).slice(0, 10);
  const extraExclude =
    lastQuestDateStr === today ? parseRerollExcludedArchetypeIds(profile) : [];

  const instantOnly = profile.flagNextQuestInstantOnly === true;
  const isReroll = profile.flagNextQuestAfterReroll === true;
  const sociability: SociabilityLevel | null = isValidSociabilityLevel(profile.sociability)
    ? profile.sociability
    : null;

  // Snapshot pour le moteur
  const scoringLogs: ScoringQuestLog[] = recentLogRows.map((r) => ({
    archetypeId: r.archetypeId,
    status: r.status as QuestLog['status'],
    questDate: r.questDate,
  }));

  const snapshot: ProfileSnapshot = {
    declaredPersonality,
    exhibitedPersonality,
    congruenceDelta,
    phase: effectivePhase,
    day: profile.currentDay,
    sociability,
    refinementBias,
    questPackBias,
    recentLogs: scoringLogs,
    hasUserLocation: context.hasUserLocation,
    isOutdoorFriendly: context.isOutdoorFriendly,
    instantOnly,
    heavyQuestPreference: parseHeavyQuestPreference(profile.heavyQuestPreference),
    excludeArchetypeIds: extraExclude,
  };

  const selection = selectCandidates(taxonomy, snapshot, {
    poolSize: 5,
    recentExclusionDays: DEFAULT_RECENT_EXCLUSION_DAYS,
    selectionSeed: `${profile.id}:${today}:${effectivePhase}:${profile.currentDay}:${isReroll ? 'reroll' : 'first'}`,
    todayIso: today,
  });

  // Filet de sécurité : si tous les filtres durs ont vidé la liste, on se rabat sur le fallback ou le top global.
  if (selection.candidates.length === 0) {
    const fb =
      findArchetypeById(taxonomy, fallbackDefault) ??
      taxonomy[0];
    if (!fb) {
      return NextResponse.json(
        { error: 'Aucun archétype éligible aujourd\'hui. Réessaie plus tard.' },
        { status: 503 },
      );
    }
    selection.candidates.push({
      archetype: fb,
      score: { affinity: 0.5, phaseFit: 0.5, freshness: 1, refinement: 0.5, total: 0.5 },
      reason: 'last-resort fallback',
    });
  }

  const durationBounds = clampQuestDurationBounds(
    profile.questDurationMinMinutes ?? 5,
    profile.questDurationMaxMinutes ?? 1440,
  );
  const durationFiltered = selection.candidates.filter(
    (c) =>
      c.archetype.minimumDurationMinutes >= durationBounds.questDurationMinMinutes &&
      c.archetype.minimumDurationMinutes <= durationBounds.questDurationMaxMinutes,
  );
  const candidatesForGen =
    durationFiltered.length > 0 ? durationFiltered : selection.candidates;

  // Brief historique pour le LLM (5 dernières quêtes, statut + texte)
  const historyBrief: GenerationHistoryItem[] = recentLogRows
    .slice(0, HISTORY_BRIEF_DEPTH)
    .map((r) => ({
      archetypeId: r.archetypeId,
      archetypeTitle: taxMap.get(r.archetypeId)?.title ?? '',
      category: taxMap.get(r.archetypeId)?.category ?? '',
      status: r.status as GenerationHistoryItem['status'],
      generatedTitle: r.generatedTitle,
      generatedMission: r.generatedMission,
      questDate: r.questDate,
    }));

  const generated = await generateDailyQuest({
    candidates: candidatesForGen,
    profile: {
      declaredPersonality,
      exhibitedPersonality,
      congruenceDelta,
      phase: effectivePhase,
      day: profile.currentDay,
      explorerAxis: profile.explorerAxis as ExplorerAxis,
      riskAxis: profile.riskAxis as RiskAxis,
      sociability,
      refinementContext,
      heavyQuestPreference: parseHeavyQuestPreference(profile.heavyQuestPreference),
      ownedQuestPackIds,
    },
    context: {
      questDateIso: today,
      city: context.city,
      country: context.country,
      weatherDescription: context.weatherDescription,
      weatherIcon: context.weatherIcon,
      temp: context.temp,
      isOutdoorFriendly: context.isOutdoorFriendly,
      hasUserLocation: context.hasUserLocation,
      questDurationMinMinutes: durationBounds.questDurationMinMinutes,
      questDurationMaxMinutes: durationBounds.questDurationMaxMinutes,
    },
    history: historyBrief,
    locale: questLocale,
    generationSeed: `${profile.id}:${today}:${effectivePhase}:${isReroll ? 'reroll' : 'first'}`,
    isReroll,
    substitutedInstantAfterDefer: instantOnly,
  });

  // Géocodage pour les quêtes outdoor
  let destinationLabel: string | null = null;
  let destinationLat: number | null = null;
  let destinationLon: number | null = null;
  if (generated.isOutdoor && context.hasUserLocation) {
    let rawLabel = generated.destinationLabel?.trim() || null;
    if (rawLabel && isPlaceholderDestinationLabel(rawLabel)) rawLabel = null;
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

  // Progression : jour, phase, série
  const lastDate = profile.lastQuestDate;
  const yesterdayStr = getPreviousQuestCalendarDate(today);
  const isSameDayRegen = lastDate === today;
  const isConsecutive = lastDate === yesterdayStr;
  const newStreak = isSameDayRegen
    ? profile.streakCount
    : isConsecutive
      ? profile.streakCount + 1
      : 1;
  const newDay = profile.currentDay + (lastDate !== today ? 1 : 0);
  const newPhase: EscalationPhase = getEffectivePhase(newDay, phaseLogs, today);

  const rerollsAfterQuestCreate = isReroll ? profile.rerollsRemaining : DAILY_FREE_REROLLS;
  const wasWeatherFallback = generated.wasFallback;
  const chosenArchetypeId = generated.archetypeId;

  const [questLog, updatedProfile] = await prisma.$transaction([
    prisma.questLog.create({
      data: {
        profileId: profile.id,
        questDate: today,
        archetypeId: chosenArchetypeId,
        generatedEmoji: generated.icon,
        generatedTitle: generated.title,
        generatedMission: generated.mission,
        generatedHook: generated.hook,
        generatedDuration: generated.duration,
        generatedSafetyNote: generated.safetyNote ?? undefined,
        isOutdoor: generated.isOutdoor,
        destinationLabel,
        destinationLat,
        destinationLon,
        locationCity: context.hasUserLocation ? context.city : null,
        weatherDescription: context.weatherDescription,
        weatherTemp: context.temp,
        phaseAtAssignment: effectivePhase,
        congruenceDeltaAtTime: congruenceDelta,
        wasRerolled: isReroll,
        wasFallback: wasWeatherFallback,
      },
    }),
    prisma.profile.update({
      where: { id: profile.id },
      data: {
        currentDay: newDay,
        currentPhase: newPhase,
        streakCount: newStreak,
        lastQuestDate: today,
        rerollsRemaining: rerollsAfterQuestCreate,
        congruenceDelta,
        flagNextQuestAfterReroll: false,
        flagNextQuestInstantOnly: false,
        rerollExcludeArchetypeId: null,
        rerollExcludeArchetypeIds: Array.from(new Set([...extraExclude, chosenArchetypeId])),
      },
    }),
  ]);

  const p = updatedProfile;

  return NextResponse.json(
    {
      ...(await toQuestResponse(questLog, p, taxonomy)),
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
    },
    { status: 201 },
  );
}

// ── POST: accept / reroll / replace / complete / abandon / report ────────────

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const questLocale = parseAppLocaleFromRequest(request);

  const body = (await request.json().catch(() => ({}))) as {
    questDate?: string;
    safetyConsentGiven?: boolean;
    action?: 'reroll' | 'replace' | 'complete' | 'abandon' | 'report';
    deferredUntil?: string;
  };

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const today = body.questDate ?? getQuestCalendarDateNow();
  const postTaxonomy = await getQuestTaxonomy();
  const postTaxMap = buildTaxonomyMap(postTaxonomy);
  const declared = profile.declaredPersonality as unknown as PersonalityVector;

  // ── Report ────────────────────────────────────────────────────────────────
  if (body.action === 'report') {
    const deferredUntil = typeof body.deferredUntil === 'string' ? body.deferredUntil.trim() : '';
    if (!isValidReportDeferredDate(deferredUntil, today)) {
      return NextResponse.json(
        {
          error: `Choisis une date entre aujourd'hui et ${today} + 14 jours (format AAAA-MM-JJ).`,
        },
        { status: 400 },
      );
    }

    const existing = await prisma.questLog.findUnique({
      where: { profileId_questDate: { profileId: profile.id, questDate: today } },
    });
    if (!existing || existing.status !== 'pending') {
      return NextResponse.json(
        { error: "Reporter n'est possible que tant que la quête n'est pas acceptée." },
        { status: 400 },
      );
    }

    const reportArchetype = findArchetypeById(postTaxonomy, existing.archetypeId);
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
    void trySoftUpdateDeclared(
      profile.id,
      declared,
      profile.currentDay,
      excludeArchetypeId,
      'rejected',
      postTaxMap,
    );
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

  // ── Abandon ───────────────────────────────────────────────────────────────
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

    void trySoftUpdateDeclared(
      profile.id,
      declared,
      profile.currentDay,
      updated.archetypeId,
      'abandoned',
      postTaxMap,
    );

    const profileAfter = await prisma.profile.findUnique({ where: { id: profile.id } });
    const p = profileAfter ?? profile;

    return NextResponse.json({
      ...(await toQuestResponse(updated, p)),
      abandoned: true,
      streak: p.streakCount,
      deferredSocialUntil: null,
      ...shopClientPayload(p),
      progression: progressionPayload(p, questLocale),
    });
  }

  // ── Reroll / Replace ──────────────────────────────────────────────────────
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
    void trySoftUpdateDeclared(
      profile.id,
      declared,
      profile.currentDay,
      excludeArchetypeId,
      'rejected',
      postTaxMap,
    );
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

  // ── Complete ──────────────────────────────────────────────────────────────
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

    const [completedBefore, outdoorBefore] = await Promise.all([
      prisma.questLog.count({
        where: { profileId: profile.id, status: 'completed' },
      }),
      prisma.questLog.count({
        where: { profileId: profile.id, status: 'completed', isOutdoor: true },
      }),
    ]);

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

    void trySoftUpdateDeclared(
      profile.id,
      declared,
      profile.currentDay,
      existing.archetypeId,
      'completed',
      postTaxMap,
    );

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
      ...(await toQuestResponse(updated, profileAfter)),
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

  // ── Accept ────────────────────────────────────────────────────────────────
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
    return NextResponse.json(
      { error: "Cette quête a été passée. Demain une nouvelle carte t'attend." },
      { status: 400 },
    );
  }
  if (logForAccept.status === 'accepted') {
    return NextResponse.json({
      ...(await toQuestResponse(logForAccept, profile)),
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

  void trySoftUpdateDeclared(
    profile.id,
    declared,
    profile.currentDay,
    updated.archetypeId,
    'accepted',
    postTaxMap,
  );

  return NextResponse.json({
    ...(await toQuestResponse(updated, profile)),
    ...shopClientPayload(profile),
  });
}

// ── Helper response shape ────────────────────────────────────────────────────

async function toQuestResponse(
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
  cachedTaxonomy?: QuestModel[],
) {
  const taxonomy = cachedTaxonomy ?? (await getQuestTaxonomy());
  const archetype = findArchetypeById(taxonomy, log.archetypeId);
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
