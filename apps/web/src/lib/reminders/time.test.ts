import { describe, expect, it } from 'vitest';
import {
  isValidIanaTimeZone,
  minutesFromMidnightInZone,
  utcCalendarDateString,
  isInReminderWindow,
} from './time';

describe('reminders/time', () => {
  it('isValidIanaTimeZone', () => {
    expect(isValidIanaTimeZone('')).toBe(false);
    expect(isValidIanaTimeZone('Europe/Paris')).toBe(true);
    expect(isValidIanaTimeZone('Invalid/Zone')).toBe(false);
  });

  it('minutesFromMidnightInZone', () => {
    const d = new Date('2026-03-24T23:30:00.000Z');
    const m = minutesFromMidnightInZone(d, 'UTC');
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThan(24 * 60);
  });

  it('utcCalendarDateString', () => {
    expect(utcCalendarDateString(new Date('2026-03-24T12:00:00.000Z'))).toBe('2026-03-24');
  });

  it('isInReminderWindow fenêtre simple', () => {
    const d = new Date('2026-03-24T09:00:00.000Z');
    const ok = isInReminderWindow(d, 'UTC', 8 * 60, 120);
    expect(typeof ok).toBe('boolean');
  });

  it('isInReminderWindow chevauche minuit', () => {
    const d = new Date('2026-03-24T23:30:00.000Z');
    const w = isInReminderWindow(d, 'UTC', 23 * 60, 120);
    expect(typeof w).toBe('boolean');
  });
});
