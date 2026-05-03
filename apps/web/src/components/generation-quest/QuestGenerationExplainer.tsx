'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpenCheck,
  ChevronRight,
  CloudSun,
  Dices,
  Gift,
  History,
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

/** Répartition des étapes en trois « étages » du pipeline (schéma). */
function flowPhase(stepIndex: number, total: number): 0 | 1 | 2 {
  if (total <= 0) return 0;
  const third = total / 3;
  if (stepIndex < third) return 0;
  if (stepIndex < 2 * third) return 1;
  return 2;
}

const PHASE_VISUAL = [
  {
    node: 'bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-[0_8px_28px_-6px_rgba(13,148,136,0.55)]',
    ring: 'ring-teal-400/50',
    cardAccent: 'border-l-teal-500',
    chip: 'border-teal-300/70 bg-teal-100/80 text-teal-950',
    armHex: '#0d9488',
  },
  {
    node: 'bg-gradient-to-br from-orange-500 to-amber-700 text-white shadow-[0_8px_28px_-6px_rgba(234,88,12,0.5)]',
    ring: 'ring-orange-400/55',
    cardAccent: 'border-l-orange-500',
    chip: 'border-orange-300/70 bg-orange-100/85 text-orange-950',
    armHex: '#ea580c',
  },
  {
    node: 'bg-gradient-to-br from-violet-600 to-violet-900 text-white shadow-[0_8px_28px_-6px_rgba(109,40,217,0.5)]',
    ring: 'ring-violet-400/45',
    cardAccent: 'border-l-violet-600',
    chip: 'border-violet-300/75 bg-violet-100/85 text-violet-950',
    armHex: '#7c3aed',
  },
] as const;

function QuestPipelineMini({
  className,
  labels,
}: {
  className?: string;
  labels: { profile: string; engine: string; quest: string };
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 440 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="qpm-flow" x1="0" y1="0" x2="440" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(13 148 136)" stopOpacity="0.25" />
          <stop offset="0.45" stopColor="rgb(234 88 12)" stopOpacity="0.2" />
          <stop offset="1" stopColor="rgb(109 40 217)" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="120"
        height="48"
        rx="12"
        className="stroke-stone-400/55"
        strokeWidth="1.5"
        fill="white"
        fillOpacity="0.65"
      />
      <text
        x="61"
        y="30"
        textAnchor="middle"
        className="fill-stone-700"
        style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'system-ui, sans-serif' }}
      >
        {labels.profile}
      </text>
      <path d="M 128 25 L 152 25" stroke="url(#qpm-flow)" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="154,25 148,21 148,29" fill="rgb(120 113 108)" />
      <rect
        x="158"
        y="1"
        width="136"
        height="48"
        rx="12"
        className="stroke-stone-400/55"
        strokeWidth="1.5"
        fill="white"
        fillOpacity="0.65"
      />
      <text
        x="226"
        y="30"
        textAnchor="middle"
        className="fill-stone-700"
        style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'system-ui, sans-serif' }}
      >
        {labels.engine}
      </text>
      <path d="M 298 25 L 322 25" stroke="url(#qpm-flow)" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="324,25 318,21 318,29" fill="rgb(120 113 108)" />
      <rect
        x="330"
        y="1"
        width="109"
        height="48"
        rx="12"
        className="stroke-stone-400/55"
        strokeWidth="1.5"
        fill="white"
        fillOpacity="0.65"
      />
      <text
        x="384"
        y="30"
        textAnchor="middle"
        className="fill-stone-700"
        style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'system-ui, sans-serif' }}
      >
        {labels.quest}
      </text>
    </svg>
  );
}

export type QuestFlowStep = { title: string; body: string };

type Props = { stepsList: QuestFlowStep[] };

