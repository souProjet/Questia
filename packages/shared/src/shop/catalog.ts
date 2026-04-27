/**
 * Catalogue boutique (Quest Coins).
 *
 * **Ajouter un produit sans toucher au CSS :**
 * 1. Titres : ajouter l'id dans `shop/titles.ts` (TITLES_REGISTRY), puis une entrée `kind: 'title'` avec `grants: { titles: ['id'] }`.
 * 2. Bonus XP : `kind: 'xp_booster'` et `grants: { xpBonusCharges: N }` (consommé à chaque quête validée).
 * 3. Relances : `grants.bonusRerolls`.
 * 4. Thèmes d'interface : tous gratuits (`getThemeIds` / `data-theme` dans `globals.css`) — plus de vente boutique.
 */
import { XP_SHOP_BONUS_PER_CHARGE } from './constants';
import type { ShopMarketingMeta } from './marketing';

export type ShopItemKind = 'reroll_pack' | 'bundle' | 'title' | 'xp_booster';

export interface ShopCatalogEntry {
  sku: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  priceCoins: number;
  /** Nom d'icône Lucide (PascalCase) pour l'UI */
  icon: string;
  grants: {
    themes?: string[];
    bonusRerolls?: number;
    /** ids présents dans TITLES_REGISTRY */
    titles?: string[];
    /** +XP_SHOP_BONUS_PER_CHARGE XP par quête validée, jusqu'à épuisement */
    xpBonusCharges?: number;
  };
  /** Mise en avant, économies bundle, etc. */
  marketing?: ShopMarketingMeta;
  /** Puces courtes affichées sous la description (« ce que tu obtiens ») */
  includedItems?: string[];
  /** Texte détaillé pour le bouton ℹ (modale / alerte) */
  contentsDetail?: string;
}

/** Ré-export utile pour l'UI (info bulle) */
export { XP_SHOP_BONUS_PER_CHARGE };

export const SHOP_CATALOG: ShopCatalogEntry[] = [
  {
    sku: 'xp_booster_5',
    kind: 'xp_booster',
    name: 'Surcharge XP ×5',
    description: `À chaque quête que tu coches « terminée », tu reçois +${XP_SHOP_BONUS_PER_CHARGE} XP en plus du calcul habituel — 5 fois, puis c'est fini.`,
    priceCoins: 300,
    icon: 'Zap',
    grants: { xpBonusCharges: 5 },
    includedItems: [
      `+${XP_SHOP_BONUS_PER_CHARGE} XP bonus par quête validée`,
      '5 utilisations — une charge par quête validée',
    ],
    contentsDetail:
      "Le bonus se déclenche uniquement quand tu marques une quête comme faite. Si tu abandonnes ou ignores, la charge n'est pas utilisée.",
    marketing: { badge: 'starter' },
  },
  {
    sku: 'xp_booster_12',
    kind: 'xp_booster',
    name: 'Surcharge XP ×12',
    description: `Même bonus (+${XP_SHOP_BONUS_PER_CHARGE} XP par quête validée), mais 12 charges pour une progression sur la durée.`,
    priceCoins: 650,
    icon: 'Rocket',
    grants: { xpBonusCharges: 12 },
    includedItems: [
      `+${XP_SHOP_BONUS_PER_CHARGE} XP bonus par quête validée`,
      '12 utilisations — ~60 QC par charge au lieu de 60',
    ],
    contentsDetail:
      'Même règle que le pack ×5 : une charge brûlée par quête cochée terminée. Meilleur prix par charge que le petit pack.',
    marketing: {
      badge: 'best_value',
      hook: 'Moins cher par charge que le pack ×5.',
      savingsCoins: 70,
      compareAtCoins: 720,
    },
  },
  {
    sku: 'pack_reroll_3',
    kind: 'reroll_pack',
    name: 'Pack 3 relances',
    description:
      'Trois fois, tu peux demander une autre quête à la place de celle proposée — en plus de la relance gratuite du jour.',
    priceCoins: 400,
    icon: 'Dices',
    grants: { bonusRerolls: 3 },
    includedItems: [
      '3 relances stockées sur ton compte',
      "N'expirent pas — tu les utilises quand tu veux",
      "S'ajoutent à ta relance quotidienne incluse",
    ],
    contentsDetail:
      "Utile si la quête du jour ne te convient pas : une relance consomme un crédit et en génère une nouvelle. Les crédits restent jusqu'à utilisation.",
  },
  {
    sku: 'bundle_explorer',
    kind: 'bundle',
    name: 'Bundle Explorateur',
    description: `5 charges de bonus XP (+${XP_SHOP_BONUS_PER_CHARGE} XP par quête) et 3 relances bonus — en un seul achat, moins cher que séparément.`,
    priceCoins: 600,
    icon: 'Compass',
    grants: {
      xpBonusCharges: 5,
      bonusRerolls: 3,
    },
    includedItems: [
      `5× bonus +${XP_SHOP_BONUS_PER_CHARGE} XP à chaque quête validée`,
      '3 relances bonus stockées sur ton compte',
    ],
    contentsDetail:
      "Ce bundle regroupe le pack XP ×5 (300 QC) et le pack 3 relances (400 QC) en un seul achat à 600 QC — soit 100 QC d'économie.",
    marketing: {
      badge: 'featured',
      hook: '100 QC économisés vs achat séparé.',
      savingsCoins: 100,
      compareAtCoins: 700,
    },
  },
];

const bySku = new Map(SHOP_CATALOG.map((e) => [e.sku, e]));

export function getShopItem(sku: string): ShopCatalogEntry | undefined {
  return bySku.get(sku);
}

export function getThemeIds(): string[] {
  return ['default', 'midnight', 'aurora', 'parchment'];
}

/**
 * Thèmes d'interface effectivement utilisables : tous ceux de {@link getThemeIds}
 * sont gratuits ; on fusionne avec ce qui est stocké en base (rétrocompat / futur).
 */
export function effectiveOwnedThemes(storedFromDb: string[]): string[] {
  const allowed = new Set(getThemeIds());
  const merged = new Set<string>();
  for (const id of getThemeIds()) merged.add(id);
  for (const t of storedFromDb) {
    if (allowed.has(t)) merged.add(t);
  }
  return getThemeIds().filter((id) => merged.has(id));
}
