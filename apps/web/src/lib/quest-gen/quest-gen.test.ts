import { describe, expect, it } from 'vitest';
import type { PersonalityVector } from '@questia/shared';
import { TEST_QUEST_TAXONOMY, buildQuestParameters } from '@questia/shared';
import { buildSystemPrompt, buildUserPrompt } from './buildPrompt';
import { buildProfileBrief } from './buildProfileBrief';
import { buildHistoryBrief } from './buildHistoryBrief';
import { buildCreativeConstraints } from './buildCreativeConstraints';
import { validateGenerated, clampToOneSentence } from './validation';
import { parseGeneratedJson } from './parse';
import { buildFallbackQuest } from './fallback';
import type { GenerationProfile, ParsedGenerationBody, QuestGenInput } from './types';

const NEUTRAL: PersonalityVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  emotionalStability: 0.5,
  thrillSeeking: 0.5,
  boredomSusceptibility: 0.5,
};

const HOMEBODY_CAUTIOUS: PersonalityVector = {
  openness: 0.25,
  conscientiousness: 0.7,
  extraversion: 0.2,
  agreeableness: 0.65,
  emotionalStability: 0.4,
  thrillSeeking: 0.15,
  boredomSusceptibility: 0.3,
};

function buildProfile(over: Partial<GenerationProfile> = {}): GenerationProfile {
  return {
    declaredPersonality: NEUTRAL,
    exhibitedPersonality: NEUTRAL,
    congruenceDelta: 0.1,
    phase: 'expansion',
    day: 5,
    explorerAxis: 'explorer',
    riskAxis: 'cautious',
    sociability: 'balanced',
    refinementContext: null,
    ...over,
  };
}

function buildInput(over: Partial<QuestGenInput> = {}): QuestGenInput {
  const built = buildQuestParameters(
    TEST_QUEST_TAXONOMY,
    {
      declaredPersonality: NEUTRAL,
      exhibitedPersonality: NEUTRAL,
      congruenceDelta: 0.1,
      phase: 'expansion',
      day: 5,
      sociability: 'balanced',
      refinementBias: {},
      recentLogs: [],
      hasUserLocation: true,
      isOutdoorFriendly: true,
      instantOnly: false,
      excludeArchetypeIds: [],
    },
    {
      questDurationMinMinutes: 5,
      questDurationMaxMinutes: 1440,
      selectionSeed: 'test-input-seed',
    },
  );
  if (!built) throw new Error('buildQuestParameters failed in test');
  return {
    taxonomy: TEST_QUEST_TAXONOMY,
    questParameters: built.params,
    profile: buildProfile(),
    context: {
      questDateIso: '2025-04-19',
      city: 'Lyon',
      country: 'France',
      weatherDescription: 'ciel dégagé',
      weatherIcon: 'Sun',
      temp: 18,
      isOutdoorFriendly: true,
      hasUserLocation: true,
      questDurationMinMinutes: 5,
      questDurationMaxMinutes: 1440,
    },
    history: [],
    locale: 'fr',
    generationSeed: 'user42:2025-04-19:expansion',
    ...over,
  };
}

describe('buildProfileBrief', () => {
  it('renders declared traits in FR', () => {
    const txt = buildProfileBrief(
      buildProfile({ declaredPersonality: HOMEBODY_CAUTIOUS, congruenceDelta: 0.05 }),
      'fr',
    );
    expect(txt).toContain('PROFIL UTILISATEUR');
    expect(txt).toContain('Jour 5');
    expect(txt).toContain('expansion');
    expect(txt).toContain('cong=0.05');
  });

  it('renders in EN', () => {
    const txt = buildProfileBrief(buildProfile(), 'en');
    expect(txt).toContain('USER PROFILE');
    expect(txt).toContain('Day 5');
  });

  it('mentions a drift when declared and exhibited diverge', () => {
    const txt = buildProfileBrief(
      buildProfile({
        declaredPersonality: HOMEBODY_CAUTIOUS,
        exhibitedPersonality: { ...HOMEBODY_CAUTIOUS, extraversion: 0.6 },
      }),
      'fr',
    );
    expect(txt).toMatch(/Écart identité ↔ comportement/);
    expect(txt).toMatch(/PLUS de énergie sociale/);
  });

  it('includes refinement context when provided', () => {
    const txt = buildProfileBrief(
      buildProfile({ refinementContext: 'préfère le calme et les missions solo' }),
      'fr',
    );
    expect(txt).toContain('préfère le calme');
  });

  it('mentionne la préférence quêtes déplacement / organisation', () => {
    const frLow = buildProfileBrief(buildProfile({ heavyQuestPreference: 'low' }), 'fr');
    expect(frLow).toMatch(/déplacement ou à organiser|RARES/i);
    const enHigh = buildProfileBrief(buildProfile({ heavyQuestPreference: 'high' }), 'en');
    expect(enHigh).toMatch(/Mobility|planning-heavy|OPEN/i);
  });
});

