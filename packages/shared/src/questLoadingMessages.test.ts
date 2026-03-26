import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  getDailyQuestLoadingLines,
  resolveQuestLoaderSession,
} from './questLoadingMessages';

describe('resolveQuestLoaderSession', () => {
  it('first-today si jamais ouvert ou autre jour', () => {
    expect(resolveQuestLoaderSession(null, '2026-06-15')).toBe('first-today');
    expect(resolveQuestLoaderSession(undefined, '2026-06-15')).toBe('first-today');
    expect(resolveQuestLoaderSession('2026-06-14', '2026-06-15')).toBe('first-today');
  });
  it('returning-today si même jour', () => {
    expect(resolveQuestLoaderSession('2026-06-15', '2026-06-15')).toBe('returning-today');
  });
});

describe('getDailyQuestLoadingLines', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne primary et secondary non vides', () => {
    const { primary, secondary } = getDailyQuestLoadingLines('2026-06-15');
    expect(primary.length).toBeGreaterThan(5);
    expect(secondary.length).toBeGreaterThan(5);
  });

  it('est déterministe pour une date ISO donnée (first-today)', () => {
    const a = getDailyQuestLoadingLines('2026-03-01', 'first-today');
    const b = getDailyQuestLoadingLines('2026-03-01', 'first-today');
    expect(a).toEqual(b);
  });

  it('diffère selon first-today vs returning-today pour la même date', () => {
    const first = getDailyQuestLoadingLines('2026-06-10', 'first-today');
    const ret = getDailyQuestLoadingLines('2026-06-10', 'returning-today');
    expect(first.primary).not.toBe(ret.primary);
    expect(first.secondary).not.toBe(ret.secondary);
  });

  it('peut varier selon la date (session fixe)', () => {
    expect(getDailyQuestLoadingLines('2026-03-01', 'first-today').primary).not.toBe(
      getDailyQuestLoadingLines('2026-03-02', 'first-today').primary,
    );
  });

  it('ignore une date mal formée et se comporte comme sans argument', () => {
    const spy = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-12-25T12:00:00.000Z');
    const bad = getDailyQuestLoadingLines('pas-une-date');
    const fallback = getDailyQuestLoadingLines();
    expect(bad).toEqual(fallback);
    spy.mockRestore();
  });

  it('first-today mentionne quête ou jour', () => {
    const { primary } = getDailyQuestLoadingLines('2026-01-01', 'first-today');
    expect(primary.toLowerCase()).toMatch(/quête|jour|carte|session|mission/);
  });

  it('returning-today évoque reprise ou recharge', () => {
    const { primary } = getDailyQuestLoadingLines('2026-01-01', 'returning-today');
    expect(primary.length).toBeGreaterThan(8);
  });
});
