'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import {
  levelFromTotalXp,
  XP_PER_LEVEL,
  xpBarSegmentsFromTotals,
  xpBreakdownRowsFr,
  type DisplayBadge,
  type XpBreakdown,
} from '@questia/shared';

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

function confettiParticle(i: number, origin: 'center' | 'high' = 'center') {
  const s = (n: number) => {
    const x = Math.sin(n * 12.9898 + i * 3.1415) * 43758.5453;
    return x - Math.floor(x);
  };
  const dx = (s(1) - 0.5) * 300;
  const dy = (origin === 'high' ? 120 : 180) + s(2) * 200;
  const spin = 520 + s(3) * 620;
  const delay = `${s(4) * 0.42}s`;
  const dur = `${1.95 + s(5) * 0.55}s`;
  const hue = Math.floor(s(6) * 360);
  const ox = (s(7) - 0.5) * 52;
  const oy = (s(8) - 0.5) * 36;
  const w = 5 + (i % 5);
  const h = 7 + (i % 4);
  return { dx, dy, spin, delay, dur, hue, ox, oy, w, h, id: i, origin };
}

export function QuestXpCelebration({
  open,
  onOpenChange,
  xpGain,
  badgesUnlocked,
  onContinue,
}: Props) {
  const t = useTranslations('AppQuest');
  const reducedMotion = usePrefersReducedMotion();
  const breakdownRows = useMemo(() => xpBreakdownRowsFr(xpGain.breakdown), [xpGain.breakdown]);

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

  const [barLevel, setBarLevel] = useState(() => levelFromTotalXp(xpGain.previousTotal).level);
  const [barPct, setBarPct] = useState(
    () => (levelFromTotalXp(xpGain.previousTotal).xpIntoLevel / XP_PER_LEVEL) * 100,
  );
  const [barInstant, setBarInstant] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = levelFromTotalXp(xpGain.previousTotal);
    const end = levelFromTotalXp(xpGain.newTotal);
    const segments = xpBarSegmentsFromTotals(xpGain.previousTotal, xpGain.newTotal);

    if (reducedMotion) {
      setBarInstant(true);
      setBarLevel(end.level);
      setBarPct((end.xpIntoLevel / XP_PER_LEVEL) * 100);
      return;
    }

    setBarLevel(start.level);
    setBarPct((start.xpIntoLevel / XP_PER_LEVEL) * 100);

    let cancelled = false;
    void (async () => {
      for (const seg of segments) {
        if (cancelled) return;
        setBarLevel(seg.level);
        setBarInstant(true);
        setBarPct(seg.fromPct * 100);
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        if (cancelled) return;
        setBarInstant(false);
        setBarPct(seg.toPct * 100);
        const dur = Math.abs(seg.toPct - seg.fromPct) < 1e-6 ? 0 : 720;
        await new Promise<void>((r) => setTimeout(r, dur));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, xpGain.previousTotal, xpGain.newTotal, reducedMotion]);

  const xpIntoDisplay = Math.round((barPct / 100) * XP_PER_LEVEL);

  const particles = useMemo(() => {
    if (reducedMotion) return [];
    const n = 36;
    return [
      ...Array.from({ length: n }, (_, i) => confettiParticle(i, 'center')),
      ...Array.from({ length: n }, (_, i) => confettiParticle(n + i, 'high')),
    ];
  }, [reducedMotion]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4">
      <button
        type="button"
        className="quest-modal-backdrop absolute inset-0 cursor-pointer motion-safe:animate-fadeIn motion-reduce:animate-none"
        aria-label="Fermer"
        onClick={() => onOpenChange(false)}
      />
      {/* Impact plein écran (style « boss vaincu ») */}
      {!reducedMotion ? (
        <div
          className="pointer-events-none absolute inset-0 z-[56] bg-gradient-to-b from-amber-200/50 via-cyan-200/35 to-violet-400/25 motion-safe:animate-quest-victory-screen-flash motion-reduce:hidden"
          aria-hidden
        />
      ) : null}
      <div className="motion-safe:animate-quest-modal-shake motion-reduce:animate-none relative z-[60] flex w-full max-w-md justify-center">
        <div
          className="relative w-full overflow-hidden rounded-3xl border-2 border-orange-300/50 bg-gradient-to-br from-amber-50 via-white to-cyan-50 shadow-[0_24px_80px_-12px_rgba(249,115,22,.42),0_0_0_1px_rgba(255,255,255,0.5)_inset] motion-safe:animate-quest-modal-pop motion-reduce:animate-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="xp-celebration-title"
        >
        {/* Anneaux d’impact */}
        {!reducedMotion ? (
          <div className="pointer-events-none absolute left-1/2 top-[36%] z-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 motion-reduce:hidden" aria-hidden>
            <div className="absolute inset-0 rounded-full border-4 border-amber-400/50 motion-safe:animate-quest-ring-pulse motion-reduce:hidden [animation-delay:0ms]" />
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 motion-safe:animate-quest-ring-pulse motion-reduce:hidden [animation-delay:120ms]" />
            <div className="absolute inset-[-12px] rounded-full border border-orange-300/30 motion-safe:animate-quest-ring-pulse motion-reduce:hidden [animation-delay:220ms]" />
          </div>
        ) : null}

        {/* Fond animé léger */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5] motion-safe:animate-celebrate-shimmer motion-reduce:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(34,211,238,0.42), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(249,115,22,0.22), transparent 50%)',
          }}
        />

        {/* Confettis */}
        {!reducedMotion && particles.length > 0 ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-3xl motion-reduce:hidden"
            aria-hidden
          >
            {particles.map((p) => (
              <span
                key={`${p.origin}-${p.id}`}
                className="absolute left-1/2 rounded-[2px] motion-safe:animate-celebrate-confetti"
                style={{
                  top: p.origin === 'high' ? '18%' : '38%',
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
            className="text-center font-display text-sm font-black tracking-tight text-cyan-900 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:60ms] [animation-fill-mode:backwards]"
          >
            {t('completedTitle')}
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

          <div
            className="mt-5 rounded-2xl border border-cyan-300/45 bg-gradient-to-r from-cyan-50/90 to-white/90 px-4 py-3 shadow-sm motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:160ms] [animation-fill-mode:backwards]"
            role="group"
            aria-label="Progression dans le niveau actuel"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-black text-cyan-950">
              <span>Niveau {barLevel}</span>
              <span className="tabular-nums text-[var(--on-cream-muted)]">
                {xpIntoDisplay}/{XP_PER_LEVEL} XP dans ce niveau
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full border border-cyan-200/50 bg-[color:var(--progress-track)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-orange-400 motion-reduce:transition-none"
                style={{
                  width: `${barPct}%`,
                  transition:
                    reducedMotion || barInstant
                      ? 'none'
                      : 'width 700ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
            <p className="mt-2 text-[10px] font-semibold leading-snug text-[var(--on-cream-subtle)]">
              Même barre que sur l’accueil : elle se remplit dans ton niveau actuel, puis repart à zéro si tu passes au
              niveau suivant.
            </p>
          </div>

          <div className="mt-5 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:200ms] [animation-fill-mode:backwards]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-900">Comment ces XP sont calculés</p>
            <ul className="mt-3 space-y-2.5">
              {breakdownRows.map((row) => (
                <li
                  key={row.key}
                  className="rounded-xl border border-cyan-200/60 bg-white/85 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wide text-cyan-900/90">{row.label}</span>
                    <span className="text-sm font-black tabular-nums text-slate-900">{row.value}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-[var(--on-cream-muted)]">
                    {row.detail}
                  </p>
                </li>
              ))}
            </ul>
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
    </div>
  );
}
