import type { QuestModel } from '../types';

/**
 * Archétype seed — SOURCE UNIQUE en TypeScript.
 *
 * Utilisation :
 *  - Seed Prisma (`apps/web/prisma/seed-archetypes.ts`) : upsert initial de la table
 *    `quest_archetypes`. Après le premier seed, la BDD est canonique — la taxonomie
 *    en prod est éditée via l'UI admin (`/api/admin/quest-archetypes`), pas ce
 *    fichier. Ce seed ne sert qu'à amorcer un environnement vide.
 *  - Fixtures de tests (`test-fixtures/`) : `TEST_QUEST_TAXONOMY` (sous-ensemble)
 *    et `FULL_QUEST_TAXONOMY` (total) sont dérivés de ce seed, pour éviter toute
 *    divergence silencieuse entre prod et tests.
 *
 * Révision des `targetTraits` :
 *  - Inclut désormais `thrillSeeking` et `boredomSusceptibility` (cf. `QuestModel.targetTraits`)
 *    car ce sont souvent les meilleurs discriminants intra-catégorie.
 *  - Valeurs étagées selon `comfortLevel` pour différencier les archétypes d'une même
 *    catégorie (sinon l'affinity score est quasi constant à l'intérieur d'une catégorie).
 *  - Cohérents avec `ACTIVITY_PERSONALITY_CORRELATION` (aucun target haut contre
 *    une corrélation fortement négative — et inversement).
 */
export const QUEST_ARCHETYPES_SEED_FALLBACK_ID = 9;

