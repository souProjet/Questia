import Link from 'next/link';
import type { ReactNode } from 'react';
import { QuestiaLogo } from '@/components/QuestiaLogo';

type AuthQuestShellProps = {
  badge: ReactNode;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthQuestShell({ badge, title, subtitle, children, footer }: AuthQuestShellProps) {
  return (
    <div className="min-h-screen bg-adventure flex flex-col items-center justify-start px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10 sm:pt-8 sm:pb-14 md:pt-10 relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-36 left-1/2 w-[min(100%,720px)] h-[440px] -translate-x-1/2 opacity-[0.22] motion-reduce:animate-none animate-glow-soft"
          style={{ background: 'radial-gradient(ellipse at top, rgba(34,211,238,0.5), transparent 62%)' }}
        />
        <div
          className="absolute top-[22%] -right-20 w-72 h-72 rounded-full opacity-[0.14]"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.55), transparent 68%)' }}
        />
        <div
          className="absolute bottom-[6%] -left-12 w-64 h-64 rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4), transparent 70%)' }}
        />
      </div>

      <main id="main-content" tabIndex={-1} className="relative z-10 mx-auto w-full max-w-[440px] min-w-0 outline-none">
        <div className="rounded-3xl border border-[rgba(19,33,45,0.1)] bg-white/92 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.14),0_4px_0_rgba(15,23,42,0.04)] backdrop-blur-sm p-6 sm:p-8">
          <header className="mb-3 sm:mb-4 text-center">
            <Link
              href="/"
              className="mb-4 inline-flex flex-col items-center gap-2.5 transition-transform hover:-translate-y-0.5 sm:flex-row sm:gap-3"
            >
              <QuestiaLogo variant="auth" priority />
              <span className="font-display font-black text-xl tracking-tight text-slate-900">QUESTIA</span>
            </Link>

            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-cyan-900 bg-cyan-50/80 border border-cyan-200/60">
                {badge}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-[1.7rem] font-black text-slate-900 leading-tight mb-2">{title}</h1>
            <p className="text-sm text-slate-500 leading-relaxed">{subtitle}</p>
          </header>

          <div className="auth-clerk-root auth-clerk-root--tight mx-auto w-full min-w-0 text-slate-900 [color-scheme:light] -mt-6 sm:-mt-8">
            {children}
          </div>

          <div className="mt-8">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-6" aria-hidden />
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}
