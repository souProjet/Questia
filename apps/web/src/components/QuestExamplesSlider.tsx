'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

export type ExampleQuestSlide = {
  title: string;
  /** Libellé court (style de quête, durée, ambiance) — pas de lieu météo dans le marketing. */
  contextLabel: string;
  mission: string;
  duration: string;
  outdoor: boolean;
  emoji: string;
};

type Props = {
  quests: ExampleQuestSlide[];
  variant?: 'default' | 'embedded';
  /** Avec variant embedded : le slider est dans un panneau (ex. hero landing) — chrome plus léger, pas de double cadre */
  nestedInPanel?: boolean;
};

export function QuestExamplesSlider({ quests, variant = 'default', nestedInPanel = false }: Props) {
  const [i, setI] = useState(0);
  const n = quests.length;

  const prev = useCallback(() => setI((x) => (x - 1 + n) % n), [n]);
  const next = useCallback(() => setI((x) => (x + 1) % n), [n]);

  useEffect(() => {
    const t = window.setInterval(next, 6500);
    return () => window.clearInterval(t);
  }, [next]);

  const embedded = variant === 'embedded';
  const inLandingPanel = embedded && nestedInPanel;
  const embeddedChrome = embedded && !nestedInPanel;
  const iconSize = embedded ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={embedded ? 'relative w-full' : 'relative max-w-lg mx-auto'}>
      {!embedded && (
        <div
          className="absolute -inset-1 rounded-[28px] opacity-80 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(251,191,36,.35), rgba(34,211,238,.25), rgba(16,185,129,.2), rgba(249,115,22,.22))',
            filter: 'blur(12px)',
          }}
          aria-hidden
        />
      )}
        <div
          className={
            inLandingPanel
              ? 'quest-slider-landing relative overflow-hidden'
              : embeddedChrome
                ? 'quest-slider-embedded relative overflow-hidden ring-1 ring-orange-400/25'
                : 'relative overflow-hidden rounded-3xl border-2 border-amber-400/80 bg-gradient-to-br from-[#fffbeb] via-[#fff8e8] to-[#ecfeff] shadow-[0_8px_0_rgba(180,83,9,.18),0_20px_50px_rgba(249,115,22,.2)]'
          }
        >
        <div
          className={
            inLandingPanel
              ? 'absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg bg-white/75 shadow-sm px-2.5 py-0.5 text-[11px] font-bold text-orange-900 border border-orange-200/55'
              : embedded
                ? 'absolute top-3 right-3 z-10 flex items-center gap-1 rounded-xl bg-white/80 shadow-md px-3 py-1 text-xs font-bold text-orange-900 border border-orange-200/70'
                : 'absolute top-5 right-5 z-10 flex items-center gap-2 rounded-xl bg-white/85 shadow-md px-3.5 py-1.5 text-sm font-bold text-orange-900 border-2 border-orange-300/70'
          }
          aria-hidden
        >
          <svg
            className={
              inLandingPanel ? 'h-3 w-3 text-orange-400' : embedded ? 'h-3.5 w-3.5 text-orange-400' : 'h-4 w-4 text-orange-500'
            }
            fill="none"
            stroke="currentColor"
            strokeWidth={2.1}
            viewBox="0 0 20 20"
            aria-hidden
          >
            <circle cx="10" cy="10" r="8.5" stroke="currentColor" />
            <path
              d="M10 5v5l3 2"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="tabular-nums">{i + 1}</span>
          <span
            className={
              inLandingPanel ? 'text-orange-300/70 px-0.5' : embedded ? 'text-orange-300/80 px-0.5' : 'text-orange-400/80 px-0.5'
            }
          >
            /
          </span>
          <span className="tabular-nums">{n}</span>
        </div>

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translate3d(-${i * 100}%, 0, 0)` }}
          >
            {quests.map((q, idx) => (
              <div
                key={idx}
                className={
                  inLandingPanel
                    ? 'w-full min-w-full shrink-0 px-3.5 pt-10 pb-4 sm:px-4 sm:pt-10 md:px-5 md:pt-10 sm:pb-4'
                    : embedded
                      ? 'w-full min-w-full shrink-0 px-4 pt-11 pb-5 sm:px-5 sm:pt-11 md:px-6 md:pt-12 sm:pb-5'
                      : 'w-full min-w-full shrink-0 px-6 pt-12 pb-6'
                }
              >
                <div className={`flex items-start gap-3 ${embedded ? 'mb-3.5' : 'mb-5'}`}>
                  <span
                    className={
                      inLandingPanel ? 'text-[1.65rem] leading-none select-none' : embedded ? 'text-3xl leading-none select-none' : 'text-4xl leading-none select-none'
                    }
                    aria-hidden
                  >
                    {q.emoji}
                  </span>
                  <div className="min-w-0 flex-1 pr-11">
                    <h3
                      className={
                        inLandingPanel
                          ? 'font-display font-black text-[1.02rem] sm:text-[1.07rem] text-[var(--on-cream)] mb-1.5 leading-snug'
                          : embedded
                            ? 'font-display font-black text-[1.07rem] sm:text-lg text-slate-900 mb-1.5 leading-snug'
                            : 'font-display font-black text-xl text-slate-900 mb-2 leading-tight'
                      }
                    >
                      {q.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span
                        className={
                          inLandingPanel
                            ? 'rounded-full border border-cyan-400/40 bg-white/65 px-2 py-0.5 font-bold text-[var(--on-cream-muted)] shadow-sm'
                            : 'rounded-full border border-cyan-400/45 bg-white/75 px-2.5 py-0.5 font-bold text-slate-800 shadow-sm'
                        }
                      >
                        {q.contextLabel}
                      </span>
                      {q.outdoor && (
                        <span className="rounded-full border border-emerald-400/35 bg-emerald-100/80 px-2 py-0.5 font-bold text-emerald-900">
                          Extérieur
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p
                  className={
                    inLandingPanel
                      ? 'mb-3 rounded-r-md border-l-[3px] border-cyan-500/90 bg-white/45 py-2 pl-3 text-[14px] sm:text-[0.92rem] font-medium leading-relaxed text-[var(--on-cream-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,.5)]'
                      : embedded
                        ? 'mb-3.5 rounded-r-lg border-l-4 border-cyan-500 bg-white/55 py-2.5 pl-3.5 text-[15px] sm:text-[0.95rem] font-medium leading-relaxed text-slate-800 shadow-inner'
                        : 'mb-5 rounded-r-lg border-l-4 border-cyan-500 bg-white/50 py-2 pl-4 text-[15px] font-medium leading-relaxed text-slate-800'
                  }
                >
                  {q.mission}
                </p>
                <div
                  className={
                    inLandingPanel
                      ? 'inline-flex items-center gap-1.5 rounded-full border border-orange-300/55 bg-orange-100/80 px-2.5 py-0.5 text-[10px] font-black text-orange-900'
                      : embedded
                        ? 'inline-flex items-center gap-1.5 rounded-full border border-orange-300/70 bg-orange-100/95 px-2.5 py-1 text-[11px] font-black text-orange-900'
                        : 'inline-flex items-center gap-1.5 rounded-lg border border-orange-300/60 bg-orange-100/90 px-3 py-1.5 text-xs font-black text-orange-900'
                  }
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-orange-700" aria-hidden strokeWidth={2.5} />
                  {q.duration}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={
            inLandingPanel
              ? 'flex items-center justify-between gap-2 border-t border-orange-200/45 bg-gradient-to-r from-white/40 via-amber-50/35 to-cyan-50/30 px-3 py-3 sm:px-3.5'
              : embedded
                ? 'flex items-center justify-between gap-3 border-t-2 border-orange-300/35 bg-gradient-to-r from-white/75 via-amber-50/50 to-cyan-50/40 px-3.5 py-3.5 sm:px-4'
                : 'flex items-center justify-between gap-4 border-t border-slate-900/10 bg-white/65 px-5 py-4'
          }
        >
          <button
            type="button"
            onClick={prev}
            className={
              inLandingPanel
                ? 'inline-flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-orange-300/45 bg-white/85 text-orange-800 shadow-sm transition-colors hover:border-cyan-400/55 hover:bg-cyan-50/80 hover:text-cyan-900 touch-manipulation active:scale-[0.98]'
                : embedded
                  ? 'inline-flex h-11 w-11 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border-2 border-orange-300/50 bg-white/90 text-orange-800 shadow-sm transition-colors hover:border-cyan-400/60 hover:bg-cyan-50 hover:text-cyan-900 touch-manipulation active:scale-[0.98]'
                  : 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900/12 bg-white/80 text-slate-800 transition-colors hover:border-cyan-400/50 hover:bg-cyan-50'
            }
            aria-label="Quête précédente"
          >
            <ChevronLeft className={iconSize} strokeWidth={2.25} aria-hidden />
          </button>
          <div className={embedded ? 'flex gap-1.5' : 'flex gap-2'}>
            {quests.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === i
                    ? inLandingPanel
                      ? 'w-5 bg-gradient-to-r from-orange-500 to-amber-400 shadow-sm'
                      : embedded
                        ? 'w-6 bg-gradient-to-r from-orange-500 to-amber-400 shadow-sm'
                        : 'w-7 bg-orange-500'
                    : 'w-2 bg-orange-200/90 hover:bg-orange-300'
                }`}
                aria-label={`Carte ${idx + 1} sur ${n}`}
                aria-current={idx === i}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className={
              inLandingPanel
                ? 'inline-flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-orange-300/45 bg-white/85 text-orange-800 shadow-sm transition-colors hover:border-cyan-400/55 hover:bg-cyan-50/80 hover:text-cyan-900 touch-manipulation active:scale-[0.98]'
                : embedded
                  ? 'inline-flex h-11 w-11 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border-2 border-orange-300/50 bg-white/90 text-orange-800 shadow-sm transition-colors hover:border-cyan-400/60 hover:bg-cyan-50 hover:text-cyan-900 touch-manipulation active:scale-[0.98]'
                  : 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900/12 bg-white/80 text-slate-800 transition-colors hover:border-cyan-400/50 hover:bg-cyan-50'
            }
            aria-label="Quête suivante"
          >
            <ChevronRight className={iconSize} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>

      {!embedded && (
        <p className="mt-6 px-2 text-center text-sm font-medium text-slate-600">
          Trois missions d'exemple — utilise les contrôles pour défiler.
        </p>
      )}
    </div>
  );
}
