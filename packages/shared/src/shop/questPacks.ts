/**
 * Packs de quêtes thématiques achetables — boostent l'orientation des quêtes
 * générées (ambiance, style de vie, lieu) sans transformer le moteur en "store
 * de quêtes" rigide.
 *
 * Game-design (rapide) :
 *  - Chaque pack appartient à un `kind` (vibe / lifestyle / location) qui
 *    structure l'UI et la stratégie de découverte (cohabitation = compatible).
 *  - Quand un pack est possédé, ses `categoryBoost`s alimentent un biais
 *    catégoriel additif côté moteur de sélection (`questPackBias`), de la même
 *    façon que `refinementBias`. Pas de filtre dur : on préserve la diversité.
 *  - Les `cityHints` orientent uniquement le LLM (consigne : "quand pertinent,
 *    ancrer la quête à <ville>"), jamais le scoring (sinon on vide le pool).
 *  - Achat unique en QC (comme un bundle) — non consommable. Plusieurs packs
 *    peuvent être actifs simultanément ; les biais s'additionnent puis
 *    saturent à la limite habituelle (cf. catégorie `refinement` du moteur).
 *
 * Pour ajouter un pack : l'enregistrer ici **et** créer une entrée
 * `kind: 'quest_pack'` dans `SHOP_CATALOG` (catalog.ts) avec
 * `grants.questPackIds: ['<id>']`.
 */
import type { PsychologicalCategory } from '../types';

export type QuestPackKind = 'vibe' | 'lifestyle' | 'location';

export interface QuestPackEntry {
  /** Identifiant stable (utilisé dans `grants.questPackIds` et stocké côté profil). */
  id: string;
  kind: QuestPackKind;
  /** Libellé court FR (UI). */
  label: string;
  /** Libellé court EN (UI). */
  labelEn: string;
  /** Sous-titre UI (FR) — 1 phrase courte. */
  tagline: string;
  /** Sous-titre UI (EN). */
  taglineEn: string;
  /** Nom d'icône Lucide PascalCase. */
  icon: string;
  /**
   * Nuances catégorielles boostées (par défaut +0.10 chacune côté moteur).
   * Reste dans la zone que `refinementAnswersToCategoryBias` produit — pas de
   * sur-stack qui éclipserait le profil déclaré.
   */
  categoryBoost: Partial<Record<PsychologicalCategory, number>>;
  /**
   * Indications LLM injectées dans le prompt quand le pack est actif.
   *  - vibes : ambiances/voix narrative (ex. « tendresse complice »)
   *  - lieux : ville à privilégier (ex. « Paris »)
   *  - lifestyle : posture (ex. « solo introspectif »)
   */
  promptHintFr: string;
  promptHintEn: string;
}

const B = 0.1;

/**
 * Registre des packs. La liste est volontairement courte et opinionnée : on
 * vise des thèmes lisibles côté joueur, pas une explosion de SKUs.
 */