describe('buildHistoryBrief', () => {
  it('returns explicit empty message when history is empty', () => {
    expect(buildHistoryBrief([], 'fr')).toMatch(/aucun/);
    expect(buildHistoryBrief([], 'en')).toMatch(/none/);
  });

  it('renders history items', () => {
    const txt = buildHistoryBrief(
      [
        {
          archetypeId: 1,
          archetypeTitle: 'Le Voyage',
          category: 'spatial_adventure',
          status: 'completed',
          generatedTitle: 'Embarquement Surprise',
          generatedMission: 'Prends un train au hasard et raconte ton trajet.',
          questDate: '2025-04-18',
        },
      ],
      'fr',
    );
    expect(txt).toContain('Embarquement Surprise');
    expect(txt).toContain('complétée');
  });
});

describe('buildCreativeConstraints', () => {
  it('lists creative brief with primary category and inspirations', () => {
    const input = buildInput();
    const txt = buildCreativeConstraints(
      input.questParameters,
      'fr',
      input.context,
      buildProfile().phase,
    );
    expect(txt).toContain('CONSIGNE CRÉATIVE');
    expect(txt).toContain(input.questParameters.primaryCategory);
    expect(txt).toMatch(/Étincelles taxonomie/i);
  });
});

describe('buildSystemPrompt', () => {
  it('FR system prompt includes guardrails', () => {
    const sys = buildSystemPrompt('fr');
    expect(sys).toContain('Questia');
    expect(sys).toContain('JSON strict');
  });

  it('EN system prompt is in English', () => {
    const sys = buildSystemPrompt('en');
    expect(sys).toContain('Questia');
    expect(sys).toContain('JSON');
  });
});

describe('buildUserPrompt', () => {
  it('includes profile, history, creative brief, and city when GPS is on', () => {
    const input = buildInput();
    const prompt = buildUserPrompt(input);
    expect(prompt).toContain('PROFIL UTILISATEUR');
    expect(prompt).toContain('CONSIGNE CRÉATIVE');
    expect(prompt).toContain('HISTORIQUE');
    expect(prompt).toContain('Lyon');
    expect(prompt).toContain('psychologicalCategory');
  });

  it('forbids city mention when no GPS', () => {
    const input = buildInput({
      context: {
        questDateIso: '2025-04-19',
        city: 'Paris',
        country: 'France',
        weatherDescription: 'pluie',
        weatherIcon: 'CloudRain',
        temp: 12,
        isOutdoorFriendly: false,
        hasUserLocation: false,
        questDurationMinMinutes: 5,
        questDurationMaxMinutes: 1440,
      },
    });
    const prompt = buildUserPrompt(input);
    expect(prompt).toMatch(/non partagée/);
    expect(prompt).toMatch(/NE CITE PAS/);
  });

  it('flags reroll mode', () => {
    const input = buildInput({ isReroll: true });
    expect(buildUserPrompt(input)).toContain('RELANCE');
  });

  it('includes repair hint when provided', () => {
    const input = buildInput();
    const prompt = buildUserPrompt(input, 'mission too long');
    expect(prompt).toContain('CORRECTION DEMANDÉE');
    expect(prompt).toContain('mission too long');
  });

  it('inclut la plage de durée utilisateur', () => {
    const input = buildInput({
      context: {
        questDateIso: '2025-04-19',
        city: 'Lyon',
        country: 'France',
        weatherDescription: 'ciel dégagé',
        weatherIcon: 'Sun',
        temp: 18,
        isOutdoorFriendly: true,
        hasUserLocation: true,
        questDurationMinMinutes: 20,
        questDurationMaxMinutes: 90,
      },
    });
    expect(buildUserPrompt(input)).toContain('20');
    expect(buildUserPrompt(input)).toContain('90');
    expect(buildUserPrompt(input)).toMatch(/DURÉE DE QUÊTE|QUEST DURATION/);
  });
});

describe('clampToOneSentence', () => {
  it('keeps the first sentence', () => {
    expect(clampToOneSentence('Va au parc. Et ensuite cours.')).toBe('Va au parc.');
  });

  it('trims by semicolon', () => {
    expect(clampToOneSentence('Va au parc ; ensuite cours.')).toBe('Va au parc');
  });

  it('clips at 300 chars', () => {
    const long = 'a'.repeat(400);
    expect(clampToOneSentence(long).length).toBeLessThanOrEqual(300);
  });
});

