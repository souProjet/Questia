import { NextRequest, NextResponse } from 'next/server';
import { QUEST_TAXONOMY, FALLBACK_QUEST_ID } from '@dopamode/shared';
import type { OperationalQuadrant, EscalationPhase } from '@dopamode/shared';
import { generateQuestNarration } from '@/lib/actions/ai';
import { checkWeatherSafety } from '@/lib/actions/weather';

export interface AcceptQuestBody {
  questId: number;
  quadrant: OperationalQuadrant;
  phase: EscalationPhase;
  congruenceDelta: number;
  currentDay: number;
  lat?: number;
  lon?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: AcceptQuestBody = await request.json();
    const { questId, quadrant, phase, congruenceDelta, currentDay, lat, lon } = body;

    let quest = QUEST_TAXONOMY.find((q) => q.id === questId);
    if (!quest) {
      return NextResponse.json({ error: 'Quête introuvable' }, { status: 404 });
    }

    let wasFallback = false;

    if (quest.requiresOutdoor && lat !== undefined && lon !== undefined) {
      const weather = await checkWeatherSafety(lat, lon);
      if (!weather.safe) {
        const fallbackId = quest.fallbackQuestId ?? FALLBACK_QUEST_ID;
        quest = QUEST_TAXONOMY.find((q) => q.id === fallbackId) ?? quest;
        wasFallback = true;
      }
    }

    const narration = await generateQuestNarration({
      anonymizedProfile: { quadrant, phase, congruenceDelta, dayNumber: currentDay },
      questModel: quest,
    });

    return NextResponse.json({ narration, questId: quest.id, wasFallback });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
