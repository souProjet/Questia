'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Bascule FR / EN sur les pages marketing (préfixe `/en` pour l’anglais, URLs françaises sans préfixe).
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('HomePage.localeSwitcher');

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-[var(--border-ui-strong)] bg-[var(--card)]/90 px-2 py-1 text-xs font-bold text-[var(--muted)] shadow-sm backdrop-blur-sm"
      role="navigation"
      aria-label={t('label')}
    >
      <Link
        href={pathname}
        locale="fr"
        className={`rounded-full px-2 py-0.5 transition-colors ${
          locale === 'fr' ? 'bg-cyan-100/90 text-cyan-950' : 'hover:text-[var(--text)]'
        }`}
      >
        {t('fr')}
      </Link>
      <span className="text-[var(--border-ui-strong)]" aria-hidden>
        ·
      </span>
      <Link
        href={pathname}
        locale="en"
        className={`rounded-full px-2 py-0.5 transition-colors ${
          locale === 'en' ? 'bg-cyan-100/90 text-cyan-950' : 'hover:text-[var(--text)]'
        }`}
      >
        {t('en')}
      </Link>
    </div>
  );
}
