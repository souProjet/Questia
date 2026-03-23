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
} from '@dopamode/shared';
import type { EscalationPhase, ExplorerAxis, RiskAxis, PersonalityVector, QuestLog } from '@dopamode/shared';
import { generateDailyQuest } from '@/lib/actions/ai';
import { getQuestContext } from '@/lib/actions/weather';
import { geocodeNominatim } from '@/lib/geocode';

// ── Today's date in YYYY-MM-DD ─────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const url = new URL(request.url);
  const lat = url.searchParams.get('lat') ? parseFloat(url.searchParams.get('lat')!) : undefined;
  const lon = url.searchParams.get('lon') ? parseFloat(url.searchParams.get('lon')!) : undefined;

  // Get profile
  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable. Complète l\'onboarding.' }, { status: 404 });

  const today = todayStr();

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
      rerollsRemaining: profile.rerollsRemaining,
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
  if (archetype?.requiresOutdoor && !context.isOutdoorFriendly) {
    archetype = QUEST_TAXONOMY.find((q) => q.id === (archetype!.fallbackQuestId ?? FALLBACK_QUEST_ID)) ?? archetype;
  }
  if (!archetype) {
    archetype = QUEST_TAXONOMY.find((q) => q.id === FALLBACK_QUEST_ID) ?? QUEST_TAXONOMY[0];
  }

  // Generate the quest via OpenAI
  const generated = await generateDailyQuest(
    {
      phase: profile.currentPhase as EscalationPhase,
      day: profile.currentDay,
      delta: profile.congruenceDelta,
      explorerAxis: profile.explorerAxis as ExplorerAxis,
      riskAxis: profile.riskAxis as RiskAxis,
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
      },
    }),
  ]);

  return NextResponse.json({
    ...toQuestResponse(questLog),
    fromCache: false,
    day: newDay,
    streak: newStreak,
    phase: newPhase,
    rerollsRemaining: 1,
    context,
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

  // ── Reroll: delete today's quest and decrement rerolls ──────────────────────
  if (body.action === 'reroll' || body.action === 'replace') {
    if (profile.rerollsRemaining <= 0) {
      return NextResponse.json({ error: 'Plus de relances disponibles aujourd\'hui.' }, { status: 400 });
    }
    const existing = await prisma.questLog.findUnique({
      where: { profileId_questDate: { profileId: profile.id, questDate: today } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Aucune quête à relancer.' }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.questLog.delete({
        where: { profileId_questDate: { profileId: profile.id, questDate: today } },
      }),
      prisma.profile.update({
        where: { id: profile.id },
        data: { rerollsRemaining: Math.max(0, profile.rerollsRemaining - 1) },
      }),
    ]);
    return NextResponse.json({ rerolled: true, rerollsRemaining: profile.rerollsRemaining - 1 });
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
    const updated = await prisma.questLog.update({
      where: { profileId_questDate: { profileId: profile.id, questDate: today } },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
    return NextResponse.json(toQuestResponse(updated));
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
    return NextResponse.json(toQuestResponse(logForAccept));
  }

  const { safetyConsentGiven } = body;
  const updated = await prisma.questLog.update({
    where: { profileId_questDate: { profileId: profile.id, questDate: today } },
    data: {
      status: 'accepted',
      safetyConsentGiven: safetyConsentGiven ?? false,
    },
  });

  return NextResponse.json(toQuestResponse(updated));
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
  };
}
