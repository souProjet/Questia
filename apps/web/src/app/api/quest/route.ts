import { NextRequest, NextResponse } from 'next/server';
import {
  computeExhibitedPersonality,
  computeCongruenceDelta,
  getEffectivePhase,
  selectCandidates,
  isValidSociabilityLevel,
} from '@questia/shared';
import type {
  PersonalityVector,
  ProfileSnapshot,
  QuestLog,
  ScoringQuestLog,
  SociabilityLevel,
} from '@questia/shared';
import { getQuestTaxonomy } from '@/lib/quest-taxonomy/cache';

/**
 * Endpoint debug / playground : pas d'IA, pas de persistance — il renvoie
 * simplement le top candidat algorithmique pour un profil fictif.
 *
 * Utile pour tests E2E et inspection manuelle du moteur.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      declaredPersonality,
      questLogs,
      currentDay,
      allowOutdoor,
      sociability,
    } = body as {
      declaredPersonality: PersonalityVector;
      questLogs: QuestLog[];
      currentDay: number;
      allowOutdoor: boolean;
      sociability?: unknown;
    };

    const taxonomy = await getQuestTaxonomy();
    const exhibited = computeExhibitedPersonality(questLogs, taxonomy);
    const delta = computeCongruenceDelta(declaredPersonality, exhibited);
    const recentLogs = questLogs.slice(-3);
    const phase = getEffectivePhase(currentDay, recentLogs);
    const recentForExclude = questLogs.slice(-5).map((l) => l.questId);

    const scoringLogs: ScoringQuestLog[] = questLogs.map((l) => ({
      archetypeId: l.questId,
      status: l.status,
      questDate: l.questDate ?? null,
    }));
    const sociabilityLevel: SociabilityLevel | null = isValidSociabilityLevel(sociability)
      ? sociability
      : null;

    const snapshot: ProfileSnapshot = {
      declaredPersonality,
      exhibitedPersonality: exhibited,
      congruenceDelta: delta,
      phase,
      day: currentDay,
      sociability: sociabilityLevel,
      refinementBias: {},
      recentLogs: scoringLogs,
      hasUserLocation: !!allowOutdoor,
      isOutdoorFriendly: !!allowOutdoor,
      instantOnly: false,
      excludeArchetypeIds: recentForExclude,
    };

    const selection = selectCandidates(taxonomy, snapshot, {
      poolSize: 1,
    });

    const quest = selection.candidates[0]?.archetype ?? null;

    return NextResponse.json({
      quest,
      phase,
      congruenceDelta: delta,
      exhibitedPersonality: exhibited,
      candidates: selection.candidates,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate quest' },
      { status: 500 },
    );
  }
}
