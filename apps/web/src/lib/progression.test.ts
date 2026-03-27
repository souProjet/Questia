import { describe, expect, it } from 'vitest';
import {
  parseBadgesEarned,
  serializeBadges,
  progressionFields,
  badgeIdsSet,
} from './progression';

describe('progression', () => {
  it('parseBadgesEarned filtre les entrées invalides', () => {
    expect(parseBadgesEarned(null)).toEqual([]);
    expect(parseBadgesEarned([{ id: 'a', unlockedAt: 't' }])).toEqual([{ id: 'a', unlockedAt: 't' }]);
  });
  it('serializeBadges délègue à shared', () => {
    const s = serializeBadges([{ id: 'premiere_quete', unlockedAt: '2025-01-01' }]);
    expect(s[0]?.title).toBeDefined();
  });
  it('serializeBadges localise en anglais', () => {
    const s = serializeBadges([{ id: 'premiere_quete', unlockedAt: '2025-01-01' }], 'en');
    expect(s[0]?.title).toBe('First stone');
  });
  it('progressionFields et badgeIdsSet', () => {
    const p = progressionFields(250);
    expect(p.level).toBeGreaterThan(1);
    expect(badgeIdsSet([{ id: 'x', unlockedAt: 'y' }]).has('x')).toBe(true);
  });
});