export const QUEST_ARCHETYPES_SEED: QuestModel[] = [
  // ── spatial_adventure ────────────────────────────────────────────────────
  {
    id: 1,
    title: 'Le Voyage Aléatoire',
    description: "Prendre un train vers une ville au hasard et se débrouiller une fois arrivé.",
    titleEn: 'The Random Journey',
    descriptionEn: 'Take a train to a random town and figure things out once you arrive.',
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.92,
      thrillSeeking: 0.9,
      emotionalStability: 0.7,
      boredomSusceptibility: 0.7,
    },
    comfortLevel: 'extreme',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 480,
    fallbackQuestId: 9,
    questPace: 'planned',
  },
  {
    id: 25,
    title: "L'Arrêt Inconnu",
    description:
      "Prendre une ligne de bus que tu n'empruntes jamais, descendre à un arrêt au hasard et marcher 20 minutes sans itinéraire fixé.",
    titleEn: 'The Unknown Stop',
    descriptionEn:
      'Take a bus line you never use, get off at a random stop, and walk 20 minutes with no fixed route.',
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.85,
      thrillSeeking: 0.7,
      emotionalStability: 0.65,
    },
    comfortLevel: 'high',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 120,
    fallbackQuestId: 1,
    questPace: 'instant',
  },
  {
    id: 37,
    title: 'La Rose des Vents',
    description:
      "Tracer une direction au hasard sur une carte (ou une appli) et marcher au moins 15 minutes dans cette direction sans but précis.",
    titleEn: 'The Wind Rose',
    descriptionEn:
      'Pick a random direction on a map (or app) and walk at least 15 minutes that way with no fixed goal.',
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.8,
      thrillSeeking: 0.6,
      emotionalStability: 0.6,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 60,
    fallbackQuestId: 25,
    questPace: 'instant',
  },
  {
    id: 50,
    title: "Le Fil de l'Eau",
    description:
      "Marcher au moins 30 minutes le long d'un cours d'eau, d'un canal ou d'une voie verte sans objectif précis.",
    titleEn: 'The Waterline',
    descriptionEn: 'Walk at least 30 minutes along a river, canal, or greenway with no fixed goal.',
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.75,
      thrillSeeking: 0.45,
      emotionalStability: 0.62,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 90,
    fallbackQuestId: 25,
    questPace: 'instant',
  },
  {
    id: 63,
    title: 'Le Terminus Vierge',
    description:
      "Prendre un bus ou un tram jusqu'à un terminus que tu n'as jamais visité et marcher 20 minutes sur place.",
    titleEn: 'The Virgin Terminus',
    descriptionEn: "Take a bus or tram to a terminus you've never visited, then walk 20 minutes there.",
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.82,
      thrillSeeking: 0.65,
      boredomSusceptibility: 0.55,
      emotionalStability: 0.62,
    },
    comfortLevel: 'high',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 120,
    fallbackQuestId: 1,
    questPace: 'instant',
  },

  // ── public_introspection ─────────────────────────────────────────────────
  {
    id: 2,
    title: 'Le Dîner Solitaire',
    description: "Manger seul dans un resto chic. Téléphone éteint. Être à l'aise avec soi-même.",
    titleEn: 'The Solo Dinner',
    descriptionEn: 'Eat alone at a nice restaurant. Phone off. Be comfortable with yourself.',
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.82,
      extraversion: 0.3,
      openness: 0.6,
    },
    comfortLevel: 'high',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 90,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 26,
    title: 'Le Banc Silencieux',
    description:
      "Rester assis seul sur un banc public 30 minutes : pas d'écran, pas de casque, seulement présence.",
    titleEn: 'The Silent Bench',
    descriptionEn: 'Sit alone on a public bench for 30 minutes: no screen, no headphones—just presence.',
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.72,
      extraversion: 0.35,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 30,
    fallbackQuestId: 2,
    questPace: 'instant',
  },
  {
    id: 38,
    title: 'Le Café Sans Écran',
    description:
      "Passer 30 minutes dans un café avec un carnet ou un livre papier, téléphone éteint ou mode avion.",
    titleEn: 'The Screen-Free Café',
    descriptionEn:
      'Spend 30 minutes in a café with a notebook or paper book—phone off or in airplane mode.',
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.68,
      extraversion: 0.4,
      conscientiousness: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 30,
    fallbackQuestId: 26,
    questPace: 'instant',
  },
  {
    id: 51,
    title: 'Le Dernier Rang',
    description:
      "T'asseoir au dernier rang d'un lieu public ouvert (sport, pratique culturelle) 25 minutes : observer, pas d'écran.",
    titleEn: 'The Back Row',
    descriptionEn:
      'Sit in the back row of an open public venue (sport, cultural practice) for 25 minutes—observe, no screen.',
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.72,
      extraversion: 0.38,
      openness: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 25,
    fallbackQuestId: 26,
    questPace: 'instant',
  },

  // ── sensory_deprivation ──────────────────────────────────────────────────
  {
    id: 3,
    title: 'La Nuit Étoilée',
    description: "Passer une nuit sous les étoiles, sans distraction, juste avec ses pensées.",
    titleEn: 'The Starry Night',
    descriptionEn: 'Spend a night under the stars, no distractions—just your thoughts.',
    category: 'sensory_deprivation',
    targetTraits: {
      openness: 0.55,
      conscientiousness: 0.55,
      boredomSusceptibility: 0.3,
      emotionalStability: 0.6,
    },
    comfortLevel: 'high',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 600,
    fallbackQuestId: 9,
    questPace: 'planned',
  },
  {
    id: 18,
    title: "L'Œil Nu",
    description:
      'Prendre 30 photos en une heure sans filtre ni retouche. Apprendre à voir le réel.',
    titleEn: 'The Naked Eye',
    descriptionEn: "Take 30 photos in one hour with no filters or edits. Learn to see what's real.",
    category: 'sensory_deprivation',
    targetTraits: {
      openness: 0.7,
      conscientiousness: 0.55,
      boredomSusceptibility: 0.4,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 60,
    fallbackQuestId: 3,
    questPace: 'instant',
  },
  {
    id: 27,
    title: 'La Marche Sans Musique',
    description: "Une promenade d'au moins 20 minutes en silence total, sans musique ni podcast.",
    titleEn: 'The Walk Without Music',
    descriptionEn: 'Walk at least 20 minutes in total silence—no music or podcast.',
    category: 'sensory_deprivation',
    targetTraits: {
      openness: 0.5,
      conscientiousness: 0.55,
      boredomSusceptibility: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 20,
    fallbackQuestId: 3,
    questPace: 'instant',
  },
  {
    id: 39,
    title: 'La Chambre Sous les Bruits',
    description: 'Dix minutes allongé·e, yeux fermés, à écouter uniquement les sons du lieu sans bouger.',
    titleEn: 'The Room Under the Sounds',
    descriptionEn: 'Lie down ten minutes, eyes closed, listening only to the sounds of the space—no moving.',
    category: 'sensory_deprivation',
    targetTraits: {
      openness: 0.45,
      emotionalStability: 0.6,
      boredomSusceptibility: 0.25,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 15,
    fallbackQuestId: 27,
    questPace: 'instant',
  },
  {
    id: 52,
    title: 'La Bouchée Lente',
    description:
      'Choisir un seul aliment ; le premier morceau yeux fermés, puis terminer en lent, sans autre distraction.',
    titleEn: 'The Slow Bite',
    descriptionEn: 'Pick one food; first bite eyes closed, then finish slowly with no other distraction.',
    category: 'sensory_deprivation',
    targetTraits: {
      conscientiousness: 0.6,
      openness: 0.5,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 15,
    fallbackQuestId: 39,
    questPace: 'instant',
  },

  // ── exploratory_sociability ──────────────────────────────────────────────
  {
    id: 4,
    title: "L'Explorateur Local",
    description: 'Aller dans une ville minuscule et parler à au moins une personne locale.',
    titleEn: 'The Local Explorer',
    descriptionEn: 'Go to a tiny town and talk to at least one local person.',
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.72,
      agreeableness: 0.6,
      openness: 0.78,
      thrillSeeking: 0.6,
    },
    comfortLevel: 'high',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 240,
    fallbackQuestId: 13,
    questPace: 'planned',
  },
  {
    id: 28,
    title: 'Le Lieu du Commerçant',
    description:
      "Demander à un commerçant local son endroit préféré dans le coin et s'y rendre une fois.",
    titleEn: "The Merchant's Pick",
    descriptionEn: 'Ask a local shopkeeper their favorite spot nearby and go there once.',
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.6,
      agreeableness: 0.65,
      openness: 0.68,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 120,
    fallbackQuestId: 4,
    questPace: 'planned',
  },
  {
    id: 40,
    title: 'Le Voisin du Quartier',
    description:
      "Demander à un voisin ou un commerçant ce qu'il changerait en premier dans le quartier — et noter une idée retenue.",
    titleEn: 'The Neighborhood Neighbor',
    descriptionEn:
      'Ask a neighbor or shopkeeper what they would change first in the area—and note one idea you keep.',
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.55,
      agreeableness: 0.72,
      openness: 0.6,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 45,
    fallbackQuestId: 28,
    questPace: 'planned',
  },
  {
    id: 53,
    title: "L'Accueil Visiteur",
    description:
      "Participer à une réunion d'accueil, un apéro nouveaux arrivants ou un club avec tour de présentation.",
    titleEn: 'The Visitor Welcome',
    descriptionEn: 'Join a welcome meetup, newcomers drink, or club with introductions.',
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.8,
      agreeableness: 0.65,
      openness: 0.68,
      thrillSeeking: 0.45,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 90,
    fallbackQuestId: 4,
    questPace: 'planned',
  },

  // ── physical_existential ─────────────────────────────────────────────────
  {
    id: 5,
    title: 'Le Point Culminant',
    description: 'Monter au point le plus haut de la ville et réfléchir à sa direction de vie.',
    titleEn: 'The High Point',
    descriptionEn: 'Climb to the highest point in town and reflect on your life direction.',
    category: 'physical_existential',
    targetTraits: {
      openness: 0.65,
      conscientiousness: 0.55,
      thrillSeeking: 0.4,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 120,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 23,
    title: 'Le Micro-Défi',
    description: 'Faire une chose qui te fait légèrement peur, juste pour prouver que tu peux.',
    titleEn: 'The Micro-Challenge',
    descriptionEn: 'Do something that scares you a little, just to prove you can.',
    category: 'physical_existential',
    targetTraits: {
      thrillSeeking: 0.7,
      openness: 0.75,
      emotionalStability: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 30,
    fallbackQuestId: 5,
    questPace: 'instant',
  },
  {
    id: 29,
    title: 'Le Trajet Lent',
    description:
      'Refaire un trajet habituel à pied ou à vélo au lieu des transports ; noter une pensée à mi-parcours.',
    titleEn: 'The Slow Commute',
    descriptionEn: 'Redo a usual commute on foot or by bike instead of transit; note one thought halfway.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.58,
      openness: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 90,
    fallbackQuestId: 5,
    questPace: 'instant',
  },
  {
    id: 41,
    title: "L'Escalier Complet",
    description:
      "Sur un trajet habituel, prendre les escaliers du début à la fin à la place d'un ascenseur ; une phrase sur l'humeur à l'arrivée.",
    titleEn: 'The Full Stairwell',
    descriptionEn:
      'On a usual route, take the stairs start-to-finish instead of an elevator; jot one line about your mood at arrival.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.68,
      openness: 0.45,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 35,
    fallbackQuestId: 29,
    questPace: 'instant',
  },
  {
    id: 54,
    title: 'Le Réveil Corps',
    description:
      "Avant tout écran le matin, au moins 12 minutes d'étirements ou de mobilité douce en silence.",
    titleEn: 'The Body Wake-Up',
    descriptionEn:
      'Before any screen in the morning, at least 12 minutes of stretches or gentle mobility in silence.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.72,
      openness: 0.48,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 15,
    fallbackQuestId: 29,
    questPace: 'instant',
  },

  // ── async_discipline ─────────────────────────────────────────────────────
  {
    id: 6,
    title: "L'Entraînement de l'Aube",
    description: "S'entraîner seul un dimanche matin pendant que tout le monde dort.",
    titleEn: 'The Dawn Workout',
    descriptionEn: 'Train alone on a Sunday morning while everyone else is asleep.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.88,
      extraversion: 0.3,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 60,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 17,
    title: 'Le Plan sans Égo',
    description: 'Une séance de sport où tu respectes exactement le plan. Discipline avant ego.',
    titleEn: 'The Ego-Free Plan',
    descriptionEn: 'A workout where you follow the plan exactly. Discipline before ego.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.92,
      emotionalStability: 0.62,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 60,
    fallbackQuestId: 6,
    questPace: 'instant',
  },
  {
    id: 19,
    title: 'Le Grand Rangement',
    description: "Réorganiser entièrement un espace de vie (pièce ou zone majeure) jusqu'au bout.",
    titleEn: 'The Big Tidy',
    descriptionEn: 'Fully reorganize a living space (room or major zone) to completion.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.85,
      boredomSusceptibility: 0.2,
      openness: 0.4,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 180,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 24,
    title: 'La Semaine Vitale',
    description:
      'Planifier une semaine complète comme si ta vie en dépendait : blocs, priorités, imprévus.',
    titleEn: 'The Vital Week',
    descriptionEn:
      'Plan a full week as if your life depended on it: blocks, priorities, contingencies.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.93,
      openness: 0.4,
      emotionalStability: 0.55,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 90,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 42,
    title: 'Les Quatre Blocs',
    description:
      'Enchaîner quatre blocs de 25 minutes sans distraction sur une seule tâche, avec 5 minutes de pause entre chaque.',
    titleEn: 'The Four Blocks',
    descriptionEn: 'Chain four 25-minute distraction-free blocks on one task, with 5-minute breaks between.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.9,
      boredomSusceptibility: 0.22,
      emotionalStability: 0.55,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 120,
    fallbackQuestId: 19,
    questPace: 'instant',
  },
  {
    id: 55,
    title: 'Les Trois MIT',
    description:
      "La veille au soir, noter trois tâches indispensables ; le lendemain, ne traiter qu'elles avant 18 h.",
    titleEn: 'The Three MITs',
    descriptionEn: 'The night before, write three must-do tasks; the next day, only those before 6 p.m.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.9,
      boredomSusceptibility: 0.3,
      openness: 0.4,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 180,
    fallbackQuestId: 24,
    questPace: 'instant',
  },

  // ── dopamine_detox ───────────────────────────────────────────────────────
  {
    id: 7,
    title: 'La Détox Digitale',
    description: 'Passer 24h sans réseaux sociaux et observer les changements cognitifs.',
    titleEn: 'The Digital Detox',
    descriptionEn: 'Go 24 hours without social media and notice how your mind shifts.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.82,
      boredomSusceptibility: 0.2,
      emotionalStability: 0.68,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 1440,
    questPace: 'planned',
  },
  {
    id: 15,
    title: 'La Lecture Profonde',
    description: "Lire 50 pages d'un livre exigeant en une journée, sans distraction.",
    titleEn: 'Deep Reading',
    descriptionEn: 'Read 50 pages of a demanding book in one day, without distraction.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.8,
      boredomSusceptibility: 0.25,
      openness: 0.7,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 240,
    fallbackQuestId: 7,
    questPace: 'instant',
  },
  {
    id: 30,
    title: 'La Soirée Analogique',
    description:
      "Une soirée complète sans aucun écran après une heure fixée (lecture papier, conversation, repos).",
    titleEn: 'The Analog Evening',
    descriptionEn: 'A full evening with no screens after a set hour (paper reading, conversation, rest).',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.68,
      boredomSusceptibility: 0.35,
      emotionalStability: 0.6,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 180,
    fallbackQuestId: 7,
    questPace: 'instant',
  },
  {
    id: 43,
    title: "L'Heure Sans Ping",
    description:
      'Une heure sans notification ni badge : mode avion partiel ou réglages, une seule activité à la fois.',
    titleEn: 'The Hour Without Pings',
    descriptionEn:
      'One hour with no notifications or badges—partial airplane mode or settings, one activity only.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.78,
      boredomSusceptibility: 0.35,
      emotionalStability: 0.6,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 60,
    fallbackQuestId: 30,
    questPace: 'instant',
  },
  {
    id: 56,
    title: 'Le Repas Hors Pièce',
    description: 'Pour un repas complet, laisser téléphone et tablette hors de la pièce où tu manges.',
    titleEn: 'The Meal Outside the Room',
    descriptionEn: 'For one full meal, leave phone and tablet outside the room where you eat.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.72,
      boredomSusceptibility: 0.38,
      emotionalStability: 0.58,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 45,
    fallbackQuestId: 30,
    questPace: 'instant',
  },
  {
    id: 64,
    title: 'Le Soir Sans Flux',
    description:
      'Après une heure fixée, aucun écran ni flux jusqu\'au coucher (lecture papier, conversation, repos).',
    titleEn: 'The No-Feed Evening',
    descriptionEn: 'After a set hour, no screens or feeds until bed (paper, conversation, rest).',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.78,
      boredomSusceptibility: 0.28,
      emotionalStability: 0.62,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 120,
    fallbackQuestId: 30,
    questPace: 'instant',
  },

  // ── active_empathy ───────────────────────────────────────────────────────
  {
    id: 8,
    title: 'Le Pont Humain',
    description: 'Lancer une vraie conversation avec un inconnu. Écouter vraiment.',
    titleEn: 'The Human Bridge',
    descriptionEn: 'Start a real conversation with a stranger. Listen for real.',
    category: 'active_empathy',
    targetTraits: {
      extraversion: 0.82,
      agreeableness: 0.65,
      openness: 0.68,
      thrillSeeking: 0.5,
    },
    comfortLevel: 'high',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 30,
    fallbackQuestId: 12,
    questPace: 'planned',
  },
  {
    id: 14,
    title: 'Le Regret des Anciens',
    description:
      'Demander à une personne plus âgée son plus grand regret. Écouter sans juger.',
    titleEn: "The Elders' Regret",
    descriptionEn: 'Ask an older person their biggest regret. Listen without judging.',
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.8,
      emotionalStability: 0.75,
      openness: 0.62,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 45,
    fallbackQuestId: 8,
    questPace: 'planned',
  },
  {
    id: 31,
    title: "L'Écoute Profonde",
    description:
      "Poser une question ouverte à quelqu'un et ne parler que pour reformuler ou approfondir pendant 10 minutes.",
    titleEn: 'Deep Listening',
    descriptionEn: 'Ask someone an open question and only speak to rephrase or go deeper for 10 minutes.',
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.78,
      conscientiousness: 0.72,
      boredomSusceptibility: 0.25,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 15,
    fallbackQuestId: 8,
    questPace: 'planned',
  },
  {
    id: 44,
    title: 'Le Miroir de Phrases',
    description:
      "Réformuler deux fois ce que l'autre vient de dire avant d'ajouter une seule phrase à toi.",
    titleEn: 'The Phrase Mirror',
    descriptionEn: 'Rephrase twice what the other person said before adding a single sentence of your own.',
    category: 'active_empathy',
    targetTraits: {
      openness: 0.75,
      agreeableness: 0.7,
      conscientiousness: 0.62,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 20,
    fallbackQuestId: 31,
    questPace: 'planned',
  },
  {
    id: 57,
    title: 'Le Silence des Deux',
    description:
      "Après avoir posé une question à quelqu'un, attendre deux minutes en silence avant de reformuler ou répondre.",
    titleEn: 'The Silence of Two',
    descriptionEn: 'After asking someone a question, wait two minutes in silence before you rephrase or answer.',
    category: 'active_empathy',
    targetTraits: {
      emotionalStability: 0.78,
      extraversion: 0.38,
      conscientiousness: 0.65,
      boredomSusceptibility: 0.2,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 25,
    fallbackQuestId: 31,
    questPace: 'planned',
  },
  {
    id: 65,
    title: 'Les Trois Pourquoi',
    description:
      "Face à quelqu'un qui te confie un souci, poser « pourquoi » jusqu'à trois fois avec douceur avant de conseiller.",
    titleEn: 'The Three Whys',
    descriptionEn: 'When someone shares a worry, ask “why” up to three times gently before advising.',
    category: 'active_empathy',
    targetTraits: {
      openness: 0.72,
      agreeableness: 0.75,
      conscientiousness: 0.58,
      emotionalStability: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 25,
    fallbackQuestId: 44,
    questPace: 'planned',
  },

  // ── temporal_projection ──────────────────────────────────────────────────
  {
    id: 9,
    title: 'La Lettre au Futur',
    description: "Écrire une lettre à la personne que l'on veut devenir dans 5 ans.",
    titleEn: 'The Letter to the Future',
    descriptionEn: 'Write a letter to the person you want to become in five years.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.55,
      conscientiousness: 0.68,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 45,
    questPace: 'instant',
  },
  {
    id: 16,
    title: 'Le Narrateur Intérieur',
    description: 'Écrire ton journal intime à la troisième personne. Te voir comme un personnage.',
    titleEn: 'The Inner Narrator',
    descriptionEn: 'Write your journal in third person. See yourself as a character.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.72,
      conscientiousness: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 60,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 20,
    title: 'La Vie Hardie',
    description: "Écrire l'histoire de ta vie si tu avais eu plus de courage.",
    titleEn: 'The Bold Life',
    descriptionEn: 'Write your life story as if you had had more courage.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.82,
      emotionalStability: 0.68,
      thrillSeeking: 0.5,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 120,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 21,
    title: 'La Bande-Son du Futur',
    description: 'Créer une playlist pour la version de toi que tu es en train de devenir.',
    titleEn: 'The Future Soundtrack',
    descriptionEn: "Make a playlist for the version of you you're becoming.",
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.75,
      conscientiousness: 0.5,
      boredomSusceptibility: 0.35,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 60,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 32,
    title: 'La Lettre du Non',
    description:
      "Écrire une page adressée à une version de toi qui dit toujours non par peur : ce que tu lui refuserais encore.",
    titleEn: 'The Letter of No',
    descriptionEn: "Write a page to a version of you who always says no out of fear: what you'd still refuse.",
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.65,
      emotionalStability: 0.7,
      conscientiousness: 0.55,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 45,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 45,
    title: 'Les Trois Futurs',
    description:
      'Écrire en trois paragraphes : ton futur dans un mois, dans un an, dans dix ans — sans juger le texte.',
    titleEn: 'The Three Futures',
    descriptionEn: 'Write three paragraphs: your future in one month, one year, ten years—without judging the draft.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.65,
      conscientiousness: 0.62,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 60,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 58,
    title: 'La Frise des Cinq Ans',
    description:
      'Sur une page, dessiner une frise des cinq dernières années avec au moins cinq jalons datés.',
    titleEn: 'The Five-Year Timeline',
    descriptionEn: 'On one page, draw a timeline of the last five years with at least five dated milestones.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.55,
      conscientiousness: 0.7,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 50,
    fallbackQuestId: 9,
    questPace: 'instant',
  },

  // ── hostile_immersion ────────────────────────────────────────────────────
  {
    id: 10,
    title: "L'Immersion Totale",
    description: "Aller à un événement où l'on ne connaît personne et rester jusqu'à être à l'aise.",
    titleEn: 'Total Immersion',
    descriptionEn: 'Go to an event where you know no one and stay until you feel somewhat at ease.',
    category: 'hostile_immersion',
    targetTraits: {
      extraversion: 0.85,
      thrillSeeking: 0.75,
      emotionalStability: 0.78,
    },
    comfortLevel: 'extreme',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 180,
    fallbackQuestId: 8,
    questPace: 'planned',
  },
  {
    id: 33,
    title: "L'Autre Monde",
    description:
      'Passer au moins une heure dans un lieu où tu te sens minoritaire (langue, âge, scène) et rester jusqu\'à être un peu à l\'aise.',
    titleEn: 'The Other World',
    descriptionEn: 'Spend at least an hour somewhere you feel in the minority (language, age, scene) until you settle a bit.',
    category: 'hostile_immersion',
    targetTraits: {
      extraversion: 0.65,
      openness: 0.78,
      emotionalStability: 0.8,
      thrillSeeking: 0.6,
    },
    comfortLevel: 'extreme',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 120,
    fallbackQuestId: 10,
    questPace: 'planned',
  },
  {
    id: 46,
    title: 'La Première Main Levée',
    description:
      'Dans un groupe (réunion, cours, apéro), prendre la parole une première fois même si la voix tremble.',
    titleEn: 'The First Hand Raised',
    descriptionEn: 'In a group (meeting, class, drinks), speak up once even if your voice shakes.',
    category: 'hostile_immersion',
    targetTraits: {
      extraversion: 0.78,
      emotionalStability: 0.72,
      thrillSeeking: 0.55,
    },
    comfortLevel: 'extreme',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 90,
    fallbackQuestId: 10,
    questPace: 'planned',
  },
  {
    id: 59,
    title: 'Le Stand Inconnu',
    description:
      "Traverser seul l'entrée d'un salon, d'une foire ou d'un forum et poser une question précise à un exposant.",
    titleEn: 'The Unknown Booth',
    descriptionEn: 'Enter a fair or expo alone and ask one specific question to an exhibitor.',
    category: 'hostile_immersion',
    targetTraits: {
      extraversion: 0.72,
      openness: 0.65,
      emotionalStability: 0.7,
      thrillSeeking: 0.55,
    },
    comfortLevel: 'extreme',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 75,
    fallbackQuestId: 33,
    questPace: 'planned',
  },

  // ── spontaneous_altruism ─────────────────────────────────────────────────
  {
    id: 11,
    title: 'Le Rayon de Soleil',
    description: 'Complimenter sincèrement cinq inconnus dans la même journée.',
    titleEn: 'The Ray of Sunshine',
    descriptionEn: 'Give five sincere compliments to strangers in the same day.',
    category: 'spontaneous_altruism',
    targetTraits: {
      extraversion: 0.82,
      agreeableness: 0.7,
      thrillSeeking: 0.4,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 60,
    fallbackQuestId: 13,
    questPace: 'planned',
  },
  {
    id: 34,
    title: 'Le Mot Égaré',
    description: "Laisser un mot manuscrit d'encouragement dans un lieu public (sans signature narcissique).",
    titleEn: 'The Misplaced Word',
    descriptionEn: 'Leave a handwritten note of encouragement in a public place (no narcissistic signature).',
    category: 'spontaneous_altruism',
    targetTraits: {
      openness: 0.72,
      agreeableness: 0.72,
      extraversion: 0.35,
      conscientiousness: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 45,
    fallbackQuestId: 11,
    questPace: 'instant',
  },
  {
    id: 47,
    title: "Le Pourboire d'Aujourd'hui",
    description:
      "Offrir un pourboire ou un geste de reconnaissance inhabituel à quelqu'un qui t'a servi (café, soin, livraison).",
    titleEn: "Today's Tip",
    descriptionEn: 'Give an unusually generous tip or thank-you to someone who served you (café, care, delivery).',
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.78,
      conscientiousness: 0.68,
      extraversion: 0.5,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 25,
    fallbackQuestId: 11,
    questPace: 'planned',
  },
  {
    id: 60,
    title: 'Le Café Suivant',
    description:
      'Si le lieu le permet, régler discrètement le café ou le thé de la personne derrière toi à la file.',
    titleEn: 'The Next Coffee',
    descriptionEn: 'If the place allows, quietly pay for the coffee or tea of the person behind you in line.',
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.72,
      thrillSeeking: 0.45,
      openness: 0.6,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 20,
    fallbackQuestId: 11,
    questPace: 'planned',
  },

  // ── relational_vulnerability ─────────────────────────────────────────────
  {
    id: 12,
    title: 'La Reconnexion',
    description: 'Appeler un ancien ami et rallumer un lien laissé éteint.',
    titleEn: 'The Reconnection',
    descriptionEn: 'Call an old friend and rekindle a bond that went cold.',
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.72,
      emotionalStability: 0.65,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 30,
    questPace: 'planned',
  },
  {
    id: 22,
    title: 'La Journée Sans Mensonge',
    description:
      "Pendant une journée entière, ne dire que la vérité (avec tact). Observer le coût et le soulagement.",
    titleEn: 'The Day Without Lies',
    descriptionEn: 'For one full day, only tell the truth (with tact). Notice the cost and the relief.',
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.6,
      emotionalStability: 0.82,
      conscientiousness: 0.6,
    },
    comfortLevel: 'extreme',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 1440,
    fallbackQuestId: 12,
    questPace: 'planned',
  },
  {
    id: 35,
    title: 'Le Remerciement Tardif',
    description:
      "Dire à un proche une chose précise que tu apprécies chez lui depuis longtemps sans l'avoir dit.",
    titleEn: 'The Late Thank-You',
    descriptionEn:
      "Tell someone close something specific you appreciate about them that you've long left unsaid.",
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.78,
      emotionalStability: 0.62,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 30,
    fallbackQuestId: 12,
    questPace: 'planned',
  },
  {
    id: 48,
    title: 'Le Vocal de Vérité',
    description:
      "Envoyer un message vocal d'environ une minute à quelqu'un que tu évites, sans mentir sur l'essentiel.",
    titleEn: 'The Truth Voice Note',
    descriptionEn: "Send a ~1-minute voice message to someone you've been avoiding, honest on what matters.",
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.62,
      emotionalStability: 0.72,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 15,
    fallbackQuestId: 12,
    questPace: 'planned',
  },
  {
    id: 61,
    title: 'La Phrase en Je',
    description:
      "Écrire ou dire une phrase qui commence par « j'ai besoin » ou « je ressens », sans accuser l'autre.",
    titleEn: 'The I-Statement',
    descriptionEn: 'Write or say a sentence starting with “I need” or “I feel,” without blaming the other person.',
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.7,
      emotionalStability: 0.72,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 20,
    fallbackQuestId: 35,
    questPace: 'planned',
  },

  // ── unconditional_service ────────────────────────────────────────────────
  {
    id: 13,
    title: 'Le Festin Altruiste',
    description: "Cuisiner un repas pour quelqu'un sans rien attendre en retour.",
    titleEn: 'The Altruistic Feast',
    descriptionEn: 'Cook a meal for someone without expecting anything in return.',
    category: 'unconditional_service',
    targetTraits: {
      agreeableness: 0.78,
      conscientiousness: 0.62,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 120,
    questPace: 'planned',
  },
  {
    id: 36,
    title: 'Le Cadeau Sans Occasion',
    description:
      'Offrir un petit cadeau ou un repas à un voisin ou un collègue sans occasion particulière.',
    titleEn: 'The Gift Without Occasion',
    descriptionEn: 'Give a small gift or a meal to a neighbor or colleague for no special reason.',
    category: 'unconditional_service',
    targetTraits: {
      agreeableness: 0.82,
      conscientiousness: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 90,
    fallbackQuestId: 13,
    questPace: 'planned',
  },
  {
    id: 49,
    title: 'Le Plat Dédicacé',
    description:
      "Préparer un plat ou un goûter pour une personne précise et le lui remettre en main propre avec une phrase simple.",
    titleEn: 'The Dedicated Dish',
    descriptionEn: 'Cook a dish or snack for a specific person and hand it to them with one simple sentence.',
    category: 'unconditional_service',
    targetTraits: {
      agreeableness: 0.78,
      conscientiousness: 0.68,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 75,
    fallbackQuestId: 13,
    questPace: 'planned',
  },
  {
    id: 62,
    title: 'La Course Sans Redemande',
    description:
      'Accomplir une course ou une démarche administrative pour quelqu\'un de proche sans qu\'on te la redemande.',
    titleEn: 'The Errand Unasked',
    descriptionEn: 'Run one errand or admin task for someone close without them asking again.',
    category: 'unconditional_service',
    targetTraits: {
      agreeableness: 0.75,
      conscientiousness: 0.75,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 60,
    fallbackQuestId: 13,
    questPace: 'planned',
  },

  // ── Ajouts 2026-04 : comblement des trous de calibration sociale/empathique ──
  // Avant ce patch, 4 catégories (exploratory_sociability, active_empathy,
  // relational_vulnerability, hostile_immersion) n'avaient AUCUN archétype `low`
  // ou `moderate` adapté à la calibration. Un user explorer_risktaker/social
  // démarrait donc toujours sur du temporal_projection/sensory_deprivation par
  // défaut — l'opposé de ses affinités.
  {
    id: 66,
    title: 'Le Salut Cordial',
    description:
      'Sur un trajet quotidien, saluer volontairement trois inconnus (voisin, commerçant, passant) avec un regard franc et une phrase simple.',
    titleEn: 'The Cordial Hello',
    descriptionEn:
      'On a daily commute, deliberately greet three strangers (neighbor, shopkeeper, passer-by) with a direct look and one simple sentence.',
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.55,
      agreeableness: 0.65,
      openness: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 20,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 67,
    title: 'Le Message Rendormi',
    description:
      "Reprendre contact avec une personne que tu n'as pas contactée depuis plus de six mois, par un message court et honnête, sans attendre de réponse immédiate.",
    titleEn: 'The Sleeping Message',
    descriptionEn:
      "Reach out to someone you haven't contacted in more than six months, with a short honest message, without expecting an immediate reply.",
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.45,
      agreeableness: 0.7,
      openness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 15,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 68,
    title: 'Le Vocal Bref',
    description:
      'Envoyer un message vocal de 30 secondes à un proche pour dire précisément ce que tu apprécies chez lui ou elle — pas un texte, un vocal.',
    titleEn: 'The Brief Voice Note',
    descriptionEn:
      'Send a 30-second voice note to someone close, saying precisely what you appreciate about them — not a text, a voice note.',
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.72,
      extraversion: 0.45,
      openness: 0.45,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 15,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 69,
    title: 'La Question Sincère',
    description:
      "Lors d'une conversation banale aujourd'hui avec un proche ou un collègue, poser une seule question sincère (« comment tu te sens vraiment ces temps-ci ? ») et écouter la réponse sans enchaîner.",
    titleEn: 'The Sincere Question',
    descriptionEn:
      "In a casual conversation today with someone close or a colleague, ask one sincere question ('how are you really doing these days?') and listen to the answer without moving on.",
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.78,
      extraversion: 0.5,
      emotionalStability: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 20,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 70,
    title: "L'Aveu Léger",
    description:
      "Partager à une personne de confiance une petite vulnérabilité que tu n'as jamais dite à voix haute (un doute, une peur modeste, un regret). Rien de dramatique — juste du vrai.",
    titleEn: 'The Light Confession',
    descriptionEn:
      "Share with someone you trust a small vulnerability you've never said out loud (a doubt, a modest fear, a regret). Nothing dramatic — just honest.",
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.68,
      openness: 0.6,
      emotionalStability: 0.5,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 30,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 71,
    title: 'Le Remerciement Concret',
    description:
      "Remercier explicitement une personne précise pour un geste passé en nommant ce que ça t'a fait — pas un « merci » générique, mais « quand tu as fait X, voilà ce que ça a changé pour moi ».",
    titleEn: 'The Concrete Thanks',
    descriptionEn:
      "Thank a specific person for a past action by naming what it did for you — not a generic 'thanks', but 'when you did X, here's what it changed for me'.",
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.75,
      extraversion: 0.5,
      openness: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 25,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 72,
    title: 'Le Désaccord Tenu',
    description:
      "Dans une conversation aujourd'hui (réunion, repas, discussion en ligne), exprimer un désaccord franc sur un point précis sans l'adoucir et tenir la position 30 secondes face à la réaction.",
    titleEn: 'The Held Disagreement',
    descriptionEn:
      "In a conversation today (meeting, meal, online thread), express frank disagreement on a specific point without softening it and hold the position for 30 seconds against the reaction.",
    category: 'hostile_immersion',
    targetTraits: {
      extraversion: 0.6,
      emotionalStability: 0.6,
      thrillSeeking: 0.55,
      agreeableness: 0.35,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 30,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 73,
    title: 'Le Circuit Mémoire',
    description:
      "Planifier et parcourir à pied ou en transports trois lieux qui ont compté dans ton passé (ancienne école, premier appart, lieu d'un souvenir fort) en une demi-journée, seul·e, sans téléphone en main.",
    titleEn: 'The Memory Circuit',
    descriptionEn:
      "Plan and visit on foot or public transit three places that mattered in your past (old school, first flat, place of a strong memory) in half a day, alone, without phone in hand.",
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.6,
      emotionalStability: 0.55,
      thrillSeeking: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 180,
    fallbackQuestId: 9,
    questPace: 'planned',
  },
  {
    id: 74,
    title: "L'Endurance du Plancher",
    description:
      'Séance corps au sol de 45 minutes (gainage, respiration, mobilité lente) jusqu\'à sortir de la zone de confort physique, chez toi, sans musique ni écran.',
    titleEn: 'The Floor Endurance',
    descriptionEn:
      'A 45-minute floor session (core work, breathing, slow mobility) pushing through physical discomfort, at home, without music or screen.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.75,
      emotionalStability: 0.55,
      thrillSeeking: 0.5,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 45,
    fallbackQuestId: 9,
    questPace: 'instant',
  },

  // ── Ajouts 2026-04 : quêtes insolites / singulières ────────────────────────
  // Série de 12 archétypes conçus pour marquer : chacun porte un dispositif
  // précis (contrainte inhabituelle, rituel physique, retournement de rôle)
  // qui le rend mémorable et identifiable. Les `targetTraits` sont volontairement
  // contrastés entre voisins de même catégorie pour discriminer les profils.
  {
    id: 75,
    title: 'Le Troc Sauvage',
    description:
      "Prendre un objet de chez toi que tu ne regretteras pas (livre, vêtement, ustensile) et te rendre dans un marché, un vide-grenier ou un quartier marchand pour proposer un troc — pas un paiement — à trois vendeurs. Rentrer avec quelque chose que tu n'aurais jamais acheté.",
    titleEn: 'The Wild Barter',
    descriptionEn:
      "Take an item from home you won't miss (a book, a piece of clothing, a utensil) and head to a market, flea market or shopping street to propose a barter — not a payment — to three vendors. Come back with something you would never have bought.",
    category: 'exploratory_sociability',
    targetTraits: {
      openness: 0.78,
      extraversion: 0.65,
      thrillSeeking: 0.6,
      agreeableness: 0.5,
    },
    comfortLevel: 'high',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 120,
    fallbackQuestId: 66,
    questPace: 'planned',
  },
  {
    id: 76,
    title: 'Le Dîner Aveugle',
    description:
      "Préparer un vrai repas (deux plats) puis te bander les yeux ou éteindre toute lumière pour le manger entièrement à l'aveugle. Pas de musique, pas de téléphone. Goûter chaque bouchée comme si tu ignorais ce qu'elle contient.",
    titleEn: 'The Blind Dinner',
    descriptionEn:
      "Cook a real meal (two dishes) then blindfold yourself or switch off all lights to eat it entirely in the dark. No music, no phone. Taste each bite as if you didn't know what it contained.",
    category: 'sensory_deprivation',
    targetTraits: {
      openness: 0.75,
      conscientiousness: 0.62,
      emotionalStability: 0.65,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 60,
    fallbackQuestId: 52,
    questPace: 'planned',
  },
  {
    id: 77,
    title: 'Le Repas des Cinq Couleurs',
    description:
      'Composer un repas qui contient cinq couleurs naturelles distinctes (blanc et noir ne comptent pas). Chercher, acheter, cuisiner — puis photographier le résultat avant la première bouchée et le manger lentement.',
    titleEn: 'The Five-Color Meal',
    descriptionEn:
      'Assemble a meal with five distinct natural colors (white and black do not count). Shop, prep, cook — then photograph the result before the first bite and eat it slowly.',
    category: 'physical_existential',
    targetTraits: {
      openness: 0.68,
      conscientiousness: 0.58,
      agreeableness: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 45,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 78,
    title: 'La Lettre aux Dix Ans',
    description:
      "Écrire à toi-même dans dix ans exactement : qui tu veux être, ce que tu espères avoir fait, ce que tu as peur de devenir. Trois pages minimum, manuscrit. Puis programmer son envoi via un service de lettre future (futureme.org) pour l'ouvrir à la date exacte.",
    titleEn: 'The Ten-Year Letter',
    descriptionEn:
      "Write to yourself ten years from now exactly: who you want to be, what you hope to have done, what you fear becoming. Three pages minimum, handwritten. Then schedule its delivery via a future-letter service (futureme.org) to open on the exact date.",
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.72,
      conscientiousness: 0.7,
      emotionalStability: 0.6,
      boredomSusceptibility: 0.25,
    },
    comfortLevel: 'extreme',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 180,
    fallbackQuestId: 9,
    questPace: 'planned',
  },
  {
    id: 79,
    title: 'Le Trajet du Troisième Bus',
    description:
      "Aller à un arrêt de bus près de chez toi. Laisser passer deux bus, quels qu'ils soient. Monter dans le troisième. Descendre à un arrêt choisi d'avance par un chiffre aléatoire (par exemple le 5ᵉ après le tien). Explorer 30 minutes autour à pied, puis revenir.",
    titleEn: 'The Third Bus',
    descriptionEn:
      "Go to a bus stop near home. Let two buses pass, whichever they are. Board the third one. Get off at a stop chosen beforehand by a random number (say, the 5th after yours). Explore on foot for 30 minutes around, then come back.",
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.82,
      thrillSeeking: 0.72,
      boredomSusceptibility: 0.65,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 90,
    fallbackQuestId: 37,
    questPace: 'instant',
  },
  {
    id: 80,
    title: 'La Journée en Langue Étrangère',
    description:
      "Passer une journée entière à ne consommer que du contenu dans une langue que tu ne maîtrises pas : musique, podcasts, films sans sous-titres, articles dans la langue d'origine. Écrire à la fin de la journée cinq mots que tu auras compris ou retenus.",
    titleEn: 'The Foreign-Language Day',
    descriptionEn:
      "Spend an entire day consuming only content in a language you don't master: music, podcasts, films with no subtitles, articles in the original language. At the end of the day, write down five words you caught or remembered.",
    category: 'dopamine_detox',
    targetTraits: {
      openness: 0.85,
      conscientiousness: 0.75,
      boredomSusceptibility: 0.7,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 480,
    fallbackQuestId: 15,
    questPace: 'planned',
  },
  {
    id: 81,
    title: 'Le Miroir des Proches',
    description:
      "Contacter trois personnes proches (amis, famille, partenaire) et leur demander individuellement : « quelle est ma pire habitude selon toi ? ». Écouter sans commenter ni te défendre. Noter textuellement leurs mots. Ne répondre à aucune avant le lendemain.",
    titleEn: 'The Mirror of Loved Ones',
    descriptionEn:
      "Reach out to three people close to you (friends, family, partner) and ask each separately: 'what's my worst habit in your eyes?'. Listen without commenting or defending. Write down their exact words. Don't reply to any of them before the next day.",
    category: 'relational_vulnerability',
    targetTraits: {
      emotionalStability: 0.72,
      openness: 0.7,
      agreeableness: 0.65,
    },
    comfortLevel: 'high',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 60,
    fallbackQuestId: 70,
    questPace: 'planned',
  },
  {
    id: 82,
    title: "Le Pseudonyme d'un Soir",
    description:
      "Lors d'une soirée, un meetup ou un événement public où tu ne connais personne, te présenter sous un autre prénom et un autre métier pendant deux heures. Observer comment les autres te perçoivent — et comment toi-même tu te perçois autrement. Révéler avant de partir si tu veux (ou pas).",
    titleEn: "The Alias for an Evening",
    descriptionEn:
      "At a party, meetup or public event where you know no one, introduce yourself under a different first name and a different job for two hours. Watch how others perceive you — and how you perceive yourself. Reveal before leaving if you want (or not).",
    category: 'hostile_immersion',
    targetTraits: {
      extraversion: 0.72,
      thrillSeeking: 0.68,
      openness: 0.65,
      agreeableness: 0.45,
    },
    comfortLevel: 'high',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 120,
    fallbackQuestId: 72,
    questPace: 'planned',
  },
  {
    id: 83,
    title: "Le Cahier de l'Étranger",
    description:
      "Aborder un inconnu (parc, café, transport long) et lui proposer de l'interviewer 15 minutes sur sa vie, sans prendre la parole sauf pour poser des questions. Noter ses mots exacts dans un cahier. À la fin, relire à voix haute une courte synthèse de ses mots — les siens, pas les tiens — avant de partir.",
    titleEn: "The Stranger's Notebook",
    descriptionEn:
      "Approach a stranger (park, café, long-distance commute) and offer to interview them for 15 minutes about their life, speaking only to ask questions. Write down their exact words in a notebook. At the end, read aloud a short synthesis of their own words — theirs, not yours — before leaving.",
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.78,
      openness: 0.75,
      conscientiousness: 0.65,
    },
    comfortLevel: 'high',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 45,
    fallbackQuestId: 31,
    questPace: 'planned',
  },
  {
    id: 84,
    title: 'La Photo Unique',
    description:
      "Ne prendre qu'UNE SEULE photo de toute la journée. Choisir consciemment le moment — attendre, rater des occasions, résister. Le reste du temps, regarder à l'œil nu, sans capture. Le soir, écrire en une phrase pourquoi ce moment-là précisément.",
    titleEn: 'The Single Photo',
    descriptionEn:
      "Take only ONE photo the entire day. Choose the moment consciously — wait, miss opportunities, resist. The rest of the day, look with your eyes only, no capture. At night, write a single sentence on why that moment, precisely.",
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.7,
      emotionalStability: 0.55,
      boredomSusceptibility: 0.3,
      openness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 30,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 85,
    title: 'La Lettre aux Six Mois',
    description:
      "Écrire à la main (pas au clavier) une lettre à toi-même datée de six mois dans le futur. La sceller dans une enveloppe avec la date d'ouverture écrite dessus. La déposer chez un ami de confiance ou dans un lieu caché (boîte verrouillée, livre rangé) que tu t'engages à revisiter à cette date précise.",
    titleEn: 'The Six-Month Letter',
    descriptionEn:
      "Handwrite (not type) a letter to yourself dated six months in the future. Seal it in an envelope with the opening date written on it. Drop it at a trusted friend's or in a hidden place (locked box, shelved book) you commit to revisit on that exact date.",
    category: 'temporal_projection',
    targetTraits: {
      conscientiousness: 0.65,
      openness: 0.62,
      emotionalStability: 0.55,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 40,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 86,
    title: 'La Règle des Trois Non',
    description:
      "Durant une journée, refuser explicitement trois demandes ou sollicitations (pro, sociales, familiales) que tu aurais normalement acceptées par réflexe. Dire « non » sans t'excuser, sans argumenter longuement. Noter tes réactions intérieures et celles des autres.",
    titleEn: 'The Rule of Three Nos',
    descriptionEn:
      "Over one day, explicitly refuse three requests (work, social, family) you would normally say yes to by reflex. Say 'no' without apologizing, without long arguments. Write down your inner reactions and the others'.",
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.72,
      emotionalStability: 0.62,
      agreeableness: 0.35,
      boredomSusceptibility: 0.25,
    },
    comfortLevel: 'moderate',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 30,
    fallbackQuestId: 19,
    questPace: 'instant',
  },

  // ── Ajouts 2026-04 : 100 micro-quêtes (5-10 min, comfortLevel `low`) ───────
  // Pool conçu pour la phase calibration : `computePhaseFit` donne son score max
  // à `low` en calibration (~0.8) et 0 en rupture — donc ces quêtes ne
  // dominent jamais en expansion/rupture malgré leur volume. Dispersion sur les
  // 13 catégories pour préserver la diversité du moteur de sélection.
  //
  // Ton volontairement mixte : dopaminergique (récompense rapide, boost
  // d'humeur), chill (respiration, présence), corps, créatif, social léger,
  // curiosité. Durées 5-10 min, `questPace: 'instant'`.
  //
  // targetTraits modérés (0.35-0.65) — discriminants intra-catégorie mais sans
  // écraser les archétypes `moderate`/`high` quand le moteur monte en phase.
  // fallbackQuestId pointe vers l'archétype `low` le plus proche de la famille
  // (ou 9 — La Lettre au Futur — en filet général).

  // ── spatial_adventure : micro-déplacements & regards neufs ────────────────
  {
    id: 87,
    title: 'Le Pâté de Maisons Nouveau',
    description:
      "Sortir et faire le tour complet d'un pâté de maisons que tu n'as jamais traversé, même à 50 m de chez toi.",
    titleEn: 'The New City Block',
    descriptionEn:
      "Step out and walk around an entire city block you've never crossed, even 50 m from home.",
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.55,
      thrillSeeking: 0.35,
      boredomSusceptibility: 0.4,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 8,
    fallbackQuestId: 73,
    questPace: 'instant',
  },
  {
    id: 88,
    title: 'Les Trois Vitrines',
    description:
      "Sur ton prochain trajet, regarder attentivement trois vitrines différentes comme un mini-musée gratuit.",
    titleEn: 'The Three Shop Windows',
    descriptionEn:
      'On your next walk, really look at three different shop windows as a free mini-museum.',
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.6,
      boredomSusceptibility: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 73,
    questPace: 'instant',
  },
  {
    id: 89,
    title: 'Le Détour Volontaire',
    description:
      "Ajouter cinq minutes à un trajet quotidien en prenant une rue que tu n'as jamais empruntée.",
    titleEn: 'The Deliberate Detour',
    descriptionEn:
      "Add five minutes to a daily route by taking a street you've never walked.",
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.55,
      thrillSeeking: 0.4,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 73,
    questPace: 'instant',
  },
  {
    id: 90,
    title: "L'Arbre Inconnu",
    description:
      "Trouver un arbre dans ton quartier que tu n'as jamais vraiment regardé et l'observer 5 minutes : écorce, branches, feuilles.",
    titleEn: 'The Unknown Tree',
    descriptionEn:
      "Find a tree in your neighborhood you've never really looked at and observe it 5 minutes: bark, branches, leaves.",
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.58,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 73,
    questPace: 'instant',
  },
  {
    id: 91,
    title: "Le Coup d'Œil du Toit",
    description:
      'Monter sur un point en hauteur accessible (pont, passerelle, parking) et regarder le paysage 5 minutes en silence.',
    titleEn: 'The Rooftop Glance',
    descriptionEn:
      'Climb to an accessible high point (bridge, walkway, parking deck) and watch the view 5 minutes in silence.',
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.55,
      thrillSeeking: 0.42,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 73,
    questPace: 'instant',
  },
  {
    id: 92,
    title: "Le Café d'à Côté",
    description:
      "Pousser la porte d'un café, d'une boulangerie ou d'un commerce que tu passes tous les jours sans entrer, et juste en ressortir avec un petit truc.",
    titleEn: 'The Café Next Door',
    descriptionEn:
      "Walk into a café, bakery or shop you pass every day without entering, and simply leave with a small thing.",
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.55,
      extraversion: 0.45,
      thrillSeeking: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 8,
    fallbackQuestId: 73,
    questPace: 'instant',
  },
  {
    id: 93,
    title: 'Les Cent Pas Dehors',
    description:
      "Sortir et marcher cent pas dehors — littéralement compter. Peu importe où, peu importe la météo (raisonnable).",
    titleEn: 'The Hundred Steps Out',
    descriptionEn:
      "Step outside and walk a hundred steps — literally count. Anywhere, any (reasonable) weather.",
    category: 'spatial_adventure',
    targetTraits: {
      openness: 0.45,
      conscientiousness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 27,
    questPace: 'instant',
  },

  // ── public_introspection : présence brève en espaces partagés ─────────────
  {
    id: 94,
    title: 'La Gorgée Lente',
    description:
      "Commander une boisson quelque part (café, fontaine, verre d'eau) et la boire en entier sans téléphone, yeux ouverts sur l'environnement.",
    titleEn: 'The Slow Sip',
    descriptionEn:
      "Order a drink somewhere (coffee, fountain, glass of water) and finish it entirely with no phone, eyes open on your surroundings.",
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.58,
      extraversion: 0.4,
      conscientiousness: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 8,
    fallbackQuestId: 38,
    questPace: 'instant',
  },
  {
    id: 95,
    title: 'Le Feu Rouge Conscient',
    description:
      "À la prochaine attente publique (feu, file, quai), poser ton téléphone dans ta poche et juste respirer en observant les gens.",
    titleEn: 'The Conscious Red Light',
    descriptionEn:
      'At the next public wait (traffic light, queue, platform), put your phone away and just breathe while watching people.',
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.55,
      conscientiousness: 0.55,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 26,
    questPace: 'instant',
  },
  {
    id: 96,
    title: 'Le Couloir Debout',
    description:
      "Rester debout 5 minutes dans un espace public (hall, abribus, couloir de gare) sans bouger, sans regarder l'écran, juste présent·e.",
    titleEn: 'The Standing Hall',
    descriptionEn:
      "Stand still 5 minutes in a public space (lobby, bus shelter, station hall) without moving, without looking at your screen, just present.",
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.55,
      extraversion: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 26,
    questPace: 'instant',
  },
  {
    id: 97,
    title: 'Le Livre en Public',
    description:
      'Emmener un livre papier dans un lieu public et en lire deux pages sans téléphone à portée de main.',
    titleEn: 'The Book in Public',
    descriptionEn:
      'Bring a paper book to a public place and read two pages with your phone out of reach.',
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.55,
      conscientiousness: 0.55,
      openness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 38,
    questPace: 'instant',
  },
  {
    id: 98,
    title: 'Le Solo au Comptoir',
    description:
      "Commander un truc au comptoir d'un café ou d'un snack et rester debout là pour le consommer, sans écran.",
    titleEn: 'The Counter Solo',
    descriptionEn:
      'Order something at a café or snack counter and stand right there to consume it, no screen.',
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.6,
      extraversion: 0.4,
      conscientiousness: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 8,
    fallbackQuestId: 2,
    questPace: 'instant',
  },
  {
    id: 99,
    title: "L'Écoute du Marché",
    description:
      "Passer 5 minutes au milieu d'un marché, d'une terrasse animée ou d'une place, à écouter le brouhaha sans y participer.",
    titleEn: 'Listening to the Market',
    descriptionEn:
      'Spend 5 minutes in the middle of a market, a busy terrace or a square, listening to the buzz without joining in.',
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.55,
      openness: 0.55,
      boredomSusceptibility: 0.32,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 26,
    questPace: 'instant',
  },
  {
    id: 100,
    title: 'Le Regard Droit',
    description:
      'Dans les transports ou un lieu public, passer 5 minutes sans regarder ton téléphone, en laissant ton regard croiser celui des autres sans fuir.',
    titleEn: 'The Straight Gaze',
    descriptionEn:
      "On transit or in a public place, spend 5 minutes away from your phone, letting your gaze meet others' without looking away.",
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.62,
      extraversion: 0.42,
      thrillSeeking: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 26,
    questPace: 'instant',
  },
  {
    id: 101,
    title: 'La Pause Banquette',
    description:
      "S'asseoir 7 minutes sur la banquette d'un fast-food, d'un hall de gare ou d'un centre commercial, téléphone face contre table.",
    titleEn: 'The Bench Break',
    descriptionEn:
      'Sit 7 minutes on a fast-food bench, station hall or shopping center seat, phone face-down on the table.',
    category: 'public_introspection',
    targetTraits: {
      emotionalStability: 0.55,
      extraversion: 0.4,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 26,
    questPace: 'instant',
  },

  // ── sensory_deprivation : respiration, silence, retour au corps ───────────
  {
    id: 102,
    title: 'La Respiration Carrée',
    description:
      "Quatre secondes d'inspire, quatre de retenue, quatre d'expire, quatre de retenue. Six cycles d'affilée, yeux fermés.",
    titleEn: 'Box Breathing',
    descriptionEn:
      'Four seconds inhale, four hold, four exhale, four hold. Six cycles in a row, eyes closed.',
    category: 'sensory_deprivation',
    targetTraits: {
      conscientiousness: 0.55,
      emotionalStability: 0.58,
      boredomSusceptibility: 0.28,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 39,
    questPace: 'instant',
  },
  {
    id: 103,
    title: 'Les Cinq Sons',
    description:
      'Pose ton téléphone. Assis·e ou debout, identifier cinq sons différents autour de toi, du plus lointain au plus proche.',
    titleEn: 'The Five Sounds',
    descriptionEn:
      'Put your phone down. Sitting or standing, identify five different sounds around you, from farthest to closest.',
    category: 'sensory_deprivation',
    targetTraits: {
      openness: 0.55,
      conscientiousness: 0.5,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 39,
    questPace: 'instant',
  },
  {
    id: 104,
    title: 'La Douche Sans Musique',
    description:
      "Prendre sa prochaine douche sans musique, sans podcast — juste le bruit de l'eau et ce que ça fait au corps.",
    titleEn: 'The Music-Free Shower',
    descriptionEn:
      'Take your next shower with no music, no podcast — just the sound of water and what it does to the body.',
    category: 'sensory_deprivation',
    targetTraits: {
      conscientiousness: 0.5,
      openness: 0.48,
      boredomSusceptibility: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 8,
    fallbackQuestId: 27,
    questPace: 'instant',
  },
  {
    id: 105,
    title: 'Les Pieds Nus',
    description:
      'Cinq minutes pieds nus sur le sol (parquet, carrelage, terre, herbe si possible), immobile, à sentir la texture.',
    titleEn: 'Barefoot',
    descriptionEn:
      'Five minutes barefoot on the ground (wood, tile, earth, grass if you can), still, feeling the texture.',
    category: 'sensory_deprivation',
    targetTraits: {
      openness: 0.55,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 39,
    questPace: 'instant',
  },
  {
    id: 106,
    title: 'Le Thé Complet',
    description:
      'Préparer un thé ou une tisane et le boire entier sans rien faire d\'autre — pas d\'écran, pas de musique, pas de lecture.',
    titleEn: 'The Full Tea',
    descriptionEn:
      "Brew a tea or infusion and drink it all with nothing else going on — no screen, no music, no reading.",
    category: 'sensory_deprivation',
    targetTraits: {
      conscientiousness: 0.55,
      emotionalStability: 0.55,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 52,
    questPace: 'instant',
  },
  {
    id: 107,
    title: 'Le Bruit Blanc',
    description:
      "S'asseoir près d'une fenêtre ouverte ou dehors 5 minutes, yeux fermés, à accepter tous les bruits sans les nommer.",
    titleEn: 'White Noise',
    descriptionEn:
      'Sit near an open window or outside 5 minutes, eyes closed, accepting every sound without naming it.',
    category: 'sensory_deprivation',
    targetTraits: {
      openness: 0.5,
      emotionalStability: 0.58,
      boredomSusceptibility: 0.25,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 39,
    questPace: 'instant',
  },
  {
    id: 108,
    title: 'La Main sur le Cœur',
    description:
      'Allongé·e ou assis·e, poser une main sur le cœur et une sur le ventre, respirer 5 minutes en sentant les deux bouger.',
    titleEn: 'Hand on the Heart',
    descriptionEn:
      'Lying or sitting, one hand on the heart and one on the belly, breathe 5 minutes feeling both move.',
    category: 'sensory_deprivation',
    targetTraits: {
      emotionalStability: 0.6,
      conscientiousness: 0.5,
      boredomSusceptibility: 0.25,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 39,
    questPace: 'instant',
  },
  {
    id: 109,
    title: "L'Aliment Sans Hâte",
    description:
      'Choisir un aliment (fruit, biscuit, carré de chocolat) et le manger en dix bouchées minimum, en reposant l\'aliment entre chaque.',
    titleEn: 'The Unhurried Bite',
    descriptionEn:
      'Pick a food (fruit, biscuit, square of chocolate) and eat it in at least ten bites, putting it down between each.',
    category: 'sensory_deprivation',
    targetTraits: {
      conscientiousness: 0.58,
      openness: 0.5,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 52,
    questPace: 'instant',
  },
  {
    id: 110,
    title: 'Le Silence Imposé',
    description:
      "Mettre le téléphone en mode avion, s'asseoir, et ne rien faire pendant 5 minutes. Rien.",
    titleEn: 'Imposed Silence',
    descriptionEn:
      'Set your phone to airplane mode, sit down, and do nothing for 5 minutes. Nothing.',
    category: 'sensory_deprivation',
    targetTraits: {
      conscientiousness: 0.55,
      emotionalStability: 0.55,
      boredomSusceptibility: 0.22,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 39,
    questPace: 'instant',
  },

  // ── exploratory_sociability : bonjours, micro-échanges ────────────────────
  {
    id: 111,
    title: 'Le Bonjour Sincère',
    description:
      "Dire bonjour avec regard franc à la prochaine personne qui te sert (caisse, serveur, livreur). Pas un réflexe, un vrai.",
    titleEn: 'The Sincere Hello',
    descriptionEn:
      'Say hello with a direct look to the next person who serves you (cashier, server, delivery). Not a reflex, a real one.',
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.5,
      agreeableness: 0.6,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 66,
    questPace: 'instant',
  },
  {
    id: 112,
    title: 'La Question au Commerçant',
    description:
      'À ta prochaine course, demander au commerçant son conseil sur un produit — et suivre sa réponse.',
    titleEn: "The Shopkeeper's Advice",
    descriptionEn:
      'On your next errand, ask the shopkeeper for advice on a product — and follow it.',
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.5,
      agreeableness: 0.6,
      openness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 7,
    fallbackQuestId: 28,
    questPace: 'instant',
  },
  {
    id: 113,
    title: 'Le Merci Nommé',
    description:
      'Remercier quelqu\'un en citant son prénom aujourd\'hui (lire le badge si besoin) : « Merci Camille, bonne journée à toi. »',
    titleEn: 'The Named Thanks',
    descriptionEn:
      "Thank someone by name today (read the badge if needed): 'Thanks Cam, have a good one.'",
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.48,
      agreeableness: 0.62,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 66,
    questPace: 'instant',
  },
  {
    id: 114,
    title: "Le Voisin d'Ascenseur",
    description:
      "Dans le prochain ascenseur, métro ou file, engager une phrase anodine avec un·e inconnu·e (« beau temps », « long trajet aussi ? »).",
    titleEn: 'The Elevator Neighbor',
    descriptionEn:
      "On your next elevator, metro or queue, start a casual sentence with a stranger ('nice weather', 'long trip too?').",
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.55,
      agreeableness: 0.55,
      thrillSeeking: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 66,
    questPace: 'instant',
  },
  {
    id: 115,
    title: 'Le Nom Retenu',
    description:
      'La prochaine personne qui se présente à toi, tu retiens son prénom ET tu le réutilises au moins deux fois dans la conversation.',
    titleEn: 'The Remembered Name',
    descriptionEn:
      "The next person who introduces themselves, remember their name AND use it at least twice during the conversation.",
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.5,
      agreeableness: 0.6,
      conscientiousness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 7,
    fallbackQuestId: 66,
    questPace: 'instant',
  },
  {
    id: 116,
    title: "L'Appel de Deux Minutes",
    description:
      'Appeler une personne (pas un message) juste pour dire « je pensais à toi, tout va bien ? ». Raccrocher sous trois minutes.',
    titleEn: 'The Two-Minute Call',
    descriptionEn:
      "Call someone (not text) just to say 'I was thinking of you, all good?'. Hang up within three minutes.",
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.52,
      agreeableness: 0.62,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 67,
    questPace: 'instant',
  },
  {
    id: 117,
    title: 'Le Partage de Découverte',
    description:
      "Envoyer à une personne un lien (chanson, article, photo) en disant : « ça m'a fait penser à toi ». Rien de plus.",
    titleEn: 'The Discovery Share',
    descriptionEn:
      "Send someone a link (song, article, photo) saying: 'this made me think of you.' Nothing more.",
    category: 'exploratory_sociability',
    targetTraits: {
      agreeableness: 0.6,
      openness: 0.55,
      extraversion: 0.45,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 67,
    questPace: 'instant',
  },
  {
    id: 118,
    title: 'Le Compliment Ciblé',
    description:
      "Faire un compliment précis (pas générique) à une personne que tu croises aujourd'hui : un détail que tu aimes vraiment.",
    titleEn: 'The Targeted Compliment',
    descriptionEn:
      'Give a precise compliment (not generic) to someone you meet today: a detail you genuinely like.',
    category: 'exploratory_sociability',
    targetTraits: {
      extraversion: 0.55,
      agreeableness: 0.65,
      thrillSeeking: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 11,
    questPace: 'instant',
  },

  // ── physical_existential : le corps en cinq minutes ───────────────────────
  {
    id: 119,
    title: 'Les Dix Squats',
    description:
      'Dix squats lents, où tu poses pieds, où tu es, maintenant. Sans échauffement, sans chrono, juste compter.',
    titleEn: 'The Ten Squats',
    descriptionEn:
      'Ten slow squats, wherever your feet are, wherever you are, right now. No warm-up, no timer, just count.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.6,
      thrillSeeking: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 54,
    questPace: 'instant',
  },
  {
    id: 120,
    title: 'Le Dos au Mur',
    description:
      'Cinq minutes dos au mur (position chaise), bras libres, respiration calme. Si ça brûle, tu restes.',
    titleEn: 'The Wall Sit',
    descriptionEn:
      'Five minutes in a wall sit (chair position), arms free, calm breathing. If it burns, you stay.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.62,
      thrillSeeking: 0.4,
      emotionalStability: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 54,
    questPace: 'instant',
  },
  {
    id: 121,
    title: 'Le Grand Étirement',
    description:
      'Trois étirements complets : nuque, dos, jambes, 60 secondes chacun. Sans scroll en parallèle.',
    titleEn: 'The Full Stretch',
    descriptionEn:
      'Three full stretches: neck, back, legs, 60 seconds each. No parallel scrolling.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.58,
      openness: 0.45,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 54,
    questPace: 'instant',
  },
  {
    id: 122,
    title: "L'Escalier Rapide",
    description:
      'Monter un escalier à allure rapide une fois, redescendre, remonter une seconde fois. Observer la respiration à la fin.',
    titleEn: 'The Fast Stairs',
    descriptionEn:
      'Climb a staircase fast once, go down, climb it a second time. Watch your breath at the end.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.6,
      thrillSeeking: 0.42,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 41,
    questPace: 'instant',
  },
  {
    id: 123,
    title: 'La Marche dans le Couloir',
    description:
      'Dix allers-retours dans un couloir ou une pièce à un rythme soutenu, sans téléphone, sans écouteurs.',
    titleEn: 'The Hallway Walk',
    descriptionEn:
      'Ten back-and-forths in a hallway or room at a brisk pace, no phone, no earbuds.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.58,
      boredomSusceptibility: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 29,
    questPace: 'instant',
  },
  {
    id: 124,
    title: 'Le Réveil Gainage',
    description:
      'Planche classique 30 secondes × 3, avec 30 secondes de pause entre chaque. Point final.',
    titleEn: 'The Core Wake-Up',
    descriptionEn:
      'Classic plank 30 seconds × 3, with 30 seconds rest between each. Done.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.65,
      thrillSeeking: 0.38,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 54,
    questPace: 'instant',
  },
  {
    id: 125,
    title: 'Le Grand Saut',
    description:
      'Quinze jumping jacks, puis quinze genoux hauts, puis quinze pas chassés. Sans pause.',
    titleEn: 'The Big Jump',
    descriptionEn:
      'Fifteen jumping jacks, then fifteen high knees, then fifteen lateral shuffles. No break.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.58,
      thrillSeeking: 0.5,
      boredomSusceptibility: 0.4,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 54,
    questPace: 'instant',
  },
  {
    id: 126,
    title: 'Les Mains Froides',
    description:
      'Passer 30 secondes les mains sous l\'eau froide, puis ressentir 2 minutes les sensations dans le corps.',
    titleEn: 'Cold Hands',
    descriptionEn:
      'Hold your hands under cold water 30 seconds, then feel the sensations in your body for 2 minutes.',
    category: 'physical_existential',
    targetTraits: {
      thrillSeeking: 0.48,
      conscientiousness: 0.55,
      emotionalStability: 0.52,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 54,
    questPace: 'instant',
  },
  {
    id: 127,
    title: 'La Respiration de l\'Effort',
    description:
      "Après n'importe quelle action physique aujourd'hui, t'arrêter 2 minutes pour sentir le cœur battre, sans le fuir.",
    titleEn: 'The Breath of Effort',
    descriptionEn:
      "After any physical action today, stop 2 minutes to feel your heart pound, without running from it.",
    category: 'physical_existential',
    targetTraits: {
      emotionalStability: 0.55,
      openness: 0.5,
      conscientiousness: 0.52,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 54,
    questPace: 'instant',
  },
  {
    id: 128,
    title: 'Les Dix Pompes',
    description:
      'Dix pompes (sur les genoux ou non). C\'est tout. Juste les faire.',
    titleEn: 'The Ten Push-Ups',
    descriptionEn:
      'Ten push-ups (on knees or not). That\'s it. Just do them.',
    category: 'physical_existential',
    targetTraits: {
      conscientiousness: 0.62,
      thrillSeeking: 0.4,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 54,
    questPace: 'instant',
  },

  // ── async_discipline : une tâche courte, totalement terminée ──────────────
  {
    id: 129,
    title: 'Les Trois Priorités',
    description:
      'En moins de 5 minutes, écrire sur papier les trois choses à faire aujourd\'hui — pas plus, pas moins.',
    titleEn: 'The Three Priorities',
    descriptionEn:
      'In under 5 minutes, write on paper the three things to do today — no more, no less.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.7,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 55,
    questPace: 'instant',
  },
  {
    id: 130,
    title: 'Le Tri de la Boîte',
    description:
      'Traiter dix emails en file depuis le plus vieux : supprimer, répondre en une ligne, ou archiver. Rien d\'autre.',
    titleEn: 'The Inbox Pass',
    descriptionEn:
      'Process ten emails in order from the oldest: delete, one-line reply, or archive. Nothing else.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.72,
      boredomSusceptibility: 0.28,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 42,
    questPace: 'instant',
  },
  {
    id: 131,
    title: 'Le Bureau Propre',
    description:
      'Dégager complètement la surface de ton bureau : papiers, tasses, câbles. Retour à l\'état zéro.',
    titleEn: 'The Clean Desk',
    descriptionEn:
      'Completely clear your desk surface: papers, cups, cables. Back to zero.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.7,
      boredomSusceptibility: 0.25,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 19,
    questPace: 'instant',
  },
  {
    id: 132,
    title: "Le Rangement d'Un Tiroir",
    description:
      'Choisir un seul tiroir et le ranger entièrement. Un seul. Fini.',
    titleEn: 'One Drawer',
    descriptionEn: 'Pick one drawer and tidy it entirely. Just one. Done.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.68,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 19,
    questPace: 'instant',
  },
  {
    id: 133,
    title: 'La Liste de Courses',
    description:
      'Faire la liste de courses de la semaine, sans rien oublier, en consultant le frigo.',
    titleEn: 'The Shopping List',
    descriptionEn:
      'Write the week\'s shopping list, leaving nothing out, by checking the fridge.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.65,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 24,
    questPace: 'instant',
  },
  {
    id: 134,
    title: 'Le Planning de Demain',
    description:
      'Bloquer sur l\'agenda de demain un créneau de 30 minutes pour la tâche que tu repousses.',
    titleEn: 'Tomorrow\'s Plan',
    descriptionEn:
      'Block a 30-minute slot on tomorrow\'s calendar for the task you\'ve been pushing.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.72,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 24,
    questPace: 'instant',
  },
  {
    id: 135,
    title: 'Le Désabonnement Un',
    description:
      'Se désabonner d\'une seule newsletter que tu ne lis plus. Aujourd\'hui. Maintenant.',
    titleEn: 'One Unsubscribe',
    descriptionEn:
      'Unsubscribe from a single newsletter you no longer read. Today. Right now.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.6,
      boredomSusceptibility: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 19,
    questPace: 'instant',
  },
  {
    id: 136,
    title: "Le Carton d'Un Objet",
    description:
      'Jeter ou donner un seul objet dont tu ne te sers pas depuis six mois. Décider, faire, fini.',
    titleEn: 'One Object Out',
    descriptionEn:
      'Throw away or give away a single object you haven\'t used in six months. Decide, do, done.',
    category: 'async_discipline',
    targetTraits: {
      conscientiousness: 0.65,
      openness: 0.45,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 19,
    questPace: 'instant',
  },

  // ── dopamine_detox : micro-pauses écran, retour au lent ───────────────────
  {
    id: 137,
    title: 'Le Mode Avion Dix',
    description:
      'Mettre ton téléphone en mode avion pendant 10 minutes — maintenant, pas plus tard.',
    titleEn: 'Airplane Ten',
    descriptionEn:
      'Put your phone in airplane mode for 10 minutes — now, not later.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.6,
      boredomSusceptibility: 0.3,
      emotionalStability: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 43,
    questPace: 'instant',
  },
  {
    id: 138,
    title: 'Le Scroll Interdit',
    description:
      'Jusqu\'à la fin de ton prochain repas, pas de feed (Insta, TikTok, Twitter, Reddit). Juste manger.',
    titleEn: 'No-Scroll Meal',
    descriptionEn:
      'Until the end of your next meal, no feed (Insta, TikTok, Twitter, Reddit). Just eat.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.62,
      boredomSusceptibility: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 56,
    questPace: 'instant',
  },
  {
    id: 139,
    title: 'La Notification Muette',
    description:
      'Désactiver les notifications d\'UNE seule app que tu consultes trop. Une seule, tout de suite.',
    titleEn: 'One Notification Off',
    descriptionEn:
      'Turn off notifications for ONE app you check too much. Just one, right now.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.65,
      boredomSusceptibility: 0.32,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 43,
    questPace: 'instant',
  },
  {
    id: 140,
    title: "L'Écran à Plat",
    description:
      'Poser le téléphone face contre table pendant ta prochaine conversation, ton prochain café, ton prochain trajet.',
    titleEn: 'Screen Face-Down',
    descriptionEn:
      'Put your phone face-down for your next conversation, next coffee, next commute.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.55,
      agreeableness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 43,
    questPace: 'instant',
  },
  {
    id: 141,
    title: 'La Musique Seule',
    description:
      'Écouter une chanson entière, yeux fermés, sans rien faire d\'autre. Juste la chanson.',
    titleEn: 'The Song Alone',
    descriptionEn:
      'Listen to one whole song, eyes closed, doing nothing else. Just the song.',
    category: 'dopamine_detox',
    targetTraits: {
      openness: 0.6,
      emotionalStability: 0.55,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 39,
    questPace: 'instant',
  },
  {
    id: 142,
    title: 'La Page Blanche',
    description:
      'Ouvrir une page blanche (papier ou écran) et écrire sans but pendant 5 minutes. Sans relire.',
    titleEn: 'The Blank Page',
    descriptionEn:
      'Open a blank page (paper or screen) and write with no purpose for 5 minutes. No re-reading.',
    category: 'dopamine_detox',
    targetTraits: {
      openness: 0.62,
      conscientiousness: 0.5,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 143,
    title: 'Le Livre Cinq Pages',
    description:
      'Lire cinq pages d\'un livre papier maintenant. N\'importe lequel. Juste cinq.',
    titleEn: 'Five Pages',
    descriptionEn:
      'Read five pages of a paper book right now. Any book. Just five.',
    category: 'dopamine_detox',
    targetTraits: {
      openness: 0.6,
      conscientiousness: 0.58,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 15,
    questPace: 'instant',
  },
  {
    id: 144,
    title: "Le Timer de l'Ennui",
    description:
      'Régler un timer de 7 minutes et ne rien faire. Si tu t\'ennuies, c\'est que ça marche.',
    titleEn: 'The Boredom Timer',
    descriptionEn:
      'Set a 7-minute timer and do nothing. If you feel bored, it\'s working.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.58,
      emotionalStability: 0.58,
      boredomSusceptibility: 0.2,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 43,
    questPace: 'instant',
  },
  {
    id: 145,
    title: "Le Fond d'Écran Neutre",
    description:
      'Remplacer le fond d\'écran de ton téléphone par du noir ou une couleur unie. Garder au moins 24 h.',
    titleEn: 'Neutral Wallpaper',
    descriptionEn:
      'Replace your phone wallpaper with black or a solid color. Keep it at least 24 h.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.58,
      openness: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 43,
    questPace: 'instant',
  },
  {
    id: 146,
    title: "L'App Cachée",
    description:
      'Déplacer l\'app que tu ouvres par réflexe dans un dossier à la dernière page du menu. Ajouter une friction.',
    titleEn: 'The Hidden App',
    descriptionEn:
      'Move the app you open by reflex into a folder on the last page. Add some friction.',
    category: 'dopamine_detox',
    targetTraits: {
      conscientiousness: 0.65,
      boredomSusceptibility: 0.3,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 43,
    questPace: 'instant',
  },

  // ── active_empathy : petites présences à l'autre ──────────────────────────
  {
    id: 147,
    title: "L'Écoute Sans Conseil",
    description:
      'Dans ta prochaine conversation un peu sérieuse, ne donner aucun conseil. Poser deux questions avant de répondre.',
    titleEn: 'Listening Without Advice',
    descriptionEn:
      'In your next serious conversation, give no advice. Ask two questions before answering.',
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.68,
      conscientiousness: 0.55,
      emotionalStability: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 10,
    fallbackQuestId: 31,
    questPace: 'instant',
  },
  {
    id: 148,
    title: 'Le Message Long',
    description:
      'Répondre à un message d\'un proche avec plus de trois phrases, en parlant de lui d\'abord avant de parler de toi.',
    titleEn: 'The Long Reply',
    descriptionEn:
      'Reply to a message from someone close with more than three sentences, talking about them first, then you.',
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.65,
      conscientiousness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 7,
    fallbackQuestId: 68,
    questPace: 'instant',
  },
  {
    id: 149,
    title: "La Nouvelle d'un Vieux",
    description:
      'Envoyer « je pensais à toi, tout va ? » à une personne qui t\'a traversé l\'esprit récemment sans contact.',
    titleEn: "An Old Friend's News",
    descriptionEn:
      "Send 'I was thinking of you, all good?' to someone who crossed your mind recently without reaching out.",
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.62,
      openness: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 67,
    questPace: 'instant',
  },
  {
    id: 150,
    title: 'Le Retour Précis',
    description:
      'Dire à quelqu\'un aujourd\'hui une qualité concrète de lui, avec un exemple précis où tu l\'as vue.',
    titleEn: 'The Precise Feedback',
    descriptionEn:
      'Tell someone today a concrete strength of theirs, with a precise example where you saw it.',
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.68,
      conscientiousness: 0.58,
      extraversion: 0.45,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 7,
    fallbackQuestId: 71,
    questPace: 'instant',
  },
  {
    id: 151,
    title: 'La Reformulation',
    description:
      'À ta prochaine conversation, reformuler une fois ce que l\'autre vient de dire avant de répondre. Rien qu\'une fois.',
    titleEn: 'The Rephrase',
    descriptionEn:
      'At your next conversation, rephrase once what the other just said before you answer. Just once.',
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.6,
      conscientiousness: 0.6,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 44,
    questPace: 'instant',
  },
  {
    id: 152,
    title: 'Le Silence Accueillant',
    description:
      'Quand quelqu\'un te parle aujourd\'hui, ne remplir aucun silence pendant 5 secondes avant de répondre.',
    titleEn: 'The Welcoming Silence',
    descriptionEn:
      'When someone speaks to you today, fill no silence for 5 seconds before you answer.',
    category: 'active_empathy',
    targetTraits: {
      emotionalStability: 0.62,
      agreeableness: 0.6,
      conscientiousness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 57,
    questPace: 'instant',
  },
  {
    id: 153,
    title: 'Le Vocal Chaleureux',
    description:
      'Envoyer un vocal de 30 secondes à un proche pour lui raconter un détail de ta journée, voix souriante.',
    titleEn: 'The Warm Voice Note',
    descriptionEn:
      'Send a 30-second voice note to someone close, telling one detail of your day in a smiling voice.',
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.62,
      extraversion: 0.48,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 68,
    questPace: 'instant',
  },
  {
    id: 154,
    title: 'La Gratitude Envoyée',
    description:
      'Envoyer à une personne (texto, mail) une phrase de gratitude précise sur quelque chose qu\'elle a fait pour toi.',
    titleEn: 'Gratitude Sent',
    descriptionEn:
      'Send someone (text, email) a precise gratitude sentence about something they did for you.',
    category: 'active_empathy',
    targetTraits: {
      agreeableness: 0.7,
      conscientiousness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 71,
    questPace: 'instant',
  },

  // ── temporal_projection : journal micro & réflexion brève ─────────────────
  {
    id: 155,
    title: 'Les Trois Gratitudes',
    description:
      'Écrire trois choses précises dont tu es reconnaissant·e aujourd\'hui. Pas « ma santé », des détails.',
    titleEn: 'The Three Gratitudes',
    descriptionEn:
      'Write three precise things you\'re grateful for today. Not "my health" — details.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.55,
      conscientiousness: 0.58,
      emotionalStability: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 156,
    title: "L'Humeur du Jour",
    description:
      'Noter en une phrase comment tu te sens maintenant, sans juger, puis une ligne sur ce qui a pu l\'influencer.',
    titleEn: "Today's Mood",
    descriptionEn:
      'Write one sentence about how you feel now, no judgement, then one line on what may have caused it.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.55,
      emotionalStability: 0.55,
      conscientiousness: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 157,
    title: 'La Photo de Mémoire',
    description:
      'Revoir dans la galerie la dernière photo qui te rend nostalgique, et écrire une phrase sur ce moment.',
    titleEn: 'The Memory Photo',
    descriptionEn:
      'Open your gallery to the last photo that makes you nostalgic, and write a sentence about that moment.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.6,
      emotionalStability: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 158,
    title: 'Le Mot à Toi-Même',
    description:
      'Écrire un message à toi-même de ce matin, comme à un ami, en une phrase bienveillante.',
    titleEn: 'A Word to Yourself',
    descriptionEn:
      'Write a message to yourself-this-morning, like to a friend, in one kind sentence.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.58,
      emotionalStability: 0.55,
      agreeableness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 159,
    title: 'La Liste des Petites Joies',
    description:
      'En 5 minutes, lister dix petits trucs qui te font plaisir en ce moment dans ta vie. Sans censure.',
    titleEn: 'The Small Joys List',
    descriptionEn:
      'In 5 minutes, list ten small things that please you right now in your life. No censor.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.6,
      emotionalStability: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 160,
    title: 'Le Souvenir Fort',
    description:
      'Fermer les yeux et se rappeler un souvenir heureux précis, puis écrire trois détails sensoriels (son, odeur, lumière).',
    titleEn: 'The Strong Memory',
    descriptionEn:
      'Close your eyes, recall a precise happy memory, then write three sensory details (sound, smell, light).',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.62,
      emotionalStability: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 161,
    title: 'La Question du Soir',
    description:
      'Avant de dormir ce soir, répondre à : « quel moment je voudrais revivre de ma journée ? ». Une phrase, pas plus.',
    titleEn: "The Evening Question",
    descriptionEn:
      "Before bed tonight, answer: 'what moment from today would I want to live again?'. One sentence, no more.",
    category: 'temporal_projection',
    targetTraits: {
      conscientiousness: 0.55,
      emotionalStability: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 162,
    title: 'Le Rêve Noté',
    description:
      'Dans les 3 minutes après le réveil, noter un mot ou une phrase du dernier rêve dont tu te souviens, même flou.',
    titleEn: 'The Noted Dream',
    descriptionEn:
      'Within 3 minutes of waking, write one word or sentence from the last dream you remember, even blurry.',
    category: 'temporal_projection',
    targetTraits: {
      openness: 0.65,
      conscientiousness: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 9,
    questPace: 'instant',
  },

  // ── hostile_immersion : petits courages tranchés ──────────────────────────
  {
    id: 163,
    title: 'Le Regard Tenu',
    description:
      "Avec une personne de ton choix aujourd'hui, tenir son regard 10 secondes pleines sans rire ni détourner.",
    titleEn: 'The Held Gaze',
    descriptionEn:
      'With a person of your choice today, hold eye contact a full 10 seconds without laughing or looking away.',
    category: 'hostile_immersion',
    targetTraits: {
      emotionalStability: 0.6,
      extraversion: 0.5,
      thrillSeeking: 0.45,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 72,
    questPace: 'instant',
  },
  {
    id: 164,
    title: "L'Opinion Donnée",
    description:
      'Dans une conversation aujourd\'hui, donner une opinion tranchée sur un petit sujet sans dire « je sais pas trop ».',
    titleEn: 'The Opinion Given',
    descriptionEn:
      "In a conversation today, give a clear opinion on a small topic without saying 'I don't really know'.",
    category: 'hostile_immersion',
    targetTraits: {
      extraversion: 0.55,
      emotionalStability: 0.58,
      thrillSeeking: 0.48,
      agreeableness: 0.4,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 72,
    questPace: 'instant',
  },
  {
    id: 165,
    title: 'La Question Gênante',
    description:
      'Poser à quelqu\'un une question un peu gênante mais sincère (« tu rêves de quoi en ce moment ? », « qu\'est-ce qui te fait peur ? »).',
    titleEn: 'The Awkward Question',
    descriptionEn:
      "Ask someone a slightly awkward but sincere question ('what are you dreaming about?', 'what scares you?').",
    category: 'hostile_immersion',
    targetTraits: {
      extraversion: 0.5,
      openness: 0.62,
      thrillSeeking: 0.48,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 7,
    fallbackQuestId: 72,
    questPace: 'instant',
  },
  {
    id: 166,
    title: 'Le Non Clair',
    description:
      'Dire non à une sollicitation aujourd\'hui sans t\'excuser, sans justifier longuement. Juste « non, pas cette fois ».',
    titleEn: 'The Clear No',
    descriptionEn:
      "Say no to a request today without apologizing, without long justifications. Just 'no, not this time'.",
    category: 'hostile_immersion',
    targetTraits: {
      emotionalStability: 0.6,
      conscientiousness: 0.55,
      agreeableness: 0.4,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 86,
    questPace: 'instant',
  },
  {
    id: 167,
    title: 'Le Premier Pas',
    description:
      "Engager la conversation avec un·e inconnu·e aujourd'hui par une question ouverte (pas « il fait beau », plutôt « d'où venez-vous ? »).",
    titleEn: 'The First Step',
    descriptionEn:
      "Start a conversation with a stranger today with an open question (not 'nice weather' but 'where are you from?').",
    category: 'hostile_immersion',
    targetTraits: {
      extraversion: 0.58,
      openness: 0.58,
      thrillSeeking: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 7,
    fallbackQuestId: 66,
    questPace: 'instant',
  },

  // ── spontaneous_altruism : gestes express ─────────────────────────────────
  {
    id: 168,
    title: 'Le Siège Cédé',
    description:
      'Céder volontairement ta place à quelqu\'un dans les transports ou une file d\'attente aujourd\'hui.',
    titleEn: 'The Given Seat',
    descriptionEn:
      'Willingly give up your seat or spot to someone on transit or in a queue today.',
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.65,
      conscientiousness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 11,
    questPace: 'instant',
  },
  {
    id: 169,
    title: 'La Porte Tenue',
    description:
      'Tenir la porte pour trois personnes sur ton trajet d\'aujourd\'hui, avec un regard et un sourire francs.',
    titleEn: 'The Held Door',
    descriptionEn:
      'Hold the door for three people on your route today, with a clear look and smile.',
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.62,
      extraversion: 0.45,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 11,
    questPace: 'instant',
  },
  {
    id: 170,
    title: 'Le Déchet Ramassé',
    description:
      'Ramasser trois déchets sur ton chemin et les mettre à la poubelle. Juste trois.',
    titleEn: 'Three Pieces of Litter',
    descriptionEn:
      'Pick up three pieces of litter on your way and bin them. Just three.',
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.58,
      conscientiousness: 0.6,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 34,
    questPace: 'instant',
  },
  {
    id: 171,
    title: 'Le Passage Facilité',
    description:
      'Laisser passer devant toi la personne derrière toi en caisse quand elle a peu d\'articles.',
    titleEn: 'The Friendly Cut',
    descriptionEn:
      'Let the person behind you go ahead at checkout when they have fewer items.',
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.68,
      conscientiousness: 0.5,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 60,
    questPace: 'instant',
  },
  {
    id: 172,
    title: 'Le Merci au Service',
    description:
      'Remercier nommément la personne qui te sert aujourd\'hui (facteur, caissier, serveur) avec une phrase vraie.',
    titleEn: 'Thanks to the Server',
    descriptionEn:
      'Thank by name the person serving you today (mail carrier, cashier, server) with a real sentence.',
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.68,
      extraversion: 0.45,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 47,
    questPace: 'instant',
  },
  {
    id: 173,
    title: 'Le Coup de Pouce',
    description:
      'Proposer explicitement ton aide à quelqu\'un aujourd\'hui (porter un sac, indiquer une direction, tenir un truc).',
    titleEn: 'The Helping Hand',
    descriptionEn:
      'Explicitly offer help to someone today (carry a bag, give directions, hold something).',
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.7,
      extraversion: 0.5,
      conscientiousness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 7,
    fallbackQuestId: 11,
    questPace: 'instant',
  },
  {
    id: 174,
    title: 'Le Compliment au Passage',
    description:
      'Complimenter sincèrement une tenue, une coiffure, un sourire d\'un·e inconnu·e croisé·e aujourd\'hui.',
    titleEn: 'The Compliment in Passing',
    descriptionEn:
      "Sincerely compliment an outfit, a haircut, a smile of a stranger you cross today.",
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.65,
      extraversion: 0.55,
      thrillSeeking: 0.35,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 11,
    questPace: 'instant',
  },
  {
    id: 175,
    title: 'Le Don Rapide',
    description:
      'Donner un petit montant ou un snack à la première cause, au premier musicien ou à la première personne dans le besoin que tu croises.',
    titleEn: 'The Quick Give',
    descriptionEn:
      'Give a small amount or a snack to the first cause, busker or person in need you encounter.',
    category: 'spontaneous_altruism',
    targetTraits: {
      agreeableness: 0.68,
      openness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: true,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 34,
    questPace: 'instant',
  },

  // ── relational_vulnerability : micro-vulnérabilités express ───────────────
  {
    id: 176,
    title: 'La Phrase Retenue',
    description:
      "Dire à voix haute à un proche aujourd'hui une phrase que tu penses sans jamais la dire (« tu comptes pour moi »).",
    titleEn: 'The Held-Back Sentence',
    descriptionEn:
      "Say out loud to someone close a sentence you think but never say ('you matter to me').",
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.65,
      emotionalStability: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 35,
    questPace: 'instant',
  },
  {
    id: 177,
    title: 'Le Message Tendre',
    description:
      'Envoyer un message court à un proche juste pour dire « je pense à toi », sans occasion.',
    titleEn: 'The Tender Message',
    descriptionEn:
      "Send a short message to someone close just to say 'I'm thinking of you', no occasion.",
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.65,
      emotionalStability: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 67,
    questPace: 'instant',
  },
  {
    id: 178,
    title: 'Le Besoin Nommé',
    description:
      'Dire à quelqu\'un aujourd\'hui une chose dont tu as besoin, clairement, sans détour (« j\'aurais besoin que tu... »).',
    titleEn: 'The Named Need',
    descriptionEn:
      "Tell someone today one thing you need, clearly, directly ('I'd need you to...').",
    category: 'relational_vulnerability',
    targetTraits: {
      emotionalStability: 0.58,
      agreeableness: 0.55,
      conscientiousness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 61,
    questPace: 'instant',
  },
  {
    id: 179,
    title: "L'Émotion Dite",
    description:
      'Dans une conversation aujourd\'hui, nommer ton émotion réelle (« je suis un peu triste, un peu fatigué·e ») au lieu de « ça va ».',
    titleEn: 'The Named Emotion',
    descriptionEn:
      "In a conversation today, name your real emotion ('I'm a bit sad, a bit tired') instead of 'I'm fine'.",
    category: 'relational_vulnerability',
    targetTraits: {
      emotionalStability: 0.58,
      agreeableness: 0.6,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 61,
    questPace: 'instant',
  },
  {
    id: 180,
    title: 'Le Pardon Silencieux',
    description:
      'Penser à une personne envers qui tu gardes une rancune, et lui pardonner intérieurement — rien d\'autre, juste ça.',
    titleEn: 'The Silent Forgiveness',
    descriptionEn:
      'Think of someone you hold a grudge against, and forgive them silently — nothing else, just that.',
    category: 'relational_vulnerability',
    targetTraits: {
      agreeableness: 0.65,
      emotionalStability: 0.6,
      openness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 5,
    fallbackQuestId: 9,
    questPace: 'instant',
  },
  {
    id: 181,
    title: 'Le Compliment Reçu',
    description:
      'La prochaine fois qu\'on te complimente aujourd\'hui, dire simplement « merci, ça me touche », sans minimiser ni retourner.',
    titleEn: 'The Compliment Received',
    descriptionEn:
      "Next time you get a compliment today, just say 'thanks, that means a lot', no minimizing, no deflecting.",
    category: 'relational_vulnerability',
    targetTraits: {
      emotionalStability: 0.6,
      agreeableness: 0.6,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 61,
    questPace: 'instant',
  },
  {
    id: 182,
    title: "L'Excuse Tenue",
    description:
      'Si tu as été maladroit·e récemment avec quelqu\'un, lui envoyer un « désolé·e, j\'ai été X » sans justification.',
    titleEn: 'The Plain Apology',
    descriptionEn:
      "If you were clumsy with someone recently, send them 'sorry, I was X' with no justification.",
    category: 'relational_vulnerability',
    targetTraits: {
      emotionalStability: 0.6,
      agreeableness: 0.65,
      conscientiousness: 0.58,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 7,
    fallbackQuestId: 61,
    questPace: 'instant',
  },

  // ── unconditional_service : petits services offerts ──────────────────────
  {
    id: 183,
    title: 'La Tâche Prise',
    description:
      'Faire en silence une tâche ménagère que fait habituellement un·e proche (vaisselle, linge, sortir la poubelle).',
    titleEn: 'The Taken Chore',
    descriptionEn:
      "Quietly do a chore someone close usually handles (dishes, laundry, taking out the trash).",
    category: 'unconditional_service',
    targetTraits: {
      agreeableness: 0.68,
      conscientiousness: 0.62,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 10,
    fallbackQuestId: 62,
    questPace: 'instant',
  },
  {
    id: 184,
    title: 'Le Café Apporté',
    description:
      'Préparer un café ou un thé pour un·e proche sans qu\'on te le demande, juste parce que.',
    titleEn: 'The Brought Coffee',
    descriptionEn:
      "Make a coffee or tea for someone close without being asked, just because.",
    category: 'unconditional_service',
    targetTraits: {
      agreeableness: 0.72,
      conscientiousness: 0.55,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 36,
    questPace: 'instant',
  },
  {
    id: 185,
    title: 'Le Texto Utile',
    description:
      'Partager à un·e proche une info qui peut lui servir (horaire, tuto, contact) sans rien attendre en retour.',
    titleEn: 'The Useful Text',
    descriptionEn:
      "Share with someone close a piece of info they can use (time, tutorial, contact) with nothing expected back.",
    category: 'unconditional_service',
    targetTraits: {
      agreeableness: 0.65,
      conscientiousness: 0.62,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: true,
    minimumDurationMinutes: 5,
    fallbackQuestId: 62,
    questPace: 'instant',
  },
  {
    id: 186,
    title: 'La Prévenance',
    description:
      'Anticiper un besoin de quelqu\'un (sortir un parapluie, préparer un truc, recharger un appareil) sans annoncer que tu le fais.',
    titleEn: 'The Small Foresight',
    descriptionEn:
      "Anticipate someone's need (set out an umbrella, prep a thing, charge a device) without announcing it.",
    category: 'unconditional_service',
    targetTraits: {
      agreeableness: 0.68,
      conscientiousness: 0.68,
    },
    comfortLevel: 'low',
    requiresOutdoor: false,
    requiresSocial: false,
    minimumDurationMinutes: 7,
    fallbackQuestId: 62,
    questPace: 'instant',
  },
];

if (process.env.NODE_ENV !== 'production') {
  const ids = new Set<number>();
  for (const q of QUEST_ARCHETYPES_SEED) {
    if (ids.has(q.id)) {
      throw new Error(`[questArchetypesSeed] id dupliqué : ${q.id}`);
    }
    ids.add(q.id);
  }
}
