import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getShopItem } from '@questia/shared';
import { applyGrantsToProfile } from './fulfill';

const findUnique = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: {
    profile: { findUnique, update },
  },
}));

describe('applyGrantsToProfile', () => {
  beforeEach(() => {
    findUnique.mockClear();
    update.mockClear();
  });

  it('ne fait rien si profil absent', async () => {
    findUnique.mockResolvedValue(null);
    const item = getShopItem('xp_booster_5')!;
    await applyGrantsToProfile('missing', [item]);
    expect(update).not.toHaveBeenCalled();
  });

  it('fusionne les grants XP et met à jour', async () => {
    findUnique.mockResolvedValue({
      id: 'p1',
      ownedThemes: ['default'],
      bonusRerollCredits: 0,
      ownedTitleIds: [],
      ownedQuestPackIds: [],
      activeThemeId: 'default',
      xpBonusCharges: 2,
    });
    update.mockResolvedValue({});
    const item = getShopItem('xp_booster_5')!;
    await applyGrantsToProfile('p1', [item]);
    expect(update).toHaveBeenCalled();
    const data = (update.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.xpBonusCharges).toBe(7);
  });

  it('applique thèmes, rerolls, titres et packs', async () => {
    findUnique.mockResolvedValue({
      id: 'p1',
      ownedThemes: ['default'],
      bonusRerollCredits: 1,
      ownedTitleIds: ['a'],
      ownedQuestPackIds: ['pack_couple'],
      activeThemeId: 'default',
      xpBonusCharges: 0,
    });
    update.mockResolvedValue({});
    await applyGrantsToProfile('p1', [
      {
        sku: 'x',
        kind: 'bundle',
        name: 't',
        description: '',
        priceCoins: 1,
        icon: 'Gift',
        grants: {
          themes: ['midnight'],
          bonusRerolls: 2,
          titles: ['b'],
          questPackIds: ['pack_paris'],
        },
      },
    ]);
    const data = (update.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    const titles = data.ownedTitleIds as string[];
    const packs = data.ownedQuestPackIds as string[];
    expect(titles).toContain('a');
    expect(titles).toContain('b');
    expect(packs).toContain('pack_couple');
    expect(packs).toContain('pack_paris');
    expect(data.bonusRerollCredits).toBe(3);
  });

  it('réinitialise activeThemeId si le thème actif n’est pas possédé', async () => {
    findUnique.mockResolvedValue({
      id: 'p1',
      ownedThemes: ['default'],
      bonusRerollCredits: 0,
      ownedTitleIds: [],
      ownedQuestPackIds: [],
      activeThemeId: 'midnight',
      xpBonusCharges: 0,
    });
    update.mockResolvedValue({});
    await applyGrantsToProfile('p1', []);
    const data = (update.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.activeThemeId).toBe('default');
  });

  it('ajoute default aux thèmes si absent', async () => {
    findUnique.mockResolvedValue({
      id: 'p1',
      ownedThemes: ['midnight'],
      bonusRerollCredits: 0,
      ownedTitleIds: [],
      ownedQuestPackIds: [],
      activeThemeId: 'midnight',
      xpBonusCharges: 0,
    });
    update.mockResolvedValue({});
    await applyGrantsToProfile('p1', []);
    const data = (update.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.ownedThemes).toEqual(expect.arrayContaining(['default', 'midnight']));
  });
});
