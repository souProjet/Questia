import { NextRequest, NextResponse } from 'next/server';
import type { OperationalQuadrant, EscalationPhase } from '@questia/shared';
import { generateQuestNarration } from '@/lib/actions/ai';
import { checkWeatherSafety } from '@/lib/actions/weather';
import { getQuestTaxonomy, getDefaultFallbackArchetypeId } from '@/lib/quest-taxonomy/cache';
import { findArchetypeById } from '@/lib/quest-taxonomy/map-prisma';

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

    const taxonomy = await getQuestTaxonomy();
    const fallbackDefault = await getDefaultFallbackArchetypeId();

    let quest = findArchetypeById(taxonomy, questId);
    if (!quest) {
      return NextResponse.json({ error: 'Quête introuvable' }, { status: 404 });
    }

    let wasFallback = false;

    if (quest.requiresOutdoor && lat !== undefined && lon !== undefined) {
      const weather = await checkWeatherSafety(lat, lon);
      if (!weather.safe) {
        const fallbackId = quest.fallbackQuestId ?? fallbackDefault;
        quest = findArchetypeById(taxonomy, fallbackId) ?? quest;
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
