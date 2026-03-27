import type { AppLocale, EscalationPhase, ExplorerAxis, RiskAxis } from '../types';

/** Liste canonique des insignes (ids, titres et critères affichés au joueur). */
export type BadgeId =
  | 'premiere_quete'
  | 'cinq_quetes'
  | 'dix_quetes'
  | 'quinze_quetes'
  | 'vingt_cinq_quetes'
  | 'cinquante_quetes'
  | 'cent_quetes'
  | 'serie_3'
  | 'serie_7'
  | 'serie_14'
  | 'serie_30'
  | 'serie_60'
  | 'phase_calibration_fin'
  | 'phase_expansion'
  | 'phase_rupture'
  | 'parcours_jour_21'
  | 'parcours_jour_30'
  | 'parcours_jour_60'
  | 'premiere_exterieur'
  | 'exterieur_5'
  | 'exterieur_10'
  | 'exterieur_25'
  | 'exterieur_50'
  | 'quadrant_audacieux'
  | 'quadrant_explorer_prudent'
  | 'quadrant_homebody_prudent'
  | 'quadrant_homebody_risktaker';

export type BadgeCategory =
  | 'progression'
  | 'serie'
  | 'phase'
  | 'exploration'
  | 'style'
  | 'volume'
  | 'milestone';

/** Libellés courts pour filtres / pastilles UI. */
export const BADGE_CATEGORY_LABEL_FR: Record<BadgeCategory, string> = {
  phase: 'Phase',
  milestone: 'Jalon',
  serie: 'Série',
  volume: 'Volume',
  exploration: 'Extérieur',
  style: 'Profil',
  progression: 'Parcours',
};

export const BADGE_CATEGORY_LABEL_EN: Record<BadgeCategory, string> = {
  phase: 'Phase',
  milestone: 'Milestone',
  serie: 'Streak',
  volume: 'Volume',
  exploration: 'Outdoors',
  style: 'Profile',
  progression: 'Journey',
};

export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  criteria: string;
  placeholderEmoji: string;
  category: BadgeCategory;
}

