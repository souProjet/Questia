import type { AppLocale } from '@questia/shared';

export type HomeDashboardStrings = {
  errSession: string;
  errHttp: (code: number) => string;
  errCreateProfile: string;
  errApiUnreachable: string;
  errOnboarding: string;
  errProfileMissing: string;
  errServer: string;
  errApiCheck: string;
  errReroll: string;
  errReport: string;
  errAbandon: string;
  /** Bouton sur l'écran d'erreur plein écran */
  errorRetry: string;
  /** Déconnexion Clerk quand la session JWT est refusée (401) */
  errorSignOut: string;
  questStatus: {
    pending: string;
    accepted: string;
    completed: string;
    abandoned: string;
    rejected: string;
    replaced: string;
  };
  rerollParts: (daily: number, bonus: number) => string;
  rerollCta: (label: string) => string;
  rerollConfirmTitle: string;
  rerollConfirmBody: string;
  rerollConfirmAction: string;
  rerollConfirmCancel: string;
  /** Pendant l'appel API après confirmation de relance */
  rerollLoading: string;
  weatherFallback: string;
  completedTitle: string;
  completedSubtitle: string;
  shareVictoryCta: string;
  swipeAccept: string;
  swipeChange: string;
  validateCta: string;
  /** Texte court sur l’overlay vert au swipe (quête acceptée) — pas le long libellé du bouton. */
  swipeValidateOverlay: string;
  abandonedTitle: string;
  abandonedSub: string;
  paceToday: string;
  pacePlanned: string;
  missionHeading: string;
  hookLabel: string;
  destinationLabel: string;
  destinationHint: string;
  safetyLabel: string;
  reportCta: string;
  abandonCta: string;
  close: string;
  durationLabel: string;
  outdoorTag: string;
  /** Quête « à caler » : reporter consomme une relance (affiché seulement si relances dispo). */
  reportPlannedHint: string;
  /** Quête « à caler » mais aucune relance. */
  reportNoRerollsHint: string;
  /** Carte destination (WebView) + Google Maps */
  mapOpenInMaps: string;
  mapOpenDirections: string;
  mapRouteFailed: string;
  mapNoGeocodeTitle: string;
  mapNoGeocodeBody: string;
  mapRendezvous: string;
  mapUserHere: string;
  /** Rangée « packs possédés » sous l’en-tête accueil */
  ownedPacksEyebrow: string;
  ownedPacksSectionA11y: string;
  ownedPackA11y: (name: string) => string;
};

function fr(): HomeDashboardStrings {
  return {
    errSession: 'Session expirée. Déconnecte-toi et reconnecte-toi.',
    errHttp: (code) => `Erreur ${code}`,
    errCreateProfile: 'Impossible de créer le profil.',
    errApiUnreachable:
      "Impossible de joindre l'API. Sur téléphone, mets l'URL ngrok dans .env (EXPO_PUBLIC_API_BASE_URL).",
    errOnboarding: "Complète l'onboarding d'abord.",
    errProfileMissing: "Profil introuvable. Complète l'onboarding.",
    errServer: 'Erreur serveur',
    errApiCheck: "Impossible de joindre l'API. Vérifie EXPO_PUBLIC_API_BASE_URL.",
    errReroll: 'Erreur relance',
    errReport: 'Erreur report',
    errAbandon: 'Erreur abandon',
    errorRetry: 'Réessayer',
    errorSignOut: 'Se déconnecter',
    questStatus: {
      pending: 'En attente de ton choix',
      accepted: 'En cours',
      completed: 'Validée',
      abandoned: 'Passée',
      rejected: 'Refusée',
      replaced: 'Remplacée',
    },
    rerollParts: (daily, bonus) => {
      const parts: string[] = [];
      if (daily > 0) parts.push(`${daily} du jour`);
      if (bonus > 0) parts.push(`${bonus} bonus`);
      return parts.length > 0 ? parts.join(' · ') : 'aucune';
    },
    rerollCta: (label) => `Changer de quête (${label})`,
    rerollConfirmTitle: 'Changer de quête ?',
    rerollConfirmBody:
      "Tu consommes une relance et l'XP de la nouvelle quête sera réduit de 25 %. Cette action est irréversible.",
    rerollConfirmAction: 'Changer',
    rerollConfirmCancel: 'Annuler',
    rerollLoading: 'Nouvelle quête en cours…',
    weatherFallback: 'Ciel variable',
    completedTitle: 'Quête accomplie',
    completedSubtitle: 'Ta série est enregistrée. À demain pour la suite.',
    shareVictoryCta: 'Partager ta carte',
    swipeAccept: 'ACCEPTER',
    swipeChange: 'CHANGER',
    validateCta: "J'ai fait la quête — valider",
    swipeValidateOverlay: 'VALIDER',
    abandonedTitle: 'À demain',
    abandonedSub: "Ta série repart à zéro. Une nouvelle quête t'attend demain.",
    paceToday: "Aujourd'hui",
    pacePlanned: 'À caler',
    missionHeading: 'Ta mission',
    hookLabel: 'Pensée du jour',
    destinationLabel: 'Destination',
    destinationHint: 'Un lieu suggéré pour ta quête.',
    safetyLabel: 'Sécurité',
    reportCta: 'Reporter — quête courte',
    abandonCta: "Ce n'est pas pour moi",
    close: 'Fermer',
    durationLabel: 'Durée :',
    outdoorTag: 'Extérieur',
    reportPlannedHint:
      "« Reporter » remplace cette quête « à caler » par une mission courte aujourd'hui et consomme une relance, comme « Changer de quête ».",
    reportNoRerollsHint:
      "Plus de relances : tu ne peux ni reporter ni changer cette quête aujourd'hui.",
    mapOpenInMaps: 'Voir dans Google Maps',
    mapOpenDirections: 'Itinéraire dans Google Maps',
    mapRouteFailed:
      "L'itinéraire à pied n'a pas pu être calculé. Utilise le bouton ci-dessus.",
    mapNoGeocodeTitle: 'Lieu à préciser',
    mapNoGeocodeBody:
      "Le lieu n'a pas pu être placé sur la carte. Ouvre Google Maps pour t'orienter.",
    mapRendezvous: 'Rendez-vous',
    mapUserHere: 'Ta position (approx.)',
    ownedPacksEyebrow: 'Parcours',
    ownedPacksSectionA11y: 'Parcours possédés — faire défiler',
    ownedPackA11y: (name) => `Ouvrir le parcours ${name}`,
  };
}

