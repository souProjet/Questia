import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

/** Tunnel d'inscription : pas d'indexation pour éviter le contenu dupliqué / fin de funnel. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'OnboardingMetadata' });
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: true },
  };
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
