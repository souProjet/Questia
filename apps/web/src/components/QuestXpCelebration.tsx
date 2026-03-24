'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { levelFromTotalXp } from '@questia/shared';
import type { DisplayBadge, XpBreakdown } from '@questia/shared';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  xpGain: {
    gained: number;
    breakdown: XpBreakdown;
    newTotal: number;
    previousTotal: number;
  };
  badgesUnlocked: DisplayBadge[];
  onContinue: () => void;
};

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

function confettiParticle(i: number) {
  const s = (n: number) => {
    const x = Math.sin(n * 12.9898 + i * 3.1415) * 43758.5453;
    return x - Math.floor(x);
  };
  const dx = (s(1) - 0.5) * 260;
  const dy = 160 + s(2) * 140;
  const spin = 400 + s(3) * 500;
  const delay = `${s(4) * 0.35}s`;
  const dur = `${1.75 + s(5) * 0.45}s`;
  const hue = Math.floor(s(6) * 360);
  const ox = (s(7) - 0.5) * 40;
  const oy = (s(8) - 0.5) * 28;
  const w = 5 + (i % 4);
  const h = 7 + (i % 3);
  return { dx, dy, spin, delay, dur, hue, ox, oy, w, h, id: i };
}

export function QuestXpCelebration({
  open,
  onOpenChange,
  xpGain,
  badgesUnlocked,
  onContinue,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();

  const levelInfo = useMemo(() => {
    const before = levelFromTotalXp(xpGain.previousTotal);
    const after = levelFromTotalXp(xpGain.newTotal);
    return {
      beforeLevel: before.level,
      afterLevel: after.level,
      leveledUp: after.level > before.level,
      levelsGained: Math.max(0, after.level - before.level),
    };
  }, [xpGain.newTotal, xpGain.previousTotal]);

  const particles = useMemo(() => Array.from({ length: reducedMotion ? 0 : 40 }, (_, i) => confettiParticle(i)), [reducedMotion]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-safe:animate-fadeIn motion-reduce:animate-none"
        aria-label="Fermer"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-orange-300/40 bg-gradient-to-br from-amber-50 via-white to-cyan-50 shadow-[0_24px_80px_-12px_rgba(249,115,22,.35)] motion-safe:animate-fade-up-slow motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="xp-celebration-title"
      >
        {/* Fond animé léger */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45] motion-safe:animate-celebrate-shimmer motion-reduce:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(34,211,238,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(249,115,22,0.18), transparent 50%)',
          }}
        />

        {/* Confettis */}
        {!reducedMotion && particles.length > 0 ? (
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl motion-reduce:hidden"
            aria-hidden
          >
            {particles.map((p) => (
              <span
                key={p.id}
                className="absolute left-1/2 top-[38%] rounded-[2px] motion-safe:animate-celebrate-confetti"
                style={{
                  width: p.w,
                  height: p.h,
                  marginLeft: p.ox,
                  marginTop: p.oy,
                  backgroundColor: `hsl(${p.hue} 82% 52%)`,
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.35)',
                  ['--dx' as string]: `${p.dx}px`,
                  ['--dy' as string]: `${p.dy}px`,
                  ['--spin' as string]: `${p.spin}deg`,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              />
            ))}
          </div>
        ) : null}

        <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-amber-400 to-orange-500 relative z-[1]" />

        <div className="relative z-[1] p-7">
          <p
            id="xp-celebration-title"
            className="text-center text-xs font-black uppercase tracking-[0.2em] text-cyan-900 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:60ms] [animation-fill-mode:backwards]"
          >
            ✨ Quête validée
          </p>

          {levelInfo.leveledUp ? (
            <div
              className="relative mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-100/90 via-white to-cyan-50/90 px-4 py-4 text-center shadow-[0_8px_30px_-8px_rgba(251,191,36,0.45)] motion-safe:animate-level-banner-in motion-reduce:animate-none [animation-delay:90ms] [animation-fill-mode:backwards]"
            >
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-800">Niveau atteint</span>
              <p className="mt-1 font-display text-4xl font-black tabular-nums tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-amber-500 to-orange-600 drop-shadow-sm motion-safe:animate-xp-number-pop motion-reduce:animate-none [animation-delay:180ms] [animation-fill-mode:backwards]">
                {levelInfo.afterLevel}
              </p>
              {levelInfo.levelsGained > 1 ? (
                <p className="mt-1 text-xs font-bold text-amber-900/90">
                  +{levelInfo.levelsGained} niveaux d’un coup !
                </p>
              ) : (
                <p className="mt-1 text-xs font-bold text-[var(--on-cream-muted)]">Palier de progression débloqué</p>
              )}
              <span
                className="pointer-events-none absolute -right-1 -top-1 h-14 w-14 rounded-full bg-amber-300/30 blur-xl motion-safe:animate-pulse motion-reduce:hidden"
                aria-hidden
              />
            </div>
          ) : null}

          <p
            className={`text-center font-display text-4xl font-black text-slate-900 motion-safe:animate-xp-number-pop motion-reduce:animate-none tabular-nums ${
              levelInfo.leveledUp ? 'mt-4' : 'mt-3'
            } [animation-delay:120ms] [animation-fill-mode:backwards]`}
          >
            +{xpGain.gained} XP
          </p>
          <p className="mt-2 text-center text-sm font-semibold text-[var(--on-cream-muted)]">
            Total {xpGain.previousTotal} →{' '}
            <span className="font-black text-cyan-900">{xpGain.newTotal}</span>
          </p>

          <div className="mt-5 rounded-2xl border border-cyan-200/70 bg-white/90 p-4 text-xs font-semibold text-[var(--on-cream-muted)] space-y-1 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:200ms] [animation-fill-mode:backwards]">
            <p className="font-black uppercase tracking-wider text-cyan-900">Détail</p>
            <p>
              Base {xpGain.breakdown.basePhase} · {xpGain.breakdown.baseAfterArchetype} XP
            </p>
            <p>
              Série · +{xpGain.breakdown.streakBonus} (×{xpGain.breakdown.streakDays} j.)
            </p>
            {xpGain.breakdown.outdoorBonus > 0 ? (
              <p>Extérieur · +{xpGain.breakdown.outdoorBonus}</p>
            ) : null}
            {xpGain.breakdown.fallbackPenalty > 0 ? (
              <p className="text-[var(--on-cream-subtle)]">Repli météo · −{xpGain.breakdown.fallbackPenalty}</p>
            ) : null}
            {xpGain.breakdown.afterReroll ? (
              <p className="text-[var(--on-cream-subtle)]">Après relance · ×0,75 sur le sous-total</p>
            ) : null}
            {xpGain.breakdown.shopBonusXp != null && xpGain.breakdown.shopBonusXp > 0 ? (
              <p className="text-emerald-800 font-black">
                Bonus boutique · +{xpGain.breakdown.shopBonusXp} XP
              </p>
            ) : null}
          </div>

          {badgesUnlocked.length > 0 ? (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-orange-600 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:240ms] [animation-fill-mode:backwards]">
                Nouveaux badges
              </p>
              <ul className="space-y-2">
                {badgesUnlocked.map((b, i) => (
                  <li
                    key={b.id}
                    className="flex gap-3 rounded-2xl border border-orange-200/60 bg-gradient-to-r from-cyan-50/50 to-amber-50/50 p-3 shadow-sm motion-safe:animate-badge-reveal motion-reduce:opacity-100"
                    style={{
                      animationDelay: reducedMotion ? '0ms' : `${280 + i * 95}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <span
                      className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-cyan-100 text-2xl shadow-inner ring-2 ring-amber-300/50 ring-offset-2 ring-offset-white/90 motion-safe:animate-xp-number-pop motion-reduce:animate-none"
                      style={{ animationDelay: reducedMotion ? '0ms' : `${300 + i * 95}ms` }}
                      aria-hidden
                    >
                      {b.placeholderEmoji}
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-[var(--on-cream)]">{b.title}</p>
                      <p className="text-xs font-medium text-[var(--on-cream-muted)]">{b.criteria}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            className="btn btn-cta btn-lg mt-6 w-full text-base font-black motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:420ms] [animation-fill-mode:backwards]"
            onClick={() => {
              onContinue();
              onOpenChange(false);
            }}
          >
            Continuer →
          </button>
        </div>
      </div>
    </div>
  );
}
