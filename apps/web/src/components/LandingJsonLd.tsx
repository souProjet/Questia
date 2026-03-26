import { siteUrl, appStoreUrl, playStoreUrl, hasAnyStoreLink } from '@/config/marketing';
import { LANDING_FAQ } from '@/data/landing-seo';

export function LandingJsonLd() {
  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: LANDING_FAQ.map((item) => ({
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
    operatingSystem: 'iOS, Android, Web',
    description:
      'Application de quêtes quotidiennes dans la vraie vie : missions courtes personnalisées selon ton profil et ton style de joueur.',
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
      description:
        'Questia transforme ton quotidien en aventure : une quête IRL par jour, personnalisée.',
      inLanguage: 'fr-FR',
      image: `${siteUrl}/brand/questia-logo.png`,
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
