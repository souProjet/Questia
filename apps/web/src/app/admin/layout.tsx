import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { isAdminClerkId } from '@/lib/auth/admin';
import { Navbar } from '@/components/Navbar';
import { AdminSubnav } from './AdminSubnav';

export const metadata: Metadata = {
  title: 'Console',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const ok = await isAdminClerkId(userId);
  if (!ok) redirect('/app');

  return (
    <div className="min-h-screen bg-adventure">
      <Navbar />
      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-24">
        <header className="relative mb-8 overflow-hidden rounded-[1.75rem] border-2 border-orange-300/45 bg-gradient-to-br from-[#fffbeb] via-white/95 to-cyan-50/40 px-5 py-5 shadow-[0_10px_0_rgba(180,83,9,.1),0_22px_48px_rgba(249,115,22,.12)] motion-safe:animate-fade-up-slow motion-reduce:animate-none sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-200/40 to-orange-200/30 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted)]">Administration</p>
              <h1 className="font-display mt-1 text-2xl font-black tracking-tight text-gradient-pop md:text-3xl">
                Console Questia
              </h1>
              <p className="mt-2 max-w-xl text-sm font-semibold text-[var(--on-cream-muted)]">
                Métriques utiles et outils de test.
              </p>
            </div>
            <div className="flex shrink-0 sm:pt-1">
              <Link
                href="/app"
                className="btn btn-cta btn-md w-full font-black sm:w-auto"
              >
                ← Retour à l&apos;app
              </Link>
            </div>
          </div>
        </header>
        <AdminSubnav />
        {children}
      </div>
    </div>
  );
}
