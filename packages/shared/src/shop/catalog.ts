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
import type { QuestPackKind } from './questPacks';

export type ShopItemKind = 'reroll_pack' | 'bundle' | 'title' | 'xp_booster' | 'quest_pack';

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
    /** ids présents dans QUEST_PACKS_REGISTRY (achat unique, type bundle) */
    questPackIds?: string[];
  };
  /** Mise en avant, économies bundle, etc. */
  marketing?: ShopMarketingMeta;
  /** Puces courtes affichées sous la description (« ce que tu obtiens ») */
  includedItems?: string[];
  /** Texte détaillé pour le bouton ℹ (modale / alerte) */
  contentsDetail?: string;
  /** Pour `kind: 'quest_pack'` : sous-catégorisation UI (vibe/lifestyle/location). */
  questPackKind?: QuestPackKind;
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

  // ── Packs de quêtes — Ambiances (vibes) ────────────────────────────────
  {
    sku: 'pack_couple',
    kind: 'quest_pack',
    questPackKind: 'vibe',
    name: 'Pack Couple',
    description:
      "Un parcours de 10 quêtes pour casser la routine à deux — petits gestes complices, sorties, rituels relationnels.",
    priceCoins: 500,
    icon: 'Heart',
    grants: { questPackIds: ['pack_couple'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Joue à ton rythme, en parallèle de la quête quotidienne",
      "Récompense finale : titre exclusif « Tandem » + 200 QC",
    ],
    contentsDetail:
      "10 quêtes éditoriales pensées pour les duos, organisées en 3 chapitres : Découverte, Approfondissement, Maîtrise. Chaque chapitre se débloque quand tu termines le précédent. À la fin du parcours, tu reçois un titre exclusif et un bonus de Quest Coins.",
    marketing: { badge: 'new', hook: 'Pour le quotidien des duos.' },
  },
  {
    sku: 'pack_ose',
    kind: 'quest_pack',
    questPackKind: 'vibe',
    name: 'Pack Osé',
    description:
      "Un parcours de 10 quêtes pour pousser un cran plus loin sans déraper — geste audacieux, prise de parole, mini-performance.",
    priceCoins: 500,
    icon: 'Flame',
    grants: { questPackIds: ['pack_ose'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Garde-fous sécurité préservés à chaque étape",
      "Récompense finale : titre exclusif « Audacieux·se » + 200 QC",
    ],
    contentsDetail:
      "10 quêtes éditoriales qui montent en intensité — parler haut, montrer, oser un geste — sans transgresser autrui. Trois chapitres de difficulté croissante. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new', hook: 'Un cran au-dessus.' },
  },
  {
    sku: 'pack_rencontres',
    kind: 'quest_pack',
    questPackKind: 'vibe',
    name: 'Pack Rencontres',
    description:
      "Un parcours de 10 quêtes pour briser la glace et créer le déclic — sans drague forcée, juste de vraies portes ouvertes.",
    priceCoins: 500,
    icon: 'Sparkles',
    grants: { questPackIds: ['pack_rencontres'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Du compliment sincère au rendez-vous décalé",
      "Récompense finale : titre exclusif « Étincelle » + 200 QC",
    ],
    contentsDetail:
      "10 étapes pour apprendre à ouvrir un échange : compliment honnête, question décalée, sujet sortant des banalités. Chapitre par chapitre, tu progresses vers des interactions plus assumées. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_nocturne',
    kind: 'quest_pack',
    questPackKind: 'vibe',
    name: 'Pack Nocturne',
    description:
      "Un parcours de 10 quêtes pour goûter à la ville après la nuit tombée — marche éclairée, observation, rituel du soir.",
    priceCoins: 500,
    icon: 'Moon',
    grants: { questPackIds: ['pack_nocturne'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "À jouer après le coucher du soleil — sécurité incluse",
      "Récompense finale : titre exclusif « Noctambule » + 200 QC",
    ],
    contentsDetail:
      "10 quêtes nocturnes en 3 chapitres : flânerie éclairée, micro-aventure urbaine, rituel du soir. La sécurité de base est rappelée à chaque étape. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_piment',
    kind: 'quest_pack',
    questPackKind: 'vibe',
    name: 'Pack Piment',
    description:
      "Un parcours de 10 quêtes piquantes — micro-performance publique, voix qui se pose, gestes qui sortent du rang.",
    priceCoins: 500,
    icon: 'Zap',
    grants: { questPackIds: ['pack_piment'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Inconfort visible mais sain — jamais aux dépens d'autrui",
      "Récompense finale : titre exclusif « Pimenté·e » + 200 QC",
    ],
    contentsDetail:
      "10 quêtes pour flirter avec l'inconfort visible : parler à voix haute, demander quelque chose d'inhabituel, décaler le regard public. Aucune étape ne te demandera de mettre quelqu'un en difficulté. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },

  // ── Packs de quêtes — Style de vie ─────────────────────────────────────
  {
    sku: 'pack_solo_absolu',
    kind: 'quest_pack',
    questPackKind: 'lifestyle',
    name: 'Pack Solo absolu',
    description:
      "Un parcours de 10 quêtes introspectives à vivre seul·e — sans culpabilité, sans contrainte sociale.",
    priceCoins: 500,
    icon: 'User',
    grants: { questPackIds: ['pack_solo_absolu'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Aucune étape ne demande d'aller voir quelqu'un",
      "Récompense finale : titre exclusif « Solitude lumineuse » + 200 QC",
    ],
    contentsDetail:
      "10 quêtes pour des semaines introverties ou des périodes calmes. Trois chapitres : Pause, Présence, Profondeur. Tu peux les jouer dans l'ordre que tu veux à l'intérieur d'un chapitre. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_gastronomie',
    kind: 'quest_pack',
    questPackKind: 'lifestyle',
    name: 'Pack Gastronomie',
    description:
      "Un parcours de 10 quêtes pour manger autrement — produit, marché, geste, lieu. Le goût comme terrain de jeu.",
    priceCoins: 500,
    icon: 'UtensilsCrossed',
    grants: { questPackIds: ['pack_gastronomie'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Goût, geste, mémoire — pas un cours de nutrition",
      "Récompense finale : titre exclusif « Gourmet·te » + 200 QC",
    ],
    contentsDetail:
      "10 quêtes ancrées dans la bouche, le marché, la cuisine. Cumulable avec un pack lieu (Lyon, Marseille…) pour une saveur locale. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_slow_life',
    kind: 'quest_pack',
    questPackKind: 'lifestyle',
    name: 'Pack Slow life',
    description:
      "Un parcours de 10 quêtes lentes pour ralentir, sentir, respirer — courtes, attentives, sans course contre la montre.",
    priceCoins: 500,
    icon: 'Leaf',
    grants: { questPackIds: ['pack_slow_life'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Micro-rituels apaisants, jamais d'urgence",
      "Récompense finale : titre exclusif « Tempo doux » + 200 QC",
    ],
    contentsDetail:
      "10 quêtes pour les périodes chargées : boisson chaude, balade lente, silence court, attention sensorielle. Trois chapitres pour t'installer durablement dans la lenteur. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_social_amis',
    kind: 'quest_pack',
    questPackKind: 'lifestyle',
    name: 'Pack Social & amis',
    description:
      "Un parcours de 10 quêtes pour renforcer les liens qui comptent — message, attention concrète, retrouvailles.",
    priceCoins: 500,
    icon: 'Users',
    grants: { questPackIds: ['pack_social_amis'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Lien réel, pas du scrolling de feed",
      "Récompense finale : titre exclusif « Tisseur·se » + 200 QC",
    ],
    contentsDetail:
      "10 étapes pour entretenir un cercle de proches : écris à quelqu'un perdu de vue, propose un café, fais une attention concrète. Trois chapitres : Reconnecter, Faire vivre, Approfondir. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },

  // ── Packs de quêtes — Lieux ────────────────────────────────────────────
  {
    sku: 'pack_paris',
    kind: 'quest_pack',
    questPackKind: 'location',
    name: 'Pack Paris',
    description:
      "Un parcours de 10 quêtes pour arpenter Paris autrement — arrondissements, rives, métro, détails vrais.",
    priceCoins: 450,
    icon: 'MapPin',
    grants: { questPackIds: ['pack_paris'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Aucun cliché touristique — Paris des habitants",
      "Récompense finale : titre exclusif « Flâneur·se de Paris » + 180 QC",
    ],
    contentsDetail:
      "10 quêtes ancrées dans Paris : passages couverts, micro-quartiers, lignes de métro mythiques, terrasses ignorées. Si tu n'es pas à Paris quand tu joues, la mission reste réalisable à distance (souvenir, échange, projet). Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_lyon',
    kind: 'quest_pack',
    questPackKind: 'location',
    name: 'Pack Lyon',
    description:
      "Un parcours de 10 quêtes entre Saône et Rhône, traboules et terrasses — Lyon comme terrain de jeu.",
    priceCoins: 450,
    icon: 'MapPin',
    grants: { questPackIds: ['pack_lyon'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Presqu'île, Croix-Rousse, traboules, quais",
      "Récompense finale : titre exclusif « Gone des quais » + 180 QC",
    ],
    contentsDetail:
      "10 quêtes pour découvrir Lyon par ses détails vrais. Cumulable avec Gastronomie, Couple ou Nocturne pour des combinaisons savoureuses. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_nantes',
    kind: 'quest_pack',
    questPackKind: 'location',
    name: 'Pack Nantes',
    description:
      "Un parcours de 10 quêtes pour habiter Nantes — Île, machines, Loire et quartiers vivants.",
    priceCoins: 450,
    icon: 'MapPin',
    grants: { questPackIds: ['pack_nantes'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Île de Nantes, Bouffay, bords d'Erdre",
      "Récompense finale : titre exclusif « Voyageur·se nantais » + 180 QC",
    ],
    contentsDetail:
      "10 quêtes inspirées des micro-paysages nantais. Si tu n'y es pas pendant le parcours, la mission s'adapte (souvenir, projet, ami à interroger). Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_marseille',
    kind: 'quest_pack',
    questPackKind: 'location',
    name: 'Pack Marseille',
    description:
      "Un parcours de 10 quêtes côté Calanques, Vieux-Port, mistral — Marseille donne le tempo.",
    priceCoins: 450,
    icon: 'MapPin',
    grants: { questPackIds: ['pack_marseille'] },
    includedItems: [
      "Parcours de 10 quêtes en 3 chapitres (3 → 4 → 3)",
      "Vieux-Port, Panier, calanques, corniche",
      "Récompense finale : titre exclusif « Cap au Sud » + 180 QC",
    ],
    contentsDetail:
      "10 quêtes phocéennes : odeurs du Vieux-Port, ruelles du Panier, balades sur la corniche, plongée mistral. Mix idéal avec Gastronomie, Solo absolu ou Slow life. Récompense finale : titre + Quest Coins.",
    marketing: { badge: 'new' },
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
