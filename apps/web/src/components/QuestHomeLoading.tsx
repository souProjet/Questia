'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Compass, Sparkles } from 'lucide-react';
import type { QuestLoaderSession } from '@questia/shared';
import {
  getDailyQuestLoadingLines,
  resolveQuestLoaderSession,
  QUEST_LOADER_DAY_STORAGE_KEY,
} from '@questia/shared';

/**
 * Écran de chargement accueil — flottant (sans encadré), textes selon première ouverture du jour ou reprise.
 * Session alignée SSR / premier rendu client (`first-today`), puis synchronisée depuis localStorage après hydratation.
 */
export function QuestHomeLoading() {
  const intlLocale = useLocale();
  const questLocale = intlLocale === 'en' ? 'en' : 'fr';
  const [session, setSession] = useState<QuestLoaderSession>('first-today');

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const last = localStorage.getItem(QUEST_LOADER_DAY_STORAGE_KEY);
      setSession(resolveQuestLoaderSession(last, today));
    } catch {
      /* noop */
    }
  }, []);

  const { primary, secondary } = getDailyQuestLoadingLines(undefined, session, questLocale);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-20 outline-none min-h-[min(78vh,52rem)] flex flex-col items-center justify-center"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" aria-hidden>
        <div className="absolute -top-12 left-1/2 w-[min(40rem,110vw)] h-[min(40rem,110vw)] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-300/28 via-amber-200/10 to-orange-200/18 blur-3xl motion-safe:animate-glow-soft motion-reduce:opacity-45" />
        <div className="absolute top-[20%] right-[6%] w-72 h-72 rounded-full bg-gradient-to-bl from-orange-200/20 to-transparent blur-3xl motion-safe:animate-float motion-reduce:opacity-30" />
        <div className="absolute bottom-[18%] left-[4%] w-64 h-64 rounded-full bg-cyan-300/12 blur-3xl motion-safe:animate-float-delayed motion-reduce:opacity-25" />
        <div className="absolute top-[22%] left-[10%] text-4xl opacity-[0.22] select-none motion-safe:animate-float motion-reduce:opacity-12">
          🧭
        </div>
        <div className="absolute top-[26%] right-[12%] text-3xl opacity-[0.2] select-none motion-safe:animate-float-delayed motion-reduce:opacity-[0.12]">
          🎲
        </div>
        <div className="absolute bottom-[32%] right-[18%] text-2xl opacity-[0.14] select-none motion-safe:animate-float motion-reduce:opacity-10 [animation-delay:1.1s]">
          ✨
        </div>
      </div>

      <div className="relative flex w-full max-w-lg flex-col items-center px-2 text-center motion-safe:animate-quest-loader-in motion-reduce:animate-none motion-reduce:opacity-100 [animation-fill-mode:both]">
        <div className="relative mb-10 flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/25 to-orange-400/20 blur-xl motion-safe:animate-pulse motion-reduce:opacity-50" />
          <span className="absolute inset-2 rounded-full bg-gradient-to-br from-white/40 to-cyan-100/20 blur-md motion-safe:animate-ping motion-reduce:animate-none opacity-50" />
          <Compass
            className="relative z-[1] h-14 w-14 text-cyan-900/90 drop-shadow-[0_2px_12px_rgba(34,211,238,0.35)] motion-safe:animate-quest-loader-bounce motion-reduce:animate-none"
            strokeWidth={1.5}
            aria-hidden
          />
          <Sparkles
            className="absolute -right-0.5 top-0 z-[1] h-7 w-7 text-amber-500 drop-shadow-sm motion-safe:animate-pulse"
            strokeWidth={1.4}
            aria-hidden
          />
        </div>

        <p
          suppressHydrationWarning
          className="font-display text-[1.4rem] font-black leading-snug tracking-tight sm:text-[1.65rem] text-gradient-on-dark max-w-[22rem] text-balance"
        >
          {primary}
        </p>
        <p
          suppressHydrationWarning
          className="mt-5 max-w-[24rem] text-sm font-semibold leading-relaxed text-[var(--on-cream-muted)] text-balance"
        >
          {secondary}
        </p>

        {/* Barre indéterminée : segment en position absolute, left animé (voir tailwind questLoaderBar) */}
        <div className="relative mt-10 h-[3px] w-full max-w-[11rem] overflow-hidden rounded-full bg-[color:var(--progress-track)]/75">
          <div className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-400 shadow-[0_0_12px_rgba(34,211,238,0.35)] motion-safe:animate-quest-loader-bar motion-reduce:animate-none" />
        </div>

        <div className="mt-8 flex gap-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-orange-400 opacity-90 shadow-[0_0_8px_rgba(249,115,22,0.35)] motion-safe:animate-bounce motion-reduce:opacity-70"
              style={{ animationDelay: `${i * 0.09}s` }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
