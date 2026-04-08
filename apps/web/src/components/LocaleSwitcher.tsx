'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Bascule FR / EN (préfixe `/en` pour l'anglais, FR sans préfixe).
 * Cibles tactiles ≥ 40px, adapté header + tiroir mobile.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('HomePage.localeSwitcher');

  const linkBase =
    'flex min-h-[40px] min-w-[3rem] sm:min-h-9 sm:min-w-11 flex-1 items-center justify-center rounded-full px-3 py-2 text-sm font-black transition-colors touch-manipulation active:scale-[0.98] motion-reduce:transform-none';

  return (
    <div
      className="inline-flex w-full max-w-[11rem] sm:max-w-none shrink-0 items-stretch gap-0.5 rounded-full border border-[var(--border-ui-strong)] bg-[var(--card)]/95 p-0.5 text-[var(--muted)] shadow-sm backdrop-blur-sm sm:gap-1 sm:px-0.5 sm:py-0.5"
      role="navigation"
      aria-label={t('label')}
    >
      <Link
        href={pathname}
        locale="fr"
        className={`${linkBase} ${
          locale === 'fr'
            ? 'bg-cyan-100/95 text-cyan-950 shadow-sm'
            : 'text-[var(--muted)] hover:bg-white/60 hover:text-[var(--text)]'
        }`}
      >
        {t('fr')}
      </Link>
      <Link
        href={pathname}
        locale="en"
        className={`${linkBase} ${
          locale === 'en'
            ? 'bg-cyan-100/95 text-cyan-950 shadow-sm'
            : 'text-[var(--muted)] hover:bg-white/60 hover:text-[var(--text)]'
        }`}
      >
        {t('en')}
      </Link>
    </div>
  );
}