/**
 * Ordre d’affichage : phases & jalons parcours → séries → volume → extérieur → style (quadrants).
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── Phases & parcours (temps) ─────────────────────────────────────────────
  {
    id: 'phase_calibration_fin',
    title: 'Étalonnage franchi',
    criteria: 'Atteindre au moins le jour 3 de ton parcours.',
    placeholderEmoji: '🌱',
    category: 'phase',
  },
  {
    id: 'phase_expansion',
    title: 'Horizon élargi',
    criteria: 'Entrer en phase Expansion (jour 4+).',
    placeholderEmoji: '🧭',
    category: 'phase',
  },
  {
    id: 'phase_rupture',
    title: 'Point de rupture',
    criteria: 'Entrer en phase Rupture (jour 11+).',
    placeholderEmoji: '⚡',
    category: 'phase',
  },
  {
    id: 'parcours_jour_21',
    title: 'Trois semaines',
    criteria: 'Atteindre le jour 21 de parcours.',
    placeholderEmoji: '📅',
    category: 'milestone',
  },
  {
    id: 'parcours_jour_30',
    title: 'Un mois sur la route',
    criteria: 'Atteindre le jour 30 de parcours.',
    placeholderEmoji: '🗓️',
    category: 'milestone',
  },
  {
    id: 'parcours_jour_60',
    title: 'Saison habitée',
    criteria: 'Atteindre le jour 60 de parcours.',
    placeholderEmoji: '🏕️',
    category: 'milestone',
  },
  // ── Séries ────────────────────────────────────────────────────────────────
  {
    id: 'serie_3',
    title: 'Premier élan',
    criteria: 'Atteindre une série de 3 jours.',
    placeholderEmoji: '✨',
    category: 'serie',
  },
  {
    id: 'serie_7',
    title: 'Semaine en feu',
    criteria: 'Atteindre une série de 7 jours.',
    placeholderEmoji: '🔥',
    category: 'serie',
  },
  {
    id: 'serie_14',
    title: 'Deux semaines d’affilée',
    criteria: 'Atteindre une série de 14 jours.',
    placeholderEmoji: '💫',
    category: 'serie',
  },
  {
    id: 'serie_30',
    title: 'Marathon',
    criteria: 'Atteindre une série de 30 jours.',
    placeholderEmoji: '🏅',
    category: 'serie',
  },
  {
    id: 'serie_60',
    title: 'Rythme d’acier',
    criteria: 'Atteindre une série de 60 jours.',
    placeholderEmoji: '🔩',
    category: 'serie',
  },
  // ── Volume (quêtes validées) ─────────────────────────────────────────────
  {
    id: 'premiere_quete',
    title: 'Première pierre',
    criteria: 'Valider ta première quête.',
    placeholderEmoji: '🥇',
    category: 'volume',
  },
  {
    id: 'cinq_quetes',
    title: 'Cinq victoires',
    criteria: 'Valider 5 quêtes au total.',
    placeholderEmoji: '5️⃣',
    category: 'volume',
  },
  {
    id: 'dix_quetes',
    title: 'Régularité',
    criteria: 'Valider 10 quêtes au total.',
    placeholderEmoji: '🔟',
    category: 'volume',
  },
  {
    id: 'quinze_quetes',
    title: 'En série',
    criteria: 'Valider 15 quêtes au total.',
    placeholderEmoji: '📎',
    category: 'volume',
  },
  {
    id: 'vingt_cinq_quetes',
    title: 'Quart de siècle',
    criteria: 'Valider 25 quêtes au total.',
    placeholderEmoji: '💠',
    category: 'volume',
  },
  {
    id: 'cinquante_quetes',
    title: 'Demi-centenaire',
    criteria: 'Valider 50 quêtes au total.',
    placeholderEmoji: '🎯',
    category: 'volume',
  },
  {
    id: 'cent_quetes',
    title: 'Cent pas',
    criteria: 'Valider 100 quêtes au total.',
    placeholderEmoji: '💯',
    category: 'volume',
  },
  // ── Extérieur ─────────────────────────────────────────────────────────────
  {
    id: 'premiere_exterieur',
    title: 'Premier pas dehors',
    criteria: 'Valider ta première quête extérieure.',
    placeholderEmoji: '🌿',
    category: 'exploration',
  },
  {
    id: 'exterieur_5',
    title: 'Air du dehors',
    criteria: 'Valider 5 quêtes extérieures.',
    placeholderEmoji: '🌤️',
    category: 'exploration',
  },
  {
    id: 'exterieur_10',
    title: 'Explorateur·rice des lieux',
    criteria: 'Valider 10 quêtes extérieures.',
    placeholderEmoji: '🗺️',
    category: 'exploration',
  },
  {
    id: 'exterieur_25',
    title: 'Grand large',
    criteria: 'Valider 25 quêtes extérieures.',
    placeholderEmoji: '🧗',
    category: 'exploration',
  },
  {
    id: 'exterieur_50',
    title: 'Horizon ouvert',
    criteria: 'Valider 50 quêtes extérieures.',
    placeholderEmoji: '🌍',
    category: 'exploration',
  },
  // ── Quadrants (profil + volume) ──────────────────────────────────────────
  {
    id: 'quadrant_audacieux',
    title: 'Trait pour trait · audacieux',
    criteria: 'Profil Explorateur·rice + Preneur·se de risque et 15 quêtes validées.',
    placeholderEmoji: '🎲',
    category: 'style',
  },
  {
    id: 'quadrant_explorer_prudent',
    title: 'Trait pour trait · explorateur sage',
    criteria: 'Profil Explorateur·rice + Prudence et 15 quêtes validées.',
    placeholderEmoji: '🧠',
    category: 'style',
  },
  {
    id: 'quadrant_homebody_prudent',
    title: 'Trait pour trait · ancrage',
    criteria: 'Profil Casanier·ière + Prudence et 15 quêtes validées.',
    placeholderEmoji: '🏠',
    category: 'style',
  },
  {
    id: 'quadrant_homebody_risktaker',
    title: 'Trait pour trait · tension',
    criteria: 'Profil Casanier·ière + Audace et 15 quêtes validées.',
    placeholderEmoji: '🎭',
    category: 'style',
  },
];

const byId = new Map<string, BadgeDefinition>(
  BADGE_DEFINITIONS.map((b) => [b.id, b] as const),
);

/** Titres et critères en anglais (même ordre que BADGE_DEFINITIONS). */
export const BADGE_TEXT_EN: Record<BadgeId, { title: string; criteria: string }> = {
  phase_calibration_fin: {
    title: 'Calibration cleared',
    criteria: 'Reach at least day 3 of your journey.',
  },
  phase_expansion: {
    title: 'Wider horizon',
    criteria: 'Enter Expansion phase (day 4+).',
  },
  phase_rupture: {
    title: 'Breaking point',
    criteria: 'Enter Rupture phase (day 11+).',
  },
  parcours_jour_21: {
    title: 'Three weeks',
    criteria: 'Reach journey day 21.',
  },
  parcours_jour_30: {
    title: 'A month on the road',
    criteria: 'Reach journey day 30.',
  },
  parcours_jour_60: {
    title: 'Season under your belt',
    criteria: 'Reach journey day 60.',
  },
  serie_3: {
    title: 'First momentum',
    criteria: 'Reach a 3-day streak.',
  },
  serie_7: {
    title: 'Week on fire',
    criteria: 'Reach a 7-day streak.',
  },
  serie_14: {
    title: 'Two weeks straight',
    criteria: 'Reach a 14-day streak.',
  },
  serie_30: {
    title: 'Marathon',
    criteria: 'Reach a 30-day streak.',
  },
  serie_60: {
    title: 'Iron rhythm',
    criteria: 'Reach a 60-day streak.',
  },
  premiere_quete: {
    title: 'First stone',
    criteria: 'Complete your first quest.',
  },
  cinq_quetes: {
    title: 'Five wins',
    criteria: 'Complete 5 quests in total.',
  },
  dix_quetes: {
    title: 'Consistency',
    criteria: 'Complete 10 quests in total.',
  },
  quinze_quetes: {
    title: 'On a roll',
    criteria: 'Complete 15 quests in total.',
  },
  vingt_cinq_quetes: {
    title: 'Quarter century',
    criteria: 'Complete 25 quests in total.',
  },
  cinquante_quetes: {
    title: 'Half-century',
    criteria: 'Complete 50 quests in total.',
  },
  cent_quetes: {
    title: 'Centurion',
    criteria: 'Complete 100 quests in total.',
  },
  premiere_exterieur: {
    title: 'First step outside',
    criteria: 'Complete your first outdoor quest.',
  },
  exterieur_5: {
    title: 'Fresh air',
    criteria: 'Complete 5 outdoor quests.',
  },
  exterieur_10: {
    title: 'Place explorer',
    criteria: 'Complete 10 outdoor quests.',
  },
  exterieur_25: {
    title: 'Open water',
    criteria: 'Complete 25 outdoor quests.',
  },
  exterieur_50: {
    title: 'Open horizon',
    criteria: 'Complete 50 outdoor quests.',
  },
  quadrant_audacieux: {
    title: 'Line for line · bold',
    criteria: 'Explorer + risk-taker profile and 15 completed quests.',
  },
  quadrant_explorer_prudent: {
    title: 'Line for line · wise explorer',
    criteria: 'Explorer + cautious profile and 15 completed quests.',
  },
  quadrant_homebody_prudent: {
    title: 'Line for line · grounded',
    criteria: 'Homebody + cautious profile and 15 completed quests.',
  },
  quadrant_homebody_risktaker: {
    title: 'Line for line · tension',
    criteria: 'Homebody + bold profile and 15 completed quests.',
  },
};