export const QUEST_PACKS_REGISTRY: Record<string, QuestPackEntry> = {
  // ── Ambiances (vibes) ────────────────────────────────────────────────────
  pack_couple: {
    id: 'pack_couple',
    kind: 'vibe',
    label: 'Couple',
    labelEn: 'Couple',
    tagline: 'Des quêtes à faire à deux pour casser la routine.',
    taglineEn: 'Quests for two — break the routine, together.',
    icon: 'Heart',
    categoryBoost: {
      relational_vulnerability: B,
      active_empathy: B,
      exploratory_sociability: B * 0.6,
    },
    promptHintFr:
      "ambiance « couple » : la quête se vit idéalement à deux ; ton complice et tendre, sans niaiserie ; petits gestes qui racontent la relation.",
    promptHintEn:
      'couple vibe: quest is ideally lived as a duo; warm, complicit tone, never cheesy; tiny gestures that say the relationship.',
  },
  pack_ose: {
    id: 'pack_ose',
    kind: 'vibe',
    label: 'Osé',
    labelEn: 'Daring',
    tagline: 'Sortir un cran plus haut. Audacieux mais sain.',
    taglineEn: 'A notch bolder — daring, never reckless.',
    icon: 'Flame',
    categoryBoost: {
      hostile_immersion: B,
      physical_existential: B,
      spatial_adventure: B * 0.6,
    },
    promptHintFr:
      "ambiance « osée » : un défi qui décoiffe légèrement, geste audacieux mais sûr, sans morale ni coaching pédant.",
    promptHintEn:
      'daring vibe: a slightly bolder challenge, audacious yet safe, no moralizing or preachy coaching.',
  },
  pack_rencontres: {
    id: 'pack_rencontres',
    kind: 'vibe',
    label: 'Rencontres',
    labelEn: 'Dating',
    tagline: 'Briser la glace, créer le déclic.',
    taglineEn: 'Break the ice, spark the moment.',
    icon: 'Sparkles',
    categoryBoost: {
      exploratory_sociability: B,
      relational_vulnerability: B,
      active_empathy: B * 0.5,
    },
    promptHintFr:
      "ambiance « rencontres » : ouvre une porte vers l'autre — un échange, un compliment sincère, une question qui sort de l'ordinaire — sans drague forcée.",
    promptHintEn:
      "dating vibe: open a door toward another person — a real exchange, an honest compliment, an unusual question — never pushy flirting.",
  },
  pack_nocturne: {
    id: 'pack_nocturne',
    kind: 'vibe',
    label: 'Nocturne',
    labelEn: 'Night out',
    tagline: 'Quand la ville change de peau après la nuit tombée.',
    taglineEn: 'When the city changes skin after dark.',
    icon: 'Moon',
    categoryBoost: {
      spatial_adventure: B,
      sensory_deprivation: B * 0.7,
      public_introspection: B * 0.6,
    },
    promptHintFr:
      "ambiance « nocturne » : la quête se vit après le coucher du soleil — éclairage, silence ou ferveur urbaine, sécurité de base toujours présente.",
    promptHintEn:
      'night-out vibe: quest takes place after sunset — light, silence or urban buzz; always keep base safety in mind.',
  },
  pack_piment: {
    id: 'pack_piment',
    kind: 'vibe',
    label: 'Piment',
    labelEn: 'Spicy',
    tagline: 'Un soupçon de provocation pour pimenter la journée.',
    taglineEn: 'A pinch of provocation to spice up your day.',
    icon: 'Zap',
    categoryBoost: {
      public_introspection: B,
      hostile_immersion: B * 0.7,
      relational_vulnerability: B * 0.5,
    },
    promptHintFr:
      "ambiance « piment » : on flirte avec l'inconfort visible (parler à voix haute, micro-performance), jamais transgresser les autres ; rester sain et drôle.",
    promptHintEn:
      'spicy vibe: flirt with visible discomfort (speak up, micro-performance), never transgress others; stay healthy and witty.',
  },

  // ── Style de vie ─────────────────────────────────────────────────────────
  pack_solo_absolu: {
    id: 'pack_solo_absolu',
    kind: 'lifestyle',
    label: 'Solo absolu',
    labelEn: 'Solo absolute',
    tagline: 'Du temps pour soi, sans bruit, sans regard.',
    taglineEn: 'Time alone — no noise, no gaze.',
    icon: 'User',
    categoryBoost: {
      sensory_deprivation: B,
      async_discipline: B,
      dopamine_detox: B * 0.7,
    },
    promptHintFr:
      "style de vie « solo absolu » : la quête se vit seul·e, sans interaction sociale ; introspection, micro-rituel, soin de soi.",
    promptHintEn:
      'solo lifestyle: quest is lived alone, no social interaction; introspection, micro-ritual, self-care.',
  },
  pack_gastronomie: {
    id: 'pack_gastronomie',
    kind: 'lifestyle',
    label: 'Gastronomie',
    labelEn: 'Gastronomy',
    tagline: 'Manger autrement : produit, geste, lieu.',
    taglineEn: 'Eat differently — product, gesture, place.',
    icon: 'UtensilsCrossed',
    categoryBoost: {
      exploratory_sociability: B * 0.6,
      spatial_adventure: B * 0.5,
      active_empathy: B * 0.5,
    },
    promptHintFr:
      "style « gastronomie » : un produit, un marché, un cuisinier·e, un plat à essayer ; goût, geste, mémoire — pas un cours de nutrition.",
    promptHintEn:
      'gastronomy lifestyle: a product, a market, a cook, a dish to try; taste, gesture, memory — never a nutrition lecture.',
  },
  pack_slow_life: {
    id: 'pack_slow_life',
    kind: 'lifestyle',
    label: 'Slow life',
    labelEn: 'Slow life',
    tagline: 'Ralentir, sentir, respirer.',
    taglineEn: 'Slow down, sense, breathe.',
    icon: 'Leaf',
    categoryBoost: {
      sensory_deprivation: B,
      dopamine_detox: B,
      temporal_projection: B * 0.5,
    },
    promptHintFr:
      "style « slow life » : pas de course, peu d'objets, beaucoup d'attention ; lenteur volontaire, sensorialité, présence à ce qui est là.",
    promptHintEn:
      'slow-life lifestyle: no rush, few objects, lots of attention; deliberate slowness, sensory presence, being where you are.',
  },
  pack_social_amis: {
    id: 'pack_social_amis',
    kind: 'lifestyle',
    label: 'Social & amis',
    labelEn: 'Social & friends',
    tagline: 'Renforcer les liens qui comptent.',
    taglineEn: 'Strengthen the bonds that matter.',
    icon: 'Users',
    categoryBoost: {
      exploratory_sociability: B,
      active_empathy: B,
      spontaneous_altruism: B * 0.6,
    },
    promptHintFr:
      "style « social & amis » : la quête fait place aux proches — un message, un rendez-vous, une attention concrète. Lien réel, pas réseaux sociaux.",
    promptHintEn:
      'social & friends lifestyle: quest makes room for close people — a message, a meet-up, real attention. Real bond, not social-media noise.',
  },

  // ── Lieux ────────────────────────────────────────────────────────────────
  pack_paris: {
    id: 'pack_paris',
    kind: 'location',
    label: 'Paris',
    labelEn: 'Paris',
    tagline: 'La carte est ton terrain : 20 arrondissements à arpenter.',
    taglineEn: 'The map is your playground: 20 arrondissements to roam.',
    icon: 'MapPin',
    categoryBoost: {
      spatial_adventure: B,
      public_introspection: B * 0.5,
    },
    promptHintFr:
      "ancrage « Paris » : quand pertinent, situer la quête dans Paris (arrondissement, rive, métro), avec un détail vrai (pas un cliché touristique).",
    promptHintEn:
      'Paris anchoring: when relevant, place the quest in Paris (arrondissement, bank, metro), using a true detail (not a tourist cliché).',
  },
  pack_lyon: {
    id: 'pack_lyon',
    kind: 'location',
    label: 'Lyon',
    labelEn: 'Lyon',
    tagline: 'Entre Saône et Rhône, traboules et terrasses.',
    taglineEn: 'Between Saône and Rhône, traboules and terraces.',
    icon: 'MapPin',
    categoryBoost: {
      spatial_adventure: B,
      exploratory_sociability: B * 0.4,
    },
    promptHintFr:
      "ancrage « Lyon » : si pertinent, situer la quête à Lyon (presqu'île, Croix-Rousse, traboules, quais) avec un détail concret.",
    promptHintEn:
      'Lyon anchoring: if relevant, place the quest in Lyon (Presqu’île, Croix-Rousse, traboules, quays) with a concrete detail.',
  },
  pack_nantes: {
    id: 'pack_nantes',
    kind: 'location',
    label: 'Nantes',
    labelEn: 'Nantes',
    tagline: 'Île, machines, Loire — la ville se prête au jeu.',
    taglineEn: 'Island, machines, Loire — the city plays along.',
    icon: 'MapPin',
    categoryBoost: {
      spatial_adventure: B,
      public_introspection: B * 0.5,
    },
    promptHintFr:
      "ancrage « Nantes » : si pertinent, situer la quête à Nantes (île de Nantes, Bouffay, Erdre) avec un détail concret.",
    promptHintEn:
      'Nantes anchoring: if relevant, place the quest in Nantes (Île de Nantes, Bouffay, Erdre) with a concrete detail.',
  },
  pack_marseille: {
    id: 'pack_marseille',
    kind: 'location',
    label: 'Marseille',
    labelEn: 'Marseille',
    tagline: 'Calanques, Vieux-Port, mistral : la ville donne le ton.',
    taglineEn: 'Calanques, Old Port, mistral — the city sets the tone.',
    icon: 'MapPin',
    categoryBoost: {
      spatial_adventure: B,
      physical_existential: B * 0.6,
    },
    promptHintFr:
      "ancrage « Marseille » : si pertinent, situer la quête à Marseille (Vieux-Port, Panier, calanques, corniche) avec un détail vrai.",
    promptHintEn:
      'Marseille anchoring: if relevant, place the quest in Marseille (Vieux-Port, Le Panier, calanques, corniche) with a true detail.',
  },
};

