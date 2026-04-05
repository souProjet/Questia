import { describe, expect, it } from 'vitest';
import {
  SHOP_CATALOG,
  getShopItem,
  getThemeIds,
  XP_SHOP_BONUS_PER_CHARGE,
} from './catalog';
import {
  hasAllPermanentBundleGrants,
  buildCoinPurchasedSkuSet,
  catalogItemFullyOwned,
} from './bundleOwnership';
import { COIN_PACKS, getCoinPack } from './coinPacks';
import { bonusPercentVsPack, questCoinsPerEuro } from './marketing';
import { getTitleDefinition, TITLE_IDS } from './titles';

describe('catalog', () => {
  it('expose des SKU uniques', () => {
    const skus = SHOP_CATALOG.map((e) => e.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });
  it('getShopItem et getThemeIds', () => {
    expect(getShopItem('nope')).toBeUndefined();
    expect(getShopItem(SHOP_CATALOG[0]!.sku)).toBeDefined();
    expect(getThemeIds()).toContain('default');
    expect(XP_SHOP_BONUS_PER_CHARGE).toBeGreaterThan(0);
  });
});

describe('bundleOwnership', () => {
  const bundle = SHOP_CATALOG.find((c) => c.kind === 'bundle')!;
  it('hasAllPermanentBundleGrants false si non bundle', () => {
    const title = SHOP_CATALOG.find((c) => c.kind === 'title')!;
    expect(hasAllPermanentBundleGrants(title, [], [])).toBe(false);
  });
  it('hasAllPermanentBundleGrants quand tout est possédé', () => {
    expect(
      hasAllPermanentBundleGrants(
        bundle,
        bundle.grants.themes ?? [],
        bundle.grants.titles ?? [],
      ),
    ).toBe(true);
  });
  it('buildCoinPurchasedSkuSet', () => {
    const s = buildCoinPurchasedSkuSet([
      { primarySku: 'a', status: 'paid', entryKind: 'coin_purchase' },
      { primarySku: 'b', status: 'pending', entryKind: 'coin_purchase' },
      { primarySku: 'c', status: 'paid' },
    ]);
    expect(s.has('a')).toBe(true);
    expect(s.has('b')).toBe(false);
  });
  it('catalogItemFullyOwned — reroll et xp toujours false', () => {
    const rr = SHOP_CATALOG.find((c) => c.kind === 'reroll_pack')!;
    const xp = SHOP_CATALOG.find((c) => c.kind === 'xp_booster')!;
    expect(catalogItemFullyOwned(rr, {}, new Set())).toBe(false);
    expect(catalogItemFullyOwned(xp, {}, new Set())).toBe(false);
  });
  it('catalogItemFullyOwned — theme_pack', () => {
    const tp = SHOP_CATALOG.find((c) => c.kind === 'theme_pack')!;
    const owned = { ownedThemes: tp.grants.themes ?? [] };
    expect(catalogItemFullyOwned(tp, owned, new Set())).toBe(true);
    expect(catalogItemFullyOwned(tp, { ownedThemes: [] }, new Set())).toBe(false);
  });
  it('catalogItemFullyOwned — bundle avec achat coin', () => {
    const shop = {
      ownedThemes: bundle.grants.themes,
      ownedTitleIds: bundle.grants.titles,
    };
    expect(catalogItemFullyOwned(bundle, shop, new Set([bundle.sku]))).toBe(true);
  });
  it('catalogItemFullyOwned — title', () => {
    const titleItem = SHOP_CATALOG.find((c) => c.kind === 'title' && c.grants.titles?.length === 1)!;
    expect(
      catalogItemFullyOwned(
        titleItem,
        { ownedTitleIds: titleItem.grants.titles },
        new Set(),
      ),
    ).toBe(true);
  });
});

describe('coinPacks', () => {
  it('getCoinPack', () => {
    expect(getCoinPack('x')).toBeUndefined();
    expect(getCoinPack(COIN_PACKS[0]!.sku)).toBeDefined();
  });
});

describe('marketing', () => {
  it('questCoinsPerEuro et bonusPercentVsPack', () => {
    expect(questCoinsPerEuro(0, 100)).toBe(0);
    expect(questCoinsPerEuro(100, 50)).toBeGreaterThan(0);
    const ref = { priceCents: 499, coinsGranted: 500 };
    const a = bonusPercentVsPack({ priceCents: 999, coinsGranted: 1200 }, ref);
    expect(typeof a).toBe('number');
    expect(bonusPercentVsPack(ref, { priceCents: 0, coinsGranted: 1 })).toBe(0);
  });
});

describe('titles', () => {
  it('registry et getTitleDefinition', () => {
    expect(TITLE_IDS.length).toBeGreaterThan(0);
    expect(getTitleDefinition('scout')?.emoji).toBeDefined();
    expect(getTitleDefinition('zzz')).toBeUndefined();
  });
});
