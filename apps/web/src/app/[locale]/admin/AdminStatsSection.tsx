'use client';

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { GlobalStatsPayload, ShopMetricsMode } from '@/lib/admin/globalStats';
import { QUEST_STATUSES } from '@/lib/admin/globalStats';

const STATUT_LEGENDE: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  completed: 'Terminée',
  rejected: 'Refusée',
  replaced: 'Remplacée',
  abandoned: 'Abandonnée',
};

/** Palette plus riche, lisible sur fond clair */
const STATUT_COULEUR: Record<string, string> = {
  pending: '#94a3b8',
  accepted: '#0ea5e9',
  completed: '#10b981',
  rejected: '#f43f5e',
  replaced: '#8b5cf6',
  abandoned: '#f97316',
};

const CHART_GRID = 'rgba(15, 23, 42, 0.06)';
const AXIS_TICK = { fill: '#64748b', fontSize: 11, fontWeight: 600 as const };

function formatEur(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function formatCourtDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const dateRow = payload[0]?.payload as { date?: string } | undefined;
  const title = (dateRow?.date as string | undefined) ?? label ?? '';
  return (
    <div className="max-w-xs rounded-2xl border border-emerald-200/90 bg-white/95 px-4 py-3 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.18)] backdrop-blur-md">
      {title ? (
        <p className="border-b border-slate-100 pb-2 font-mono text-[11px] font-bold text-slate-500">{title}</p>
      ) : null}
      <ul className="mt-2 space-y-1.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
            </span>
            <span className="shrink-0 font-mono font-bold tabular-nums text-slate-900">
              {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR') : p.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartTooltipShop({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; payload?: unknown }>;
  label?: string | number;
  mode: ShopMetricsMode;
}) {
  if (!active || !payload?.length) return null;
  const dateRow = payload[0]?.payload as { date?: string } | undefined;
  const title = (dateRow?.date as string | undefined) ?? (label != null ? String(label) : '');
  const v = payload[0]?.value;
  const n = typeof v === 'number' ? v : 0;
  return (
    <div className="rounded-2xl border border-emerald-200/90 bg-white/95 px-4 py-3 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.18)] backdrop-blur-md">
      {title ? <p className="font-mono text-[11px] font-bold text-slate-500">{title}</p> : null}
      {mode === 'eur' ? (
        <>
          <p className="mt-1 font-display text-lg font-black text-emerald-800">{formatEur(n * 100)}</p>
          <p className="text-xs font-semibold text-slate-500">Argent réel encaissé (Stripe, jour)</p>
        </>
      ) : (
        <>
          <p className="mt-1 font-display text-lg font-black text-amber-900">
            {Math.round(n).toLocaleString('fr-FR')} <span className="text-sm font-bold text-amber-800/90">QC</span>
          </p>
          <p className="text-xs font-semibold text-slate-500">Dépenses en Quest Coins (jour)</p>
        </>
      )}
    </div>
  );
}

function ChartShell({
  icon,
  title,
  subtitle,
  children,
  className = '',
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/95 via-slate-50/40 to-emerald-50/20 p-1 shadow-[0_16px_48px_-20px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/60 ${className}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-300/15 to-cyan-300/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative rounded-[0.9rem] bg-white/80 p-5 backdrop-blur-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start gap-3 sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 text-xl shadow-inner ring-1 ring-emerald-200/60"
              aria-hidden
            >
              {icon}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-black leading-tight text-[var(--on-cream)]">{title}</h3>
              <p className="mt-1 text-sm font-semibold leading-snug text-[var(--on-cream-muted)]">{subtitle}</p>
            </div>
          </div>
        </div>
        <div className="min-h-0 w-full">{children}</div>
      </div>
    </div>
  );
}

function KpiMini({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'emerald' | 'cyan' | 'violet' | 'amber';
}) {
  const bg =
    tone === 'emerald'
      ? 'from-emerald-500/15 to-teal-500/10 border-emerald-200/70'
      : tone === 'cyan'
        ? 'from-cyan-500/15 to-sky-500/10 border-cyan-200/70'
        : tone === 'violet'
          ? 'from-violet-500/15 to-fuchsia-500/10 border-violet-200/70'
          : 'from-amber-500/15 to-orange-500/10 border-amber-200/70';
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br px-4 py-3 shadow-sm ${bg}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600/90">{label}</p>
      <p className="mt-1 font-display text-2xl font-black tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-600/85">{sub}</p>
    </div>
  );
}

export default function AdminStatsSection() {
  const uid = useId().replace(/:/g, '');
  const gradCa = `ca-${uid}`;
  const gradBarIns = `barIns-${uid}`;
  const gradLineStroke = `lineStroke-${uid}`;

  const [presetDays, setPresetDays] = useState(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [rangeMode, setRangeMode] = useState<'preset' | 'custom'>('preset');
  const [shopMode, setShopMode] = useState<ShopMetricsMode>('eur');
  const [stats, setStats] = useState<GlobalStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchStats = useCallback(async (qs: URLSearchParams) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/stats?${qs}`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error ?? `Réponse ${res.status}`);
      setStats(j as GlobalStatsPayload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (rangeMode === 'custom' && (!customFrom || !customTo || customFrom > customTo)) return;
    const qs = new URLSearchParams();
    if (rangeMode === 'custom' && customFrom && customTo && customFrom <= customTo) {
      qs.set('from', customFrom);
      qs.set('to', customTo);
    } else {
      qs.set('days', String(presetDays));
    }
    qs.set('shopMode', shopMode);
    void fetchStats(qs);
  }, [rangeMode, customFrom, customTo, presetDays, shopMode, fetchStats]);

  const chartRows = useMemo(() => {
    if (!stats) return [];
    return stats.dayLabels.map((date, i) => {
      const row: Record<string, string | number> = { date, court: formatCourtDate(date) };
      row.inscriptions = stats.signupsPerDay[i];
      row.cumulComptes = stats.signupsCumulativeEndOfDay[i];
      const primary = stats.shopPrimaryPerDay[i] ?? 0;
      row.shopSeries = stats.shopMode === 'eur' ? primary / 100 : primary;
      for (const st of QUEST_STATUSES) {
        row[st] = stats.questsByStatusPerDay[i][st];
      }
      return row;
    });
  }, [stats]);

  const totalsPie = useMemo(() => {
    if (!stats) return [];
    return QUEST_STATUSES.map((st) => ({
      name: STATUT_LEGENDE[st] ?? st,
      value: stats.questsTotalsInRange[st] ?? 0,
      key: st,
    })).filter((x) => x.value > 0);
  }, [stats]);

  const kpiSums = useMemo(() => {
    if (!stats) return null;
    const signups = stats.signupsPerDay.reduce((a, b) => a + b, 0);
    const completions = stats.questsTotalsInRange.completed ?? 0;
    const questLines = Object.values(stats.questsTotalsInRange).reduce((a, b) => a + b, 0);
    return { signups, completions, questLines };
  }, [stats]);

  const pieData = useMemo(
    () => totalsPie.map((t) => ({ name: t.name, value: t.value, key: t.key })),
    [totalsPie],
  );

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border-2 border-emerald-300/50 bg-gradient-to-br from-emerald-50/50 via-white to-cyan-50/40 p-6 shadow-[0_16px_48px_-20px_rgba(16,185,129,0.2)] sm:p-8">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/25 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-gradient-to-tl from-cyan-300/20 to-transparent blur-3xl" />

      <div className="relative mb-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-900/80 shadow-sm">
          <span className="text-base" aria-hidden>
            📊
          </span>
          Séries temporelles
        </p>
        <h2 className="font-display mt-3 text-xl font-black tracking-tight text-[var(--on-cream)] sm:text-2xl">
          ② · Graphiques &amp; tendances
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-[var(--on-cream-muted)]">
          Inscriptions, quêtes par statut, boutique et tendances — période en UTC.
        </p>

        <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-white/90 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-900/75">Plage</p>
              <div className="mt-2 -mx-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
                <div className="flex w-max max-w-none flex-nowrap gap-1 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-1 sm:w-full sm:max-w-full">
                  {[7, 30, 90, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setRangeMode('preset');
                        setPresetDays(d);
                      }}
                      className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black transition-all sm:min-w-0 sm:flex-1 sm:px-2 sm:text-[11px] md:px-3 ${
                        rangeMode === 'preset' && presetDays === d
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/25'
                          : 'text-[var(--muted)] hover:bg-white/90'
                      }`}
                    >
                      {d === 365 ? '1 an' : `${d} j.`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-emerald-100/90 pt-4">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-900/75">Dates au choix</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                <input
                  type="date"
                  className="min-w-0 flex-1 rounded-xl border-2 border-emerald-200/80 bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 sm:max-w-[11rem]"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
                <span className="shrink-0 text-emerald-600/80" aria-hidden>
                  →
                </span>
                <input
                  type="date"
                  className="min-w-0 flex-1 rounded-xl border-2 border-emerald-200/80 bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 sm:max-w-[11rem]"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
                <button
                  type="button"
                  disabled={loading || !customFrom || !customTo || customFrom > customTo}
                  onClick={() => setRangeMode('custom')}
                  className="btn btn-primary btn-sm shrink-0 font-black shadow-md"
                >
                  Appliquer
                </button>
                {rangeMode === 'custom' ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm shrink-0 font-black"
                    onClick={() => setRangeMode('preset')}
                  >
                    Plages rapides
                  </button>
                ) : null}
              </div>
            </div>

            <div className="border-t border-emerald-100/90 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">Indicateurs boutique</p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[var(--on-cream-muted)] sm:text-xs">
                    € encaissements réels (Stripe) · QC dépensés sur les achats en coins.
                  </p>
                </div>
                <div
                  className="flex shrink-0 flex-nowrap gap-1 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-1"
                  role="group"
                  aria-label="Unité des montants boutique"
                >
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShopMode('eur')}
                    className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black transition-all ${
                      shopMode === 'eur'
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm'
                        : 'text-[var(--muted)] hover:bg-white/90'
                    }`}
                  >
                    € EUR
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShopMode('qc')}
                    className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black transition-all ${
                      shopMode === 'qc'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm'
                        : 'text-[var(--muted)] hover:bg-white/90'
                    }`}
                  >
                    QC
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <p className="relative mb-6 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm font-bold text-red-900 shadow-inner">
          {err}
        </p>
      ) : null}

      {loading && !stats ? (
        <div className="relative flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border border-emerald-100 bg-white/60 py-16">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/25" />
            <div className="absolute inset-1 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          </div>
          <p className="text-sm font-bold text-[var(--muted)]">Chargement des graphiques…</p>
        </div>
      ) : null}

      {stats && kpiSums ? (
        <div className="relative space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3 sm:px-5">
            <p className="text-sm font-bold text-[var(--on-cream)]">
              <span className="text-[var(--muted)]">Période :</span>{' '}
              <time dateTime={stats.from} className="font-mono text-emerald-800">
                {new Date(stats.from + 'T12:00:00Z').toLocaleDateString('fr-FR')}
              </time>
              <span className="mx-2 text-[var(--muted)]">—</span>
              <time dateTime={stats.to} className="font-mono text-emerald-800">
                {new Date(stats.to + 'T12:00:00Z').toLocaleDateString('fr-FR')}
              </time>
              <span className="ml-2 text-xs font-semibold text-[var(--muted)]">
                ({stats.dayLabels.length} jour{stats.dayLabels.length > 1 ? 's' : ''})
              </span>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiMini
              label={stats.shopMode === 'eur' ? 'Encaissements réels (période)' : 'QC dépensés (période)'}
              value={
                stats.shopMode === 'eur'
                  ? formatEur(stats.shopTotalPrimary)
                  : `${stats.shopTotalPrimary.toLocaleString('fr-FR')} QC`
              }
              sub={`${stats.shopPaidTransactionCount} transaction${stats.shopPaidTransactionCount > 1 ? 's' : ''}`}
              tone="emerald"
            />
            <KpiMini
              label="Inscriptions (période)"
              value={kpiSums.signups.toLocaleString('fr-FR')}
              sub="nouveaux profils sur la plage"
              tone="cyan"
            />
            <KpiMini
              label="Lignes quête (période)"
              value={kpiSums.questLines.toLocaleString('fr-FR')}
              sub="tous statuts confondus"
              tone="violet"
            />
            <KpiMini
              label="Quêtes terminées"
              value={kpiSums.completions.toLocaleString('fr-FR')}
              sub="complétions sur la plage"
              tone="amber"
            />
          </div>

          <ChartShell
            icon="👥"
            title="Inscriptions & base joueurs"
            subtitle="Barres : nouveaux comptes par jour · Courbe : total cumulé des profils à la fin de chaque jour."
          >
            <div className="h-[300px] w-full min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id={gradBarIns} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id={gradLineStroke} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0f766e" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 8" vertical={false} />
                  <XAxis
                    dataKey="court"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: CHART_GRID }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={36}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 16 }}
                    formatter={(value) => <span className="text-sm font-semibold text-slate-700">{value}</span>}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="inscriptions"
                    name="Inscriptions (jour)"
                    fill={`url(#${gradBarIns})`}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulComptes"
                    name="Total comptes (fin de jour)"
                    stroke={`url(#${gradLineStroke})`}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartShell>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ChartShell
                icon="📚"
                title="Quêtes par statut"
                subtitle="Empilement journalier (une ligne par joueur et par jour). La couleur « Terminée » donne déjà les complétions du jour — pas de second graphique pour éviter le doublon."
              >
                <div className="h-[340px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartRows} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                      <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 8" vertical={false} />
                      <XAxis
                        dataKey="court"
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={{ stroke: CHART_GRID }}
                        interval="preserveStartEnd"
                        minTickGap={22}
                      />
                      <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ paddingTop: 12 }}
                        formatter={(value) => <span className="text-xs font-semibold text-slate-700">{value}</span>}
                      />
                      {QUEST_STATUSES.map((st, idx) => (
                        <Bar
                          key={st}
                          dataKey={st}
                          stackId="q"
                          name={STATUT_LEGENDE[st] ?? st}
                          fill={STATUT_COULEUR[st]}
                          radius={idx === QUEST_STATUSES.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                          maxBarSize={56}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartShell>
            </div>
            <div className="lg:col-span-2">
              <ChartShell
                icon="◎"
                title="Répartition (période)"
                subtitle="Part des statuts sur le total des lignes quête dans la plage."
              >
                {pieData.length > 0 ? (
                  <div className="h-[280px] w-full sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="58%"
                          outerRadius="88%"
                          paddingAngle={2}
                          animationDuration={900}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.key} fill={STATUT_COULEUR[entry.key]} stroke="#fff" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) =>
                            active && payload?.[0] ? (
                              <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg">
                                <p className="font-bold text-slate-800">{payload[0].name}</p>
                                <p className="font-mono text-lg font-black text-slate-900">
                                  {(payload[0].value as number).toLocaleString('fr-FR')}
                                </p>
                              </div>
                            ) : null
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm font-semibold text-[var(--muted)]">Aucune donnée sur cette période.</p>
                )}
                {totalsPie.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {totalsPie.map((t) => (
                      <span
                        key={t.key}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-sm"
                        style={{ borderColor: STATUT_COULEUR[t.key] }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: STATUT_COULEUR[t.key] }} />
                        {t.name} · {t.value.toLocaleString('fr-FR')}
                      </span>
                    ))}
                  </div>
                ) : null}
              </ChartShell>
            </div>
          </div>

          <ChartShell
            icon={stats.shopMode === 'eur' ? '💶' : '🪙'}
            title={stats.shopMode === 'eur' ? 'Encaissements réels (Stripe)' : 'Dépenses Quest Coins'}
            subtitle={
              stats.shopMode === 'eur'
                ? 'Somme des paiements en euros (centimes > 0), hors achats entièrement en QC.'
                : 'Somme des QC débités sur les achats payés en monnaie virtuelle (pas d’argent réel).'
            }
          >
            <div className="mb-4 flex flex-wrap items-baseline gap-3">
              <span
                className={`font-display text-3xl font-black tracking-tight ${
                  stats.shopMode === 'eur' ? 'text-emerald-800' : 'text-amber-900'
                }`}
              >
                {stats.shopMode === 'eur'
                  ? formatEur(stats.shopTotalPrimary)
                  : `${stats.shopTotalPrimary.toLocaleString('fr-FR')} QC`}
              </span>
              <span className="text-sm font-semibold text-[var(--muted)]">
                {stats.shopPaidTransactionCount} transaction{stats.shopPaidTransactionCount > 1 ? 's' : ''} sur la période
              </span>
            </div>
            <div className="h-[260px] w-full min-w-0 sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id={gradCa} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={stats.shopMode === 'eur' ? '#10b981' : '#f59e0b'}
                        stopOpacity={0.55}
                      />
                      <stop
                        offset="55%"
                        stopColor={stats.shopMode === 'eur' ? '#34d399' : '#fbbf24'}
                        stopOpacity={0.12}
                      />
                      <stop offset="100%" stopColor="#ecfdf5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 8" vertical={false} />
                  <XAxis
                    dataKey="court"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: CHART_GRID }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    tick={{ ...AXIS_TICK, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      stats.shopMode === 'eur' ? `${v} €` : `${Math.round(Number(v)).toLocaleString('fr-FR')} QC`
                    }
                  />
                  <Tooltip
                    content={(props) => (
                      <ChartTooltipShop
                        active={props.active}
                        payload={props.payload}
                        label={props.label}
                        mode={stats.shopMode}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="shopSeries"
                    name={stats.shopMode === 'eur' ? 'Encaissement du jour (€)' : 'QC dépensés (jour)'}
                    stroke={stats.shopMode === 'eur' ? '#059669' : '#d97706'}
                    strokeWidth={2.5}
                    fill={`url(#${gradCa})`}
                    fillOpacity={1}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartShell>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.1)]">
            <div className="border-b border-slate-200/70 bg-white/90 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-lg shadow-inner ring-1 ring-violet-200/50">
                  🏷️
                </span>
                <div>
                  <h3 className="font-display text-lg font-black text-[var(--on-cream)]">Détail par article (SKU)</h3>
                  <p className="text-sm font-semibold text-[var(--on-cream-muted)]">
                    {stats.shopMode === 'eur'
                      ? 'Montants TTC encaissés en euros (Stripe) sur la période.'
                      : 'Quest Coins dépensés par article sur la période.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/90">
                    <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                      Référence
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                      Libellé
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                      Transactions
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                      {stats.shopMode === 'eur' ? 'Montant TTC' : 'QC dépensés'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.shopBySku.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm font-semibold text-[var(--muted)]">
                        Aucune donnée sur cette période pour ce mode.
                      </td>
                    </tr>
                  ) : (
                    stats.shopBySku.map((r, i) => (
                      <tr
                        key={`${r.sku}-${r.label}-${i}`}
                        className="border-b border-slate-100/90 transition-colors hover:bg-emerald-50/40"
                      >
                        <td className="px-5 py-3 font-mono text-xs font-bold text-slate-800">{r.sku}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{r.label}</td>
                        <td className="px-5 py-3 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                          {r.count}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-sm font-black tabular-nums text-emerald-800">
                          {stats.shopMode === 'eur' ? formatEur(r.amount) : `${r.amount.toLocaleString('fr-FR')} QC`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
