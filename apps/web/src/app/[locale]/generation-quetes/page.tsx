import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { QuestGenerationExplainer } from '@/components/generation-quest/QuestGenerationExplainer';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'QuestGenerationPage' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: true, follow: true },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
    },
  };
}

export default async function GenerationQuetesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <QuestGenerationExplainer />;
}
