'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Navbar } from '@/components/Navbar';
import { Icon } from '@/components/Icons';
import {
  getQuestPack,
  getQuestPackArc,
  type ArcStateView,
  type QuestPackArc,
  type QuestPackArcChapter,
  type QuestPackArcSlot,
} from '@questia/shared';

type Locale = 'fr' | 'en';

interface RouteParams {
  params: Promise<{ packId: string; locale: string }>;
}

interface FetchedArc {
  arc: QuestPackArc;
  state: ArcStateView;
}

interface CompletePayload {
  arc: QuestPackArc;
  state: ArcStateView;
  xpEarned: number;
  rewardJustClaimed: { titleId: string; coins: number } | null;
  coinBalance: number;
  totalXp: number;
}

function pickLocale<T extends { fr: string; en: string }>(loc: Locale, value: T): string {
  return loc === 'en' ? value.en : value.fr;
}

function chapterStatusBadge(
  status: 'completed' | 'in_progress' | 'locked',
  loc: Locale,
): { label: string; className: string; icon: string } {
  if (status === 'completed') {
    return {
      label: loc === 'en' ? 'Done' : 'Terminé',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: 'CheckCircle2',
    };
  }
  if (status === 'in_progress') {
    return {
      label: loc === 'en' ? 'In progress' : 'En cours',
      className: 'bg-violet-100 text-violet-700 border-violet-200',
      icon: 'PlayCircle',
    };
  }
  return {
    label: loc === 'en' ? 'Locked' : 'Verrouillé',
    className: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: 'Lock',
  };
}

