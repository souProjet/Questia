import type { NextRequest } from 'next/server';
import type { AppLocale } from '@questia/shared';

/** `?locale=en|fr` ou en-tête Accept-Language (défaut : fr). */
export function parseAppLocaleFromRequest(request: NextRequest): AppLocale {
  const q = request.nextUrl.searchParams.get('locale');
  if (q === 'en' || q === 'fr') return q;
  const al = request.headers.get('accept-language') ?? '';
  if (/^\s*en([-,;]|$)/i.test(al)) return 'en';
  return 'fr';
}
