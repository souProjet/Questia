import { describe, it, expect } from 'vitest';
import type { XpBreakdown } from './engine/xp';
import {
  XP_AFTER_REROLL_MULT,
  XP_PER_QUEST_CAP,
  XP_STREAK_BONUS_CAP,
} from './engine/xp';
import { xpBreakdownRowsFr } from './xpBreakdownUi';

function base(over: Partial<XpBreakdown> = {}): XpBreakdown {
  return {
    basePhase: 'calibration',
    baseRaw: 12,
    baseAfterArchetype: 10,
    explorerAxis: 'explorer',
    riskAxis: 'cautious',
    streakDays: 2,
    streakBonus: 6,
    outdoorBonus: 0,
    fallbackPenalty: 0,
    afterReroll: false,
    subtotalBeforeReroll: 50,
    subtotalAfterReroll: 50,
    cappedTotal: 50,
    ...over,
  };
}

describe('xpBreakdownRowsFr', () => {
  it('inclut phase et profil explorateur prudent', () => {
    const rows = xpBreakdownRowsFr(base());
    expect(rows[0].detail).toContain('Découverte');
    expect(rows[0].detail).toContain('profil explorateur · prudent');
    expect(rows[0].value).toBe('10 XP');
  });

  it('couvre les trois phases d’escalade', () => {
    expect(xpBreakdownRowsFr(base({ basePhase: 'expansion' }))[0].detail).toContain('Exploration');
    expect(xpBreakdownRowsFr(base({ basePhase: 'rupture' }))[0].detail).toContain('Intensité');
  });

  it('couvre les quatre combinaisons archétype / risque', () => {
    expect(
      xpBreakdownRowsFr(base({ explorerAxis: 'explorer', riskAxis: 'risktaker' }))[0].detail,
    ).toContain('profil explorateur · audacieux');
    expect(
      xpBreakdownRowsFr(base({ explorerAxis: 'homebody', riskAxis: 'risktaker' }))[0].detail,
    ).toContain('profil casanier · audacieux');
    expect(
      xpBreakdownRowsFr(base({ explorerAxis: 'homebody', riskAxis: 'cautious' }))[0].detail,
    ).toContain('profil casanier · prudent');
  });

  it('affiche +0 XP quand le bonus de série est nul', () => {
    const rows = xpBreakdownRowsFr(base({ streakBonus: 0, streakDays: 0 }));
    const streak = rows.find((r) => r.key === 'streak');
    expect(streak?.value).toBe('+0 XP');
    expect(streak?.detail).toContain(String(XP_STREAK_BONUS_CAP));
  });

  it('ajoute une ligne bonus extérieur', () => {
    const rows = xpBreakdownRowsFr(base({ outdoorBonus: 8 }));
    expect(rows.some((r) => r.key === 'outdoor')).toBe(true);
  });

  it('ajoute une ligne repli météo', () => {
    const rows = xpBreakdownRowsFr(base({ fallbackPenalty: 5 }));
    expect(rows.some((r) => r.key === 'fallback')).toBe(true);
  });

  it('ajoute une ligne après relance', () => {
    const rows = xpBreakdownRowsFr(
      base({
        afterReroll: true,
        subtotalBeforeReroll: 40,
        subtotalAfterReroll: 30,
      }),
    );
    const reroll = rows.find((r) => r.key === 'reroll');
    expect(reroll?.value).toContain(String(XP_AFTER_REROLL_MULT));
    expect(reroll?.detail).toContain('40');
  });

  it('ajoute une ligne plafond quand le total est plafonné', () => {
    const rows = xpBreakdownRowsFr(
      base({
        subtotalAfterReroll: 200,
        cappedTotal: XP_PER_QUEST_CAP,
      }),
    );
    const cap = rows.find((r) => r.key === 'cap');
    expect(cap?.detail).toContain(String(XP_PER_QUEST_CAP));
  });

  it('ajoute une ligne bonus boutique', () => {
    const rows = xpBreakdownRowsFr(base({ shopBonusXp: 15 }));
    const shop = rows.find((r) => r.key === 'shop');
    expect(shop?.value).toBe('+15 XP');
  });

  it('n’ajoute pas de ligne boutique si bonus absent ou nul', () => {
    expect(xpBreakdownRowsFr(base({ shopBonusXp: 0 })).some((r) => r.key === 'shop')).toBe(false);
    expect(xpBreakdownRowsFr(base({})).some((r) => r.key === 'shop')).toBe(false);
  });
});
