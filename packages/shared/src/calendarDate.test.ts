import { describe, expect, it } from 'vitest';
import { calendarDateInTimeZone, getQuestCalendarDateNow, QUEST_CALENDAR_TIMEZONE } from './calendarDate';

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
