import {
  REFINEMENT_QUESTIONS,
  REFINEMENT_SCHEMA_VERSION,
  shouldPromptRefinementSurvey,
} from '@questia/shared';

export function getRefinementSurveyPayload(
  profile: {
    currentDay: number;
    refinementSchemaVersion: number;
    refinementSkippedAt: string | null;
  },
  completedQuestCount: number,
) {
  const due = shouldPromptRefinementSurvey({
    currentDay: profile.currentDay,
    completedQuestCount,
    refinementSchemaVersion: profile.refinementSchemaVersion,
    refinementSkippedAt: profile.refinementSkippedAt,
  });
  if (!due) {
    return { due: false as const, schemaVersion: REFINEMENT_SCHEMA_VERSION };
  }
  return {
    due: true as const,
    schemaVersion: REFINEMENT_SCHEMA_VERSION,
    questions: [...REFINEMENT_QUESTIONS],
    consentNotice:
      'Ces réponses servent uniquement à adapter tes quêtes et le ton des missions. Tu peux demander leur suppression conformément à notre politique de confidentialité.',
  };
}
