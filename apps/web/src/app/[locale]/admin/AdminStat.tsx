export function AdminStat({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: number;
  hint: string;
  accent: 'cyan' | 'orange' | 'violet' | 'emerald';
  /** Emoji ou court symbole décoratif */
  icon?: string;
}) {
  const styles =
    accent === 'cyan'
      ? {
          ring: 'border-cyan-300/70 bg-gradient-to-br from-white via-cyan-50/40 to-white shadow-[0_8px_32px_-12px_rgba(34,211,238,0.35)]',
          glow: 'from-cyan-400/25 to-transparent',
          iconBg: 'bg-cyan-100/90 text-cyan-800',
        }
      : accent === 'orange'
        ? {
            ring: 'border-orange-300/70 bg-gradient-to-br from-white via-amber-50/50 to-white shadow-[0_8px_32px_-12px_rgba(249,115,22,0.28)]',
            glow: 'from-amber-400/30 to-transparent',
            iconBg: 'bg-amber-100/90 text-amber-900',
          }
        : accent === 'emerald'
          ? {
              ring: 'border-emerald-300/70 bg-gradient-to-br from-white via-emerald-50/40 to-white shadow-[0_8px_32px_-12px_rgba(16,185,129,0.3)]',
              glow: 'from-emerald-400/25 to-transparent',
              iconBg: 'bg-emerald-100/90 text-emerald-900',
            }
          : {
              ring: 'border-violet-300/70 bg-gradient-to-br from-white via-violet-50/45 to-white shadow-[0_8px_32px_-12px_rgba(139,92,246,0.32)]',
              glow: 'from-violet-400/25 to-transparent',
              iconBg: 'bg-violet-100/90 text-violet-900',
            };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border-2 px-4 py-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${styles.ring}`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${styles.glow} blur-2xl`}
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        {icon ? (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg shadow-inner ${styles.iconBg}`}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums tracking-tight text-[var(--text)]">
            {value.toLocaleString('fr-FR')}
          </p>
          <p className="mt-1.5 text-xs font-semibold leading-snug text-[var(--on-cream-subtle)]">{hint}</p>
        </div>
      </div>
    </div>
  );
}
