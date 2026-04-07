import type { Metadata } from 'next';
import { siteUrl } from '@/config/marketing';

/** Chemin « logique » sans préfixe de locale (ex. `/legal/cgu`, `/`). */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return pathname === '/en' ? '/' : pathname.slice(3) || '/';
  }
  return pathname;
}

/** URL canonique absolue pour la locale et le chemin logique courants. */
export function canonicalUrlFor(locale: string, logicalPath: string): string {
  const enPath = logicalPath === '/' ? '/en' : `/en${logicalPath}`;
  const frPath = logicalPath === '/' ? '/' : logicalPath;
  if (locale === 'en') return `${siteUrl}${enPath}`;
  return `${siteUrl}${frPath}`;
}

/** Canoniques + hreflang (`fr`, `en-US`, `x-default` → FR par défaut du routing). */
export function alternatesForLocalePath(
  locale: string,
  logicalPath: string,
): NonNullable<Metadata['alternates']> {
  const frPath = logicalPath === '/' ? '/' : logicalPath;
  const enPath = logicalPath === '/' ? '/en' : `/en${logicalPath}`;
  return {
    canonical: canonicalUrlFor(locale, logicalPath),
    languages: {
      fr: `${siteUrl}${frPath}`,
      'en-US': `${siteUrl}${enPath}`,
      'x-default': `${siteUrl}${frPath}`,
    },
  };
}
