import { describe, expect, it } from 'vitest';
import {
  PHASE_BOUNDARIES,
  getPhaseForDay,
  shouldDowngrade,
  getEffectivePhase,
  shouldUpscale,
  DAILY_FREE_REROLLS,
  MAX_REROLLS_PER_DAY,
} from './escalation';
import type { QuestLog } from '../types';

describe('PHASE_BOUNDARIES', () => {
  it('expose des bornes cohérentes', () => {
    expect(PHASE_BOUNDARIES.calibration.end).toBeLessThan(PHASE_BOUNDARIES.expansion.start);
    expect(DAILY_FREE_REROLLS).toBe(1);
    expect(MAX_REROLLS_PER_DAY).toBe(3);
  });
});

describe('getPhaseForDay', () => {
  it('calibration jours 1–3', () => {
    expect(getPhaseForDay(1)).toBe('calibration');
    expect(getPhaseForDay(3)).toBe('calibration');
  });
  it('expansion jours 4–10', () => {
    expect(getPhaseForDay(4)).toBe('expansion');
    expect(getPhaseForDay(10)).toBe('expansion');
  });
  it('rupture jour 11+', () => {
    expect(getPhaseForDay(11)).toBe('rupture');
    expect(getPhaseForDay(99)).toBe('rupture');
  });
});

function minimalLog(overrides?: Partial<QuestLog>): QuestLog {
  return {
    id: '',
    userId: '',
    questId: 1,
    assignedAt: '',
    status: 'completed',
    congruenceDeltaAtAssignment: 0,
    phaseAtAssignment: 'calibration',
    wasRerolled: false,
    wasFallback: false,
    safetyConsentGiven: false,
    ...overrides,
  };
}

describe('shouldDowngrade', () => {
  it('false en calibration (déjà au minimum)', () => {
    expect(shouldDowngrade('calibration', [])).toBe(false);
  });

  it('false en rupture sans assez de rejets', () => {
    const logs: QuestLog[] = [minimalLog({ status: 'rejected' })];
    expect(shouldDowngrade('rupture', logs)).toBe(false);
  });

  it('true en rupture avec 2+ rejets récents', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'rejected' }),
      minimalLog({ status: 'rejected' }),
    ];
    expect(shouldDowngrade('rupture', logs)).toBe(true);
  });

  it('true en expansion avec 3+ rejets récents', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'rejected' }),
      minimalLog({ status: 'rejected' }),
      minimalLog({ status: 'rejected' }),
    ];
    expect(shouldDowngrade('expansion', logs)).toBe(true);
  });

  it('false en expansion avec seulement 2 rejets', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'rejected' }),
      minimalLog({ status: 'rejected' }),
    ];
    expect(shouldDowngrade('expansion', logs)).toBe(false);
  });

  it('filtre par fenêtre temporelle quand todayIso est fourni', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'rejected', questDate: '2026-04-16' }),
      minimalLog({ status: 'rejected', questDate: '2026-04-10' }),
    ];
    expect(shouldDowngrade('rupture', logs, '2026-04-16')).toBe(false);
    expect(shouldDowngrade('rupture', logs)).toBe(true);
  });
});

describe('getEffectivePhase', () => {
  it("retourne la phase naturelle en l'absence de downgrade", () => {
    expect(getEffectivePhase(5, [])).toBe('expansion');
  });

  it('passe en expansion si downgrade en rupture', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'rejected' }),
      minimalLog({ status: 'rejected' }),
    ];
    expect(getEffectivePhase(12, logs)).toBe('expansion');
  });

  it('passe en calibration si downgrade en expansion', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'rejected' }),
      minimalLog({ status: 'rejected' }),
      minimalLog({ status: 'rejected' }),
    ];
    expect(getEffectivePhase(6, logs)).toBe('calibration');
  });
});

describe('shouldUpscale', () => {
  it('false si déjà en rupture', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'completed' }),
      minimalLog({ status: 'completed' }),
      minimalLog({ status: 'completed' }),
    ];
    expect(shouldUpscale('rupture', logs)).toBe(false);
  });

  it('true en calibration avec 3+ complétions consécutives', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'completed' }),
      minimalLog({ status: 'completed' }),
      minimalLog({ status: 'completed' }),
    ];
    expect(shouldUpscale('calibration', logs)).toBe(true);
  });

  it('false si série de complétions cassée par un rejet', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'completed' }),
      minimalLog({ status: 'rejected' }),
      minimalLog({ status: 'completed' }),
      minimalLog({ status: 'completed' }),
    ];
    expect(shouldUpscale('calibration', logs)).toBe(false);
  });

  it('false si complétions hors fenêtre temporelle (7 jours)', () => {
    const logs: QuestLog[] = [
      minimalLog({ status: 'completed', questDate: '2026-03-01' }),
      minimalLog({ status: 'completed', questDate: '2026-03-02' }),
      minimalLog({ status: 'completed', questDate: '2026-03-03' }),
    ];
    expect(shouldUpscale('calibration', logs, '2026-04-16')).toBe(false);
    expect(shouldUpscale('calibration', logs)).toBe(true);
  });
});