export function localizeBadgeDefinition(
  def: BadgeDefinition,
  locale: AppLocale,
): { title: string; criteria: string } {
  if (locale === 'en') {
    const en = BADGE_TEXT_EN[def.id];
    if (en) return en;
  }
  return { title: def.title, criteria: def.criteria };
}

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return byId.get(id as BadgeId);
}

export interface DisplayBadge {
  id: string;
  unlockedAt: string;
  title: string;
  criteria: string;
  placeholderEmoji: string;
  category: BadgeCategory;
}

/** Normalise le JSON stocké en base et enrichit les titres / critères pour l’UI. */
export function displayEarnedBadges(raw: unknown, locale: AppLocale = 'fr'): DisplayBadge[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.filter(
    (x): x is { id: string; unlockedAt: string } =>
      x != null &&
      typeof x === 'object' &&
      typeof (x as { id?: string }).id === 'string' &&
      typeof (x as { unlockedAt?: string }).unlockedAt === 'string',
  );
  return rows.map((b) => {
    const def = getBadgeDefinition(b.id);
    const text = def ? localizeBadgeDefinition(def, locale) : { title: b.id, criteria: '' };
    return {
      id: b.id,
      unlockedAt: b.unlockedAt,
      title: def ? text.title : b.id,
      criteria: def ? text.criteria : '',
      placeholderEmoji: def?.placeholderEmoji ?? '🏅',
      category: def?.category ?? 'progression',
    };
  });
}

