import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR, enUS } from '@clerk/localizations';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/config/marketing';
import { CookieNotice } from '@/components/CookieNotice';
import { MarketingScripts } from '@/components/analytics/MarketingScripts';
import { SkipLink } from '@/components/SkipLink';
import { HtmlLang } from '@/components/HtmlLang';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'RootLayout' });

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t('titleDefault'),
      template: '%s | Questia',
    },
    description: t('description'),
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      siteName: 'Questia',
      images: [{ url: '/brand/questia-logo.png', width: 512, height: 512, alt: 'Questia' }],
    },
    twitter: {
      card: 'summary',
      title: t('twitterTitle'),
      description: t('twitterDescription'),
      images: ['/brand/questia-logo.png'],
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const clerkLocale = locale === 'fr' ? frFR : enUS;

  return (
    <ClerkProvider localization={clerkLocale}>
      <NextIntlClientProvider messages={messages}>
        <HtmlLang />
        <SkipLink />
        {children}
        <CookieNotice />
        <MarketingScripts />
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}
