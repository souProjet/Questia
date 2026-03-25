import { describe, expect, it } from 'vitest';
import type { PersonalityVector } from '@questia/shared';
import { QUEST_TAXONOMY } from '@questia/shared';
import { archetypeCategoryLabelFr, buildPersonalityPromptBlock, describeArchetypeTargetTraits } from './questGenerationPrompt';

const base = (): PersonalityVector => ({
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  emotionalStability: 0.5,
  thrillSeeking: 0.5,
  boredomSusceptibility: 0.5,
});

describe('questGenerationPrompt', () => {
  it('buildPersonalityPromptBlock inclut déclaré, delta et mention peu d’historique', () => {
    const declared = base();
    const exhibited = base();
    for (const k of Object.keys(exhibited) as (keyof PersonalityVector)[]) {
      exhibited[k] = 0;
    }
    const block = buildPersonalityPromptBlock(declared, exhibited, 0.12);
    expect(block).toMatch(/TENDANCES DÉCLARÉES/);
    expect(block).toMatch(/INDICATEUR DE COHÉRENCE/);
    expect(block).toMatch(/0\.12/);
    expect(block).toMatch(/peu de données/i);
  });

  it('describeArchetypeTargetTraits et libellé famille', () => {
    const q = QUEST_TAXONOMY[0]!;
    expect(archetypeCategoryLabelFr(q.category).length).toBeGreaterThan(3);
    expect(describeArchetypeTargetTraits(q).length).toBeGreaterThan(5);
  });
});
