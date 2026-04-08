'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OverviewJson } from './adminOverviewTypes';
import { AdminStat } from './AdminStat';
import AdminStatsSection from './AdminStatsSection';

const STATUT_QUETE_LIB: Record<string, string> = {
  pending: 'en attente',
  accepted: 'acceptée',
  completed: 'terminée',
  rejected: 'refusée',
  replaced: 'remplacée',
  abandoned: 'abandonnée',
};

function titreStatutQuete(s: string) {
  const t = STATUT_QUETE_LIB[s] ?? s;
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : s;
}

export default function AdminStatsPageClient() {
  const [data, setData] = useState<OverviewJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error ?? `Réponse serveur ${res.status}`);
      setData(j as OverviewJson);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusEntries = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.questStatusToday).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-[1.75rem] border-2 border-cyan-200/50 bg-gradient-to-br from-white via-cyan-50/30 to-violet-50/20 px-6 py-20 shadow-inner">
        <div
          className="relative h-14 w-14"
          role="status"
          aria-label="Chargement"
        >
          <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/30" />
          <div className="absolute inset-1 animate-spin rounded-full border-[3px] border-cyan-200 border-t-cyan-600" />
        </div>
        <p className="text-sm font-bold text-[var(--muted)]">Chargement des statistiques…</p>
      </div>
    );
  }

  if (err && !data) {
    return (
      <div className="rounded-[1.75rem] border-2 border-red-200/80 bg-gradient-to-br from-red-50 to-amber-50/50 px-6 py-8 shadow-inner">
        <p className="font-display text-lg font-black text-red-900">Impossible de charger les statistiques</p>
        <p className="mt-2 text-sm font-semibold text-red-800/90">{err}</p>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.75rem] border-2 border-cyan-300/50 bg-gradient-to-br from-white via-cyan-50/40 to-violet-50/40 p-6 shadow-[0_12px_40px_-16px_rgba(34,211,238,0.25)] ring-1 ring-cyan-100/80 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-300/35 to-violet-300/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-gradient-to-tr from-orange-200/20 to-transparent blur-2xl" aria-hidden />

        <div className="relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-800/90 shadow-sm">
              <span className="text-base leading-none" aria-hidden>
                ◈
              </span>
              Instantané
            </p>
            <h2 className="font-display mt-3 text-xl font-black tracking-tight text-[var(--on-cream)] sm:text-2xl">
              ① · Vue globale
            </h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-[var(--on-cream-muted)]">
              Indicateurs agrégés sur tous les joueurs — photo à la volée de l&apos;économie et de l&apos;activité.
            </p>
            <p className="mt-2 text-xs font-semibold text-[var(--on-cream-subtle)]">
              Mis à jour {new Date(d.generatedAt).toLocaleString('fr-FR')} · jour de référence{' '}
              <span className="font-mono text-[var(--on-cream-muted)]">{d.todayUtc}</span> (UTC)
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="btn btn-cta btn-sm shrink-0 font-black shadow-md"
          >
            {loading ? '…' : 'Rafraîchir'}
          </button>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminStat label="Comptes profil" value={d.totalProfiles} hint="total enregistrés" accent="cyan" icon="👤" />
          <AdminStat label="Comptes admin" value={d.adminProfilesCount} hint="rôle administrateur" accent="violet" icon="✦" />
          <AdminStat label="Inscriptions 7 j." value={d.profilesLast7Days} hint="nouveaux profils" accent="orange" icon="📈" />
          <AdminStat
            label="Quêtes générées aujourd'hui"
            value={d.questLogsForToday}
            hint={`jour ${d.todayUtc} (UTC)`}
            accent="violet"
            icon="📜"
          />
          <AdminStat label="Complétions aujourd'hui" value={d.completedToday} hint="tous utilisateurs" accent="cyan" icon="✓" />
          <AdminStat label="Complétions (total)" value={d.totalCompletedQuests} hint="historique" accent="orange" icon="🏆" />
          <AdminStat label="QC en circulation" value={d.totalCoinsInEconomy} hint="somme des soldes" accent="emerald" icon="🪙" />
          <AdminStat label="Transactions boutique" value={d.shopTransactionsCount} hint="paiements / portefeuille" accent="cyan" icon="🛒" />
          <AdminStat label="Appareils push" value={d.pushDevicesCount} hint="application mobile" accent="orange" icon="📱" />
        </div>

        {statusEntries.length > 0 ? (
          <div className="relative mt-8 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 via-white/90 to-transparent px-4 py-4 sm:px-5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-900/70">
              Quêtes du jour par statut (UTC)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {statusEntries.map(([status, n]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/95 px-3 py-1.5 font-mono text-[11px] font-bold text-emerald-950 shadow-sm"
                >
                  <span className="text-emerald-600/90">{titreStatutQuete(status)}</span>
                  <span className="tabular-nums text-emerald-900">{n}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <AdminStatsSection />
    </div>
  );
}
