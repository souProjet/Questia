import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthQuestShellProps = {
  badge: ReactNode;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

/**
 * Enveloppe auth : fond clair « aventure » (comme la landing) + panneau tableau de quête crème / orange / cyan.
 */
export function AuthQuestShell({ badge, title, subtitle, children, footer }: AuthQuestShellProps) {
  return (
    <div className="min-h-screen bg-adventure flex flex-col items-center justify-center px-4 py-10 sm:py-14 relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-36 left-1/2 w-[min(100%,720px)] h-[440px] -translate-x-1/2 opacity-[0.28] motion-reduce:animate-none animate-glow-soft"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(34,211,238,0.5), transparent 62%)',
          }}
        />
        <div
          className="absolute top-[22%] -right-20 w-72 h-72 rounded-full opacity-[0.18]"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.55), transparent 68%)' }}
        />
        <div
          className="absolute bottom-[6%] -left-12 w-64 h-64 rounded-full opacity-[0.14]"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4), transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[440px] min-w-0">
        <div className="quest-slider-embedded p-6 sm:p-8">
          <header className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <span className="quest-sticker inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-black tracking-wide">
                {badge}
              </span>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-3 mb-6 group transition-transform hover:-translate-y-0.5"
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black text-white"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #fbbf24)',
                  boxShadow: '0 8px 22px rgba(249,115,22,.32)',
                }}
              >
                ⚔
              </div>
              <span className="font-display font-black text-xl tracking-tight text-[var(--text)]">DOPAMODE</span>
            </Link>

            <h1 className="font-display text-2xl sm:text-3xl font-black text-[var(--text)] leading-tight mb-2">{title}</h1>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{subtitle}</p>
          </header>

          <div className="auth-clerk-root mx-auto w-full min-w-0 text-[var(--text)] [color-scheme:light]">
            {children}
          </div>

          <div className="mt-8">
            <div className="divider-glow mb-6 opacity-90" aria-hidden />
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
