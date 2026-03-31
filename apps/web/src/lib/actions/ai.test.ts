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
        hasUserLocation: true,
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
        hasUserLocation: true,
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

  it('injecte les variables de personnalisation dans le prompt', async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              icon: 'Compass',
              title: 'Balade des détails',
              mission:
                'Va dans une rue calme à Lyon et note trois détails visuels nouveaux. Termine par une photo sans filtre.',
              hook: 'Ton quartier cache encore des surprises.',
              duration: '40 min',
              isOutdoor: true,
              safetyNote: 'Reste sur des axes fréquentés.',
              destinationLabel: 'Quais du Rhône',
              destinationQuery: 'Quais du Rhône, Lyon, France',
            }),
          },
        },
      ],
    });
    vi.resetModules();
    const { generateDailyQuest } = await import('./ai');
    const archetype = QUEST_TAXONOMY.find((q) => q.requiresOutdoor && !q.requiresSocial)!;
    await generateDailyQuest(
      {
        phase: 'rupture',
        day: 17,
        congruenceDelta: 0.41,
        explorerAxis: 'explorer',
        riskAxis: 'risktaker',
        questDateIso: '2026-03-29',
        generationSeed: 'profilA:2026-03-29:rupture',
        declaredPersonality: uniformPersonality(0.65),
        exhibitedPersonality: uniformPersonality(0.35),
        refinementContext: 'Préfère des actions concrètes en soirée et peu de foule.',
      },
      archetype,
      {
        city: 'Lyon',
        country: 'France',
        weatherDescription: 'Dégagé',
        weatherIcon: 'Sun',
        temp: 19,
        isOutdoorFriendly: true,
        hasUserLocation: true,
      },
    );

    const callArg = createMock.mock.calls[0]?.[0] as {
      temperature: number;
      messages: Array<{ role: string; content: string }>;
    };
    expect(callArg.temperature).toBe(0.84);
    const userPrompt = callArg.messages.find((m) => m.role === 'user')?.content ?? '';

    expect(userPrompt).toContain('VARIATION (évite la copie)');
    expect(userPrompt).toContain('Jour n°17');
    expect(userPrompt).toContain('Niveau (phase effective pour cette quête) : en rupture');
    expect(userPrompt).toContain('Ville : Lyon, France');
    expect(userPrompt).toContain('PRÉFÉRENCES UTILISATEUR');
  });

  it('relance la génération avec température adaptée après réponse invalide', async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                icon: 'Target',
                title: 'Titre',
                mission: 'Mission floue.',
                hook: 'Hook trop long hook trop long hook trop long hook trop long',
                duration: '10 min',
                isOutdoor: false,
                safetyNote: null,
                destinationLabel: null,
                destinationQuery: null,
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                icon: 'Target',
                title: 'Ancrage de fin de journée',
                mission:
                  'Prends dix minutes à Bordeaux pour écrire trois lignes sur ta journée puis envoie un message concret à une personne de confiance.',
                hook: 'Un geste précis bat mille intentions.',
                duration: '25 min',
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
    const archetype = QUEST_TAXONOMY.find((q) => !q.requiresOutdoor && q.requiresSocial)!;
    const out = await generateDailyQuest(
      {
        phase: 'expansion',
        day: 8,
        congruenceDelta: 0.28,
        explorerAxis: 'homebody',
        riskAxis: 'cautious',
        questDateIso: '2026-03-26',
        generationSeed: 'profilB:2026-03-26:expansion',
        declaredPersonality: uniformPersonality(0.45),
        exhibitedPersonality: uniformPersonality(0.25),
        isRerollGeneration: true,
      },
      archetype,
      {
        city: 'Bordeaux',
        country: 'France',
        weatherDescription: 'Nuageux',
        weatherIcon: 'Cloud',
        temp: 13,
        isOutdoorFriendly: false,
        hasUserLocation: true,
      },
    );

    expect(createMock).toHaveBeenCalledTimes(2);
    const firstTemp = (createMock.mock.calls[0]?.[0] as { temperature: number }).temperature;
    const secondTemp = (createMock.mock.calls[1]?.[0] as { temperature: number }).temperature;
    expect(firstTemp).toBe(0.9);
    expect(secondTemp).toBe(0.72);
    expect(out.title).toBe('Ancrage de fin de journée');
  });
});
