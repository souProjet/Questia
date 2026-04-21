import { describe, expect, it } from 'vitest';
import {
  calendarDateInTimeZone,
  calendarDaysBetweenUtc,
  getQuestCalendarDateForInstant,
  getQuestCalendarDateNow,
  QUEST_CALENDAR_TIMEZONE,
} from './calendarDate';

describe('calendarDateInTimeZone', () => {
  it('retourne AAAA-MM-JJ', () => {
    const s = calendarDateInTimeZone(new Date('2026-03-26T12:00:00Z'), QUEST_CALENDAR_TIMEZONE);
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getQuestCalendarDateNow', () => {
  it('format ISO date', () => {
    expect(getQuestCalendarDateNow()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getQuestCalendarDateForInstant', () => {
  it('aligne sur Paris, pas sur le jour UTC', () => {
    expect(getQuestCalendarDateForInstant(new Date('2026-05-31T22:30:00.000Z'))).toBe('2026-06-01');
  });
});

describe('calendarDaysBetweenUtc', () => {
  it('compte les jours entre deux dates ISO', () => {
    expect(calendarDaysBetweenUtc('2026-05-25', '2026-06-01')).toBe(7);
    expect(calendarDaysBetweenUtc('2026-06-01', '2026-06-01')).toBe(0);
  });

  it('retourne -1 si format invalide', () => {
    expect(calendarDaysBetweenUtc('nope', '2026-06-01')).toBe(-1);
  });
});
