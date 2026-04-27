import type { AppLocale } from '@questia/shared';

/**
 * Chaînes écran Profil (alignées sur le namespace AppProfile du web).
 */
export function getProfileScreenStrings(locale: AppLocale) {
  if (locale === 'en') {
    return {
      title: 'Profile',
      errSession: 'Session expired.',
      errGeneric: (code: number) => `Error ${code}`,
      errLoad: 'Could not load profile.',
      retry: 'Retry',
      defaultName: 'Adventurer',
      axisExplorer: 'Explorer',
      axisHomebody: 'Homebody',
      riskAudacious: 'Bold',
      riskCautious: 'Cautious',
      levelLabel: 'Level',
      xpLine: (total: number, toNext: number, into: number, per: number) =>
        `${total} XP total · ${toNext} XP to level up (tier ${into}/${per})`,
      dayChip: (day: number) => `Day ${day}`,
      journey: 'Journey',
      streak: 'Streak',
      a11yLevelCard: 'Level and XP',
      a11yLevelHint: 'Open the shop for XP boosts and cosmetics',
      a11yHistory: 'Quest history',
      a11yHistoryHint: 'Open the quest journal',
      a11yHome: "Home and today's quest",
      a11yHomeHint: 'Back to home',
      badgesTitle: 'Badges',
      badgesHint:
        'Unlocked: warm card with a green badge. Pending: greyed card, dashed border.',
      unlocked: 'Unlocked',
      locked: 'Locked',
      objectiveInProgress: 'In progress',
      legalTitle: 'Legal',
      legalPrivacy: 'Privacy',
      legalLegal: 'Legal notice',
      legalTerms: 'Terms',
      legalSales: 'Terms of sale',
      legalWellbeing: 'Well-being',
      legalOpen: (label: string) => `Open ${label}`,
      signOut: 'Sign out',
      signOutA11y: 'Sign out',
      localeSection: 'Language',
      localeFr: 'Français',
      localeEn: 'English',
      prefsSection: 'Quests & reminders',
      prefsCadenceTitle: 'Notification frequency (app and email)',
      prefsCadenceDaily: 'Once a day',
      prefsCadenceWeekly: 'Once a week',
      prefsCadenceMonthly: 'Once a month (~28 d)',
      prefsDurationTitle: 'Suggested quest duration',
      prefsDurationHint:
        'Filters archetypes by indicative duration and guides the generated “duration” line. If the range is very tight, other archetypes may still appear.',
      prefsDurMin: 'Minimum (minutes)',
      prefsDurMax: 'Maximum (minutes)',
      prefsSave: 'Save preferences',
      prefsSaving: 'Saving…',
      prefsSaved: 'Saved.',
      prefsErr: 'Could not save.',
      prefsHeavyTitle: 'Travel & planning-heavy quests',
      prefsHeavyHint:
        'Outdoor trips or “schedule ahead” quests (social or long-form pace). Gently steers archetype selection and model hints.',
      prefsHeavyLow: 'Rarely',
      prefsHeavyBalanced: 'Balanced',
      prefsHeavyHigh: 'Often',
      appearanceSection: 'Appearance',
      appearanceTheme: 'Active theme',
      appearanceTitle: 'Profile title',
      noTitle: 'No title',
      themeLabel: (id: string) => {
        if (id === 'default') return 'Questia (light)';
        if (id === 'midnight') return 'Boreal night';
        if (id === 'aurora') return 'Aurora';
        if (id === 'parchment') return 'Parchment';
        return id;
      },
      selectThemeTitle: 'Active theme',
      selectTitleTitle: 'Profile title',
      themeCurrentA11y: (name: string) => `Current theme: ${name}`,
      themeOpenHint: 'Opens theme picker',
      titleCurrentA11y: (name: string) => `Profile title: ${name}`,
      titleOpenHint: 'Opens title picker',
      errSaveAppearance: 'Could not save appearance.',
    };
  }
  return {
    title: 'Profil',
    errSession: 'Session expirée.',
    errGeneric: (code: number) => `Erreur ${code}`,
    errLoad: 'Impossible de charger le profil.',
    retry: 'Réessayer',
    defaultName: 'Aventurier·e',
    axisExplorer: 'Explorateur·rice',
    axisHomebody: 'Casanier·ière',
    riskAudacious: 'Audacieux·se',
    riskCautious: 'Prudent·e',
    levelLabel: 'Niveau',
    xpLine: (total: number, toNext: number, into: number, per: number) =>
      `${total} XP au total · encore ${toNext} XP pour monter (tranche ${into}/${per})`,
    dayChip: (day: number) => `Jour ${day}`,
    journey: 'Parcours',
    streak: 'Série',
    a11yLevelCard: 'Niveau et XP',
    a11yLevelHint: 'Ouvre la boutique pour bonus XP et cosmétiques',
    a11yHistory: 'Historique des quêtes',
    a11yHistoryHint: 'Ouvre le journal des quêtes',
    a11yHome: 'Accueil et quête du jour',
    a11yHomeHint: "Retour à l'accueil",
    badgesTitle: 'Insignes',
    badgesHint:
      'Débloqués : carte chaude avec pastille verte. En attente : carte grisée, bordure en pointillés.',
    unlocked: 'Débloqué',
    locked: 'À débloquer',
    objectiveInProgress: 'Objectif en cours',
    legalTitle: 'Informations légales',
    legalPrivacy: 'Confidentialité',
    legalLegal: 'Mentions légales',
    legalTerms: 'CGU',
    legalSales: 'CGV',
    legalWellbeing: 'Bien-être',
    legalOpen: (label: string) => `Ouvrir ${label}`,
    signOut: 'Se déconnecter',
    signOutA11y: 'Se déconnecter',
    localeSection: 'Langue',
    localeFr: 'Français',
    localeEn: 'English',
    prefsSection: 'Quêtes & rappels',
    prefsCadenceTitle: 'Fréquence des notifications (app et e-mail)',
    prefsCadenceDaily: '1× par jour',
    prefsCadenceWeekly: '1× par semaine',
    prefsCadenceMonthly: '1× par mois (~28 j)',
    prefsDurationTitle: 'Durée des quêtes proposées',
    prefsDurationHint:
      'Filtre les archétypes selon leur durée indicative et guide la ligne « durée ». Si la plage est très serrée, d’autres archétypes peuvent quand même apparaître.',
    prefsDurMin: 'Minimum (minutes)',
    prefsDurMax: 'Maximum (minutes)',
    prefsSave: 'Enregistrer les préférences',
    prefsSaving: 'Enregistrement…',
    prefsSaved: 'Enregistré.',
    prefsErr: 'Échec de l’enregistrement.',
    prefsHeavyTitle: 'Quêtes à déplacer ou à organiser',
    prefsHeavyHint:
      'Sorties / extérieur ou quêtes « à caler » (social ou longue durée). Module la sélection (en douceur) et les consignes au modèle.',
    prefsHeavyLow: 'Rarement',
    prefsHeavyBalanced: 'Équilibré',
    prefsHeavyHigh: 'Souvent',
    appearanceSection: 'Apparence',
    appearanceTheme: 'Thème actif',
    appearanceTitle: 'Titre sur le profil',
    noTitle: 'Aucun titre',
    themeLabel: (id: string) => {
      if (id === 'default') return 'Questia (clair)';
      if (id === 'midnight') return 'Nuit boréale';
      if (id === 'aurora') return 'Aurore';
      if (id === 'parchment') return 'Parchemin';
      return id;
    },
    selectThemeTitle: 'Thème actif',
    selectTitleTitle: 'Titre sur le profil',
    themeCurrentA11y: (name: string) => `Thème actuel : ${name}`,
    themeOpenHint: 'Ouvre le choix de thème',
    titleCurrentA11y: (name: string) => `Titre sur le profil : ${name}`,
    titleOpenHint: 'Ouvre le choix du titre affiché',
    errSaveAppearance: "Impossible d'enregistrer l'apparence.",
  };
}

export type ProfileScreenStrings = ReturnType<typeof getProfileScreenStrings>;
