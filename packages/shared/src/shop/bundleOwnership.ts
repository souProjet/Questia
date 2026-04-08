import type { ShopCatalogEntry } from './catalog';

function themeSetFromOwned(ownedThemes: string[] | undefined): Set<string> {
  const s = new Set(ownedThemes ?? []);
  if (!s.has('default')) s.add('default');
  return s;
}

/**
 * Tous les éléments « permanents » du bundle (thèmes, titres) sont déjà possédés.
 * Ne tient pas compte des charges XP / relances (toujours cumulables via autres articles).
 */
export function hasAllPermanentBundleGrants(
  item: ShopCatalogEntry,
  ownedThemes: string[] | undefined,
  ownedTitleIds: string[] | undefined,
): boolean {
  if (item.kind !== 'bundle') return false;
  const ownedThemeIds = themeSetFromOwned(ownedThemes);
  const ownedTitles = new Set(ownedTitleIds ?? []);
  return (
    (item.grants.themes?.every((t) => ownedThemeIds.has(t)) ?? true) &&
    (item.grants.titles?.every((t) => ownedTitles.has(t)) ?? true)
  );
}

/** SKUs déjà achetés en Quest Coins (journal boutique : entryKind coin_purchase, payé). */
export function buildCoinPurchasedSkuSet(
  transactions: { primarySku: string; status: string; entryKind?: string }[],
): Set<string> {
  const s = new Set<string>();
  for (const t of transactions) {
    if (t.status === 'paid' && t.entryKind === 'coin_purchase' && t.primarySku) {
      s.add(t.primarySku);
    }
  }
  return s;
}

/**
 * Indique si l'article ne peut plus être acheté (bouton « Déjà à toi », etc.).
 * Pour un **bundle** : bloqué seulement si tout le contenu permanent est possédé **et**
 * un achat en QC pour ce SKU existe déjà (sinon le joueur peut acheter une fois pour les bonus XP).
 */
export function catalogItemFullyOwned(
  item: ShopCatalogEntry,
  shop: {
    ownedThemes?: string[];
    ownedTitleIds?: string[];
  },
  coinPurchasedSkus: Set<string>,
): boolean {
  const ownedThemeIds = themeSetFromOwned(shop.ownedThemes);
  const ownedTitles = new Set(shop.ownedTitleIds ?? []);

  if (item.kind === 'reroll_pack' || item.kind === 'xp_booster') return false;

  if (item.kind === 'bundle') {
    const permanent =
      (item.grants.themes?.every((t) => ownedThemeIds.has(t)) ?? true) &&
      (item.grants.titles?.every((t) => ownedTitles.has(t)) ?? true);
    if (!permanent) return false;
    return coinPurchasedSkus.has(item.sku);
  }

  if (item.kind === 'theme_pack') {
    return item.grants.themes?.every((t) => ownedThemeIds.has(t)) ?? false;
  }
  if (item.kind === 'title') {
    return item.grants.titles?.every((t) => ownedTitles.has(t)) ?? false;
  }
  return false;
}
