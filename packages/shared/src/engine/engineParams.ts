/**
 * Paramètres numériques du moteur de génération de quêtes.
 *
 * Toutes les « constantes magiques » qui pilotent la personnalité réelle de
 * l'algo vivent ici, avec une explication de leur rôle et des effets attendus
 * quand on les bouge. Cela facilite l'A/B testing, la revue et la maintenance.
 *
 * Convention : valeurs dans [0, 1] sauf mention contraire. Les deltas et
 * poids sont en valeur brute ajoutée/multipliée aux scores (score plus bas = meilleur fit).
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

// ── scoreQuestFit ───────────────────────────────────────────────────────────

/**
 * Quand on simule « le trait après avoir fait cette activité » :
 *  - shift = corr * FIT_SHIFT_GAIN * max(room, FIT_MIN_ROOM)
 *  - room = ce qu'il reste avant le plafond (1-current pour corr>0, current pour corr<0)
 *
 * FIT_SHIFT_GAIN : amplitude globale du décalage attendu.
 * FIT_MIN_ROOM : évite que des profils déjà extrêmes ne bougent plus du tout.
 */
export const FIT_SHIFT_GAIN = 0.5;
export const FIT_MIN_ROOM = 0.08;

// ── mixPersonality (scoringVector = α·declared + (1-α)·exhibited) ───────────

/** Fourchette du poids attribué à `exhibited` avant ajustement de phase. */
export const MIX_WEIGHT_MIN = 0.12;
export const MIX_WEIGHT_MAX = 0.45;

/** Facteurs multiplicateurs appliqués au poids selon la phase. */
export const MIX_PHASE_MULTIPLIER = {
  calibration: 0.78,
  expansion: 1.05,
  rupture: 1.14,
} as const;

/** Petit additif en phase rupture pour pousser un peu plus vers l'observé. */
export const MIX_RUPTURE_BONUS = 0.035;

/** Plafond final du poids par phase (après multiplicateur). */
export const MIX_PHASE_CAP = {
  calibration: MIX_WEIGHT_MAX,
  expansion: 0.48,
  rupture: 0.54,
} as const;

/** Δ de congruence par défaut si non fourni (ordre de grandeur raisonnable hors rupture). */
export const MIX_DEFAULT_DELTA = 0.22;

// ── Confort / ton doux (computeGentleness + modulation de score) ────────────

/** Score 0-1 : plus haut = profil "plus doux" (calme, peu avide de sensations). */
export const GENTLENESS_WEIGHTS = {
  extraversion: 0.30,
  thrillSeeking: 0.25,
  openness: 0.20,
  emotionalStability: 0.10,
  boredomSusceptibility: 0.15,
} as const;

/** Pénalité multiplicative sur `comfortExcess` selon la phase. */
export const COMFORT_PHASE_MULTIPLIER = {
  calibration: 0.22,
  expansion: 0.10,
  rupture: 0.03,
} as const;

/** Barème de confort numérique pour `comfortExcess`. */
export const COMFORT_NUMERIC = {
  low: 1,
  moderate: 2,
  high: 3,
  extreme: 4,
} as const;

/** Tolérance "durée trop longue" (au-delà, légère pénalité en dehors de rupture). */
export const DURATION_SOFT_CAP_MIN = 60;
export const DURATION_EXCESS_PENALTY_PER_MIN = 0.0006;

/** Pénalité "quête sociale" pour profils doux en calibration. */
export const GENTLE_SOCIAL_PENALTY_THRESHOLD = 0.55;
export const GENTLE_SOCIAL_PENALTY = 0.12;

// ── Diversité & sélection ───────────────────────────────────────────────────

/** Nombre de candidats dans la fenêtre "top-k" autour desquels on jitter. */
export const DEFAULT_DIVERSITY_WINDOW = 4;

/**
 * Jitter = aléa stable par `(seed, questId)` utilisé pour varier le choix entre
 * archétypes de score proche. Amplitude adaptative :
 *   amplitude = clamp( spread * FRACTION , MIN , ABSOLUTE_CAP )
 *
 * Invariants visés :
 *  - spread grand (vrais écarts de fit)  → jitter ≤ CAP << spread  → fit l'emporte.
 *  - spread nul (égalités) → jitter = MIN → apporte de la diversité entre jours.
 */
export const JITTER_SPREAD_FRACTION = 0.35;
export const JITTER_ABSOLUTE_CAP = 0.08;
export const JITTER_MIN_AMPLITUDE = 0.06;

/**
 * Tie-break déterministe par rang (stabilise le tri quand les scores sont ex aequo).
 * Volontairement **inférieur** à JITTER_MIN_AMPLITUDE pour que le jitter puisse
 * naturellement réordonner les positions proches d'un jour à l'autre.
 */
export const JITTER_INDEX_STEP = 0.004;

// ── Pénalités de catégorie (diversification) ────────────────────────────────

/**
 * Pénalité par archétype déjà proposé (relances cumulées) pour **sa catégorie**.
 * Fait reculer le "même thème" quand l'user a déjà relancé dessus.
 */
export const CATEGORY_REROLL_PENALTY_PER_EXCLUDE = 0.18;

/** Pénalité par archétype récent (fenêtre `CATEGORY_RECENT_WINDOW_LOGS`). */
export const CATEGORY_RECENT_PENALTY_PER_OCCURRENCE = 0.065;
export const CATEGORY_RECENT_WINDOW_LOGS = 10;

/** Cap par source (reroll exclusions, récents, biais…) — borne défensive contre un cumul aberrant. */
export const CATEGORY_SOURCE_PENALTY_CAP = 0.9;
/**
 * Cap total après merge. Doit rester >> au spread typique de `scoreQuestFit`
 * (~0.5) pour qu'une pénalité intentionnelle puisse réellement dépriorisier une
 * catégorie, mais fini pour éviter les effets de cascade.
 */
export const CATEGORY_TOTAL_PENALTY_CAP = 1.5;

// ── Soft-update du profil déclaré (early days) ──────────────────────────────

export const SOFT_UPDATE_MAX_DAY = 5;
export const SOFT_UPDATE_ACCEPT_WEIGHT = 0.03;
export const SOFT_UPDATE_REJECT_WEIGHT = -0.05;

// ── Fenêtres temporelles (exclusions & récence) ─────────────────────────────

/** Nombre de jours calendaires pendant lesquels un archétype déjà servi est exclu. */
export const RECENT_EXCLUSION_WINDOW_DAYS = 7;

/** Nombre de logs pris en compte pour le calcul de `exhibited` / congruence. */
export const ENGINE_HISTORY_LOGS = 14;

/** Nombre de logs pour le bloc anti-répétition textuel côté IA. */
export const ANTI_REPEAT_RECENT_LOGS = 8;
