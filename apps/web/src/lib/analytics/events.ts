/**
 * Noms d’événements analytics (GA4 / dataLayer) — alignés sur docs/marketing-analytics.md
 * Ne pas renommer sans mettre à jour GTM / GA4.
 */
export const AnalyticsEvent = {
  pageView: 'page_view',
  onboardingStarted: 'onboarding_started',
  onboardingStepCompleted: 'onboarding_step_completed',
  onboardingCompleted: 'onboarding_completed',
  login: 'login',
  signUp: 'sign_up',
  questViewed: 'quest_viewed',
  questAccepted: 'quest_accepted',
  questCompleted: 'quest_completed',
  questRerolled: 'quest_rerolled',
  questAbandoned: 'quest_abandoned',
  shareOpened: 'share_opened',
  beginCheckout: 'begin_checkout',
  purchase: 'purchase',
  profileUpdated: 'profile_updated',
} as const;