function en(): HomeDashboardStrings {
  return {
    errSession: 'Session expired. Sign out and sign in again.',
    errHttp: (code) => `Error ${code}`,
    errCreateProfile: 'Could not create profile.',
    errApiUnreachable:
      'Could not reach the API. On a phone, set the ngrok URL in .env (EXPO_PUBLIC_API_BASE_URL).',
    errOnboarding: 'Finish onboarding first.',
    errProfileMissing: 'Profile not found. Finish onboarding.',
    errServer: 'Server error',
    errApiCheck: 'Could not reach the API. Check EXPO_PUBLIC_API_BASE_URL.',
    errReroll: 'Reroll error',
    errReport: 'Report error',
    errAbandon: 'Abandon error',
    errorRetry: 'Retry',
    errorSignOut: 'Sign out',
    questStatus: {
      pending: 'Waiting for your choice',
      accepted: 'In progress',
      completed: 'Completed',
      abandoned: 'Skipped',
      rejected: 'Declined',
      replaced: 'Replaced',
    },
    rerollParts: (daily, bonus) => {
      const parts: string[] = [];
      if (daily > 0) parts.push(`${daily} daily`);
      if (bonus > 0) parts.push(`${bonus} bonus`);
      return parts.length > 0 ? parts.join(' · ') : 'none';
    },
    rerollCta: (label) => `Change quest (${label})`,
    rerollConfirmTitle: 'Change quest?',
    rerollConfirmBody:
      "You'll use a reroll and the new quest's XP will be reduced by 25%. This cannot be undone.",
    rerollConfirmAction: 'Change',
    rerollConfirmCancel: 'Cancel',
    rerollLoading: 'Drawing your new quest…',
    weatherFallback: 'Mixed skies',
    completedTitle: 'Quest complete',
    completedSubtitle: 'Your streak is saved. See you tomorrow for the next one.',
    shareVictoryCta: 'Share your card',
    swipeAccept: 'ACCEPT',
    swipeChange: 'CHANGE',
    validateCta: 'I did the quest — complete',
    swipeValidateOverlay: 'COMPLETE',
    abandonedTitle: 'See you tomorrow',
    abandonedSub: 'Your streak resets. A new quest awaits tomorrow.',
    paceToday: 'Today',
    pacePlanned: 'Planned',
    missionHeading: 'Your mission',
    hookLabel: 'Thought of the day',
    destinationLabel: 'Destination',
    destinationHint: 'A suggested spot for your quest.',
    safetyLabel: 'Safety',
    reportCta: 'Defer — short quest',
    abandonCta: 'Not for me',
    close: 'Close',
    durationLabel: 'Duration:',
    outdoorTag: 'Outdoor',
    reportPlannedHint:
      '“Defer” swaps this multi-day quest for a short quest today and uses a reroll, same as “Change quest.”',
    reportNoRerollsHint: "No rerolls left — you can't defer or change this quest today.",
    mapOpenInMaps: 'Open in Google Maps',
    mapOpenDirections: 'Directions in Google Maps',
    mapRouteFailed: "Walking directions couldn't be calculated. Use the button above.",
    mapNoGeocodeTitle: 'Location to refine',
    mapNoGeocodeBody: "We couldn't place this on the map. Open Google Maps to find your way.",
    mapRendezvous: 'Meet-up',
    mapUserHere: 'Your position (approx.)',
    ownedPacksEyebrow: 'Paths',
    ownedPacksSectionA11y: 'Owned paths — scroll sideways',
    ownedPackA11y: (name) => `Open journey ${name}`,
  };
}

export function getHomeDashboardStrings(locale: AppLocale): HomeDashboardStrings {
  return locale === 'en' ? en() : fr();
}
