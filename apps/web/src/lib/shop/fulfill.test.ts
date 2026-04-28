import { describe, expect, it, vi } from 'vitest';
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
});