export const QUEST_PACK_IDS: string[] = Object.keys(QUEST_PACKS_REGISTRY);

export function getQuestPack(id: string): QuestPackEntry | undefined {
  return QUEST_PACKS_REGISTRY[id];
}

export function listQuestPacksByKind(kind: QuestPackKind): QuestPackEntry[] {
  return QUEST_PACK_IDS.map((id) => QUEST_PACKS_REGISTRY[id]!).filter((p) => p.kind === kind);
}

/**
 * Cumule les `categoryBoost`s des packs possédés pour produire un biais
 * additif (saturé) à appliquer côté moteur. Forme similaire à
 * `refinementAnswersToCategoryBias` pour pouvoir cohabiter sans réécrire
 * le scoring.
 */
export function questPackBiasFromOwned(
  ownedPackIds: string[] | undefined,
): Partial<Record<PsychologicalCategory, number>> {
  if (!ownedPackIds || ownedPackIds.length === 0) return {};
  const out: Partial<Record<PsychologicalCategory, number>> = {};
  for (const id of ownedPackIds) {
    const pack = QUEST_PACKS_REGISTRY[id];
    if (!pack) continue;
    for (const [cat, boost] of Object.entries(pack.categoryBoost) as [
      PsychologicalCategory,
      number,
    ][]) {
      const cur = out[cat] ?? 0;
      out[cat] = cur + boost;
    }
  }
  /** Saturation : éviter qu'un cumul de packs n'écrase la variété (≈ ±0.18). */
  const CAP = 0.18;
  for (const k of Object.keys(out) as PsychologicalCategory[]) {
    const v = out[k] ?? 0;
    out[k] = Math.max(-CAP, Math.min(CAP, v));
  }
  return out;
}

/** Helper UI : noms des packs possédés (libellés FR par défaut). */
export function questPackLabels(
  ownedPackIds: string[] | undefined,
  locale: 'fr' | 'en' = 'fr',
): string[] {
  if (!ownedPackIds || ownedPackIds.length === 0) return [];
  return ownedPackIds
    .map((id) => QUEST_PACKS_REGISTRY[id])
    .filter((p): p is QuestPackEntry => Boolean(p))
    .map((p) => (locale === 'en' ? p.labelEn : p.label));
}
