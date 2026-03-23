/**
 * L’IA renvoie un nom d’icône Lucide (`icon`), stocké côté API dans `generatedEmoji`.
 * Pour les cartes type « landing », on affiche un vrai emoji Unicode.
 */
export const QUEST_LUCIDE_ICON_TO_EMOJI: Record<string, string> = {
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

const DEFAULT_QUEST_EMOJI = '⚔️';

/** Nom d’icône PascalCase ou chaîne déjà emoji */
export function questDisplayEmoji(raw: string | null | undefined): string {
  if (raw == null || raw === '') return DEFAULT_QUEST_EMOJI;
  const t = raw.trim();
  if (t.length === 0) return DEFAULT_QUEST_EMOJI;
  // Déjà un emoji (ou texte non ASCII) : on garde tel quel
  if (!/^[A-Za-z]+$/.test(t)) return t;
  const direct = QUEST_LUCIDE_ICON_TO_EMOJI[t];
  if (direct) return direct;
  const pascal = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  return QUEST_LUCIDE_ICON_TO_EMOJI[pascal] ?? DEFAULT_QUEST_EMOJI;
}
