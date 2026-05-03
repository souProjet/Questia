import { describe, expect, it } from 'vitest';
import { questAnalyticsId } from './questId';

describe('questAnalyticsId', () => {
  it('concatène date et archétype', () => {
    expect(questAnalyticsId({ questDate: '2026-05-03', archetypeId: 42 })).toBe('2026-05-03_42');
  });
});
