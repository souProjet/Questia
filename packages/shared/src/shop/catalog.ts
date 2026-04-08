/**
 * Catalogue boutique (Quest Coins).
 *
 * **Ajouter un produit sans toucher au CSS :**
 * 1. Titres : ajouter l'id dans `shop/titles.ts` (TITLES_REGISTRY), puis une entrée `kind: 'title'` avec `grants: { titles: ['id'] }`.
 * 2. Bonus XP : `kind: 'xp_booster'` et `grants: { xpBonusCharges: N }` (consommé à chaque quête validée).
 * 3. Relances : `grants.bonusRerolls`.
 * 4. Thèmes : préférer **un** `theme_pack` qui liste plusieurs `themes: [...]` — les styles sont dans `globals.css` (`data-theme`), pas un fichier par SKU.
 */
import { XP_SHOP_BONUS_PER_CHARGE } from './constants';
import type { ShopMarketingMeta } from './marketing';

export type ShopItemKind =
  | 'theme_pack'
  | 'reroll_pack'
  | 'bundle'
  | 'title'
  | 'xp_booster';

export interface ShopCatalogEntry {
  sku: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  priceCoins: number;
  emoji: string;
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
    sku: 'themes_pack_premium',
    kind: 'theme_pack',
    name: 'Pack thèmes premium',
    description:
      "Débloque les trois thèmes d'app payants d'un coup : couleurs et ambiance des écrans changent (profil, boutique, quête du jour).",
    priceCoins: 750,
    emoji: '🎨',
    grants: { themes: ['midnight', 'aurora', 'parchment'] },
    includedItems: [
      '3 thèmes visuels : Nuit boréale, Aurore, Parchemin',
      "S'applique à l'interface (boutons, fonds) — pas au texte des quêtes",
      'Tu les actives dans les réglages une fois achetés',
    ],
    contentsDetail:
      'Chaque thème est un habillage complet (clair / coloré / parchemin). Tu peux revenir au thème Questia par défaut à tout moment dans les préférences.',
    marketing: {
      badge: 'popular',
      hook: 'Environ le prix de deux thèmes achetés séparément.',
      savingsCoins: 300,
      compareAtCoins: 1050,
    },
  },
  {
    sku: 'title_scout',
    kind: 'title',
    name: 'Titre — Éclaireur·se',
    description: 'Un libellé décoratif sous ton pseudo sur ton profil (ex. « Éclaireur·se »).',
    priceCoins: 180,
    emoji: '🧭',
    grants: { titles: ['scout'] },
    includedItems: ['1 titre affichable sur ton profil', 'Pure décoration — aucun bonus de jeu'],
  },
  {
    sku: 'title_spark',
    kind: 'title',
    name: 'Titre — Étincelle',
    description: 'Un autre titre à afficher sous ton nom, pour changer de style.',
    priceCoins: 180,
    emoji: '✨',
    grants: { titles: ['spark'] },
    includedItems: ['1 titre affichable sur ton profil', 'Tu le choisis dans les réglages parmi ceux que tu possèdes'],
  },
  {
    sku: 'title_bundle_icons',
    kind: 'title',
    name: 'Pack titres « Icônes »',
    description: 'Trois titres avec icônes : Ancre, Comète et Cœur — pour varier ta présentation.',
    priceCoins: 420,
    emoji: '🏷️',
    grants: { titles: ['anchor', 'comet', 'heart'] },
    includedItems: [
      '3 titres : Ancre, Comète, Cœur',
      "Tu n'en affiches qu'un à la fois dans les réglages",
    ],
    contentsDetail:
      'Chaque titre est un couple icône + mot. Idéal si tu veux plusieurs looks sans racheter un par un.',
    marketing: {
      badge: 'best_value',
      hook: 'Moins cher que trois achats séparés.',
      savingsCoins: 120,
      compareAtCoins: 540,
    },
  },
  {
    sku: 'xp_booster_5',
    kind: 'xp_booster',
    name: 'Surcharge XP ×5',
    description: `À chaque quête que tu coches « terminée », tu reçois +${XP_SHOP_BONUS_PER_CHARGE} XP en plus du calcul habituel — 5 fois, puis c'est fini.`,
    priceCoins: 350,
    emoji: '⚡',
    grants: { xpBonusCharges: 5 },
    includedItems: [
      `+${XP_SHOP_BONUS_PER_CHARGE} XP bonus par quête validée`,
      '5 utilisations : une charge consommée à chaque validation',
    ],
    contentsDetail:
      "Le bonus se déclenche uniquement quand tu marques une quête comme faite. Si tu abandonnes ou ignores, la charge n'est pas utilisée.",
    marketing: { badge: 'starter', hook: 'Bon pour tester le bonus sans gros engagement.' },
  },
  {
    sku: 'xp_booster_12',
    kind: 'xp_booster',
    name: 'Surcharge XP ×12',
    description: `Même bonus (+${XP_SHOP_BONUS_PER_CHARGE} XP par quête validée), mais 12 charges pour une progression plus longue.`,
    priceCoins: 750,
    emoji: '🚀',
    grants: { xpBonusCharges: 12 },
    includedItems: [
      `+${XP_SHOP_BONUS_PER_CHARGE} XP bonus par quête validée`,
      '12 utilisations au total',
    ],
    contentsDetail:
      'Même règle que le pack ×5 : une charge brûlée par quête cochée terminée. Meilleur prix par charge que le petit pack.',
    marketing: {
      badge: 'best_value',
      hook: 'Moins cher par charge que le pack ×5.',
      savingsCoins: 90,
      compareAtCoins: 840,
    },
  },
  {
    sku: 'pack_reroll_3',
    kind: 'reroll_pack',
    name: 'Pack 3 relances',
    description:
      'Trois fois, tu peux demander une autre quête à la place de celle proposée — en plus de la relance gratuite du jour.',
    priceCoins: 500,
    emoji: '🎲',
    grants: { bonusRerolls: 3 },
    includedItems: [
      '3 relances stockées sur ton compte',
      'N\'expirent pas : tu les utilises quand tu veux',
      "S'ajoutent à ta relance quotidienne incluse",
    ],
    contentsDetail:
      "Utile si la quête du jour ne te convient pas : une relance consomme un crédit et en génère une nouvelle. Les crédits restent jusqu'à utilisation.",
  },
  {
    /** Un seul achat en QC par compte une fois tout le contenu « permanent » obtenu ; avant le 1er achat du SKU, achetable même si thèmes / titre déjà pris à l'unité (pour les bonus XP du lot). */
    sku: 'bundle_explorer',
    kind: 'bundle',
    name: 'Bundle Explorateur',
    description:
      "Un lot : les trois thèmes d'interface, 5 charges de bonus XP et le titre Étincelle.",
    priceCoins: 1390,
    emoji: '🧭',
    grants: {
      themes: ['midnight', 'aurora', 'parchment'],
      xpBonusCharges: 5,
      titles: ['spark'],
    },
    includedItems: [
      '3 thèmes visuels (Nuit boréale, Aurore, Parchemin)',
      `5× bonus +${XP_SHOP_BONUS_PER_CHARGE} XP à chaque quête validée`,
      '1 titre profil : Étincelle',
    ],
    contentsDetail:
      'Tu débloques tout le visuel, un peu de XP en rabais sur les prochaines validations, et un titre à afficher. Les thèmes et le titre se règlent dans les préférences.',
    marketing: {
      badge: 'featured',
      hook: "Plus avantageux que d'acheter chaque pièce séparément.",
      savingsCoins: 190,
      compareAtCoins: 1580,
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
