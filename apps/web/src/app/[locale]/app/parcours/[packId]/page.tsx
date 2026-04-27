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
      className:
        'border border-[color:color-mix(in_srgb,var(--green)_32%,var(--border-ui))] bg-[color-mix(in_srgb,var(--green)_12%,var(--surface))] text-[var(--green)]',
      icon: 'CheckCircle2',
    };
  }
  if (status === 'in_progress') {
    return {
      label: loc === 'en' ? 'In progress' : 'En cours',
      className:
        'border border-[color:color-mix(in_srgb,var(--orange)_28%,var(--border-ui))] bg-[color-mix(in_srgb,var(--gold)_18%,var(--card))] text-[var(--text)]',
      icon: 'PlayCircle',
    };
  }
  return {
    label: loc === 'en' ? 'Locked' : 'Verrouillé',
    className: 'border border-[color:var(--border-ui)] bg-[color-mix(in_srgb,var(--text)_5%,var(--card))] text-[var(--muted)]',
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
          ? 'border-[color:color-mix(in_srgb,var(--green)_32%,var(--border-ui))] bg-[color-mix(in_srgb,var(--green)_8%,var(--card))]'
          : isLocked
            ? 'border-[color:var(--border-ui)] bg-[var(--surface)]/70 opacity-55'
            : 'card cursor-pointer border-[color:color-mix(in_srgb,var(--orange)_12%,var(--border-ui))] shadow-sm hover:-translate-y-px hover:shadow-md motion-reduce:transform-none'
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
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
          isDone
            ? 'border-[color:color-mix(in_srgb,var(--green)_35%,transparent)] bg-[color-mix(in_srgb,var(--green)_16%,var(--card))] text-[var(--green)]'
            : isLocked
              ? 'border-[color:var(--border-ui)] bg-[color-mix(in_srgb,var(--text)_6%,var(--card))] text-[var(--muted)]'
              : 'border-[color:color-mix(in_srgb,var(--violet)_24%,var(--border-ui))] bg-[color-mix(in_srgb,var(--violet)_9%,var(--card))] text-[var(--violet)]'
        }`}
        aria-hidden
      >
        <Icon name={isDone ? 'Check' : isLocked ? 'Lock' : slot.icon} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-bold leading-tight ${
            isDone
              ? 'text-[color:color-mix(in_srgb,var(--green)_88%,var(--text))] line-through decoration-[color:color-mix(in_srgb,var(--green)_45%,transparent)]'
              : 'text-[var(--text)]'
          }`}
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
        <Icon name="ChevronRight" size="sm" className="text-[var(--link-on-bg)]" aria-hidden />
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
    <div
      className="quest-modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="quest-modal-sheet flex max-h-[min(90vh,760px)] w-full max-w-xl flex-col overflow-hidden sm:max-h-[min(88vh,720px)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="quest-modal-panel-accent shrink-0" aria-hidden />
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[color:var(--border-ui)] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--orange)_30%,var(--border-ui))] bg-[color-mix(in_srgb,var(--violet)_9%,var(--card))] text-[var(--violet)]"
              aria-hidden
            >
              <Icon name={slot.icon} size="lg" />
            </span>
            <div className="min-w-0">
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
            className="shrink-0 rounded-full p-2 text-[var(--muted)] transition hover:bg-[color-mix(in_srgb,var(--text)_6%,var(--card))] hover:text-[var(--text)]"
            aria-label={loc === 'en' ? 'Close' : 'Fermer'}
          >
            <Icon name="X" size="md" />
          </button>
        </header>

        <div className="quest-modal-panel-body min-h-0 flex-1 space-y-4 overflow-y-auto">
          <p className="text-sm font-semibold leading-relaxed text-[var(--text)]">
            {pickLocale(loc, slot.mission)}
          </p>
          <p className="app-hook-quote p-4 text-sm italic leading-relaxed text-[var(--text)]">
            « {pickLocale(loc, slot.hook)} »
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="Clock" size="xs" aria-hidden />
              {slot.durationMinutes < 60
                ? `${slot.durationMinutes} min`
                : `~${Math.round(slot.durationMinutes / 60)} h`}
            </span>
            <span aria-hidden>·</span>
            <span>+{slot.xp} XP</span>
          </div>
          {safety ? (
            <p className="flex items-start gap-2 rounded-xl border-2 border-[color:color-mix(in_srgb,var(--gold)_40%,var(--border-ui))] bg-[color-mix(in_srgb,var(--gold)_14%,var(--card))] p-3.5 text-xs font-semibold leading-relaxed text-[var(--text)]">
              <Icon name="ShieldAlert" size="xs" className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden />
              <span>{safety}</span>
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[color:var(--border-ui)] bg-[color-mix(in_srgb,var(--surface)_64%,var(--card))] px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
          >
            {loc === 'en' ? 'Later' : 'Plus tard'}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={busy || status !== 'available'}
            className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-50"
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
            <span className="text-[10px] font-bold opacity-90">+{slot.xp} XP</span>
          </button>
        </footer>
        <span className="sr-only">{arc.packId}</span>
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
    <div className="app-shop-balance-card p-5 motion-safe:animate-fade-up">
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--gold)_50%,var(--border-ui))] bg-[color-mix(in_srgb,var(--gold)_18%,var(--card))] text-[var(--gold)]"
          aria-hidden
        >
          <Icon name="Trophy" size="lg" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-[var(--gold)]">
            {loc === 'en' ? 'Journey complete' : 'Parcours terminé'}
          </p>
          <p className="font-display text-xl font-black text-[var(--text)]">
            {loc === 'en' ? 'Title unlocked + bonus QC' : 'Titre débloqué + bonus QC'}
          </p>
          <p className="mt-1.5 text-sm font-bold leading-snug text-[var(--text)]">
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
      <main className="relative z-10 mx-auto max-w-2xl px-4 pt-24 pb-28">
        <Link
          href="/app/shop"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--link-on-bg)] transition hover:underline"
        >
          <Icon name="ChevronLeft" size="xs" />
          {loc === 'en' ? 'Back to shop' : 'Retour boutique'}
        </Link>

        <header className="app-app-hero-band p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--orange)_38%,var(--border-ui))] bg-[var(--card)] text-[var(--violet)] shadow-sm"
              aria-hidden
            >
              <Icon name={packMeta.icon} size="xl" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">
                {loc === 'en' ? '10-quest journey' : 'Parcours de 10 quêtes'}
              </p>
              <h1 className="font-display text-2xl font-black leading-tight text-[var(--text)] sm:text-3xl">
                {loc === 'en' ? packMeta.labelEn : packMeta.label}
              </h1>
              <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[var(--muted)]">
                {loc === 'en' ? packMeta.taglineEn : packMeta.tagline}
              </p>
            </div>
          </div>

          {data ? (
            <div className="mt-6">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
                <span>
                  {data.state.completedCount}/{data.state.totalSlots}{' '}
                  {loc === 'en' ? 'completed' : 'complétées'}
                </span>
                <span className="tabular-nums text-[var(--text)]">
                  {Math.round((data.state.completedCount / Math.max(1, data.state.totalSlots)) * 100)}%
                </span>
              </div>
              <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[var(--progress-track)] ring-1 ring-[color:color-mix(in_srgb,var(--text)_5%,transparent)]">
                <div
                  className="h-full rounded-full bg-[var(--green)] shadow-[0_0_12px_color-mix(in_srgb,var(--green)_40%,transparent)] transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.round((data.state.completedCount / Math.max(1, data.state.totalSlots)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </header>

        {recentXp > 0 ? (
          <p className="streak-badge mt-5 w-full justify-center text-sm font-black text-[var(--green)]">
            +{recentXp} XP {loc === 'en' ? 'awarded' : 'crédités'}
          </p>
        ) : null}

        {recentReward ? <div className="mt-4"><RewardBanner reward={recentReward} loc={loc} /></div> : null}

        {data?.state.rewardClaimed && !recentReward ? (
          <p className="streak-badge mt-5 w-full justify-center text-sm font-black text-[var(--text)]">
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
          <section className="mt-8">
            <p className="label mb-3 px-0.5">
              {loc === 'en' ? 'Your path' : 'Ton parcours'}
            </p>
            <div className="relative space-y-5">
            {data.state.chapters.map((c, i) => {
              const badge = chapterStatusBadge(c.status, loc);
              const fullChapter = data.arc.chapters[i];
              return (
                <article
                  key={c.id}
                  className={`app-shop-featured-card relative p-5 sm:pl-6 ${
                    c.status === 'locked' ? 'opacity-[0.72]' : ''
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex shrink-0 items-start pt-0.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[color:color-mix(in_srgb,var(--violet)_35%,var(--border-ui))] bg-[var(--card)] font-display text-sm font-black text-[var(--text)] shadow-sm"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
                        {loc === 'en' ? `Chapter ${i + 1}` : `Chapitre ${i + 1}`}
                      </p>
                      <h2 className="font-display text-lg font-black leading-snug text-[var(--text)] sm:text-xl">
                        {pickLocale(loc, c.title)}
                      </h2>
                      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[var(--muted)]">
                        {pickLocale(loc, c.description)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider ${badge.className}`}
                    >
                      <Icon name={badge.icon} size="xs" aria-hidden />
                      {badge.label}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
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

            <div className="app-shop-balance-card border-2 border-dashed border-[color:color-mix(in_srgb,var(--gold)_45%,var(--border-ui))] p-5">
              <p className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-[var(--gold)]">
                <Icon name="Trophy" size="xs" aria-hidden />
                {loc === 'en' ? 'Final reward' : 'Récompense finale'}
              </p>
              <p className="mt-2 text-sm font-bold leading-relaxed text-[var(--text)]">
                {loc === 'en'
                  ? `Title "${data.arc.rewardTitleId}" + ${data.arc.rewardCoins} Quest Coins`
                  : `Titre « ${data.arc.rewardTitleId} » + ${data.arc.rewardCoins} Quest Coins`}
              </p>
            </div>
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
