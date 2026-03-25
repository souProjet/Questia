import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QUEST_TAXONOMY } from '@questia/shared';
import type { PersonalityVector } from '@questia/shared';

const uniformPersonality = (v: number): PersonalityVector => ({
  openness: v,
  conscientiousness: v,
  extraversion: v,
  agreeableness: v,
  emotionalStability: v,
  thrillSeeking: v,
  boredomSusceptibility: v,
});

const createMock = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: createMock,
      },
    };
  },
}));

describe('ai actions', () => {
  beforeEach(() => {
    createMock.mockReset();
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
  });

  it('generateDailyQuest parse JSON OpenAI', async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              icon: 'Target',
              title: 'Test quête intérieure',
              mission:
                'À Paris, ouvre ton carnet et écris trois phrases sur ce qui t’attire aujourd’hui. Ferme les yeux une minute puis relis. Ne sors pas : reste chez toi ou dans un lieu couvert.',
              hook: 'Paris commence dans ta tête, un mot à la fois.',
              duration: '1h',
              isOutdoor: false,
              safetyNote: null,
              destinationLabel: null,
              destinationQuery: null,
            }),
          },
        },
      ],
    });
    vi.resetModules();
    const { generateDailyQuest } = await import('./ai');
    const archetype = QUEST_TAXONOMY.find((q) => !q.requiresOutdoor)!;
    const q = await generateDailyQuest(
      {
        phase: 'calibration',
        day: 1,
        congruenceDelta: 0.1,
        explorerAxis: 'explorer',
        riskAxis: 'cautious',
        questDateIso: '2026-03-24',
        declaredPersonality: uniformPersonality(0.5),
        exhibitedPersonality: uniformPersonality(0),
      },
      archetype,
      {
        city: 'Paris',
        country: 'FR',
        weatherDescription: 'Beau',
        weatherIcon: 'Sun',
        temp: 20,
        isOutdoorFriendly: true,
      },
    );
    expect(q.title).toBe('Test quête intérieure');
    expect(q.icon).toBe('Target');
  });

  it('generateDailyQuest fallback si erreur', async () => {
    createMock.mockRejectedValue(new Error('api'));
    vi.resetModules();
    const { generateDailyQuest } = await import('./ai');
    const archetype = QUEST_TAXONOMY[0]!;
    const q = await generateDailyQuest(
      {
        phase: 'calibration',
        day: 1,
        congruenceDelta: 0.1,
        explorerAxis: 'explorer',
        riskAxis: 'cautious',
        questDateIso: '2026-03-24',
        declaredPersonality: uniformPersonality(0.5),
        exhibitedPersonality: uniformPersonality(0),
      },
      archetype,
      {
        city: 'Paris',
        country: 'FR',
        weatherDescription: 'Beau',
        weatherIcon: 'Sun',
        temp: 20,
        isOutdoorFriendly: false,
      },
    );
    expect(q.mission).toBe(archetype.description);
    expect(q.icon).toBe('Swords');
  });

  it('generateQuestNarration fallback', async () => {
    createMock.mockRejectedValue(new Error('api'));
    vi.resetModules();
    const { generateQuestNarration } = await import('./ai');
    const archetype = QUEST_TAXONOMY[0]!;
    const n = await generateQuestNarration({
      anonymizedProfile: {
        quadrant: { explorerAxis: 'explorer', riskAxis: 'cautious' },
        phase: 'calibration',
        congruenceDelta: 0,
        dayNumber: 1,
      },
      questModel: archetype,
    });
    expect(n.narrative).toBe(archetype.description);
  });
});
