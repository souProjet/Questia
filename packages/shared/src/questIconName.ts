/**
 * Normalise l'icône de quête affichée : l'API stocke un nom Lucide (PascalCase)
 * dans `generatedEmoji` ; les anciennes valeurs emoji sont converties.
 */
export const QUEST_DISPLAY_ICON_KEYS = [
  'Swords',
  'Camera',
  'Coffee',
  'Mic',
  'Compass',
  'Sparkles',
  'TreePine',
  'MapPin',
  'Target',
  'BookOpen',
  'UtensilsCrossed',
  'Drama',
  'Leaf',
  'Navigation',
  'Flower',
  'Flame',
] as const;

export type QuestDisplayIconKey = (typeof QUEST_DISPLAY_ICON_KEYS)[number];

const VALID = new Set<string>(QUEST_DISPLAY_ICON_KEYS);

/** Ancien mapping nom Lucide → emoji (pour entrées historiques uniquement). */
const LEGACY_LUCIDE_TO_EMOJI: Record<string, string> = {
  Swords: '⚔️',
  Camera: '📸',
  Coffee: '☕',
  Mic: '🎤',
  Compass: '🧭',
  Sparkles: '✨',
  TreePine: '🌲',
  MapPin: '📍',
  Target: '🎯',
  BookOpen: '📖',
  UtensilsCrossed: '🍽️',
  Drama: '🎭',
  Leaf: '🌿',
  Navigation: '🧭',
  Flower: '🌸',
};

const LEGACY_EMOJI_TO_ICON: Record<string, string> = {
  ...Object.fromEntries(Object.entries(LEGACY_LUCIDE_TO_EMOJI).map(([k, v]) => [v, k])),
  '🔥': 'Flame',
};

/** @deprecated Utiliser `normalizeQuestIconName`. */
export const QUEST_LUCIDE_ICON_TO_EMOJI = LEGACY_LUCIDE_TO_EMOJI;

function resolveLucideKey(t: string): string | null {
  if (VALID.has(t)) return t;
  const pascal = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  if (VALID.has(pascal)) return pascal;
  const lower = t.toLowerCase();
  for (const k of VALID) {
    if (k.toLowerCase() === lower) return k;
  }
  return null;
}

/**
 * Retourne un nom d'icône Lucide (PascalCase), ex. `Swords`, `MapPin`.
 */
export function normalizeQuestIconName(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === '') return 'Swords';
  const t = raw.trim();
  if (t.length === 0) return 'Swords';

  if (!/^[A-Za-z]+$/.test(t)) {
    return LEGACY_EMOJI_TO_ICON[t] ?? 'Swords';
  }

  return resolveLucideKey(t) ?? 'Swords';
}

/** @deprecated Utiliser `normalizeQuestIconName` — retourne désormais un nom d'icône, pas un emoji. */
export function questDisplayEmoji(raw: string | null | undefined): string {
  return normalizeQuestIconName(raw);
}
