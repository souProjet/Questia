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
    const item = getShopItem('themes_pack_premium')!;
    await applyGrantsToProfile('missing', [item]);
    expect(update).not.toHaveBeenCalled();
  });

  it('fusionne thèmes et met à jour', async () => {
    findUnique.mockResolvedValue({
      id: 'p1',
      ownedThemes: ['default'],
      ownedNarrationPacks: [],
      bonusRerollCredits: 0,
      ownedTitleIds: [],
      activeThemeId: 'default',
      xpBonusCharges: 0,
    });
    update.mockResolvedValue({});
    const item = getShopItem('themes_pack_premium')!;
    await applyGrantsToProfile('p1', [item]);
    expect(update).toHaveBeenCalled();
    const data = (update.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.ownedThemes).toBeDefined();
  });
});
