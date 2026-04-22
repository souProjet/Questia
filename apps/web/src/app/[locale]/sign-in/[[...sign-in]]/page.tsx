import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/Icons';
import { AuthQuestShell } from '@/components/AuthQuestShell';
import { clerkAuthAppearance } from '@/lib/clerk-auth-appearance';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'AuthSignIn' });
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
    robots: { index: false, follow: true },
  };
}

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('AuthSignIn');
  const appHome = locale === 'en' ? '/en/app' : '/app';

  return (
    <AuthQuestShell
      badge={
        <>
          <Icon name="Compass" size="sm" className="inline-block shrink-0 text-cyan-800/90" aria-hidden /> {t('badge')}
        </>
      }
      title={t('title')}
      subtitle={t('subtitle')}
      footer={
        <p className="text-center text-sm text-slate-500">
          {t('footerPrompt')}{' '}
          <Link
            href="/sign-up"
            className="font-bold text-cyan-700 hover:text-orange-600 underline decoration-cyan-300/50 underline-offset-[0.2em] transition-colors duration-200"
          >
            {t('footerLink')}
          </Link>
        </p>
      }
    >
      <SignIn appearance={clerkAuthAppearance} forceRedirectUrl={appHome} />
    </AuthQuestShell>
  );
}
