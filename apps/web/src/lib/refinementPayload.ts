import {
  REFINEMENT_QUESTIONS,
  REFINEMENT_SCHEMA_VERSION,
  shouldPromptRefinementSurvey,
} from '@questia/shared';
import { siteUrl } from '@/config/marketing';

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
    consentNotice: `Ces réponses servent uniquement à adapter tes quêtes et le ton des missions. Export et suppression : page Profil sur le web. Politique de confidentialité : ${siteUrl}/legal/confidentialite`,
  };
}