describe('parseGeneratedJson', () => {
  const archetype = TEST_QUEST_TAXONOMY[1]!;
  const defaultDur = 30;

  it('parses a well-formed JSON', () => {
    const raw = JSON.stringify({
      psychologicalCategory: archetype.category,
      requiresSocial: false,
      icon: 'Coffee',
      title: 'Le Dîner Suspendu',
      mission: 'Va dîner seul·e dans un restaurant à Lyon, téléphone éteint.',
      hook: 'Une heure rien que pour toi.',
      duration: '1h',
      isOutdoor: false,
      safetyNote: null,
      destinationLabel: null,
      destinationQuery: null,
      selectionReason: 'profil introspectif aujourd\'hui',
      selfFitScore: 78,
    });
    const parsed = parseGeneratedJson(raw, false, defaultDur);
    expect(parsed.psychologicalCategory).toBe(archetype.category);
    expect(parsed.icon).toBe('Coffee');
    expect(parsed.selfFitScore).toBe(78);
  });

  it('throws if psychologicalCategory is missing', () => {
    const raw = JSON.stringify({ icon: 'Coffee', title: 'x', mission: 'y', hook: 'z' });
    expect(() => parseGeneratedJson(raw, false, defaultDur)).toThrow();
  });

  it('falls back to Target icon when icon is invalid', () => {
    const raw = JSON.stringify({
      psychologicalCategory: archetype.category,
      requiresSocial: false,
      icon: 'NotAnIcon',
      title: 'A title',
      mission: 'Do something concrete now.',
      hook: 'Just go.',
    });
    const parsed = parseGeneratedJson(raw, false, defaultDur);
    expect(parsed.icon).toBe('Target');
  });
});

describe('validateGenerated', () => {
  const archetype = TEST_QUEST_TAXONOMY[1]!;
  const engineCat = archetype.category;

  function valid(): ParsedGenerationBody {
    return {
      psychologicalCategory: engineCat,
      requiresSocial: false,
      icon: 'Coffee',
      title: 'Le Dîner Suspendu',
      mission: 'Va dîner seul·e dans un restaurant à Lyon, téléphone éteint.',
      hook: 'Une heure rien que pour toi.',
      duration: '1h',
      isOutdoor: false,
      safetyNote: null,
      destinationLabel: null,
      destinationQuery: null,
      selectionReason: null,
      selfFitScore: null,
    };
  }

  it('accepts a valid quest', () => {
    const r = validateGenerated(valid(), engineCat, 'fr', 'Lyon', false);
    expect(r.ok).toBe(true);
  });

  it('rejects psychologicalCategory mismatch', () => {
    const r = validateGenerated({ ...valid(), psychologicalCategory: 'spatial_adventure' }, engineCat, 'fr', 'Lyon', false);
    expect(r.ok).toBe(false);
  });

  it('rejects multi-sentence mission', () => {
    const r = validateGenerated(
      { ...valid(), mission: 'Va à Lyon. Ensuite mange.' },
      engineCat,
      'fr',
      'Lyon',
      false,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects too long mission', () => {
    const r = validateGenerated(
      { ...valid(), mission: 'a'.repeat(400) + ' à Lyon' },
      engineCat,
      'fr',
      'Lyon',
      false,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects vague mission about life', () => {
    const r = validateGenerated(
      { ...valid(), mission: 'Réfléchis à ta vie depuis Lyon.' },
      engineCat,
      'fr',
      'Lyon',
      false,
    );
    expect(r.ok).toBe(false);
  });

  it('requires city mention if city is real', () => {
    const r = validateGenerated(
      { ...valid(), mission: 'Va dîner seul·e dans un restaurant calme, téléphone éteint.' },
      engineCat,
      'fr',
      'Lyon',
      false,
    );
    expect(r.ok).toBe(false);
  });

  it('outdoor needs destinationLabel + destinationQuery', () => {
    const outdoorArch = TEST_QUEST_TAXONOMY.find((q) => q.requiresOutdoor)!;
    const r = validateGenerated(
      {
        ...valid(),
        psychologicalCategory: outdoorArch.category,
        isOutdoor: true,
        destinationLabel: '',
        destinationQuery: '',
        mission: 'Va marcher dans le parc proche à Lyon.',
      },
      outdoorArch.category,
      'fr',
      'Lyon',
      true,
    );
    expect(r.ok).toBe(false);
  });
});

describe('buildFallbackQuest', () => {
  it('builds a fallback from the primary category pool', () => {
    const input = buildInput();
    const fb = buildFallbackQuest(
      input.questParameters.fallbackArchetypePool,
      input.taxonomy,
      input.questParameters.primaryCategory,
      'fr',
      input.context,
      input.generationSeed,
    );
    expect(fb.wasFallback).toBe(true);
    expect(fb.psychologicalCategory).toBe(input.questParameters.primaryCategory);
    expect(fb.title.length).toBeGreaterThan(0);
    expect(fb.mission.length).toBeGreaterThan(0);
  });
});

// Re-export to silence unused symbols
void buildProfile;
void buildInput;
void TEST_QUEST_TAXONOMY;
void HOMEBODY_CAUTIOUS;
void NEUTRAL;
void buildQuestParameters;
