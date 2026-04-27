/**
 * Titres d'affichage — gratuits et accessibles à tous par défaut.
 * Pour en créer un nouveau : ajouter une entrée ici.
 */
export interface TitleDefinition {
  id: string;
  /** Court libellé sous le pseudo / dans la nav */
  label: string;
  /** Nom d'icône Lucide (PascalCase) */
  icon: string;
}

export const TITLES_REGISTRY: Record<string, TitleDefinition> = {
  scout: {
    id: 'scout',
    label: 'Éclaireur·se des trottoirs',
    icon: 'Compass',
  },
  spark: {
    id: 'spark',
    label: 'Étincelle du quotidien',
    icon: 'Sparkles',
  },
  anchor: {
    id: 'anchor',
    label: 'Ancre du calme',
    icon: 'Anchor',
  },
  comet: {
    id: 'comet',
    label: 'Traînée comète',
    icon: 'Rocket',
  },
  heart: {
    id: 'heart',
    label: 'Cœur en vadrouille',
    icon: 'Heart',
  },

  // ── Titres exclusifs débloqués en finissant un parcours de pack ─────────
  pack_couple_master: { id: 'pack_couple_master', label: 'Tandem', icon: 'Heart' },
  pack_ose_master: { id: 'pack_ose_master', label: 'Audacieux·se', icon: 'Flame' },
  pack_rencontres_master: {
    id: 'pack_rencontres_master',
    label: 'Étincelle',
    icon: 'Sparkles',
  },
  pack_nocturne_master: { id: 'pack_nocturne_master', label: 'Noctambule', icon: 'Moon' },
  pack_piment_master: { id: 'pack_piment_master', label: 'Pimenté·e', icon: 'Zap' },
  pack_solo_absolu_master: {
    id: 'pack_solo_absolu_master',
    label: 'Solitude lumineuse',
    icon: 'User',
  },
  pack_gastronomie_master: {
    id: 'pack_gastronomie_master',
    label: 'Gourmet·te',
    icon: 'UtensilsCrossed',
  },
  pack_slow_life_master: {
    id: 'pack_slow_life_master',
    label: 'Tempo doux',
    icon: 'Leaf',
  },
  pack_social_amis_master: {
    id: 'pack_social_amis_master',
    label: 'Tisseur·se',
    icon: 'Users',
  },
  pack_paris_master: {
    id: 'pack_paris_master',
    label: 'Flâneur·se de Paris',
    icon: 'MapPin',
  },
  pack_lyon_master: {
    id: 'pack_lyon_master',
    label: 'Gone des quais',
    icon: 'MapPin',
  },
  pack_nantes_master: {
    id: 'pack_nantes_master',
    label: 'Voyageur·se nantais',
    icon: 'MapPin',
  },
  pack_marseille_master: {
    id: 'pack_marseille_master',
    label: 'Cap au Sud',
    icon: 'MapPin',
  },
};

export const TITLE_IDS = Object.keys(TITLES_REGISTRY);

export function getTitleDefinition(id: string): TitleDefinition | undefined {
  return TITLES_REGISTRY[id];
}
