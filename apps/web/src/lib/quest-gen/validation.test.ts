import { describe, expect, it } from 'vitest';
import type { ParsedGenerationBody } from './types';
import { TEST_QUEST_TAXONOMY } from '@questia/shared';
import { validateGenerated, clampToOneSentence } from './validation';

describe('validateGenerated — branches complémentaires', () => {
  const base = TEST_QUEST_TAXONOMY[1]!;
  const engineCat = base.category;

  function v(over: Partial<ParsedGenerationBody> = {}): ParsedGenerationBody {
    return {
      psychologicalCategory: engineCat,
      requiresSocial: false,
      icon: 'Coffee',
      title: 'Titre OK',
      mission: 'Va au marché à Lyon et achète un fruit.',
      hook: 'Assez long.',
      duration: '30 min',
      isOutdoor: false,
      safetyNote: null,
      destinationLabel: null,
      destinationQuery: null,
      selectionReason: null,
      selfFitScore: null,
      ...over,
    };
  }

  it('rejette une icône hors liste', () => {
    const r = validateGenerated(v({ icon: 'NotInList' }), engineCat, 'fr', 'Lyon', false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('liste');
  });

  it('rejette titre trop court ou trop long', () => {
    expect(validateGenerated(v({ title: 'ab' }), engineCat, 'fr', 'Lyon', false).ok).toBe(false);
    expect(validateGenerated(v({ title: 'x'.repeat(91) }), engineCat, 'fr', 'Lyon', false).ok).toBe(
      false,
    );
  });

  it('rejette mission vide, multiligne, point-virgule', () => {
    expect(validateGenerated(v({ mission: '   ' }), engineCat, 'fr', 'Lyon', false).ok).toBe(false);
    expect(
      validateGenerated(v({ mission: 'Ligne 1\nLigne 2 à Lyon.' }), engineCat, 'fr', 'Lyon', false).ok,
    ).toBe(false);
    expect(
      validateGenerated(v({ mission: 'Fais A ; puis B à Lyon.' }), engineCat, 'fr', 'Lyon', false).ok,
    ).toBe(false);
  });

  it('rejette mission avec trop de mots', () => {
    const many = Array.from({ length: 55 }, () => 'a').join(' ');
    const r = validateGenerated(v({ mission: `${many} à Lyon.` }), engineCat, 'fr', 'Lyon', false);
    expect(r.ok).toBe(false);
  });

  it('rejette une formulation d\'achat obligatoire', () => {
    const r = validateGenerated(
      v({ mission: 'Effectue un achat obligatoire de plus de 10 € à Lyon pour valider la quête.' }),
      engineCat,
      'fr',
      'Lyon',
      false,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/achat|dépense|money/i);
  });

  it('messages EN pour psychologicalCategory différent du moteur', () => {
    const r = validateGenerated(v({ psychologicalCategory: 'spatial_adventure' }), engineCat, 'en', null, false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/psychologicalCategory|engine/i);
  });

  it('rejette patterns meta « futur toi » (FR / EN)', () => {
    expect(
      validateGenerated(
        v({ mission: 'Imagine le toi du futur en marchant à Lyon.' }),
        engineCat,
        'fr',
        'Lyon',
        false,
      ).ok,
    ).toBe(false);
    expect(
      validateGenerated(
        v({ mission: 'Write a note to your future self in Lyon.' }),
        engineCat,
        'en',
        'Lyon',
        false,
      ).ok,
    ).toBe(false);
  });

  it('hook trop court ou trop de mots', () => {
    expect(validateGenerated(v({ hook: 'court' }), engineCat, 'fr', 'Lyon', false).ok).toBe(false);
    const longHook = Array.from({ length: 30 }, () => 'word').join(' ');
    expect(validateGenerated(v({ hook: longHook }), engineCat, 'fr', 'Lyon', false).ok).toBe(false);
  });

  it('extérieur : placeholder destinationLabel', () => {
    const outdoor = TEST_QUEST_TAXONOMY.find((q) => q.requiresOutdoor) ?? base;
    const r = validateGenerated(
      v({
        psychologicalCategory: outdoor.category,
        isOutdoor: true,
        destinationLabel: 'lieu',
        destinationQuery: 'parc central ville',
        mission: 'Marche vers ce lieu à Lyon.',
      }),
      outdoor.category,
      'fr',
      'Lyon',
      true,
    );
    expect(r.ok).toBe(false);
  });

  it('requiresSocial sans interaction dans la mission', () => {
    const r = validateGenerated(
      v({
        mission: 'Reste chez toi à Lyon en silence sans aucun contact.',
        requiresSocial: true,
      }),
      engineCat,
      'fr',
      'Lyon',
      false,
    );
    expect(r.ok).toBe(false);
  });

  it('ignore la contrainte ville pour « ta ville »', () => {
    const r = validateGenerated(
      v({ mission: 'Va marcher trente minutes.' }),
      engineCat,
      'fr',
      'ta ville',
      false,
    );
    expect(r.ok).toBe(true);
  });
});

describe('clampToOneSentence', () => {
  it('vide, une phrase, point-virgule, tronqué', () => {
    expect(clampToOneSentence('')).toBe('');
    expect(clampToOneSentence('  ')).toBe('');
    expect(clampToOneSentence('Une seule. Deuxième.')).toBe('Une seule.');
    expect(clampToOneSentence('A ; B')).toBe('A');
    const long = `${'mot '.repeat(200)}fini.`;
    const out = clampToOneSentence(long);
    expect(out.length).toBeLessThanOrEqual(300);
  });
});
