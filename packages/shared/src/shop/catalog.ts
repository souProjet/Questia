/**
 * Catalogue boutique (Quest Coins).
 *
 * **Ajouter un produit sans toucher au CSS :**
 * 1. Titres : ajouter l’id dans `shop/titles.ts` (TITLES_REGISTRY), puis une entrée `kind: 'title'` avec `grants: { titles: ['id'] }`.
 * 2. Bonus XP : `kind: 'xp_booster'` et `grants: { xpBonusCharges: N }` (consommé à chaque quête validée).
 * 3. Styles de texte : `kind: 'narration_pack'` + `grants.narrationPacks`.
 * 4. Relances : `grants.bonusRerolls`.
 * 5. Thèmes : préférer **un** `theme_pack` qui liste plusieurs `themes: [...]` — les styles sont dans `globals.css` (`data-theme`), pas un fichier par SKU.
 */
import { XP_SHOP_BONUS_PER_CHARGE } from './constants';
import type { ShopMarketingMeta } from './marketing';

export type ShopItemKind =
  | 'theme_pack'
  | 'narration_pack'
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
    narrationPacks?: string[];
    bonusRerolls?: number;
    /** ids présents dans TITLES_REGISTRY */
    titles?: string[];
    /** +XP_SHOP_BONUS_PER_CHARGE XP par quête validée, jusqu’à épuisement */
    xpBonusCharges?: number;
  };
  /** Mise en avant, économies bundle, etc. */
  marketing?: ShopMarketingMeta;
  /** Puces courtes affichées sous la description (« ce que tu obtiens ») */
  includedItems?: string[];
  /** Texte détaillé pour le bouton ℹ (modale / alerte) */
  contentsDetail?: string;
}

/** Ré-export utile pour l’UI (info bulle) */
export { XP_SHOP_BONUS_PER_CHARGE };

export const SHOP_CATALOG: ShopCatalogEntry[] = [
  {
    sku: 'themes_pack_premium',
    kind: 'theme_pack',
    name: 'Pack thèmes premium',
    description:
      'Débloque les trois thèmes d’app payants d’un coup : couleurs et ambiance des écrans changent (profil, boutique, quête du jour).',
    priceCoins: 750,
    emoji: '🎨',
    grants: { themes: ['midnight', 'aurora', 'parchment'] },
    includedItems: [
      '3 thèmes visuels : Nuit boréale, Aurore, Parchemin',
      'S’applique à l’interface (boutons, fonds) — pas au texte des quêtes',
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
      'Tu n’en affiches qu’un à la fois dans les réglages',
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
    description: `À chaque quête que tu coches « terminée », tu reçois +${XP_SHOP_BONUS_PER_CHARGE} XP en plus du calcul habituel — 5 fois, puis c’est fini.`,
    priceCoins: 350,
    emoji: '⚡',
    grants: { xpBonusCharges: 5 },
    includedItems: [
      `+${XP_SHOP_BONUS_PER_CHARGE} XP bonus par quête validée`,
      '5 utilisations : une charge consommée à chaque validation',
    ],
    contentsDetail:
      'Le bonus se déclenche uniquement quand tu marques une quête comme faite. Si tu abandonnes ou ignores, la charge n’est pas utilisée.',
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
    sku: 'pack_narration_cinematic',
    kind: 'narration_pack',
    name: 'Style cinématique',
    description:
      'Les textes de ta quête du jour sont rédigés comme une petite scène : rythme de film, images nettes, mise en avant des actions.',
    priceCoins: 600,
    emoji: '🎬',
    grants: { narrationPacks: ['cinematic'] },
    includedItems: [
      'Change le ton des phrases de ta quête du jour',
      'S’applique aux prochaines quêtes après achat (pas aux anciennes)',
    ],
    contentsDetail:
      'Une fois le pack choisi dans les réglages, chaque nouvelle quête du jour utilisera ce style jusqu’à ce que tu changes pour un autre style débloqué. Le fond de l’histoire et les objectifs restent les mêmes — seule la façon d’écrire change.',
  },
  {
    sku: 'pack_narration_poetic',
    kind: 'narration_pack',
    name: 'Style poétique',
    description:
      'Phrases plus imagées et léger rythme littéraire — toujours lisible et bienveillant.',
    priceCoins: 600,
    emoji: '✒️',
    grants: { narrationPacks: ['poetic'] },
    includedItems: [
      'Ton plus « image » pour les textes du jour',
      'Valable pour les prochaines quêtes après activation',
    ],
    contentsDetail:
      'Pensé pour qui aime un peu de métaphore sans lourdeur. Tu peux repasser au style par défaut Questia quand tu veux.',
  },
  {
    sku: 'pack_narration_noir',
    kind: 'narration_pack',
    name: 'Style mystère urbain',
    description:
      'Ambiance ville la nuit, tension douce façon polar — sans violence ni contenu sombre.',
    priceCoins: 700,
    emoji: '🌃',
    grants: { narrationPacks: ['noir'] },
    includedItems: [
      'Ambiance « film noir » légère pour les textes du jour',
      'Après achat : prochaines quêtes uniquement',
    ],
    contentsDetail:
      'Le décor et les défis de la quête ne changent pas : c’est uniquement la couleur du récit. Reste bienveillant et adapté à tous les publics.',
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
      'S’ajoutent à ta relance quotidienne incluse',
    ],
    contentsDetail:
      'Utile si la quête du jour ne te convient pas : une relance consomme un crédit et en génère une nouvelle. Les crédits restent jusqu’à utilisation.',
  },
  {
    sku: 'bundle_explorer',
    kind: 'bundle',
    name: 'Bundle Explorateur',
    description:
      'Un lot : les trois thèmes d’interface, le style cinématique pour les textes du jour, 5 charges de bonus XP et le titre Étincelle.',
    priceCoins: 1650,
    emoji: '🧭',
    grants: {
      themes: ['midnight', 'aurora', 'parchment'],
      narrationPacks: ['cinematic'],
      xpBonusCharges: 5,
      titles: ['spark'],
    },
    includedItems: [
      '3 thèmes visuels (Nuit boréale, Aurore, Parchemin)',
      '1 style de texte pour les quêtes : cinématique',
      `5× bonus +${XP_SHOP_BONUS_PER_CHARGE} XP à chaque quête validée`,
      '1 titre profil : Étincelle',
    ],
    contentsDetail:
      'Tu débloques tout le visuel, un ton pour les textes de quête, un peu de XP en rabais sur les prochaines validations, et un titre à afficher. Les thèmes et le titre se règlent dans les préférences ; le style de texte se choisit comme les autres packs « ton des quêtes ».',
    marketing: {
      badge: 'featured',
      hook: 'Plus avantageux que d’acheter chaque pièce séparément.',
      savingsCoins: 230,
      compareAtCoins: 1880,
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
