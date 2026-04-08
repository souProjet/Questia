import type { ShopMarketingBadge } from './marketing';

/**
 * Packs de **Quest Coins** achetables avec de l'argent réel (Stripe Checkout uniquement).
 * Les achats boutique utilisent exclusivement les coins.
 */
export interface CoinPackEntry {
  sku: string;
  name: string;
  description: string;
  /** Montant en centimes d'euro (Stripe) */
  priceCents: number;
  currency: 'eur';
  /** Coins crédités sur le compte après paiement confirmé */
  coinsGranted: number;
  emoji: string;
  /** Ordre d'affichage (plus petit = à gauche) */
  sortOrder?: number;
  marketing?: {
    badge?: ShopMarketingBadge;
    hook?: string;
  };
  /** Puces « ce que tu obtiens » */
  includedItems?: string[];
  /** Détail pour le bouton ℹ */
  contentsDetail?: string;
}

export const COIN_PACKS: CoinPackEntry[] = [
  {
    sku: 'coin_pack_500',
    name: '500 Quest Coins',
    description: 'Pour un premier achat ou compléter ton solde : thèmes, titres, bonus, packs.',
    priceCents: 499,
    currency: 'eur',
    coinsGranted: 500,
    emoji: '🪙',
    sortOrder: 0,
    includedItems: ['500 QC ajoutés à ton solde après paiement', 'Utilisables sur tous les articles en QC'],
    contentsDetail:
      "Les Quest Coins sont une monnaie virtuelle : tu les dépenses uniquement dans l'app. Aucun renouvellement automatique — tu recharges quand tu veux.",
    marketing: { badge: 'starter', hook: 'Le plus petit pack pour tester.' },
  },
  {
    sku: 'coin_pack_1200',
    name: '1 200 Quest Coins',
    description: 'Le bon compromis : plusieurs achats ou un bundle sans repasser à la caisse tout de suite.',
    priceCents: 999,
    currency: 'eur',
    coinsGranted: 1200,
    emoji: '💰',
    sortOrder: 1,
    includedItems: ['1 200 QC sur ton compte', 'Même usage que les autres packs'],
    contentsDetail:
      'Le rapport QC / € est meilleur que le plus petit pack. Idéal si tu prévois 2–3 achats ou un bundle.',
    marketing: { badge: 'popular', hook: 'Bon compromis prix / quantité.' },
  },
  {
    sku: 'coin_pack_3000',
    name: '3 000 Quest Coins',
    description: 'Maximum de QC par euro : idéal si tu veux tout débloquer sans recharger souvent.',
    priceCents: 1999,
    currency: 'eur',
    coinsGranted: 3000,
    emoji: '✨',
    sortOrder: 2,
    includedItems: ["3 000 QC crédités d'un coup", 'Meilleur rapport QC / € du catalogue'],
    contentsDetail:
      'Paiement unique par carte. Après validation, le solde est mis à jour et tu peux tout dépenser en boutique.',
    marketing: { badge: 'best_value', hook: 'Maximum de QC pour ton argent.' },
  },
];

const bySku = new Map(COIN_PACKS.map((e) => [e.sku, e]));

export function getCoinPack(sku: string): CoinPackEntry | undefined {
  return bySku.get(sku);
}
