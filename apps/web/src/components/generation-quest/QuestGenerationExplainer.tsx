'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpenCheck,
  CloudSun,
  Dices,
  Gift,
  History,
  Link2,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const ICONS: LucideIcon[] = [
  UserRound,
  History,
  BookOpenCheck,
  Scale,
  TrendingUp,
  CloudSun,
  Target,
  Dices,
  Sparkles,
  ShieldCheck,
  Gift,
];

const ACCENT_STYLES = [
  {
    ring: 'from-cyan-400 to-cyan-600',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-400/40',
    icon: 'text-cyan-700',
    glow: 'shadow-[0_0_40px_-8px_rgba(6,182,212,0.45)]',
  },
  {
    ring: 'from-orange-400 to-orange-600',
    bg: 'bg-orange-500/10',
    border: 'border-orange-400/40',
    icon: 'text-orange-700',
    glow: 'shadow-[0_0_40px_-8px_rgba(249,115,22,0.4)]',
  },
  {
    ring: 'from-violet-400 to-violet-600',
    bg: 'bg-violet-500/10',
    border: 'border-violet-400/35',
    icon: 'text-violet-700',
    glow: 'shadow-[0_0_40px_-8px_rgba(139,92,246,0.4)]',
  },
  {
    ring: 'from-emerald-400 to-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/40',
    icon: 'text-emerald-700',
    glow: 'shadow-[0_0_40px_-8px_rgba(16,185,129,0.4)]',
  },
] as const;

function FlowConnector({ index }: { index: number }) {
  const nextAccent = ACCENT_STYLES[(index + 1) % ACCENT_STYLES.length]!;
  return (
    <div className="relative flex justify-center py-1" aria-hidden>
      <div
        className={`h-14 w-1 rounded-full bg-gradient-to-b ${nextAccent.ring} opacity-80`}
        style={{ minHeight: '2.5rem' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Link2 className="h-4 w-4 text-slate-400" strokeWidth={2.5} />
      </div>
    </div>
  );
}

export type QuestFlowStep = { title: string; body: string };

type Props = { stepsList: QuestFlowStep[] };

export function QuestGenerationExplainer({ stepsList }: Props) {
  const t = useTranslations('QuestGenerationPage');
  const steps = stepsList;
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/90">
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(6,182,212,0.35) 0%, transparent 45%),
              radial-gradient(circle at 80% 10%, rgba(249,115,22,0.28) 0%, transparent 40%),
              radial-gradient(circle at 50% 90%, rgba(139,92,246,0.22) 0%, transparent 45%)`,
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 py-14 sm:py-20">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('kicker')}
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">{t('title')}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{t('lead')}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4 sm:py-6">
        <p className="mb-8 text-sm text-slate-600">
          <Link href="/" className="font-semibold text-orange-600 hover:underline">
            {t('backHome')}
          </Link>
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-24">
        <div
          className="relative rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-sm sm:p-10"
          role="region"
          aria-label={t('diagramAria')}
        >
          <div
            className="pointer-events-none absolute left-8 top-24 bottom-32 hidden w-px bg-gradient-to-b from-cyan-300 via-orange-300 to-violet-300 opacity-60 sm:block md:left-12"
            aria-hidden
          />

          <ol className="relative space-y-0">
            {steps.map((step, i) => {
              const Icon = ICONS[i] ?? UserRound;
              const accent = ACCENT_STYLES[i % ACCENT_STYLES.length]!;
              /** Ne pas partir de opacity:0 + whileInView seul : l’IntersectionObserver peut ne pas tirer au 1er paint (contenu invisible jusqu’à un remount, ex. changement de langue). */
              const itemMotion = reduceMotion
                ? {}
                : {
                    initial: { x: i % 2 === 0 ? -14 : 14 },
                    whileInView: { x: 0 },
                    viewport: { once: true, amount: 0.08, margin: '0px 0px -12% 0px' },
                    transition: { delay: i * 0.03, duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
                  };

              return (
                <li key={`quest-flow-${i}`}>
                  <motion.div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6" {...itemMotion}>
                    <div className="flex shrink-0 items-center gap-3 sm:w-28 sm:flex-col sm:items-center md:w-32">
                      <div
                        className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 ${accent.border} ${accent.bg} ${accent.glow}`}
                      >
                        <span
                          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accent.ring} opacity-15`}
                          aria-hidden
                        />
                        <Icon className={`relative h-7 w-7 ${accent.icon}`} strokeWidth={2.25} aria-hidden />
                      </div>
                      <span className="font-display text-xs font-black tabular-nums text-slate-400 sm:text-center">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-5 sm:py-5">
                      <h2 className="font-display text-lg font-black text-slate-900 sm:text-xl">{step.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">{step.body}</p>
                    </div>
                  </motion.div>
                  {i < steps.length - 1 ? <FlowConnector index={i} /> : null}
                </li>
              );
            })}
          </ol>
          {steps.length === 0 ? (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {t('stepsLoadError')}
            </p>
          ) : null}
        </div>

        <div className="mt-12 rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/90 to-amber-50/50 p-6 sm:p-8">
          <h2 className="font-display text-lg font-black text-slate-900">{t('noteTitle')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-[15px]">{t('noteBody')}</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-[15px]">{t('privacyNote')}</p>
          <p className="mt-4 text-sm">
            <Link href="/legal/confidentialite" className="font-bold text-orange-700 hover:underline">
              {t('privacyLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