function SlotLine({
  slot,
  status,
  loc,
  onOpen,
}: {
  slot: { slug: string; key: string; status: 'completed' | 'available' | 'locked'; icon: string; title: { fr: string; en: string }; durationMinutes: number; xp: number };
  status: 'completed' | 'available' | 'locked';
  loc: Locale;
  onOpen: () => void;
}) {
  const isLocked = status === 'locked';
  const isDone = status === 'completed';
  return (
    <li
      className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        isDone
          ? 'border-emerald-200 bg-emerald-50/60'
          : isLocked
            ? 'border-[color:var(--border-ui)] bg-[var(--surface)]/60 opacity-60'
            : 'border-[color:var(--border-ui)] bg-[var(--card)] hover:border-violet-300 hover:bg-violet-50/30 cursor-pointer'
      }`}
      onClick={isLocked ? undefined : onOpen}
      role={isLocked ? undefined : 'button'}
      tabIndex={isLocked ? -1 : 0}
      onKeyDown={(e) => {
        if (isLocked) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isDone
            ? 'bg-emerald-200/80 text-emerald-700'
            : isLocked
              ? 'bg-slate-200 text-slate-400'
              : 'bg-violet-100 text-violet-700'
        }`}
        aria-hidden
      >
        <Icon name={isDone ? 'Check' : isLocked ? 'Lock' : slot.icon} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-bold leading-tight ${isDone ? 'text-emerald-800 line-through decoration-emerald-400/60' : 'text-[var(--text)]'}`}
        >
          {pickLocale(loc, slot.title)}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-[var(--muted)]">
          {slot.durationMinutes < 60
            ? `${slot.durationMinutes} min`
            : `~${Math.round(slot.durationMinutes / 60)} h`}{' '}
          · +{slot.xp} XP
        </p>
      </div>
      {!isLocked && !isDone ? (
        <Icon name="ChevronRight" size="sm" className="text-violet-500" aria-hidden />
      ) : null}
    </li>
  );
}

function SlotModal({
  arc,
  chapter,
  slot,
  loc,
  busy,
  onClose,
  onComplete,
  status,
}: {
  arc: QuestPackArc;
  chapter: QuestPackArcChapter;
  slot: QuestPackArcSlot;
  loc: Locale;
  busy: boolean;
  status: 'completed' | 'available' | 'locked';
  onClose: () => void;
  onComplete: () => void;
}) {
  const safety = slot.safetyNote ? pickLocale(loc, slot.safetyNote) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-t-3xl bg-[var(--card)] shadow-2xl ring-1 ring-[color:var(--border-ui-strong)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[color:var(--border-ui)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700" aria-hidden>
              <Icon name={slot.icon} size="lg" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
                {pickLocale(loc, chapter.title)}
              </p>
              <h2 className="font-display text-lg font-black leading-tight text-[var(--text)]">
                {pickLocale(loc, slot.title)}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
            aria-label={loc === 'en' ? 'Close' : 'Fermer'}
          >
            <Icon name="X" size="md" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm font-semibold leading-relaxed text-[var(--text)]">
            {pickLocale(loc, slot.mission)}
          </p>
          <p className="rounded-xl bg-violet-50 p-3 text-xs italic leading-relaxed text-violet-900">
            « {pickLocale(loc, slot.hook)} »
          </p>
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
            <span className="inline-flex items-center gap-1">
              <Icon name="Clock" size="xs" aria-hidden />
              {slot.durationMinutes < 60
                ? `${slot.durationMinutes} min`
                : `~${Math.round(slot.durationMinutes / 60)} h`}
            </span>
            <span aria-hidden>·</span>
            <span>+{slot.xp} XP</span>
          </div>
          {safety ? (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-900">
              <Icon name="ShieldAlert" size="xs" className="mt-0.5 shrink-0" aria-hidden />
              <span>{safety}</span>
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--border-ui)] bg-[var(--surface)]/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
          >
            {loc === 'en' ? 'Later' : 'Plus tard'}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={busy || status !== 'available'}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Icon name="Check" size="xs" aria-hidden />
            {status === 'completed'
              ? loc === 'en'
                ? 'Already done'
                : 'Déjà fait'
              : busy
                ? '…'
                : loc === 'en'
                  ? "I've done it"
                  : "C'est fait"}
            <span className="text-[10px] font-bold opacity-80">+{slot.xp} XP</span>
          </button>
        </footer>
        {/* Sourcing arc id (silent) */}
        <span className="hidden">{arc.packId}</span>
      </div>
    </div>
  );
}

function RewardBanner({
  reward,
  loc,
}: {
  reward: { titleId: string; coins: number };
  loc: Locale;
}) {
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-rose-50 p-5 shadow-sm motion-safe:animate-fade-up">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200/80 text-amber-700" aria-hidden>
          <Icon name="Trophy" size="lg" />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">
            {loc === 'en' ? 'Journey complete' : 'Parcours terminé'}
          </p>
          <p className="font-display text-xl font-black text-amber-900">
            {loc === 'en' ? 'Title unlocked + bonus QC' : 'Titre débloqué + bonus QC'}
          </p>
          <p className="mt-1 text-sm font-bold text-amber-900">
            {loc === 'en'
              ? `Title "${reward.titleId}" added · +${reward.coins} QC credited`
              : `Titre « ${reward.titleId} » ajouté · +${reward.coins} QC crédités`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ParcoursPage({ params }: RouteParams) {
  const { packId } = use(params);
  const localeStr = useLocale();
  const loc: Locale = localeStr === 'en' ? 'en' : 'fr';
  const arcStatic = useMemo(() => getQuestPackArc(packId), [packId]);
  const packMeta = useMemo(() => getQuestPack(packId), [packId]);
  const [data, setData] = useState<FetchedArc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSlotKey, setOpenSlotKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recentReward, setRecentReward] = useState<{ titleId: string; coins: number } | null>(null);
  const [recentXp, setRecentXp] = useState<number>(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quest/pack/${packId}`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? 'Erreur');
      }
      const j = (await res.json()) as FetchedArc;
      setData(j);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [packId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleComplete = useCallback(
    async (slotKey: string) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/quest/pack/${packId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotKey }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? 'Erreur');
        }
        const j = (await res.json()) as CompletePayload;
        setData({ arc: j.arc, state: j.state });
        setRecentXp(j.xpEarned);
        if (j.rewardJustClaimed) setRecentReward(j.rewardJustClaimed);
        setOpenSlotKey(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setBusy(false);
      }
    },
    [busy, packId],
  );

  const findSlot = useCallback(
    (slotKey: string): { chapter: QuestPackArcChapter; slot: QuestPackArcSlot } | null => {
      if (!data) return null;
      const [chId, slug] = slotKey.split('.');
      const chapter = data.arc.chapters.find((c) => c.id === chId);
      if (!chapter) return null;
      const slot = chapter.slots.find((s) => s.slug === slug);
      if (!slot) return null;
      return { chapter, slot };
    },
    [data],
  );

  const slotStatus = useCallback(
    (slotKey: string): 'completed' | 'available' | 'locked' => {
      if (!data) return 'locked';
      for (const c of data.state.chapters) {
        for (const s of c.slots) {
          if (s.key === slotKey) return s.status;
        }
      }
      return 'locked';
    },
    [data],
  );

  if (!arcStatic || !packMeta) {
    return (
      <div className="min-h-screen bg-adventure">
        <Navbar />
        <main className="relative z-10 mx-auto max-w-3xl px-4 pt-24 pb-24">
          <p className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-800 ring-1 ring-rose-200">
            {loc === 'en' ? 'Unknown pack.' : 'Pack inconnu.'}
          </p>
          <Link href="/app/shop" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-violet-700 hover:underline">
            <Icon name="ChevronLeft" size="xs" /> {loc === 'en' ? 'Back to shop' : 'Retour boutique'}
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-adventure">
      <Navbar />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pt-24 pb-24">
        <Link
          href="/app/shop"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--link-on-bg)] hover:underline"
        >
          <Icon name="ChevronLeft" size="xs" />
          {loc === 'en' ? 'Back to shop' : 'Retour boutique'}
        </Link>

        <header className="rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm" aria-hidden>
              <Icon name={packMeta.icon} size="xl" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
                {loc === 'en' ? '10-quest journey' : 'Parcours de 10 quêtes'}
              </p>
              <h1 className="font-display text-2xl font-black leading-tight">
                {loc === 'en' ? packMeta.labelEn : packMeta.label}
              </h1>
              <p className="mt-1 text-sm font-medium opacity-90">
                {loc === 'en' ? packMeta.taglineEn : packMeta.tagline}
              </p>
            </div>
          </div>

          {data ? (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider opacity-90">
                <span>
                  {data.state.completedCount}/{data.state.totalSlots}{' '}
                  {loc === 'en' ? 'completed' : 'complétées'}
                </span>
                <span>{Math.round((data.state.completedCount / Math.max(1, data.state.totalSlots)) * 100)}%</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{
                    width: `${Math.round((data.state.completedCount / Math.max(1, data.state.totalSlots)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </header>

        {recentXp > 0 ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            +{recentXp} XP {loc === 'en' ? 'awarded' : 'crédités'}
          </p>
        ) : null}

        {recentReward ? <div className="mt-4"><RewardBanner reward={recentReward} loc={loc} /></div> : null}

        {data?.state.rewardClaimed && !recentReward ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {loc === 'en' ? 'Journey already completed — well done!' : 'Parcours déjà bouclé — bravo !'}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm font-bold text-[var(--muted)]">
            {loc === 'en' ? 'Loading…' : 'Chargement…'}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            {error}
          </p>
        ) : null}

        {data ? (
          <section className="mt-6 space-y-5">
            {data.state.chapters.map((c, i) => {
              const badge = chapterStatusBadge(c.status, loc);
              const fullChapter = data.arc.chapters[i];
              return (
                <article
                  key={c.id}
                  className={`rounded-2xl border bg-[var(--card)] p-4 shadow-sm ${
                    c.status === 'locked' ? 'border-[color:var(--border-ui)] opacity-70' : 'border-[color:var(--border-ui)]'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
                        {loc === 'en' ? `Chapter ${i + 1}` : `Chapitre ${i + 1}`}
                      </p>
                      <h2 className="font-display text-lg font-black text-[var(--text)]">
                        {pickLocale(loc, c.title)}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-[var(--muted)] leading-relaxed">
                        {pickLocale(loc, c.description)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${badge.className}`}
                    >
                      <Icon name={badge.icon} size="xs" aria-hidden />
                      {badge.label}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {c.slots.map((s, idx) => (
                      <SlotLine
                        key={s.key}
                        slot={s}
                        status={s.status}
                        loc={loc}
                        onOpen={() => {
                          if (s.status === 'locked') return;
                          setOpenSlotKey(s.key);
                          // Sourcing fullChapter for type safety; not displayed here.
                          void fullChapter?.slots[idx];
                        }}
                      />
                    ))}
                  </ul>
                </article>
              );
            })}

            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700">
                <Icon name="Trophy" size="xs" aria-hidden />
                {loc === 'en' ? 'Final reward' : 'Récompense finale'}
              </p>
              <p className="mt-1 text-sm font-bold text-amber-900">
                {loc === 'en'
                  ? `Title "${data.arc.rewardTitleId}" + ${data.arc.rewardCoins} Quest Coins`
                  : `Titre « ${data.arc.rewardTitleId} » + ${data.arc.rewardCoins} Quest Coins`}
              </p>
            </div>
          </section>
        ) : null}
      </main>

      {openSlotKey
        ? (() => {
            const found = findSlot(openSlotKey);
            if (!found || !data) return null;
            return (
              <SlotModal
                arc={data.arc}
                chapter={found.chapter}
                slot={found.slot}
                loc={loc}
                busy={busy}
                status={slotStatus(openSlotKey)}
                onClose={() => {
                  setOpenSlotKey(null);
                  setRecentXp(0);
                }}
                onComplete={() => void handleComplete(openSlotKey)}
              />
            );
          })()
        : null}
    </div>
  );
}
