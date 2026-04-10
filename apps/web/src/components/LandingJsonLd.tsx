import { getTranslations } from 'next-intl/server';
import {
  siteUrl,
  appStoreUrl,
  playStoreUrl,
  hasAnyStoreLink,
  softwareApplicationOperatingSystemLabel,
} from '@/config/marketing';

/** Locale explicite : évite `getLocale()` côté serveur (ordre RSC / navigation client). */
export async function LandingJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'HomePage' });
  const faqItems = t.raw('faqItems') as { question: string; answer: string }[];

  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const appSchema: Record<string, unknown> = {
    '@type': 'SoftwareApplication',
    name: 'Questia',
    image: `${siteUrl}/brand/questia-logo.png`,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: softwareApplicationOperatingSystemLabel(),
    description: t('jsonLd.appDescription'),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    url: siteUrl,
  };

  if (hasAnyStoreLink()) {
    if (appStoreUrl) appSchema.downloadUrl = appStoreUrl;
    if (playStoreUrl) {
      appSchema.installUrl = playStoreUrl;
    }
  }

  const graph = [
    {
      '@type': 'WebSite',
      name: 'Questia',
      url: siteUrl,
      description: t('jsonLd.webDescription'),
      inLanguage: locale === 'en' ? 'en-US' : 'fr-FR',
      image: `${siteUrl}/og/questia-open-graph.png`,
    },
    {
      '@type': 'Organization',
      name: 'Questia',
      url: siteUrl,
      logo: `${siteUrl}/brand/questia-logo.png`,
    },
    appSchema,
    faqSchema,
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': graph,
        }),
      }}
    />
  );
}
