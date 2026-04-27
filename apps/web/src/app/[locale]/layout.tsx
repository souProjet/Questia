import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR, enUS } from '@clerk/localizations';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { facebookAppId, siteUrl, storeAvailability } from '@/config/marketing';
import { alternatesForLocalePath, canonicalUrlFor, stripLocalePrefix } from '@/lib/seo/alternates';
import { CookieNotice } from '@/components/CookieNotice';
import { AnalyticsClerkTracker } from '@/components/analytics/AnalyticsClerkTracker';
import { AnalyticsPageViewTracker } from '@/components/analytics/AnalyticsPageViewTracker';
import { MarketingScripts } from '@/components/analytics/MarketingScripts';
import { QuestiaPostHogProvider } from '@/components/analytics/QuestiaPostHogProvider';
import { SkipLink } from '@/components/SkipLink';
import { HtmlLang } from '@/components/HtmlLang';
import { AuraOrbsLayer } from '@/components/aura/AuraOrbsLayer';

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
  const stores = storeAvailability();
  const twitterDescriptionKey =
    stores === 'none'
      ? 'twitterDescriptionNoStores'
      : stores === 'android'
        ? 'twitterDescriptionStoresAndroid'
        : stores === 'ios'
          ? 'twitterDescriptionStoresIos'
          : 'twitterDescriptionStoresBoth';

  const h = await headers();
  const pathname = h.get('x-questia-pathname') ?? '/';
  const logical = stripLocalePrefix(pathname);
  const alternates = alternatesForLocalePath(locale, logical);
  const ogUrl = canonicalUrlFor(locale, logical);
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

  return {
    metadataBase: new URL(siteUrl),
    icons: {
      icon: [{ url: '/brand/questia-logo.png', sizes: '512x512', type: 'image/png' }],
      apple: [{ url: '/brand/questia-logo.png', sizes: '512x512' }],
    },
    title: {
      default: t('titleDefault'),
      template: '%s | Questia',
    },
    description: t('description'),
    alternates,
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
    ...(facebookAppId ? { facebook: { appId: facebookAppId } } : {}),
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      type: 'website',
      url: ogUrl,
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: locale === 'en' ? ['fr_FR'] : ['en_US'],
      siteName: 'Questia',
      images: [
        {
          url: '/og/questia-open-graph.png',
          width: 1200,
          height: 630,
          alt: t('ogImageAlt'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('twitterTitle'),
      description: t(twitterDescriptionKey),
      images: ['/og/questia-open-graph.png'],
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
  /** Aligné sur next-intl (`as-needed`) : les `NEXT_PUBLIC_CLERK_*_URL` du .env pointent vers `/sign-in` sans préfixe (FR). */
  const clerkPaths =
    locale === 'en'
      ? {
          signInUrl: '/en/sign-in',
          signUpUrl: '/en/sign-up',
          signInForceRedirectUrl: '/en/app',
          signUpForceRedirectUrl: '/en/app',
        }
      : {
          signInUrl: '/sign-in',
          signUpUrl: '/sign-up',
          signInForceRedirectUrl: '/app',
          signUpForceRedirectUrl: '/app',
        };

  /** Après déconnexion : accueil public — pas `/app` (réservé aux connectés, sinon 404 / boucle selon la config Clerk). */
  const afterSignOutUrl = locale === 'en' ? '/en' : '/';

  return (
    <ClerkProvider localization={clerkLocale} afterSignOutUrl={afterSignOutUrl} {...clerkPaths}>
      <NextIntlClientProvider messages={messages}>
        <QuestiaPostHogProvider>
          <HtmlLang />
          <SkipLink />
          <AuraOrbsLayer />
          {children}
          <CookieNotice />
          <MarketingScripts />
          <Suspense fallback={null}>
            <AnalyticsPageViewTracker />
          </Suspense>
          <AnalyticsClerkTracker />
        </QuestiaPostHogProvider>
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}
