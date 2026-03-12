import { NextRequest, NextResponse } from 'next/server';
import { selectQuest, computeExhibitedPersonality, computeCongruenceDelta, getEffectivePhase } from '@dopamode/shared';
import type { PersonalityVector, QuestLog } from '@dopamode/shared';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      declaredPersonality,
      questLogs,
      currentDay,
      allowOutdoor,
    } = body as {
      declaredPersonality: PersonalityVector;
      questLogs: QuestLog[];
      currentDay: number;
      allowOutdoor: boolean;
    };

    const exhibited = computeExhibitedPersonality(questLogs);
    const delta = computeCongruenceDelta(declaredPersonality, exhibited);
    const recentLogs = questLogs.slice(-3);
    const phase = getEffectivePhase(currentDay, recentLogs);
    const recentQuestIds = questLogs.slice(-5).map((l) => l.questId);

    const quest = selectQuest(declaredPersonality, phase, recentQuestIds, allowOutdoor);

    return NextResponse.json({
      quest,
      phase,
      congruenceDelta: delta,
      exhibitedPersonality: exhibited,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate quest' },
      { status: 500 },
    );
  }
}
