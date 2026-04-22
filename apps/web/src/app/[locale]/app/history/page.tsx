'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Icon } from '@/components/Icons';
import { HISTORY_PAGE_SIZE, questDisplayEmoji, type EscalationPhase } from '@questia/shared';

type QuestTab = 'quests' | 'wallet';

type QuestHistoryRow = {
  id: string;
  questDate: string;
  archetypeId: number;
  archetypeTitle: string | null;
  emoji: string;
  title: string;
  mission: string;
  hook: string;
  duration: string;
  isOutdoor: boolean;
  destinationLabel: string | null;
  locationCity: string | null;
  weatherDescription: string | null;
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced';
  assignedAt: string;
  completedAt: string | null;
  phase: EscalationPhase;
  wasRerolled: boolean;
  xpAwarded: number | null;
};

type TxRow = {
  id: string;
  entryKind: string;
  coinsDelta: number | null;
  coinBalanceAfter: number | null;
  amountCents: number;
  currency: string;
  status: string;
  primarySku: string;
  label: string;
  createdAt: string;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function reusePayload(q: QuestHistoryRow) {
  const lines = [
    q.title?.trim(),
    '',
    q.mission?.trim(),
    q.hook ? `\n— ${q.hook.trim()}` : '',
    q.duration ? `\n⏱ ${q.duration}` : '',
  ].filter(Boolean);
  return lines.join('\n').trim();
}

const PHASE_PILL: Record<EscalationPhase, string> = {
  calibration: 'pill-calibration',
  expansion: 'pill-expansion',
  rupture: 'pill-rupture',
};

function histChip(active: boolean, tone: 'orange' | 'cyan' | 'green' | 'gold') {
  return `hist-chip ${active ? `hist-chip--on-${tone}` : ''}`.trim();
}

function HistoryPageInner() {
  const t = useTranslations('AppHistory');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: QuestTab = tabParam === 'wallet' ? 'wallet' : 'quests';

  const phaseLabel = useMemo(
    (): Record<EscalationPhase, string> => ({
      calibration: t('phaseCalibration'),
      expansion: t('phaseExpansion'),
      rupture: t('phaseRupture'),
    }),
    [t],
  );

  const statusQuestLabel = useMemo(
    (): Record<QuestHistoryRow['status'], string> => ({
      pending: t('fPending'),
      accepted: t('fAccepted'),
      completed: t('fCompleted'),
      rejected: t('fRejected'),
      replaced: t('fReplaced'),
    }),
    [t],
  );

  const entryKindLabel = useCallback(
    (k: string) => {
      const map: Record<string, string> = {
        legacy_stripe_product: t('entryKind_legacy_stripe_product'),
        stripe_coin_topup: t('entryKind_stripe_coin_topup'),
        coin_purchase: t('entryKind_coin_purchase'),
      };
      return map[k] ?? k;
    },
    [t],
  );

  const txStatusLabelFn = useCallback(
    (k: string) => {
      const map: Record<string, string> = {
        pending: t('txPending'),
        paid: t('txPaid'),
        failed: t('txFailed'),
        refunded: t('txRefunded'),
      };
      return map[k] ?? k;
    },
    [t],
  );

  const [quests, setQuests] = useState<QuestHistoryRow[] | null>(null);
  const [transactions, setTransactions] = useState<TxRow[] | null>(null);
  const [questHasMore, setQuestHasMore] = useState(true);
  const [txHasMore, setTxHasMore] = useState(true);
  const [questLoadingMore, setQuestLoadingMore] = useState(false);
  const [txLoadingMore, setTxLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [qSearch, setQSearch] = useState('');
  const [qStatus, setQStatus] = useState<'all' | QuestHistoryRow['status']>('all');
  const [qPhase, setQPhase] = useState<'all' | EscalationPhase>('all');
  const [qOutdoor, setQOutdoor] = useState<'all' | 'out' | 'in'>('all');

  const [wSearch, setWSearch] = useState('');
  const [wKind, setWKind] = useState<'all' | string>('all');
  const [wTxStatus, setWTxStatus] = useState<'all' | string>('all');
  const [wFlow, setWFlow] = useState<'all' | 'in' | 'out'>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const qUrl = `/api/quest/history?limit=${HISTORY_PAGE_SIZE}&offset=0`;
        const tUrl = `/api/shop/transactions?limit=${HISTORY_PAGE_SIZE}&offset=0`;
        const [rq, rt] = await Promise.all([
          fetch(qUrl, { credentials: 'include' }),
          fetch(tUrl, { credentials: 'include' }),
        ]);
        if (!rq.ok) {
          const j = await rq.json().catch(() => ({}));
          throw new Error(typeof j.error === 'string' ? j.error : t('errQuests'));
        }
        if (!rt.ok) {
          const j = await rt.json().catch(() => ({}));
          throw new Error(typeof j.error === 'string' ? j.error : t('errTx'));
        }
        const jq = (await rq.json()) as { quests: QuestHistoryRow[]; hasMore: boolean };
        const jt = (await rt.json()) as { transactions: TxRow[]; hasMore: boolean };
        if (!cancelled) {
          setQuests(jq.quests);
          setQuestHasMore(jq.hasMore);
          setTransactions(jt.transactions);
          setTxHasMore(jt.hasMore);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Erreur de chargement');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const loadMoreQuests = useCallback(async () => {
    if (!questHasMore || questLoadingMore || quests === null) return;
    setQuestLoadingMore(true);
    try {
      const offset = quests.length;
      const res = await fetch(`/api/quest/history?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { quests: QuestHistoryRow[]; hasMore: boolean };
      setQuests((prev) => {
        const base = prev ?? [];
        const seen = new Set(base.map((q) => q.id));
        const merged = [...base];
        for (const q of data.quests) {
          if (!seen.has(q.id)) {
            seen.add(q.id);
            merged.push(q);
          }
        }
        return merged;
      });
      setQuestHasMore(data.hasMore);
    } finally {
      setQuestLoadingMore(false);
    }
  }, [questHasMore, questLoadingMore, quests]);

  const loadMoreTx = useCallback(async () => {
    if (!txHasMore || txLoadingMore || transactions === null) return;
    setTxLoadingMore(true);
    try {
      const offset = transactions.length;
      const res = await fetch(`/api/shop/transactions?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { transactions: TxRow[]; hasMore: boolean };
      setTransactions((prev) => {
        const base = prev ?? [];
        const seen = new Set(base.map((t) => t.id));
        const merged = [...base];
        for (const t of data.transactions) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            merged.push(t);
          }
        }
        return merged;
      });
      setTxHasMore(data.hasMore);
    } finally {
      setTxLoadingMore(false);
    }
  }, [txHasMore, txLoadingMore, transactions]);

  const loading = quests === null || transactions === null;

  useEffect(() => {
    if (loading) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (tab === 'quests') void loadMoreQuests();
        else void loadMoreTx();
      },
      { root: null, rootMargin: '280px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [
    tab,
    loading,
    loadMoreQuests,
    loadMoreTx,
    questHasMore,
    txHasMore,
    questLoadingMore,
    txLoadingMore,
  ]);

  const kindOptions = useMemo(() => {
    const s = new Set<string>();
    (transactions ?? []).forEach((t) => s.add(t.entryKind));
    return Array.from(s).sort();
  }, [transactions]);

  const filteredQuests = useMemo(() => {
    const list = quests ?? [];
    const needle = normalize(qSearch.trim());
    return list.filter((q) => {
      if (qStatus !== 'all' && q.status !== qStatus) return false;
      if (qPhase !== 'all' && q.phase !== qPhase) return false;
      if (qOutdoor === 'out' && !q.isOutdoor) return false;
      if (qOutdoor === 'in' && q.isOutdoor) return false;
      if (!needle) return true;
      const hay = normalize(
        [q.title, q.mission, q.hook, q.destinationLabel, q.locationCity, q.archetypeTitle, q.questDate]
          .filter(Boolean)
          .join(' '),
      );
      return hay.includes(needle);
    });
  }, [quests, qSearch, qStatus, qPhase, qOutdoor]);

  const filteredTx = useMemo(() => {
    const list = transactions ?? [];
    const needle = normalize(wSearch.trim());
    return list.filter((t) => {
      if (wKind !== 'all' && t.entryKind !== wKind) return false;
      if (wTxStatus !== 'all' && t.status !== wTxStatus) return false;
      if (wFlow === 'in') {
        if (t.coinsDelta == null || t.coinsDelta <= 0) return false;
      }
      if (wFlow === 'out') {
        if (t.coinsDelta == null || t.coinsDelta >= 0) return false;
      }
      if (!needle) return true;
      const hay = normalize([t.label, t.primarySku, entryKindLabel(t.entryKind)].join(' '));
      return hay.includes(needle);
    });
  }, [transactions, wSearch, wKind, wTxStatus, wFlow, entryKindLabel]);

  const copyReuse = useCallback(async (q: QuestHistoryRow) => {
    const text = reusePayload(q);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(q.id);
      window.setTimeout(() => setCopiedId((id) => (id === q.id ? null : id)), 2000);
    } catch {
      setCopiedId(null);
    }
  }, []);

  return (
    <div className="min-h-screen bg-adventure">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-3 sm:px-5 pt-24 pb-20 outline-none">
        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--orange)] mb-2">{t('eyebrow')}</p>
          <h1 className="font-display font-black text-3xl text-[var(--text)]">{t('title')}</h1>
          <p className="mt-2 text-sm font-medium text-[var(--muted)] max-w-xl">{t('subtitle')}</p>
        </header>

        <nav className="hist-tabs mb-8" aria-label={t('navAria')}>
          <Link
            href="/app/history?tab=quests"
            scroll={false}
            aria-current={tab === 'quests' ? 'page' : undefined}
            className={`hist-tab ${tab === 'quests' ? 'hist-tab--active' : ''}`}
          >
            {t('tabQuests')}
          </Link>
          <Link
            href="/app/history?tab=wallet"
            scroll={false}
            aria-current={tab === 'wallet' ? 'page' : undefined}
            className={`hist-tab ${tab === 'wallet' ? 'hist-tab--active' : ''}`}
          >
            {t('tabWallet')}
          </Link>
        </nav>

        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-4 text-sm font-semibold text-red-900">
            {loadError}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : tab === 'quests' ? (
          <section aria-labelledby="hist-quests-heading">
            <h2 id="hist-quests-heading" className="sr-only">
              {t('srQuests')}
            </h2>

            <div className="hist-filters-panel space-y-4 mb-6">
              <label className="block">
                <span className="hist-field-label">{t('search')}</span>
                <input
                  type="search"
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  placeholder={t('qPlaceholder')}
                  className="hist-input"
                  autoComplete="off"
                />
              </label>

              <div className="hist-filter-row">
                <span className="hist-filter-name">{t('status')}</span>
                {(
                  [
                    ['all', t('fAll')],
                    ['completed', t('fCompleted')],
                    ['accepted', t('fAccepted')],
                    ['rejected', t('fRejected')],
                    ['replaced', t('fReplaced')],
                    ['pending', t('fPending')],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setQStatus(v)}
                    className={histChip(qStatus === v, 'orange')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="hist-filter-row">
                <span className="hist-filter-name">Phase</span>
                {(
                  [
                    ['all', 'Toutes'],
                    ['calibration', phaseLabel.calibration],
                    ['expansion', phaseLabel.expansion],
                    ['rupture', phaseLabel.rupture],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setQPhase(v)}
                    className={histChip(qPhase === v, 'cyan')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="hist-filter-row">
                <span className="hist-filter-name">{t('place')}</span>
                {(
                  [
                    ['all', t('fAll')],
                    ['out', t('fOutdoor')],
                    ['in', t('fIndoor')],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setQOutdoor(v)}
                    className={histChip(qOutdoor === v, 'green')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold text-[var(--subtle)] mb-4">
              {filteredQuests.length} résultat{filteredQuests.length > 1 ? 's' : ''} sur {(quests?.length ?? 0) === 0
                ? 'aucune entrée chargée'
                : `${quests?.length} entrée${(quests?.length ?? 0) > 1 ? 's' : ''} chargée${(quests?.length ?? 0) > 1 ? 's' : ''}`}
              {questHasMore ? " · d'autres entrées peuvent exister" : ' · historique entièrement chargé'}
            </p>

            {filteredQuests.length === 0 ? (
              <div>
                <p className="hist-empty">
                  {(quests?.length ?? 0) === 0 ? t('emptyQuests') : t('emptyQuestFilters')}
                </p>
                {(quests?.length ?? 0) > 0 && questHasMore ? (
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void loadMoreQuests()}
                      disabled={questLoadingMore}
                      className="hist-reuse-btn opacity-100 disabled:opacity-60"
                    >
                      {questLoadingMore ? t('loading') : t('loadMore')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <ul className="space-y-5">
                  {filteredQuests.map((q, i) => (
                    <li
                      key={q.id}
                      className="hist-quest-card hist-quest-card--enter"
                      style={{ animationDelay: `${Math.min(i, 16) * 42}ms` }}
                    >
                      <div className="hist-quest-card__bar" aria-hidden />
                      <div className="hist-quest-card__body">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex gap-3 min-w-0">
                            <Icon
                              name={questDisplayEmoji(q.emoji)}
                              size="xl"
                              className="shrink-0 text-orange-800/95"
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <p className="font-display font-black text-lg text-[var(--text)] leading-tight">{q.title}</p>
                              <p className="mt-1 text-xs font-semibold text-[var(--subtle)]">
                                {new Date(q.questDate).toLocaleDateString(dateLocale, {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}{' '}
                                · {statusQuestLabel[q.status]}
                                {q.wasRerolled ? ` · ${t('rerolled')}` : ''}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={PHASE_PILL[q.phase]}>{phaseLabel[q.phase]}</span>
                                {q.isOutdoor ? (
                                  <span className="pill-outdoor">{t('ext')}</span>
                                ) : (
                                  <span className="pill-indoor">{t('int')}</span>
                                )}
                                {q.xpAwarded != null ? (
                                  <span className="pill-xp-boost">+{q.xpAwarded} XP</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void copyReuse(q)}
                            className="hist-reuse-btn"
                          >
                            {copiedId === q.id ? t('copied') : t('reuse')}
                          </button>
                        </div>
                        {q.archetypeTitle ? (
                          <p className="mt-3 text-[11px] font-bold text-[var(--muted)]">
                            {t('inspiration')} {q.archetypeTitle}
                          </p>
                        ) : null}
                        <div className="hist-mission">{q.mission}</div>
                        {q.hook ? <p className="hist-hook">{q.hook}</p> : null}
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-[var(--subtle)]">
                          {q.duration ? <span>⏱ {q.duration}</span> : null}
                          {q.destinationLabel ? (
                            <span className="inline-flex items-center gap-1">
                              <Icon name="MapPin" size="xs" className="text-cyan-800 shrink-0" aria-hidden />
                              {q.destinationLabel}
                            </span>
                          ) : null}
                          {q.locationCity ? (
                            <span>
                              {t('city')} {q.locationCity}
                            </span>
                          ) : null}
                          {q.weatherDescription ? (
                            <span>
                              {t('weather')} {q.weatherDescription}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div ref={loadMoreRef} className="h-px w-full" aria-hidden />
                <div className="flex min-h-[3rem] flex-col items-center justify-center gap-2 py-4">
                  {questLoadingMore ? (
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  ) : null}
                  {!questHasMore && !questLoadingMore ? (
                    <p className="text-xs font-semibold text-[var(--subtle)]">{t('allLoaded')}</p>
                  ) : null}
                </div>
              </>
            )}
          </section>
        ) : (
          <section aria-labelledby="hist-wallet-heading">
            <h2 id="hist-wallet-heading" className="sr-only">
              {t('srWallet')}
            </h2>

            <div className="hist-filters-panel space-y-4 mb-6">
              <label className="block">
                <span className="hist-field-label">{t('search')}</span>
                <input
                  type="search"
                  value={wSearch}
                  onChange={(e) => setWSearch(e.target.value)}
                  placeholder={t('wPlaceholder')}
                  className="hist-input"
                  autoComplete="off"
                />
              </label>

              <div className="hist-filter-row">
                <span className="hist-filter-name">{t('type')}</span>
                <button type="button" onClick={() => setWKind('all')} className={histChip(wKind === 'all', 'cyan')}>
                  {t('fAll')}
                </button>
                {kindOptions.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setWKind(k)}
                    className={histChip(wKind === k, 'cyan')}
                  >
                    {entryKindLabel(k)}
                  </button>
                ))}
              </div>

              <div className="hist-filter-row">
                <span className="hist-filter-name">{t('payStatus')}</span>
                {(['all', 'paid', 'pending', 'failed', 'refunded'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setWTxStatus(v)}
                    className={histChip(wTxStatus === v, 'gold')}
                  >
                    {v === 'all' ? t('fAll') : txStatusLabelFn(v)}
                  </button>
                ))}
              </div>

              <div className="hist-filter-row">
                <span className="hist-filter-name">{t('qcFlow')}</span>
                {(
                  [
                    ['all', t('fAll')],
                    ['in', t('flowIn')],
                    ['out', t('flowOut')],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setWFlow(v)}
                    className={histChip(wFlow === v, 'green')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold text-[var(--subtle)] mb-4">
              {t('resultsTx', { count: filteredTx.length })}{' '}
              {t('histOn')}{' '}
              {(transactions?.length ?? 0) === 0
                ? t('histLoadedNone')
                : t('histLoadedSome', { count: transactions?.length ?? 0 })}
              {txHasMore ? t('hintMore') : t('hintDone')}
            </p>

            {filteredTx.length === 0 ? (
              <div>
                <p className="hist-empty">
                  {(transactions?.length ?? 0) === 0 ? t('emptyTx') : t('emptyTxFilters')}
                </p>
                {(transactions?.length ?? 0) > 0 && txHasMore ? (
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void loadMoreTx()}
                      disabled={txLoadingMore}
                      className="hist-reuse-btn opacity-100 disabled:opacity-60"
                    >
                      {txLoadingMore ? t('loading') : t('loadMore')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <ul className="hist-tx-list divide-y divide-[color:var(--border-ui)]">
                  {filteredTx.map((tx) => (
                    <li key={tx.id} className="px-4 py-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[var(--text)] block">{tx.label}</span>
                        <span className="text-[var(--subtle)] font-mono text-[10px]">{tx.primarySku}</span>
                        <span className="block text-[10px] font-bold text-[var(--muted)] mt-1">
                          {entryKindLabel(tx.entryKind)} · {txStatusLabelFn(tx.status)}
                        </span>
                      </div>
                      <div className="text-right">
                        {tx.coinsDelta != null ? (
                          <span
                            className={`font-black tabular-nums ${
                              tx.coinsDelta >= 0 ? 'text-[var(--green)]' : 'text-[var(--orange)]'
                            }`}
                          >
                            {tx.coinsDelta >= 0 ? '+' : ''}
                            {tx.coinsDelta} QC
                          </span>
                        ) : null}
                        {tx.amountCents > 0 ? (
                          <span className="block text-xs text-[var(--muted)] font-semibold">
                            {(tx.amountCents / 100).toFixed(2).replace('.', ',')} {tx.currency.toUpperCase()}
                          </span>
                        ) : null}
                        {tx.coinBalanceAfter != null ? (
                          <span className="block text-[10px] text-[var(--subtle)]">
                            {t('balanceAfter', { n: tx.coinBalanceAfter })}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-[var(--subtle)] w-full font-medium">
                        {new Date(tx.createdAt).toLocaleString(dateLocale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
                <div ref={loadMoreRef} className="h-px w-full" aria-hidden />
                <div className="flex min-h-[3rem] flex-col items-center justify-center gap-2 py-4">
                  {txLoadingMore ? (
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  ) : null}
                  {!txHasMore && !txLoadingMore ? (
                    <p className="text-xs font-semibold text-[var(--subtle)]">{t('allLoaded')}</p>
                  ) : null}
                </div>
              </>
            )}

            <p className="mt-6 text-center text-xs text-[var(--subtle)]">
              {t('walletFooterBefore')}
              <Link href="/app/shop" className="font-bold text-[var(--orange)] underline-offset-2 hover:underline">
                {t('shopLink')}
              </Link>
              {t('walletFooterAfter')}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-adventure">
          <Navbar />
          <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-3 sm:px-5 pt-24 pb-24 flex justify-center outline-none">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </main>
        </div>
      }
    >
      <HistoryPageInner />
    </Suspense>
  );
}
