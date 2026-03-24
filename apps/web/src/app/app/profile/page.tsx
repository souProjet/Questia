'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  BADGE_CATEGORY_LABEL_FR,
  getBadgeCatalogForUi,
  type BadgeCatalogEntry,
  type ExplorerAxis,
  type RiskAxis,
} from '@questia/shared';
import type { SerializedBadge } from '@/lib/progression';

type ProfileRes = {
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  streakCount: number;
  currentDay: number;
  badgesEarned?: unknown;
  progression: {
    level: number;
    totalXp: number;
    xpIntoLevel: number;
    xpToNext: number;
    xpPerLevel: number;
    badges: SerializedBadge[];
    badgeCatalog: BadgeCatalogEntry[];
  };
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileRes | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' });
      if (!res.ok) {
        setError(res.status === 401 ? 'Non connecté.' : 'Profil introuvable.');
        return;
      }
      const json = (await res.json()) as ProfileRes & { totalXp?: number };
      setData(json);
    } catch {
      setError('Impossible de charger le profil.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const quadrant = data
    ? `${data.explorerAxis === 'explorer' ? 'Explorateur·rice' : 'Casanier·ière'} · ${
        data.riskAxis === 'risktaker' ? 'Audacieux·se' : 'Prudent·e'
      }`
    : '';

  const prog = data?.progression;
  const pct =
    prog && prog.xpPerLevel > 0 ? Math.min(100, (prog.xpIntoLevel / prog.xpPerLevel) * 100) : 0;
  const catalog: BadgeCatalogEntry[] =
    prog?.badgeCatalog && prog.badgeCatalog.length > 0
      ? prog.badgeCatalog
      : getBadgeCatalogForUi(data?.badgesEarned);

  return (
    <div className="min-h-screen bg-adventure">
      <Navbar />
      <main className="relative z-10 max-w-2xl mx-auto px-4 pt-24 pb-20">
        <div className="flex flex-wrap gap-4 mb-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm font-bold text-cyan-900 hover:underline"
          >
            ← Retour à la quête
          </Link>
          <Link
            href="/app/shop"
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-900 hover:underline"
          >
            Boutique
          </Link>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
            {error}
          </p>
        )}

        {!data && !error && (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        )}

        {data && prog && (
          <>
            <h1 className="font-display font-black text-3xl text-[var(--text)] mb-2">Profil</h1>
            <p className="text-[var(--muted)] font-semibold mb-8">{quadrant}</p>

            <section className="rounded-3xl border-2 border-cyan-300/40 bg-gradient-to-br from-white via-cyan-50/40 to-amber-50/30 p-6 shadow-lg mb-8">
              <div className="flex justify-between items-end gap-4 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-900">Niveau</span>
                <span className="font-display text-5xl font-black text-[var(--text)]">{prog.level}</span>
              </div>
              <p className="text-sm font-semibold text-[var(--muted)] mb-3">
                {prog.totalXp} XP au total · encore {prog.xpToNext} XP pour monter · progression dans ce niveau :{' '}
                {prog.xpIntoLevel}/{prog.xpPerLevel}
              </p>
              <div className="h-3 rounded-full bg-[color:var(--progress-track)] overflow-hidden border border-cyan-200/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-orange-400 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </section>

            <section className="flex flex-wrap gap-3 mb-10">
              <span className="pill-expansion shadow-sm">
                <span aria-hidden>📍</span> Jour {data.currentDay}
              </span>
              <span className="streak-badge text-xs shadow-sm">
                <span aria-hidden>🔥</span>
                <span className="font-black">{data.streakCount}</span> série
              </span>
            </section>

            <h2 className="label mb-3">Insignes</h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Tous les objectifs sont visibles : ce qui brille est à toi, le reste t&apos;attend encore.
            </p>

            <ul className="grid gap-4 sm:grid-cols-2">
              {catalog.map((b) => (
                <li
                  key={b.id}
                  className={`rounded-2xl border p-4 shadow-sm transition-all ${
                    b.unlocked
                      ? 'border-orange-200/60 bg-[var(--card)]/95'
                      : 'border-[color:var(--border-ui)] bg-[var(--surface)]/95 opacity-[0.88] grayscale-[0.35]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-3xl leading-none" aria-hidden>
                      {b.placeholderEmoji}
                    </span>
                    {!b.unlocked ? (
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--subtle)] shrink-0">
                        À débloquer
                      </span>
                    ) : null}
                  </div>
                  <span className="inline-block mt-1 mb-1 rounded-full border border-[color:var(--border-ui)] bg-[var(--card)]/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[var(--subtle)]">
                    {BADGE_CATEGORY_LABEL_FR[b.category]}
                  </span>
                  <p className={`font-black ${b.unlocked ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>{b.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-1 font-medium">{b.criteria}</p>
                  {b.unlocked && b.unlockedAt ? (
                    <p className="text-[10px] text-[var(--subtle)] mt-3 font-semibold">
                      {new Date(b.unlockedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[var(--subtle)] mt-3 font-semibold">Objectif en cours</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
