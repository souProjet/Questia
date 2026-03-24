/** Badges type « vitrine jeu » (F2P / boutique) */
export type ShopMarketingBadge = 'featured' | 'best_value' | 'popular' | 'starter' | 'new';

export interface ShopMarketingMeta {
  badge?: ShopMarketingBadge;
  /** Économie affichée vs achat des composants au détail (QC) */
  savingsCoins?: number;
  /** Prix « avant » pour mise en avant du bundle (QC) — barré côté UI */
  compareAtCoins?: number;
  /** Sous-titre marketing court */
  hook?: string;
}

/** QC obtenus pour 1 € dépensé (plus = meilleur rapport) */
export function questCoinsPerEuro(priceCents: number, coinsGranted: number): number {
  const eur = priceCents / 100;
  if (eur <= 0) return 0;
  return coinsGranted / eur;
}

export interface CoinPackPricing {
  priceCents: number;
  coinsGranted: number;
}

/** Pourcentage de bonus vs un pack de référence (souvent le « starter ») */
export function bonusPercentVsPack(pack: CoinPackPricing, reference: CoinPackPricing): number {
  const a = questCoinsPerEuro(pack.priceCents, pack.coinsGranted);
  const b = questCoinsPerEuro(reference.priceCents, reference.coinsGranted);
  if (b <= 0) return 0;
  return Math.round(((a / b) - 1) * 100);
}
