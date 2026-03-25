import { describe, expect, it } from 'vitest';
import {
  REFINEMENT_SCHEMA_VERSION,
  shouldPromptRefinementSurvey,
  parseValidRefinementAnswers,
  refinementAnswersToCategoryBias,
  buildRefinementContextForPrompt,
} from './profileRefinement';

describe('profileRefinement', () => {
  it('shouldPromptRefinementSurvey respecte version et seuils', () => {
    expect(
      shouldPromptRefinementSurvey({
        currentDay: 2,
        completedQuestCount: 0,
        refinementSchemaVersion: 0,
        refinementSkippedAt: null,
      }),
    ).toBe(false);

    expect(
      shouldPromptRefinementSurvey({
        currentDay: 10,
        completedQuestCount: 0,
        refinementSchemaVersion: 0,
        refinementSkippedAt: null,
      }),
    ).toBe(true);

    expect(
      shouldPromptRefinementSurvey({
        currentDay: 10,
        completedQuestCount: 0,
        refinementSchemaVersion: REFINEMENT_SCHEMA_VERSION,
        refinementSkippedAt: null,
      }),
    ).toBe(false);
  });

  it('parseValidRefinementAnswers accepte un objet complet valide', () => {
    const raw = {
      social_mode: 'balanced',
      romance_topics: 'neutral',
      food_missions: 'neutral',
      energy_peak: 'varies',
      crowds: 'neutral',
    };
    expect(parseValidRefinementAnswers(raw)).toEqual(raw);
    expect(parseValidRefinementAnswers({ ...raw, social_mode: 'nope' })).toBeNull();
  });

  it('refinementAnswersToCategoryBias et prompt non vides pour solo + avoid romance', () => {
    const a = {
      social_mode: 'solo',
      romance_topics: 'avoid',
      food_missions: 'neutral',
      energy_peak: 'morning',
      crowds: 'draining',
    };
    const b = refinementAnswersToCategoryBias(a);
    expect(b.exploratory_sociability).toBeLessThan(0);
    expect(b.relational_vulnerability).toBeLessThan(0);
    const p = buildRefinementContextForPrompt(a);
    expect(p).toMatch(/solo|calme/i);
  });

  it('romance avoid : biais couple sur relational_vulnerability, pas de malus hostile_immersion ; compensation si profil social aventureux', () => {
    const soloAvoid = refinementAnswersToCategoryBias({
      social_mode: 'solo',
      romance_topics: 'avoid',
      food_missions: 'neutral',
      energy_peak: 'varies',
      crowds: 'neutral',
    });
    const socialAvoid = refinementAnswersToCategoryBias({
      social_mode: 'social',
      romance_topics: 'avoid',
      food_missions: 'neutral',
      energy_peak: 'varies',
      crowds: 'neutral',
    });
    expect(soloAvoid.relational_vulnerability).toBeLessThan(0);
    expect(socialAvoid.relational_vulnerability).toBeLessThan(0);
    expect((socialAvoid.hostile_immersion ?? 0)).toBeGreaterThan(soloAvoid.hostile_immersion ?? 0);
    const ctx = buildRefinementContextForPrompt({
      social_mode: 'social',
      romance_topics: 'avoid',
      food_missions: 'neutral',
      energy_peak: 'varies',
      crowds: 'neutral',
    });
    expect(ctx).toMatch(/flirt|rencontre/i);
  });
});
