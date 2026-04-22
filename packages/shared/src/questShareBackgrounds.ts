/**
 * Fonds pour la carte « quête validée » (partage / export).
 * — Web : `cssGradient` en background-image
 * — React Native : `colors` + `locations` pour expo-linear-gradient
 */
export interface QuestShareBackground {
  id: string;
  /** Libellé court pour le sélecteur */
  label: string;
  /** Gradient CSS linéaire complet, ex. linear-gradient(165deg, #a, #b) */
  cssGradient: string;
  /** Couleurs pour LinearGradient (au moins 2) */
  colors: readonly [string, string, ...string[]];
  /** Positions 0–1, même longueur que colors */
  locations?: readonly number[];
  /** Texte / panneau adaptés à un fond sombre */
  darkForeground: boolean;
}

export const QUEST_SHARE_BACKGROUNDS: readonly QuestShareBackground[] = [
  {
    id: 'adventure',
    label: 'Aventure',
    cssGradient:
      'linear-gradient(165deg, #e8ecf8 0%, #f4f1ea 42%, #dce4ef 100%)',
    colors: ['#e8ecf8', '#f4f1ea', '#dce4ef'],
    locations: [0, 0.42, 1],
    darkForeground: false,
  },
  {
    id: 'sunrise',
    label: 'Aurore',
    cssGradient:
      'linear-gradient(180deg, #fef3c7 0%, #fde68a 35%, #fdba74 100%)',
    colors: ['#fef3c7', '#fde68a', '#fdba74'],
    locations: [0, 0.35, 1],
    darkForeground: false,
  },
  {
    id: 'forest',
    label: 'Forêt',
    cssGradient:
      'linear-gradient(145deg, #d1fae5 0%, #a7f3d0 50%, #34d399 100%)',
    colors: ['#d1fae5', '#a7f3d0', '#34d399'],
    locations: [0, 0.5, 1],
    darkForeground: false,
  },
  {
    id: 'ocean',
    label: 'Océan',
    cssGradient:
      'linear-gradient(160deg, #e7f1ef 0%, #3d7a72 45%, #134e4a 100%)',
    colors: ['#e7f1ef', '#3d7a72', '#134e4a'],
    locations: [0, 0.45, 1],
    darkForeground: false,
  },
  {
    id: 'ember',
    label: 'Braise',
    cssGradient:
      'linear-gradient(165deg, #faf6f4 0%, #d4a088 40%, #c2410c 100%)',
    colors: ['#faf6f4', '#d4a088', '#c2410c'],
    locations: [0, 0.4, 1],
    darkForeground: false,
  },
  {
    id: 'night',
    label: 'Crépuscule',
    cssGradient:
      'linear-gradient(180deg, #1e293b 0%, #334155 55%, #0f172a 100%)',
    colors: ['#1e293b', '#334155', '#0f172a'],
    locations: [0, 0.55, 1],
    darkForeground: true,
  },
  {
    id: 'lavender',
    label: 'Lavande',
    cssGradient:
      'linear-gradient(145deg, #faf5ff 0%, #e9d5ff 45%, #8b5cf6 100%)',
    colors: ['#faf5ff', '#e9d5ff', '#8b5cf6'],
    locations: [0, 0.45, 1],
    darkForeground: false,
  },
  {
    id: 'dune',
    label: 'Dune',
    cssGradient:
      'linear-gradient(168deg, #fffbeb 0%, #fcd34d 42%, #d97706 100%)',
    colors: ['#fffbeb', '#fcd34d', '#d97706'],
    locations: [0, 0.42, 1],
    darkForeground: false,
  },
  {
    id: 'pop',
    label: 'Pop',
    cssGradient:
      'linear-gradient(135deg, #fdf2f8 0%, #f472b6 48%, #db2777 100%)',
    colors: ['#fdf2f8', '#f472b6', '#db2777'],
    locations: [0, 0.48, 1],
    darkForeground: false,
  },
  {
    id: 'arctic',
    label: 'Arctique',
    cssGradient:
      'linear-gradient(175deg, #f0fdfa 0%, #99f6e4 38%, #0f766e 100%)',
    colors: ['#f0fdfa', '#99f6e4', '#0f766e'],
    locations: [0, 0.38, 1],
    darkForeground: false,
  },
  {
    id: 'boreal',
    label: 'Boréal',
    cssGradient:
      'linear-gradient(180deg, #042f2e 0%, #0d9488 52%, #134e4a 100%)',
    colors: ['#042f2e', '#0d9488', '#134e4a'],
    locations: [0, 0.52, 1],
    darkForeground: true,
  },
  {
    id: 'velvet',
    label: 'Velours',
    cssGradient:
      'linear-gradient(155deg, #1e1b4b 0%, #6d28d9 42%, #fce7f3 100%)',
    colors: ['#1e1b4b', '#6d28d9', '#fce7f3'],
    locations: [0, 0.42, 1],
    darkForeground: false,
  },
] as const;

export function getQuestShareBackgroundById(id: string): QuestShareBackground {
  return QUEST_SHARE_BACKGROUNDS.find((b) => b.id === id) ?? QUEST_SHARE_BACKGROUNDS[0];
}
