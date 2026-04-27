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
};

export const TITLE_IDS = Object.keys(TITLES_REGISTRY);

export function getTitleDefinition(id: string): TitleDefinition | undefined {
  return TITLES_REGISTRY[id];
}
