import { describe, expect, it, beforeEach, vi } from 'vitest';

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

import {
  analyzeQuestArchetypeFromFreeform,
  analyzeQuestArchetypeSuggestion,
  bumpExtraversionForSocialApproachQuests,
  deriveQuestPaceFromFlags,
} from './analyzeArchetypeSuggestion';

const suggestionPayload = {
  category: 'spatial_adventure',
  targetTraits: { openness: 0.7, extraversion: 0.4 },
  comfortLevel: 'moderate',
  requiresOutdoor: false,
  requiresSocial: false,
  minimumDurationMinutes: 30,
  titleEn: 'English title',
  descriptionEn: 'English description with enough content.',
};

const freeformPayload = {
  inputLanguage: 'fr',
  titleFr: 'Titre FR',
  descriptionFr: 'Description FR détaillée.',
  titleEn: 'Title EN',
  descriptionEn: 'Description EN detailed.',
  category: 'exploratory_sociability',
  targetTraits: { openness: 0.6 },
  comfortLevel: 'high',
  requiresOutdoor: true,
  requiresSocial: false,
  minimumDurationMinutes: 60,
};

describe('bumpExtraversionForSocialApproachQuests', () => {
  it('rehausse l’extraversion pour compliment / contact si valeur trop basse', () => {
    const out = bumpExtraversionForSocialApproachQuests({
      category: 'spontaneous_altruism',
      targetTraits: { agreeableness: 0.7, extraversion: 0.4 },
      comfortLevel: 'moderate',
      requiresOutdoor: false,
      requiresSocial: true,
      minimumDurationMinutes: 45,
      titleEn: 'Compliments',
      descriptionEn: 'Compliment three people today for positivity.',
    });
    expect(out.targetTraits.extraversion).toBeGreaterThanOrEqual(0.76);
  });

  it('laisse une quête non sociale inchangée', () => {
    const out = bumpExtraversionForSocialApproachQuests({
      category: 'public_introspection',
      targetTraits: { extraversion: 0.35, emotionalStability: 0.7 },
      comfortLevel: 'moderate',
      requiresOutdoor: false,
      requiresSocial: false,
      minimumDurationMinutes: 30,
      titleEn: 'Journal',
      descriptionEn: 'Write alone at home.',
    });
    expect(out.targetTraits.extraversion).toBe(0.35);
  });
});

describe('deriveQuestPaceFromFlags', () => {
  it('planifiée si social ou durée ≥ 6 h', () => {
    expect(deriveQuestPaceFromFlags({ requiresSocial: true, minimumDurationMinutes: 10 })).toBe('planned');
    expect(deriveQuestPaceFromFlags({ requiresSocial: false, minimumDurationMinutes: 360 })).toBe('planned');
  });
  it('instant sinon', () => {
    expect(deriveQuestPaceFromFlags({ requiresSocial: false, minimumDurationMinutes: 120 })).toBe('instant');
  });
});

describe('analyzeQuestArchetypeSuggestion', () => {
  beforeEach(() => {
    createMock.mockReset();
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
  });

  it('normalise la réponse JSON du premier appel', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(suggestionPayload) } }],
    });
    const out = await analyzeQuestArchetypeSuggestion({
      titleFr: 'Titre',
      descriptionFr: 'Description',
    });
    expect(out.category).toBe('spatial_adventure');
    expect(out.titleEn).toBe('English title');
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('appelle la traduction si la partie EN est à réparer', async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...suggestionPayload,
                titleEn: '',
                descriptionEn: 'description pending.',
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
                titleEn: 'Repaired title',
                descriptionEn: 'Repaired description.',
              }),
            },
          },
        ],
      });
    const out = await analyzeQuestArchetypeSuggestion({
      titleFr: 'Bonjour',
      descriptionFr: 'Texte français.',
    });
    expect(out.titleEn).toBe('Repaired title');
    expect(out.descriptionEn).toBe('Repaired description.');
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});

describe('analyzeQuestArchetypeFromFreeform', () => {
  beforeEach(() => {
    createMock.mockReset();
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
  });

  it('retourne une analyse bilingue complète sans appel de secours', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(freeformPayload) } }],
    });
    const out = await analyzeQuestArchetypeFromFreeform('contenu collé');
    expect(out.titleFr).toBe('Titre FR');
    expect(out.titleEn).toBe('Title EN');
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('complète l’anglais via traduction si besoin', async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...freeformPayload,
                titleEn: '',
                descriptionEn: 'description pending.',
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
                titleEn: 'EN',
                descriptionEn: 'Full EN text.',
              }),
            },
          },
        ],
      });
    const out = await analyzeQuestArchetypeFromFreeform('Une ligne');
    expect(out.titleEn).toBe('EN');
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('complète le français via traduction si besoin', async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...freeformPayload,
                titleFr: '',
                descriptionFr: '',
                titleEn: 'Only EN title',
                descriptionEn: 'Only EN body long enough.',
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
                titleFr: 'Titre FR traduit',
                descriptionFr: 'Description FR traduite.',
              }),
            },
          },
        ],
      });
    /** Contenu vide → pas de titre/description FR dérivés du collage : déclenche la traduction EN→FR. */
    const out = await analyzeQuestArchetypeFromFreeform('');
    expect(out.titleFr).toBe('Titre FR traduit');
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
