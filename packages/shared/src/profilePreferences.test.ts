import { describe, expect, it } from 'vitest';
import {
  clampQuestDurationBounds,
  parseHeavyQuestPreference,
  parseReminderCadence,
} from './profilePreferences';

describe('parseHeavyQuestPreference', () => {
  it('normalise low / balanced / high', () => {
    expect(parseHeavyQuestPreference('low')).toBe('low');
    expect(parseHeavyQuestPreference('HIGH')).toBe('high');
    expect(parseHeavyQuestPreference(null)).toBe('balanced');
    expect(parseHeavyQuestPreference('nope')).toBe('balanced');
  });
});

describe('parseReminderCadence', () => {
  it('normalise les valeurs connues', () => {
    expect(parseReminderCadence('weekly')).toBe('weekly');
    expect(parseReminderCadence('MONTHLY')).toBe('monthly');
    expect(parseReminderCadence(null)).toBe('daily');
    expect(parseReminderCadence('unknown')).toBe('daily');
  });
});

describe('clampQuestDurationBounds', () => {
  it('borne et ordonne min/max', () => {
    expect(clampQuestDurationBounds(90, 30)).toEqual({
      questDurationMinMinutes: 30,
      questDurationMaxMinutes: 90,
    });
  });

  it('applique les plages absolues', () => {
    expect(clampQuestDurationBounds(1, 2000)).toEqual({
      questDurationMinMinutes: 5,
      questDurationMaxMinutes: 1440,
    });
  });
});
