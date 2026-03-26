import { describe, expect, it } from 'vitest';
import { QUEST_SYSTEM_GUARDRAILS, truncateForPrompt } from './promptGuardrails';

describe('promptGuardrails', () => {
  it('QUEST_SYSTEM_GUARDRAILS contient les thèmes attendus', () => {
    expect(QUEST_SYSTEM_GUARDRAILS).toContain('Garde-fous obligatoires');
    expect(QUEST_SYSTEM_GUARDRAILS).toContain('légales');
  });

  describe('truncateForPrompt', () => {
    it('retourne undefined pour null / undefined / chaîne vide', () => {
      expect(truncateForPrompt(null, 10)).toBeUndefined();
      expect(truncateForPrompt(undefined, 10)).toBeUndefined();
      expect(truncateForPrompt('', 10)).toBeUndefined();
      expect(truncateForPrompt('   ', 10)).toBe('');
    });

    it('retourne la chaîne trimée si sous la limite', () => {
      expect(truncateForPrompt('  hello  ', 10)).toBe('hello');
      expect(truncateForPrompt('abc', 5)).toBe('abc');
    });

    it('tronque avec ellipse si au-dessus de la limite', () => {
      expect(truncateForPrompt('abcdefghij', 4)).toBe('abcd…');
      expect(truncateForPrompt('hello world', 5)).toBe('hello…');
    });
  });
});
