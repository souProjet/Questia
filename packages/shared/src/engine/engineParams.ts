/**
 * Paramètres numériques du moteur de génération de quêtes.
 *
 * Toutes les « constantes magiques » qui pilotent la personnalité réelle de
 * l'algo vivent ici, avec une explication de leur rôle et des effets attendus
 * quand on les bouge. Cela facilite l'A/B testing, la revue et la maintenance.
 */

// ── computeExhibitedPersonality ─────────────────────────────────────────────

/**
 * Décroissance de récence : le log i reçoit un poids `RECENCY_DECAY ** i`.
 * Plus petit = oublie plus vite. 0.88 ≈ le log #10 pèse ~28 % du #0.
 */
export const RECENCY_DECAY = 0.88;

/** Poids de statut pour l'agrégation `exhibited`. Positif = tire vers la corrélation de la catégorie. */
export const STATUS_WEIGHT = {
  completed: 1.0,
  accepted: 0.3,
  rejected: -0.5,
  abandoned: 0,
  pending: 0,
  replaced: 0,
} as const;

/**
 * Baseline neutre du vecteur `exhibited`. Les contributions de corrélation
 * s'ajoutent à partir de cette valeur — comparable directement à `declared` ∈ [0,1].
 */
export const EXHIBITED_BASELINE = 0.5;

/**
 * Amplitude max par laquelle une corrélation parfaite (|c|=1, poids=1) peut éloigner
 * un trait de la baseline en un seul log. À 0.5, un log "completed" avec c=+1 porte
 * le trait jusqu'à 1.0 ; c=-1 jusqu'à 0.0.
 */
export const EXHIBITED_MAX_SHIFT = 0.5;

/** Seuil d'écart à la baseline pour considérer qu'il y a du signal exploitable. */
export const EXHIBITED_SIGNAL_EPSILON = 0.03;

// ── computeGentleness ───────────────────────────────────────────────────────

/** Score 0-1 : plus haut = profil "plus doux" (calme, peu avide de sensations). */
export const GENTLENESS_WEIGHTS = {
  extraversion: 0.30,
  thrillSeeking: 0.25,
  openness: 0.20,
  emotionalStability: 0.10,
  boredomSusceptibility: 0.15,
} as const;

// ── Confort & durée (phaseFit) ──────────────────────────────────────────────

/** Barème de confort numérique pour `phaseFit`. */
export const COMFORT_NUMERIC = {
  low: 1,
  moderate: 2,
  high: 3,
  extreme: 4,
} as const;

/** Tolérance "durée trop longue" (au-delà, légère pénalité en dehors de rupture). */
export const DURATION_SOFT_CAP_MIN = 60;

// ── Soft-update du profil déclaré (early days) ──────────────────────────────

export const SOFT_UPDATE_MAX_DAY = 5;
export const SOFT_UPDATE_ACCEPT_WEIGHT = 0.03;
export const SOFT_UPDATE_REJECT_WEIGHT = -0.05;

// ── Fenêtres temporelles (exclusions & récence) ─────────────────────────────

/** Nombre de jours calendaires pendant lesquels un archétype déjà servi est exclu. */
export const RECENT_EXCLUSION_WINDOW_DAYS = 7;

/** Nombre de logs pris en compte pour le calcul de `exhibited` / congruence. */
export const ENGINE_HISTORY_LOGS = 14;
