import { defineRouting } from 'next-intl/routing';

/** Locales supportées : FR par défaut (France), EN pour export / EU. */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  /** URLs FR sans préfixe (`/`, `/app`) ; anglais sous `/en/...`. */
  localePrefix: 'as-needed',
  /** Cookie + `Accept-Language` : langue par défaut si pas de préfixe ni cookie. */
  localeDetection: true,
});
