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
  weatherFallback: string;
  completedTitle: string;
  completedSubtitle: string;
  shareVictoryCta: string;
  swipeAccept: string;
  swipeChange: string;
  tapDetails: string;
  validateCta: string;
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
  reportHint: string;
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
    rerollConfirmBody: 'Tu consommes une relance et l\u2019XP de la nouvelle quête sera réduit de 25 %. Cette action est irréversible.',
    rerollConfirmAction: 'Changer',
    rerollConfirmCancel: 'Annuler',
    weatherFallback: 'Ciel variable',
    completedTitle: 'Quête accomplie',
    completedSubtitle: 'Ta série est enregistrée. À demain pour la suite.',
    shareVictoryCta: 'Partager ta carte',
    swipeAccept: 'ACCEPTER',
    swipeChange: 'CHANGER',
    tapDetails: 'Appuie pour voir les détails',
    validateCta: "J'ai fait la quête — valider",
    abandonedTitle: 'À demain',
    abandonedSub: 'Ta série repart à zéro. Une nouvelle quête t\u2019attend demain.',
    paceToday: "Aujourd'hui",
    pacePlanned: 'À caler',
    missionHeading: 'Ta mission',
    hookLabel: 'Pensée du jour',
    destinationLabel: 'Destination',
    destinationHint: 'Un lieu suggéré pour ta quête.',
    safetyLabel: 'Sécurité',
    reportCta: 'Reporter — quête courte',
    abandonCta: 'Ce n\u2019est pas pour moi',
    close: 'Fermer',
    durationLabel: 'Durée :',
    outdoorTag: 'Extérieur',
    reportHint: 'Comme « Changer de quête », une relance est utilisée si tu reportes.',
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
    rerollConfirmBody: 'You\u2019ll use a reroll and the new quest\u2019s XP will be reduced by 25%. This cannot be undone.',
    rerollConfirmAction: 'Change',
    rerollConfirmCancel: 'Cancel',
    weatherFallback: 'Mixed skies',
    completedTitle: 'Quest complete',
    completedSubtitle: 'Your streak is saved. See you tomorrow for the next one.',
    shareVictoryCta: 'Share your card',
    swipeAccept: 'ACCEPT',
    swipeChange: 'CHANGE',
    tapDetails: 'Tap to see details',
    validateCta: 'I did the quest \u2014 complete',
    abandonedTitle: 'See you tomorrow',
    abandonedSub: 'Your streak resets. A new quest awaits tomorrow.',
    paceToday: 'Today',
    pacePlanned: 'Planned',
    missionHeading: 'Your mission',
    hookLabel: 'Thought of the day',
    destinationLabel: 'Destination',
    destinationHint: 'A suggested spot for your quest.',
    safetyLabel: 'Safety',
    reportCta: 'Defer \u2014 short quest',
    abandonCta: 'Not for me',
    close: 'Close',
    durationLabel: 'Duration:',
    outdoorTag: 'Outdoor',
    reportHint: 'Like "Change quest," deferring uses a reroll \u2014 you get a short quest for today.',
  };
}

export function getHomeDashboardStrings(locale: AppLocale): HomeDashboardStrings {
  return locale === 'en' ? en() : fr();
}
