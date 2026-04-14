import { describe, expect, it } from 'vitest';
import {
  calendarDateInTimeZone,
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
