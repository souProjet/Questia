import type { AppLocale } from '@questia/shared';

const fr = {
  home: 'Accueil',
  shop: 'Boutique',
  history: 'Journal',
  profile: 'Profil',
} as const;

const en = {
  home: 'Home',
  shop: 'Shop',
  history: 'Journal',
  profile: 'Profile',
} as const;

export function getTabTitles(locale: AppLocale) {
  return locale === 'en' ? en : fr;
}
