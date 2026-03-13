import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { QUEST_TAXONOMY } from '@dopamode/shared';
import type { EscalationPhase, ExplorerAxis, RiskAxis } from '@dopamode/shared';
import { generateDailyQuest } from '@/lib/actions/ai';
import { getQuestContext } from '@/lib/actions/weather';

// ── Archetype selection ────────────────────────────────────────────────────────

function selectArchetype(
  phase: EscalationPhase,
  explorerAxis: ExplorerAxis,
  riskAxis: RiskAxis,
  isOutdoorFriendly: boolean,
  recentArchetypeIds: number[],
) {
  // Filter by outdoor availability
  let pool = isOutdoorFriendly
    ? QUEST_TAXONOMY
    : QUEST_TAXONOMY.filter((q) => !q.requiresOutdoor);

  // Filter by phase → comfort level
  const comfortByPhase: Record<EscalationPhase, string[]> = {
    calibration: ['low', 'moderate'],
    expansion:   ['moderate', 'high'],
    rupture:     ['high', 'extreme'],
  };
  const allowed = comfortByPhase[phase];
  pool = pool.filter((q) => allowed.includes(q.comfortLevel));

  // Prefer quests not done in last 7 days
  const fresh = pool.filter((q) => !recentArchetypeIds.includes(q.id));
  if (fresh.length > 0) pool = fresh;

  // Boost social quests for explorers, solo quests for homebodies
  if (explorerAxis === 'explorer') {
    const social = pool.filter((q) => q.requiresSocial);
    if (social.length >= 2) pool = social;
  }

  if (pool.length === 0) pool = QUEST_TAXONOMY; // ultimate fallback

  return pool[Math.floor(Math.random() * pool.length)];
}

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
    });
  }

  // ── Generate a new quest ────────────────────────────────────────────────────

  // Get weather + location context
  const context = await getQuestContext(lat, lon);

  // Get recent archetype IDs (last 7 days) to avoid repetition
  const recent = await prisma.questLog.findMany({
    where: { profileId: profile.id },
    orderBy: { assignedAt: 'desc' },
    take: 7,
    select: { archetypeId: true },
  });
  const recentIds = recent.map((r) => r.archetypeId);

  // Select the best archetype
  const archetype = selectArchetype(
    profile.currentPhase as EscalationPhase,
    profile.explorerAxis as ExplorerAxis,
    profile.riskAxis as RiskAxis,
    context.isOutdoorFriendly,
    recentIds,
  );

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
        currentDay:    newDay,
        currentPhase:  newPhase,
        streakCount:   newStreak,
        lastQuestDate: today,
        rerollsRemaining: 1, // reset daily rerolls
      },
    }),
  ]);

  return NextResponse.json({
    ...toQuestResponse(questLog),
    fromCache: false,
    day: newDay,
    streak: newStreak,
    phase: newPhase,
    context,
  }, { status: 201 });
}

// ── POST: accept the quest (mark as accepted in DB) ───────────────────────────

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { questDate, safetyConsentGiven } = await request.json() as {
    questDate?: string;
    safetyConsentGiven?: boolean;
  };

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const today = questDate ?? todayStr();
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
  locationCity: string | null;
  weatherDescription: string | null;
  weatherTemp: number | null;
  status: string;
}) {
  const archetype = QUEST_TAXONOMY.find((q) => q.id === log.archetypeId);
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
    city: log.locationCity,
    weather: log.weatherDescription,
    weatherTemp: log.weatherTemp,
    status: log.status,
  };
}