export function QuestGenerationExplainer({ stepsList }: Props) {
  const t = useTranslations('QuestGenerationPage');
  const steps = stepsList;
  const reduceMotion = useReducedMotion();
  const phaseLabels = [t('flowPhaseMemory'), t('flowPhaseIntent'), t('flowPhaseDelivery')] as const;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative z-10 min-h-screen overflow-x-hidden bg-adventure outline-none"
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="landing-hero-ambient-glow absolute -top-28 left-1/2 h-[min(38vh,24rem)] w-[min(100rem,200%)] max-w-none -translate-x-1/2 rounded-[100%] opacity-45 motion-safe:animate-glow-soft motion-reduce:animate-none motion-reduce:opacity-30"
          aria-hidden
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-8 pb-6 sm:px-5 sm:pt-12 sm:pb-8">
        <div className="landing-hero-panel p-6 sm:p-8 md:p-10">
          <p className="label mb-4 flex items-center gap-2 text-stone-600">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-700/80" aria-hidden />
            {t('kicker')}
          </p>
          <h1 className="font-display text-[clamp(1.65rem,2.5vw+0.85rem,2.75rem)] font-black leading-tight tracking-tight text-[var(--on-cream)] text-balance sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--on-cream-muted)] sm:text-lg">
            {t('lead')}
          </p>

          <p className="mt-4 border-t border-orange-200/40 text-sm">
            <Link
              href="/"
              className="font-semibold text-cyan-900/90 underline-offset-4 transition-colors hover:text-cyan-950 hover:underline"
            >
              {t('backHome')}
            </Link>
          </p>
        </div>
      </div>

      <div
        className="relative mx-auto max-w-5xl px-4 pb-10 sm:px-5 sm:pb-14"
        role="region"
        aria-label={t('diagramAria')}
      >
        <div className="mb-10 flex flex-col items-stretch gap-3 rounded-2xl border border-stone-200/85 bg-[color-mix(in_srgb,var(--card)_55%,transparent)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-sm sm:px-6">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
            {t('schematicPipeline')}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-1 md:gap-2">
            {phaseLabels.map((label, i) => {
              const pv = PHASE_VISUAL[i]!;
              return (
                <div key={`phase-${i}`} className="flex items-center gap-1 sm:gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm sm:text-[13px] ${pv.chip}`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: pv.armHex }}
                      aria-hidden
                    />
                    {label}
                  </span>
                  {i < 2 ? (
                    <ChevronRight
                      className="hidden h-5 w-5 shrink-0 text-stone-400 sm:block"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {steps.length === 0 ? (
          <p className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3.5 text-sm text-amber-950 shadow-sm">
            {t('stepsLoadError')}
          </p>
        ) : (
          <ol className="relative list-none space-y-10 md:space-y-6">
            <div
              className="absolute top-4 bottom-4 left-10 w-1 rounded-full bg-gradient-to-b from-teal-400/40 via-orange-400/45 to-violet-500/40 md:hidden"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute top-6 bottom-6 left-1/2 hidden w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-teal-400/30 via-orange-400/35 to-violet-500/35 md:block"
              aria-hidden
            />

            {steps.map((step, i) => {
              const Icon = ICONS[i] ?? UserRound;
              const phase = flowPhase(i, steps.length);
              const pv = PHASE_VISUAL[phase]!;
              const itemMotion = reduceMotion
                ? {}
                : {
                    initial: { y: 14, opacity: 0.9 },
                    whileInView: { y: 0, opacity: 1 },
                    viewport: { once: true, amount: 0.08, margin: '0px 0px -10% 0px' },
                    transition: { delay: i * 0.035, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
                  };

              const node = (
                <div
                  className={`relative z-[1] flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md ring-4 ring-white/90 sm:h-14 sm:w-14 ${pv.ring} ${pv.node}`}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.1} aria-hidden />
                </div>
              );

              const card = (
                <article
                  className={`landing-glass-card relative max-w-lg rounded-2xl border border-stone-200/80 border-l-[3px] p-5 pl-[1.15rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] sm:rounded-[1.35rem] sm:p-6 ${pv.cardAccent}`}
                >
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <span
                      className={`rounded-md border px-2 py-0.5 font-display text-[10px] font-black tabular-nums tracking-wider uppercase sm:text-[11px] ${pv.chip}`}
                    >
                      {phaseLabels[phase]}
                    </span>
                    <span className="font-display text-xs font-black tabular-nums text-stone-400">
                      #{String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-lg font-bold leading-snug text-[var(--text)] sm:text-xl">{step.title}</h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-stone-600 sm:text-[15px]">{step.body}</p>
                </article>
              );

              const isRight = i % 2 === 0;

              return (
                <motion.li
                  key={`quest-flow-${i}`}
                  className="relative grid grid-cols-1 items-center gap-5 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-x-3 md:gap-y-0"
                  {...itemMotion}
                >
                  <div className="flex gap-4 md:hidden">
                    <div className="relative flex w-12 shrink-0 justify-center pt-0.5">{node}</div>
                    <div className="min-w-0 flex-1">{card}</div>
                  </div>

                  <div className="hidden md:contents">
                    {isRight ? (
                      <>
                        <div className="min-h-px" aria-hidden />
                        <div className="relative flex justify-center py-1">{node}</div>
                        <div className="flex justify-start pl-2">
                          <div className="relative w-full max-w-lg">
                            <div
                              className="absolute top-1/2 right-full mr-2 hidden h-1 w-10 -translate-y-1/2 rounded-full md:block"
                              style={{ backgroundColor: `${pv.armHex}99` }}
                              aria-hidden
                            />
                            {card}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-end pr-2">
                          <div className="relative w-full max-w-lg">
                            <div
                              className="absolute top-1/2 left-full ml-2 hidden h-1 w-10 -translate-y-1/2 rounded-full md:block"
                              style={{ backgroundColor: `${pv.armHex}99` }}
                              aria-hidden
                            />
                            {card}
                          </div>
                        </div>
                        <div className="relative flex justify-center py-1">{node}</div>
                        <div className="min-h-px" aria-hidden />
                      </>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-16 sm:px-5 sm:pb-24">
        <div className="landing-cta-panel p-6 sm:p-8 md:p-9">
          <h2 className="font-display text-lg font-black text-[var(--text)] sm:text-xl">{t('noteTitle')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-[15px]">{t('noteBody')}</p>
          <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-[15px]">{t('privacyNote')}</p>
          <p className="mt-5 text-sm">
            <Link
              href="/legal/confidentialite"
              className="font-bold text-orange-800 underline-offset-4 hover:text-orange-950 hover:underline"
            >
              {t('privacyLink')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
