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
      "Oriente l'IA vers des quêtes à vivre à deux : petits gestes complices, sorties, rituels relationnels — sans niaiserie.",
    priceCoins: 500,
    icon: 'Heart',
    grants: { questPackIds: ['pack_couple'] },
    includedItems: [
      "Quêtes ancrées dans la relation (à deux ou en duo)",
      "Boost catégoriel permanent (vulnérabilité relationnelle, empathie)",
      "Achat unique — actif tant que tu le veux dans la boutique",
    ],
    contentsDetail:
      "Ce pack ajoute un biais durable au moteur de sélection : davantage de quêtes type « rituel partagé », « micro-attention » ou « sortie pensée pour deux ». Tu peux le combiner avec d'autres packs (Nocturne, Gastronomie…). Désactivable à venir dans le profil.",
    marketing: { badge: 'new', hook: 'Pour le quotidien des duos.' },
  },
  {
    sku: 'pack_ose',
    kind: 'quest_pack',
    questPackKind: 'vibe',
    name: 'Pack Osé',
    description:
      "Pour pousser un cran plus loin sans déraper : geste audacieux, prise de parole, mini-performance.",
    priceCoins: 500,
    icon: 'Flame',
    grants: { questPackIds: ['pack_ose'] },
    includedItems: [
      "Boost vers les quêtes à inconfort visible (mais sain)",
      "Conserve les garde-fous sécurité du moteur",
      "Achat unique",
    ],
    contentsDetail:
      "« Osé » ne veut pas dire « stupide » : le pack pondère vers des quêtes où tu fais quelque chose de visible (parler, montrer, oser un geste) tout en respectant les règles de sécurité de Questia.",
    marketing: { badge: 'new', hook: 'Un cran au-dessus.' },
  },
  {
    sku: 'pack_rencontres',
    kind: 'quest_pack',
    questPackKind: 'vibe',
    name: 'Pack Rencontres',
    description:
      "Briser la glace, créer le déclic. Plus de quêtes qui ouvrent une vraie porte vers les autres.",
    priceCoins: 500,
    icon: 'Sparkles',
    grants: { questPackIds: ['pack_rencontres'] },
    includedItems: [
      "Plus de sociabilité exploratoire et d'échanges sincères",
      "Pas de drague forcée — qualité de l'échange avant la quantité",
      "Achat unique",
    ],
    contentsDetail:
      "Tu reçois plus souvent des quêtes qui ouvrent un échange : un compliment honnête, une question décalée, un sujet sortant des banalités. Compatible Nocturne / Paris / Gastronomie.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_nocturne',
    kind: 'quest_pack',
    questPackKind: 'vibe',
    name: 'Pack Nocturne',
    description:
      "Quand la ville change de peau après la nuit tombée — quêtes qui s'allument plutôt en soirée.",
    priceCoins: 500,
    icon: 'Moon',
    grants: { questPackIds: ['pack_nocturne'] },
    includedItems: [
      "Boost « après le coucher du soleil »",
      "Mix introspection urbaine + micro-aventure",
      "Achat unique",
    ],
    contentsDetail:
      "Le moteur favorise les archétypes qui se prêtent au soir : marche éclairée, observation urbaine, rituel nocturne, sortie tardive. Le LLM reçoit aussi la consigne d'orienter le récit après le coucher du soleil.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_piment',
    kind: 'quest_pack',
    questPackKind: 'vibe',
    name: 'Pack Piment',
    description:
      "Un soupçon de provocation pour pimenter la journée — micro-performance publique, voix qui se pose.",
    priceCoins: 500,
    icon: 'Zap',
    grants: { questPackIds: ['pack_piment'] },
    includedItems: [
      "Boost vers l'introspection publique et l'inconfort visible",
      "Toujours sous garde-fous (jamais transgresser autrui)",
      "Achat unique",
    ],
    contentsDetail:
      "Le pack pousse vers des quêtes un peu piquantes : parler à voix haute, demander quelque chose d'inhabituel, décaler le regard public. Aucune quête ne te demandera de mettre quelqu'un en difficulté.",
    marketing: { badge: 'new' },
  },

  // ── Packs de quêtes — Style de vie ─────────────────────────────────────
  {
    sku: 'pack_solo_absolu',
    kind: 'quest_pack',
    questPackKind: 'lifestyle',
    name: 'Pack Solo absolu',
    description:
      "Pour les périodes où tu veux être seul·e sans culpabiliser — quêtes introspectives, sans interaction sociale.",
    priceCoins: 500,
    icon: 'User',
    grants: { questPackIds: ['pack_solo_absolu'] },
    includedItems: [
      "Aucune quête à contrainte sociale (jamais imposée)",
      "Boost privation sensorielle / discipline asynchrone / détox",
      "Achat unique",
    ],
    contentsDetail:
      "Le moteur évite les quêtes qui exigent d'aller voir quelqu'un et privilégie celles que tu peux faire entièrement seul·e. Idéal pour des semaines plus introverties ou des périodes calmes.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_gastronomie',
    kind: 'quest_pack',
    questPackKind: 'lifestyle',
    name: 'Pack Gastronomie',
    description:
      "Manger autrement : produit, marché, geste, lieu. Le goût comme terrain de quête.",
    priceCoins: 500,
    icon: 'UtensilsCrossed',
    grants: { questPackIds: ['pack_gastronomie'] },
    includedItems: [
      "Plus de quêtes ancrées « bouche, marché, cuisine »",
      "Compatible avec un pack lieu (Lyon, Marseille…)",
      "Achat unique",
    ],
    contentsDetail:
      "Le pack ajoute un biais vers des quêtes alimentaires (produit, lieu, geste) sans transformer Questia en application nutrition. Le LLM reçoit la consigne de privilégier goût, geste et mémoire — pas un cours.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_slow_life',
    kind: 'quest_pack',
    questPackKind: 'lifestyle',
    name: 'Pack Slow life',
    description:
      "Ralentir, sentir, respirer. Des quêtes courtes, lentes, attentives — quand tu veux décompresser.",
    priceCoins: 500,
    icon: 'Leaf',
    grants: { questPackIds: ['pack_slow_life'] },
    includedItems: [
      "Boost privation sensorielle / détox dopaminergique",
      "Pas de course contre la montre",
      "Achat unique",
    ],
    contentsDetail:
      "Le moteur oriente vers des micro-rituels lents (boisson chaude, balade lente, silence court) plutôt que vers des défis intenses. Idéal pour les périodes chargées où tu veux rester sur de petites victoires apaisantes.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_social_amis',
    kind: 'quest_pack',
    questPackKind: 'lifestyle',
    name: 'Pack Social & amis',
    description:
      "Renforcer les liens qui comptent : message, attention concrète, retrouvailles.",
    priceCoins: 500,
    icon: 'Users',
    grants: { questPackIds: ['pack_social_amis'] },
    includedItems: [
      "Boost vers les quêtes sociales et empathiques",
      "Idéal si tu veux entretenir un cercle de proches",
      "Achat unique",
    ],
    contentsDetail:
      "Plus de quêtes type « écris à quelqu'un que tu n'as pas vu depuis 3 mois », « propose un café cette semaine », « fais une attention concrète » — pas du scrolling de feed, du lien réel.",
    marketing: { badge: 'new' },
  },

  // ── Packs de quêtes — Lieux ────────────────────────────────────────────
  {
    sku: 'pack_paris',
    kind: 'quest_pack',
    questPackKind: 'location',
    name: 'Pack Paris',
    description:
      "Ancre tes quêtes dans Paris : arrondissements, rives, métro, détails vrais — pas de cliché touristique.",
    priceCoins: 450,
    icon: 'MapPin',
    grants: { questPackIds: ['pack_paris'] },
    includedItems: [
      "Plus de quêtes situées dans Paris quand le contexte le permet",
      "Détail concret (arrondissement, rive, ligne de métro)",
      "Achat unique",
    ],
    contentsDetail:
      "Quand le GPS et la météo le permettent, le LLM reçoit une consigne d'ancrage à Paris : un arrondissement, une rive, un café réel. Pas de filtre dur — si tu n'es pas à Paris ce jour-là, la quête s'adapte.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_lyon',
    kind: 'quest_pack',
    questPackKind: 'location',
    name: 'Pack Lyon',
    description:
      "Entre Saône et Rhône, traboules et terrasses : tes quêtes prennent racine à Lyon.",
    priceCoins: 450,
    icon: 'MapPin',
    grants: { questPackIds: ['pack_lyon'] },
    includedItems: [
      "Plus de quêtes ancrées Lyon (Presqu'île, Croix-Rousse…)",
      "Détails concrets (traboules, quais)",
      "Achat unique",
    ],
    contentsDetail:
      "Quand pertinent, la quête se situe à Lyon avec un détail vrai (Presqu'île, Croix-Rousse, traboules, quais). Compatible avec d'autres packs (Gastronomie, Couple, Nocturne…).",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_nantes',
    kind: 'quest_pack',
    questPackKind: 'location',
    name: 'Pack Nantes',
    description:
      "Île, machines, Loire : Nantes se prête au jeu. Quêtes ancrées dans les quartiers vivants.",
    priceCoins: 450,
    icon: 'MapPin',
    grants: { questPackIds: ['pack_nantes'] },
    includedItems: [
      "Plus de quêtes ancrées Nantes (Île, Bouffay, Erdre…)",
      "Détails concrets",
      "Achat unique",
    ],
    contentsDetail:
      "La quête s'ancre à Nantes quand c'est pertinent — Île de Nantes, quartier Bouffay, bords d'Erdre — avec un détail vrai. Pas de filtre dur si tu n'y es pas.",
    marketing: { badge: 'new' },
  },
  {
    sku: 'pack_marseille',
    kind: 'quest_pack',
    questPackKind: 'location',
    name: 'Pack Marseille',
    description:
      "Calanques, Vieux-Port, mistral : la ville donne le ton à tes quêtes.",
    priceCoins: 450,
    icon: 'MapPin',
    grants: { questPackIds: ['pack_marseille'] },
    includedItems: [
      "Plus de quêtes ancrées Marseille (Vieux-Port, Panier, calanques…)",
      "Détails concrets",
      "Achat unique",
    ],
    contentsDetail:
      "La quête se situe à Marseille avec un détail réel (Vieux-Port, Panier, calanques, corniche) quand le contexte s'y prête. Mix idéal avec Gastronomie, Solo absolu ou Slow life.",
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
