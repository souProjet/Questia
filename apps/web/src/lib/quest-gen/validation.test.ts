import { describe, expect, it } from 'vitest';
import type { QuestModel } from '@questia/shared';
import { TEST_QUEST_TAXONOMY } from '@questia/shared';
import { validateGenerated, clampToOneSentence } from './validation';

describe('validateGenerated — branches complémentaires', () => {
  const base = TEST_QUEST_TAXONOMY[1]!;
  const ids = [base.id];

  function v(over: Partial<Parameters<typeof validateGenerated>[0]> = {}) {
    return {
      archetypeId: base.id,
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
      wasFallback: false,
      ...over,
    } satisfies Parameters<typeof validateGenerated>[0];
  }

  it('rejette une icône hors liste', () => {
    const r = validateGenerated(v({ icon: 'NotInList' }), ids, base, 'fr', 'Lyon', false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('liste');
  });

  it('rejette titre trop court ou trop long', () => {
    expect(validateGenerated(v({ title: 'ab' }), ids, base, 'fr', 'Lyon', false).ok).toBe(false);
    expect(validateGenerated(v({ title: 'x'.repeat(91) }), ids, base, 'fr', 'Lyon', false).ok).toBe(
      false,
    );
  });

  it('rejette mission vide, multiligne, point-virgule', () => {
    expect(validateGenerated(v({ mission: '   ' }), ids, base, 'fr', 'Lyon', false).ok).toBe(false);
    expect(
      validateGenerated(v({ mission: 'Ligne 1\nLigne 2 à Lyon.' }), ids, base, 'fr', 'Lyon', false).ok,
    ).toBe(false);
    expect(
      validateGenerated(v({ mission: 'Fais A ; puis B à Lyon.' }), ids, base, 'fr', 'Lyon', false).ok,
    ).toBe(false);
  });

  it('rejette mission avec trop de mots', () => {
    const many = Array.from({ length: 55 }, () => 'a').join(' ');
    const r = validateGenerated(v({ mission: `${many} à Lyon.` }), ids, base, 'fr', 'Lyon', false);
    expect(r.ok).toBe(false);
  });

  it('messages EN pour archetypeId hors liste', () => {
    const r = validateGenerated(v({ archetypeId: 999 }), ids, base, 'en', null, false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/candidate|list/i);
  });

  it('rejette patterns meta « futur toi » (FR / EN)', () => {
    expect(
      validateGenerated(
        v({ mission: 'Imagine le toi du futur en marchant à Lyon.' }),
        ids,
        base,
        'fr',
        'Lyon',
        false,
      ).ok,
    ).toBe(false);
    expect(
      validateGenerated(
        v({ mission: 'Write a note to your future self in Lyon.' }),
        ids,
        base,
        'en',
        'Lyon',
        false,
      ).ok,
    ).toBe(false);
  });

  it('hook trop court ou trop de mots', () => {
    expect(validateGenerated(v({ hook: 'court' }), ids, base, 'fr', 'Lyon', false).ok).toBe(false);
    const longHook = Array.from({ length: 30 }, () => 'word').join(' ');
    expect(validateGenerated(v({ hook: longHook }), ids, base, 'fr', 'Lyon', false).ok).toBe(false);
  });

  it('extérieur : placeholder destinationLabel', () => {
    const outdoor = TEST_QUEST_TAXONOMY.find((q) => q.requiresOutdoor) ?? base;
    const r = validateGenerated(
      v({
        archetypeId: outdoor.id,
        isOutdoor: true,
        destinationLabel: 'lieu',
        destinationQuery: 'parc central ville',
        mission: 'Marche vers ce lieu à Lyon.',
      }),
      [outdoor.id],
      outdoor,
      'fr',
      'Lyon',
      true,
    );
    expect(r.ok).toBe(false);
  });

  it('archétype social sans interaction dans la mission', () => {
    const socialArch: QuestModel = { ...base, requiresSocial: true };
    const r = validateGenerated(
      v({
        mission: 'Reste chez toi à Lyon en silence sans aucun contact.',
        archetypeId: socialArch.id,
      }),
      [socialArch.id],
      socialArch,
      'fr',
      'Lyon',
      false,
    );
    expect(r.ok).toBe(false);
  });

  it('ignore la contrainte ville pour « ta ville »', () => {
    const r = validateGenerated(
      v({ mission: 'Va marcher trente minutes.' }),
      ids,
      base,
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
