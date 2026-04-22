import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

/** Espace connecté : pas d'indexation (déjà exclu par robots.txt, renforcé ici). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppShellLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  const { locale } = await params;
  const prefix = locale === 'en' ? '/en' : '';
  if (!userId) {
    redirect(`${prefix}/sign-in`);
  }

  return children;
}
