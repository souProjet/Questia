import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { questDisplayEmoji } from '@questia/shared';
import { prisma } from '@/lib/db';
import { alternatesForLocalePath, canonicalUrlFor } from '@/lib/seo/alternates';

type PageParams = {
  locale: string;
  shareId: string;
};

const sharedQuestSelect = {
  questDate: true,
  generatedEmoji: true,
  generatedTitle: true,
  generatedMission: true,
  generatedHook: true,
  generatedDuration: true,
  status: true,
} as const;

async function loadSharedQuest(shareId: string) {
  return prisma.questLog.findUnique({
    where: { shareId },
    select: sharedQuestSelect,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, shareId } = await params;
  const log = await loadSharedQuest(shareId);
  if (!log || log.status !== 'completed') {
    return { title: 'Questia' };
  }
  const displayEmoji = questDisplayEmoji(log.generatedEmoji);
  const title = `${displayEmoji} ${log.generatedTitle} | Questia`;
  const description =
    log.generatedMission.length > 155
      ? `${log.generatedMission.slice(0, 152)}…`
      : log.generatedMission;
  const path = `/q/${shareId}`;
  return {
    title,
    description,
    alternates: alternatesForLocalePath(locale, path),
    openGraph: {
      title,
      description,
      url: canonicalUrlFor(locale, path),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      siteName: 'Questia',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function SharedQuestPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, shareId } = await params;
  const isEn = locale === 'en';

  const log = await loadSharedQuest(shareId);

  if (!log || log.status !== 'completed') notFound();

  const displayEmoji = questDisplayEmoji(log.generatedEmoji);

  return (
    <main className="min-h-screen bg-adventure px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-xl rounded-3xl border border-orange-200/60 bg-white/95 p-6 shadow-[0_24px_50px_-20px_rgba(15,23,42,0.35)] sm:p-8">
        <p className="mb-2 text-center text-xs font-black uppercase tracking-[0.22em] text-slate-500">
          {isEn ? 'Shared Quest' : 'Quete partagee'}
        </p>
        <h1 className="text-center font-display text-2xl font-black text-slate-900 sm:text-3xl">
          <span className="mr-2 align-[-2px]">{displayEmoji}</span>
          {log.generatedTitle}
        </h1>
        <p className="mt-2 text-center text-sm font-semibold text-slate-500">
          {new Date(`${log.questDate}T12:00:00.000Z`).toLocaleDateString(
            isEn ? 'en-GB' : 'fr-FR',
          )}{' '}
          · {log.generatedDuration}
        </p>

        <section className="mt-6 rounded-2xl border border-cyan-200/65 bg-cyan-50/35 p-4 sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-800">
            {isEn ? 'Mission' : 'Mission'}
          </p>
          <p className="mt-2 font-display text-lg font-black leading-snug text-slate-900 sm:text-xl">
            {log.generatedMission}
          </p>
        </section>

        <blockquote className="mt-5 rounded-2xl border border-orange-200/65 bg-orange-50/55 px-4 py-3 text-sm italic leading-relaxed text-slate-700">
          « {log.generatedHook} »
        </blockquote>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            href={isEn ? '/en/app' : '/app'}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 px-5 py-3 text-sm font-black text-white shadow-[0_12px_30px_-10px_rgba(249,115,22,0.6)]"
          >
            {isEn ? 'Open Questia' : 'Ouvrir Questia'}
          </Link>
          <Link
            href={isEn ? '/en' : '/'}
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            {isEn ? 'Back to website' : 'Retour au site'}
          </Link>
        </div>
      </div>
    </main>
  );
}