export interface BadgeCatalogEntry {
  id: BadgeId;
  title: string;
  criteria: string;
  placeholderEmoji: string;
  category: BadgeCategory;
  unlocked: boolean;
  unlockedAt?: string;
}

function parseEarnedDates(raw: unknown): Map<string, string> {
  const m = new Map<string, string>();
  if (!Array.isArray(raw)) return m;
  for (const x of raw) {
    if (x != null && typeof x === 'object' && typeof (x as { id?: string }).id === 'string') {
      const id = (x as { id: string }).id;
      const u = (x as { unlockedAt?: string }).unlockedAt;
      if (typeof u === 'string') m.set(id, u);
    }
  }
  return m;
}

/** Tous les insignes du jeu : débloqués ou verrouillés (objectifs visibles). */
export function getBadgeCatalogForUi(earnedRaw: unknown, locale: AppLocale = 'fr'): BadgeCatalogEntry[] {
  const dates = parseEarnedDates(earnedRaw);
  return BADGE_DEFINITIONS.map((def) => {
    const { title, criteria } = localizeBadgeDefinition(def, locale);
    return {
      id: def.id,
      title,
      criteria,
      placeholderEmoji: def.placeholderEmoji,
      category: def.category,
      unlocked: dates.has(def.id),
      unlockedAt: dates.get(def.id),
    };
  });
}

export interface BadgeEvaluationStats {
  totalCompletions: number;
  outdoorCompletions: number;
  currentStreak: number;
  currentDay: number;
  currentPhase: EscalationPhase;
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
}

export interface EarnedBadge {
  id: BadgeId;
  unlockedAt: string;
}

/**
 * Retourne uniquement les badges nouvellement débloqués (pas déjà dans `existingIds`).
 */
export function evaluateNewBadges(
  existingIds: Set<string>,
  stats: BadgeEvaluationStats,
  nowIso: string = new Date().toISOString(),
): EarnedBadge[] {
  const out: EarnedBadge[] = [];

  const tryUnlock = (id: BadgeId, condition: boolean) => {
    if (existingIds.has(id) || out.some((b) => b.id === id)) return;
    if (condition) out.push({ id, unlockedAt: nowIso });
  };

  const { totalCompletions: t, outdoorCompletions: o, currentStreak: s, currentDay: d, currentPhase: ph } = stats;
  const ex = stats.explorerAxis;
  const rk = stats.riskAxis;

  const volOk = (n: number) => t >= n;
  const extOk = (n: number) => o >= n;
  const quad = (needEx: ExplorerAxis, needRk: RiskAxis) =>
    ex === needEx && rk === needRk && t >= 15;

  // Volume
  tryUnlock('premiere_quete', volOk(1));
  tryUnlock('cinq_quetes', volOk(5));
  tryUnlock('dix_quetes', volOk(10));
  tryUnlock('quinze_quetes', volOk(15));
  tryUnlock('vingt_cinq_quetes', volOk(25));
  tryUnlock('cinquante_quetes', volOk(50));
  tryUnlock('cent_quetes', volOk(100));

  // Séries
  tryUnlock('serie_3', s >= 3);
  tryUnlock('serie_7', s >= 7);
  tryUnlock('serie_14', s >= 14);
  tryUnlock('serie_30', s >= 30);
  tryUnlock('serie_60', s >= 60);

  // Phases & parcours (jour = compteur de parcours côté profil)
  tryUnlock('phase_calibration_fin', d >= 3);
  tryUnlock('phase_expansion', d >= 4);
  tryUnlock('phase_rupture', d >= 11 || ph === 'rupture');
  tryUnlock('parcours_jour_21', d >= 21);
  tryUnlock('parcours_jour_30', d >= 30);
  tryUnlock('parcours_jour_60', d >= 60);

  // Extérieur
  tryUnlock('premiere_exterieur', extOk(1));
  tryUnlock('exterieur_5', extOk(5));
  tryUnlock('exterieur_10', extOk(10));
  tryUnlock('exterieur_25', extOk(25));
  tryUnlock('exterieur_50', extOk(50));

  // Quadrants (les 4 combinaisons axes × volume)
  tryUnlock('quadrant_audacieux', quad('explorer', 'risktaker'));
  tryUnlock('quadrant_explorer_prudent', quad('explorer', 'cautious'));
  tryUnlock('quadrant_homebody_prudent', quad('homebody', 'cautious'));
  tryUnlock('quadrant_homebody_risktaker', quad('homebody', 'risktaker'));

  return out;
}
