import { describe, expect, it } from 'vitest';
import type { PersonalityVector, QuestModel } from '@questia/shared';
import { QUEST_TAXONOMY } from '@questia/shared';
import {
  archetypeCategoryLabel,
  buildNarrativeVoiceBlock,
  buildPersonalityPromptBlock,
  describeArchetypeTargetTraits,
} from './questGenerationPrompt';

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
  it("buildPersonalityPromptBlock inclut déclaré, delta et mention peu d'historique", () => {
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

  it('buildPersonalityPromptBlock FR avec historique et écarts', () => {
    const declared = base();
    declared.openness = 0.85;
    const exhibited = base();
    exhibited.openness = 0.1;
    for (const k of ['conscientiousness', 'extraversion', 'agreeableness', 'emotionalStability'] as const) {
      exhibited[k] = 0;
    }
    const block = buildPersonalityPromptBlock(declared, exhibited, 0.4);
    expect(block).toMatch(/TENDANCES OBSERVÉES/);
    expect(block).toMatch(/ÉCARTS POSSIBLES/);
    expect(block).toMatch(/marqué/);
  });

  it('buildPersonalityPromptBlock EN sans historique et seuils de cohérence', () => {
    const declared = base();
    const exhibited = base();
    for (const k of Object.keys(exhibited) as (keyof PersonalityVector)[]) {
      exhibited[k] = 0;
    }
    const small = buildPersonalityPromptBlock(declared, exhibited, 0.1, 'en');
    expect(small).toMatch(/DECLARED TENDENCIES/);
    expect(small).toMatch(/small —/);

    const moderate = buildPersonalityPromptBlock(declared, exhibited, 0.22, 'en');
    expect(moderate).toMatch(/moderate —/);

    const large = buildPersonalityPromptBlock(declared, exhibited, 0.4, 'en');
    expect(large).toMatch(/large —/);
  });

  it('buildPersonalityPromptBlock EN avec historique, gaps et extraversion', () => {
    const declared = base();
    declared.extraversion = 0.85;
    const exhibited = base();
    for (const k of Object.keys(exhibited) as (keyof PersonalityVector)[]) {
      exhibited[k] = 0;
    }
    exhibited.extraversion = 0.1;
    exhibited.openness = 0.1;
    const block = buildPersonalityPromptBlock(declared, exhibited, 0.2, 'en');
    expect(block).toMatch(/OBSERVED TENDENCIES/);
    expect(block).toMatch(/POSSIBLE GAPS/);
    expect(block).toMatch(/sociability/);
  });

  it('buildPersonalityPromptBlock EN couvre les bandes plutôt basse / modérée / haute', () => {
    const declared = base();
    declared.openness = 0.2;
    declared.conscientiousness = 0.5;
    declared.extraversion = 0.8;
    const exhibited = base();
    for (const k of Object.keys(exhibited) as (keyof PersonalityVector)[]) {
      exhibited[k] = 0;
    }
    const block = buildPersonalityPromptBlock(declared, exhibited, 0.1, 'en');
    expect(block).toMatch(/rather low/);
    expect(block).toMatch(/moderate/);
    expect(block).toMatch(/rather high/);
  });

  it('buildNarrativeVoiceBlock FR / EN et phase', () => {
    const frCal = buildNarrativeVoiceBlock('calibration', 'fr', 'seed-a');
    expect(frCal).toMatch(/VOIX NARRATIVE \(calibration\)/);
    expect(frCal).toMatch(/FORMAT/);

    const frRup = buildNarrativeVoiceBlock('rupture', 'fr', 'seed-b');
    expect(frRup).toMatch(/rupture/);

    const enExp = buildNarrativeVoiceBlock('expansion', 'en', 'seed-c');
    expect(enExp).toMatch(/NARRATIVE VOICE \(expansion\)/);
    expect(enExp).toMatch(/FORMAT:/);
  });

  it('describeArchetypeTargetTraits et libellé famille', () => {
    const q = QUEST_TAXONOMY[0]!;
    expect(archetypeCategoryLabel(q.category).length).toBeGreaterThan(3);
    expect(describeArchetypeTargetTraits(q).length).toBeGreaterThan(5);
  });

  it('archetypeCategoryLabel EN et describeArchetypeTargetTraits sans traits / EN / forces', () => {
    const q = QUEST_TAXONOMY[0]!;
    expect(archetypeCategoryLabel(q.category, 'en').length).toBeGreaterThan(2);

    const bare: QuestModel = { ...q, targetTraits: {} };
    expect(describeArchetypeTargetTraits(bare)).toBe('équilibre général');
    expect(describeArchetypeTargetTraits(bare, 'en')).toBe('general balance');

    const mixed: QuestModel = {
      ...q,
      targetTraits: { openness: 0.8, conscientiousness: 0.5, extraversion: 0.2 },
    };
    const fr = describeArchetypeTargetTraits(mixed, 'fr');
    expect(fr).toContain('fort');
    expect(fr).toContain('modéré');
    expect(fr).toContain('léger');

    const en = describeArchetypeTargetTraits(mixed, 'en');
    expect(en).toContain('strong');
    expect(en).toContain('moderate');
    expect(en).toContain('light');
  });
});
