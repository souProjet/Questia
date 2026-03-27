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
  weatherFallback: string;
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
    weatherFallback: 'Ciel variable',
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
    weatherFallback: 'Mixed skies',
  };
}

export function getHomeDashboardStrings(locale: AppLocale): HomeDashboardStrings {
  return locale === 'en' ? en() : fr();
}
