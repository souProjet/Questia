import { describe, expect, it } from 'vitest';
import {
  BADGE_CATEGORY_LABEL_FR,
  BADGE_DEFINITIONS,
  getBadgeDefinition,
  displayEarnedBadges,
  getBadgeCatalogForUi,
  evaluateNewBadges,
  type BadgeEvaluationStats,
} from './badges';

describe('badges — constantes', () => {
  it('couvre les libellés de catégorie', () => {
    const keys = Object.keys(BADGE_CATEGORY_LABEL_FR);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      expect(BADGE_CATEGORY_LABEL_FR[k as keyof typeof BADGE_CATEGORY_LABEL_FR].length).toBeGreaterThan(0);
    }
  });
  it('BADGE_DEFINITIONS a des ids uniques', () => {
    const ids = new Set(BADGE_DEFINITIONS.map((b) => b.id));
    expect(ids.size).toBe(BADGE_DEFINITIONS.length);
  });
});

describe('getBadgeDefinition', () => {
  it('trouve une définition connue', () => {
    expect(getBadgeDefinition('premiere_quete')?.title).toBeDefined();
  });
  it('undefined pour id inconnu', () => {
    expect(getBadgeDefinition('nope')).toBeUndefined();
  });
});

describe('displayEarnedBadges', () => {
  it('retourne [] si non tableau', () => {
    expect(displayEarnedBadges(null)).toEqual([]);
    expect(displayEarnedBadges({})).toEqual([]);
  });
  it('filtre et enrichit les entrées valides', () => {
    const rows = displayEarnedBadges([
      { id: 'premiere_quete', unlockedAt: '2025-01-01T00:00:00.000Z' },
      { id: 'inconnu', unlockedAt: '2025-01-02T00:00:00.000Z' },
      { foo: 'bar' },
    ]);
    expect(rows.some((r) => r.id === 'premiere_quete')).toBe(true);
    expect(rows.find((r) => r.id === 'inconnu')?.title).toBe('inconnu');
  });
});

describe('getBadgeCatalogForUi', () => {
  it('liste tout le catalogue avec état verrouillé', () => {
    const cat = getBadgeCatalogForUi([]);
    expect(cat.length).toBe(BADGE_DEFINITIONS.length);
    expect(cat.every((c) => c.unlocked === false)).toBe(true);
  });
  it('marque débloqué avec dates', () => {
    const cat = getBadgeCatalogForUi([{ id: 'serie_3', unlockedAt: '2025-01-01' }]);
    const row = cat.find((c) => c.id === 'serie_3');
    expect(row?.unlocked).toBe(true);
    expect(row?.unlockedAt).toBe('2025-01-01');
  });
  it('localise titre et critère en anglais', () => {
    const cat = getBadgeCatalogForUi([], 'en');
    const row = cat.find((c) => c.id === 'serie_3');
    expect(row?.title).toBe('First momentum');
    expect(row?.criteria).toContain('3-day streak');
  });
});

function stats(p: Partial<BadgeEvaluationStats>): BadgeEvaluationStats {
  return {
    totalCompletions: 0,
    outdoorCompletions: 0,
    currentStreak: 0,
    currentDay: 1,
    currentPhase: 'calibration',
    explorerAxis: 'explorer',
    riskAxis: 'cautious',
    ...p,
  };
}

describe('evaluateNewBadges', () => {
  it('ne duplique pas les badges déjà possédés', () => {
    const existing = new Set<string>(['premiere_quete']);
    const out = evaluateNewBadges(existing, stats({ totalCompletions: 0 }), '2025-01-01T00:00:00.000Z');
    expect(out.some((b) => b.id === 'premiere_quete')).toBe(false);
  });

  it('débloque volume, série, phases, extérieur et quadrants', () => {
    const s = stats({
      totalCompletions: 100,
      outdoorCompletions: 50,
      currentStreak: 60,
      currentDay: 60,
      currentPhase: 'rupture',
      explorerAxis: 'explorer',
      riskAxis: 'risktaker',
    });
    const out = evaluateNewBadges(new Set(), s, '2025-01-01T00:00:00.000Z');
    const ids = new Set(out.map((b) => b.id));
    expect(ids.has('cent_quetes')).toBe(true);
    expect(ids.has('exterieur_50')).toBe(true);
    expect(ids.has('serie_60')).toBe(true);
    expect(ids.has('phase_rupture')).toBe(true);
    expect(ids.has('parcours_jour_60')).toBe(true);
    expect(ids.has('quadrant_audacieux')).toBe(true);
  });

  it('phase_rupture si jour < 11 mais phase rupture', () => {
    const out = evaluateNewBadges(
      new Set(),
      stats({ currentDay: 5, currentPhase: 'rupture' }),
      'iso',
    );
    expect(out.some((b) => b.id === 'phase_rupture')).toBe(true);
  });

  it('quadrant homebody + risktaker', () => {
    const out = evaluateNewBadges(
      new Set(),
      stats({
        totalCompletions: 15,
        explorerAxis: 'homebody',
        riskAxis: 'risktaker',
      }),
      'iso',
    );
    expect(out.some((b) => b.id === 'quadrant_homebody_risktaker')).toBe(true);
  });
});
