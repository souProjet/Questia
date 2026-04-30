'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import {
  SHOP_CATALOG,
  COIN_PACKS,
  getCoinPack,
  XP_SHOP_BONUS_PER_CHARGE,
  bonusPercentVsPack,
  questCoinsPerEuro,
  catalogItemFullyOwned,
  buildCoinPurchasedSkuSet,
  QUESTIA_SHOP_GRANTS_UPDATED,
  type ShopCatalogEntry,
  type CoinPackEntry,
  type ShopMarketingBadge,
  type QuestPackKind,
} from '@questia/shared';
import { AnalyticsEvent } from '@/lib/analytics/events';
import { trackAnalyticsEvent } from '@/lib/analytics/track';
import { trackMetaPixelEvent } from '@/lib/analytics/trackMeta';
import { Icon } from '@/components/Icons';

function notifyQuestScreenShopGrantsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUESTIA_SHOP_GRANTS_UPDATED));
  }
}

/* ─── Modale recharge QC ─────────────────────────────────────────────────── */

function RechargeModalContent({
  coinPacksSorted,
  coinPackReference,
  stripeLoadingSku,
  balance,
  onClose,
  onPay,
  onShowInfo,
}: {
  coinPacksSorted: CoinPackEntry[];
  coinPackReference: CoinPackEntry | undefined;
  stripeLoadingSku: string | null;
  balance: number;
  onClose: () => void;
  onPay: (sku: string) => void;
  onShowInfo: (title: string, body: string) => void;
}) {
  const t = useTranslations('AppShop');
  const locale = useLocale();
  const numLocale = locale === 'en' ? 'en-US' : 'fr-FR';

  return (
    <div className="flex max-h-[min(88vh,640px)] min-h-0 flex-col">
      {/* ── En-tête compact ── */}
      <header className="shrink-0 flex items-center justify-between gap-3 border-b border-[color:var(--border-ui)] px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 id="recharge-modal-title" className="font-display font-black text-lg text-[var(--text)]">
            {t('rechargeTitle')}
          </h2>
          <p className="mt-0.5 text-xs font-medium text-[var(--muted)]">
            {t('currentBalance')} <span className="font-black text-[var(--text)] tabular-nums">{balance.toLocaleString(numLocale)} QC</span>
            {' · '}
            <span className="inline-flex items-center gap-1">
              <Icon name="Lock" size="xs" className="text-[var(--green)] shrink-0" aria-hidden />
              {t('securePay')}
            </span>
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]"
          onClick={onClose}
          aria-label={t('close')}
        >
          <Icon name="X" size="md" />
        </button>
      </header>

      {/* ── Packs ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <ul className="grid gap-3 sm:grid-cols-3">
          {coinPacksSorted.map((pack) => {
            const eur = (pack.priceCents / 100).toFixed(2).replace('.', ',');
            const qcPerEur = questCoinsPerEuro(pack.priceCents, pack.coinsGranted);
            const bonusVsStarter =
              coinPackReference && pack.sku !== coinPackReference.sku
                ? bonusPercentVsPack(pack, coinPackReference)
                : 0;
            const isBest = pack.marketing?.badge === 'best_value';
            return (
              <li
                key={pack.sku}
                className={`flex flex-col rounded-2xl border-2 p-4 ${
                  isBest
                    ? 'border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-200/50'
                    : 'border-[color:var(--border-ui)] bg-[var(--card)]'
                }`}
              >
                {/* Badge */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  {pack.marketing?.badge ? (
                    <MarketingBadge badge={pack.marketing.badge} />
                  ) : (
                    <span />
                  )}
                  {pack.contentsDetail ? (
                    <button
                      type="button"
                      className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-[color:var(--border-ui)] bg-[var(--surface)] text-[10px] font-black text-[var(--muted)] hover:bg-[var(--card)]"
                      aria-label={t('moreInfo', { name: pack.name })}
                      onClick={() => onShowInfo(pack.name, pack.contentsDetail!)}
                    >
                      i
                    </button>
                  ) : null}
                </div>

                {/* Montant QC */}
                <p className={`font-display text-3xl font-black leading-none tracking-tight ${isBest ? 'text-emerald-800' : 'text-[var(--green)]'}`}>
                  +{pack.coinsGranted.toLocaleString(numLocale)}
                  <span className="ml-1 text-lg">QC</span>
                </p>

                {/* Taux */}
                <p className={`mt-1 text-[11px] font-bold ${isBest ? 'text-emerald-600' : 'text-[var(--green)]'}`}>
                  {t('qcPerEur', { n: Math.round(qcPerEur) })}
                  {bonusVsStarter > 0 ? (
                    <span className="ml-1 font-black">{t('vsStarter', { n: bonusVsStarter })}</span>
                  ) : null}
                </p>

                {/* Prix + CTA */}
                <div className="mt-auto pt-4">
                  <p className="font-display text-2xl font-black tabular-nums text-[var(--text)]">
                    {eur} €
                  </p>
                  <button
                    type="button"
                    disabled={stripeLoadingSku === pack.sku}
                    onClick={() => onPay(pack.sku)}
                    className="btn btn-primary btn-sm mt-3 w-full font-black disabled:opacity-50"
                  >
                    {stripeLoadingSku === pack.sku ? t('redirecting') : t('payAmount', { amount: eur })}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Footer minimaliste ── */}
      <footer className="shrink-0 border-t border-[color:var(--border-ui)] px-5 py-2.5 text-center sm:px-6">
        <p className="text-[11px] text-[var(--subtle)]">{t('rechargeFooter')}</p>
      </footer>
    </div>
  );
}

/* ─── Badge marketing ─────────────────────────────────────────────────────── */

function MarketingBadge({ badge }: { badge: ShopMarketingBadge }) {
  const t = useTranslations('AppShop');
  const labels: Record<ShopMarketingBadge, string> = {
    featured: t('mbFeatured'),
    best_value: t('mbBest'),
    popular: t('mbPopular'),
    starter: t('mbStarter'),
    new: t('mbNew'),
  };
  const styles: Record<ShopMarketingBadge, string> = {
    featured: 'bg-gradient-to-r from-violet-600 to-amber-500 text-white border-0',
    best_value: 'bg-emerald-600 text-white border-emerald-700',
    popular: 'bg-orange-500 text-white border-orange-600',
    starter: 'bg-[#64748b] text-white border-[color:var(--border-ui-strong)]',
    new: 'bg-cyan-600 text-white border-cyan-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border ${styles[badge]}`}>
      {labels[badge]}
    </span>
  );
}

/* ─── Types ───────────────────────────────────────────────────────────────── */

type ShopFlash = { message: string; kind: 'success' | 'error' | 'info' };

type ProfileShop = {
  coinBalance: number;
  activeThemeId: string;
  bonusRerollCredits: number;
  xpBonusCharges: number;
  ownedThemes?: string[];
  ownedTitleIds?: string[];
  ownedQuestPackIds?: string[];
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

/* ─── Filtres packs de quêtes (vibe / lifestyle / location) ───────────────── */

const PACK_KIND_META: Record<QuestPackKind, { fr: string; en: string; icon: string }> = {
  vibe: { fr: 'Ambiances', en: 'Vibes', icon: 'Sparkles' },
  lifestyle: { fr: 'Style de vie', en: 'Lifestyle', icon: 'Leaf' },
  location: { fr: 'Lieux', en: 'Locations', icon: 'MapPin' },
};

/* ─── Page principale ─────────────────────────────────────────────────────── */

function ShopPageInner() {
  const t = useTranslations('AppShop');
  const locale = useLocale();
  const numLocale = locale === 'en' ? 'en-US' : 'fr-FR';

  const searchParams = useSearchParams();

  const coinPacksSorted = useMemo(
    () => [...COIN_PACKS].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [],
  );
  const coinPackReference = coinPacksSorted[0];

  const { bundleItem, boostItems, rerollItems, questPackItems } = useMemo(() => ({
    bundleItem: SHOP_CATALOG.find((i) => i.kind === 'bundle'),
    boostItems: SHOP_CATALOG.filter((i) => i.kind === 'xp_booster'),
    rerollItems: SHOP_CATALOG.filter((i) => i.kind === 'reroll_pack'),
    questPackItems: SHOP_CATALOG.filter((i) => i.kind === 'quest_pack'),
  }), []);

  const [questPackFilter, setQuestPackFilter] = useState<QuestPackKind | 'all'>('all');
  const filteredQuestPacks = useMemo(() => {
    if (questPackFilter === 'all') return questPackItems;
    return questPackItems.filter((p) => p.questPackKind === questPackFilter);
  }, [questPackItems, questPackFilter]);

  const [shop, setShop] = useState<ProfileShop | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoadingSku, setStripeLoadingSku] = useState<string | null>(null);
  const [coinPurchaseSku, setCoinPurchaseSku] = useState<string | null>(null);
  const [flash, setFlash] = useState<ShopFlash | null>(null);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);
  const [balanceAnimTick, setBalanceAnimTick] = useState(0);
  const [purchaseHighlightSku, setPurchaseHighlightSku] = useState<string | null>(null);
  const [celebratePurchase, setCelebratePurchase] = useState(false);

  const runPurchaseCelebration = useCallback((sku: string) => {
    setBalanceAnimTick((n) => n + 1);
    setPurchaseHighlightSku(sku);
    setCelebratePurchase(true);
    window.setTimeout(() => setCelebratePurchase(false), 2200);
    window.setTimeout(() => setPurchaseHighlightSku(null), 1800);
  }, []);

  const coinPurchasedSkus = useMemo(() => buildCoinPurchasedSkuSet(transactions), [transactions]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch('/api/profile', { cache: 'no-store' }),
        fetch('/api/shop/transactions', { cache: 'no-store' }),
      ]);
      if (!pRes.ok) {
        setError(pRes.status === 401 ? t('err401') : t('errProfile'));
        setLoading(false);
        return;
      }
      const pJson = (await pRes.json()) as { shop?: ProfileShop };
      setShop(pJson.shop ?? null);

      if (tRes.ok) {
        const tJson = (await tRes.json()) as { transactions?: TxRow[] };
        setTransactions(tJson.transactions ?? []);
      }
    } catch {
      setError(t('errLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    if (success === '1') {
      void load().then(() => {
        notifyQuestScreenShopGrantsUpdated();
      });
      let skipDup = false;
      try {
        skipDup = sessionStorage.getItem('questia_stripe_purchase_done') === '1';
      } catch { /* ignore */ }
      let sku: string | null = null;
      try {
        sku = sessionStorage.getItem('questia_checkout_sku');
        if (sku) sessionStorage.removeItem('questia_checkout_sku');
      } catch { /* ignore */ }
      const pack = sku ? getCoinPack(sku) : undefined;
      const valueEur = pack ? pack.priceCents / 100 : 0;
      if (sku && !skipDup) {
        try {
          sessionStorage.setItem('questia_stripe_purchase_done', '1');
        } catch { /* ignore */ }
        trackAnalyticsEvent(AnalyticsEvent.purchase, {
          currency: 'EUR',
          value: valueEur,
          transaction_id: `stripe_coin_${sku}_${Date.now()}`,
          items: [{ item_id: sku, item_name: pack?.name ?? sku }],
          payment_type: 'stripe',
        });
        trackMetaPixelEvent('Purchase', {
          currency: 'EUR',
          value: valueEur,
          content_ids: [sku],
          content_type: 'product',
        });
      }
      setFlash({ message: t('flashPaid'), kind: 'success' });
      setBalanceAnimTick((n) => n + 1);
      setCelebratePurchase(true);
      window.setTimeout(() => setCelebratePurchase(false), 2200);
    }
    if (canceled === '1') setFlash({ message: t('flashCanceled'), kind: 'info' });
  }, [searchParams, load, t]);

  useEffect(() => {
    const themeId = shop?.activeThemeId ?? 'default';
    if (themeId === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', themeId);
  }, [shop?.activeThemeId]);

  const rechargeStripe = async (sku: string) => {
    setStripeLoadingSku(sku);
    setFlash(null);
    try {
      const pack = getCoinPack(sku);
      const valueEur = pack ? pack.priceCents / 100 : 0;
      trackAnalyticsEvent(AnalyticsEvent.beginCheckout, {
        currency: 'EUR',
        value: valueEur,
        items: [{ item_id: sku, item_name: pack?.name ?? sku }],
      });
      trackMetaPixelEvent('InitiateCheckout', {
        currency: 'EUR',
        value: valueEur,
        content_ids: [sku],
        content_type: 'product',
      });
      try {
        sessionStorage.setItem('questia_checkout_sku', sku);
        sessionStorage.removeItem('questia_stripe_purchase_done');
      } catch { /* ignore */ }
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setFlash({ message: data.error ?? t('errCheckout'), kind: 'error' });
        return;
      }
      window.location.href = data.url;
    } catch {
      setFlash({ message: t('errCheckout'), kind: 'error' });
    } finally {
      setStripeLoadingSku(null);
    }
  };

  const buyWithCoins = async (sku: string) => {
    setCoinPurchaseSku(sku);
    setFlash(null);
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      const data = (await res.json()) as { error?: string; coinBalance?: number };
      if (!res.ok) {
        setFlash({ message: data.error ?? t('errPurchase'), kind: 'error' });
        return;
      }
      const cat = SHOP_CATALOG.find((e) => e.sku === sku);
      trackAnalyticsEvent(AnalyticsEvent.purchase, {
        currency: 'EUR',
        value: 0,
        items: [{ item_id: sku, item_name: cat?.name ?? sku }],
        payment_type: 'quest_coins',
      });
      trackMetaPixelEvent('Purchase', {
        currency: 'EUR',
        value: 0,
        content_ids: [sku],
        content_type: 'product',
      });
      await load();
      notifyQuestScreenShopGrantsUpdated();
      runPurchaseCelebration(sku);
    } catch {
      setFlash({ message: t('errPurchase'), kind: 'error' });
    } finally {
      setCoinPurchaseSku(null);
    }
  };

  const balance = shop?.coinBalance ?? 0;

  /* Rendu d'une carte catalogue standard */
  const renderCatalogCard = (item: ShopCatalogEntry) => {
    if (!shop) return null;
    const owns = catalogItemFullyOwned(item, shop, coinPurchasedSkus);
    const affordable = balance >= item.priceCoins;
    const bump = purchaseHighlightSku === item.sku;
    const m = item.marketing;

    return (
      <li
        key={item.sku}
        className={`shop-elevated-surface rounded-2xl border p-5 flex flex-col gap-3 transition-shadow duration-300 ${
          m?.badge === 'best_value'
            ? 'border-emerald-300/80 ring-1 ring-emerald-200/60'
            : 'border-[color:var(--border-ui)]'
        } ${bump ? 'motion-safe:animate-shop-card-bump motion-reduce:ring-2 motion-reduce:ring-amber-300/50' : ''}`}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] ring-1 ring-[color:var(--border-ui)]" aria-hidden>
            <Icon name={item.icon} size="lg" className="text-[var(--orange)]" />
          </span>
          <div className="flex flex-wrap items-center gap-1 justify-end">
            {m?.badge ? <MarketingBadge badge={m.badge} /> : null}
            {item.contentsDetail ? (
              <button
                type="button"
                className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-ui-strong)] bg-[var(--card)] text-[10px] font-black text-[var(--muted)] hover:bg-[var(--surface)]"
                aria-label={t('moreInfo', { name: item.name })}
                onClick={() => setInfoModal({ title: item.name, body: item.contentsDetail! })}
              >
                i
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1">
          <p className="font-black text-[var(--text)]">{item.name}</p>
          <p className="mt-1.5 text-xs text-[var(--muted)] font-medium leading-relaxed">{item.description}</p>
          {item.includedItems?.length ? (
            <ul className="mt-3 space-y-1.5">
              {item.includedItems.map((line) => (
                <li key={line} className="flex gap-2 text-[11px] font-semibold leading-snug text-[var(--muted)]">
                  <Icon name="Check" size="xs" className="mt-0.5 shrink-0 text-[var(--green)]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {m?.hook ? (
            <p className="mt-2 text-[11px] font-bold text-[var(--green)]">{m.hook}</p>
          ) : null}
          {m?.compareAtCoins != null && m.savingsCoins != null ? (
            <p className="mt-2 text-xs text-[var(--subtle)]">
              <span className="line-through tabular-nums">{m.compareAtCoins.toLocaleString(numLocale)} QC</span>
              <span className="mx-1.5 font-bold text-[var(--green)]">−{m.savingsCoins.toLocaleString(numLocale)} QC</span>
              <span className="text-[var(--subtle)]">{t('vsSeparate')}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[color:var(--border-ui)]">
          <span className="font-display text-xl font-black text-[var(--orange)] tabular-nums">
            {item.priceCoins.toLocaleString(numLocale)} QC
          </span>
          {owns ? (
            item.kind === 'quest_pack' && item.grants.questPackIds?.[0] ? (
              <Link
                href={`/app/parcours/${item.grants.questPackIds[0]}?from=shop`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-sm transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Icon name="Compass" size="xs" aria-hidden />
                {locale === 'en' ? 'View journey' : 'Voir le parcours'}
              </Link>
            ) : (
              <span className="text-xs font-black uppercase tracking-wider text-[var(--green)]">{t('owned')}</span>
            )
          ) : (
            <button
              type="button"
              disabled={coinPurchaseSku === item.sku}
              onClick={() => {
                if (!affordable) { setRechargeOpen(true); return; }
                void buyWithCoins(item.sku);
              }}
              className={`btn btn-primary btn-md text-sm font-black transition-transform duration-150 hover:scale-[1.03] hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${
                !affordable && coinPurchaseSku !== item.sku ? 'ring-2 ring-amber-400/80 ring-offset-2 ring-offset-[var(--card)]' : ''
              }`}
              title={!affordable ? t('insufficientHint') : undefined}
            >
              {coinPurchaseSku === item.sku ? '…' : t('buy')}
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-adventure">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="relative z-10 max-w-4xl mx-auto px-3 sm:px-5 pt-24 pb-24 outline-none">

        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--link-on-bg)] hover:underline mb-6"
        >
          {t('back')}
        </Link>

        <h1 className="font-display font-black text-3xl text-[var(--text)] mb-6">{t('title')}</h1>

        {/* Messages flash */}
        {flash ? (
          <div
            role={flash.kind === 'error' ? 'alert' : 'status'}
            key={flash.message}
            className={`mb-6 rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--text)] motion-safe:animate-fade-up motion-reduce:animate-none ${
              flash.kind === 'success' ? 'shop-flash-success' : flash.kind === 'error' ? 'shop-flash-error' : 'shop-flash-info'
            }`}
          >
            {flash.message}
          </div>
        ) : null}

        {error && (
          <p className="shop-flash-error rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--text)]">
            {error}
          </p>
        )}

        {loading && !error && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        )}

        {shop && !loading && (
          <>
            {/* Confettis d'achat */}
            {celebratePurchase ? (
              <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
                <div className="absolute inset-0 bg-gradient-to-b from-amber-300/45 via-fuchsia-400/15 to-cyan-400/25 motion-safe:animate-shop-celebration-overlay motion-reduce:hidden" />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 via-transparent to-amber-200/20 motion-safe:animate-shop-gold-flash motion-reduce:hidden" />
                {(
                  [
                    { icon: 'Sparkles', left: '10%', top: '24%', delay: '0ms', orbit: false },
                    { icon: 'Sparkles', left: '82%', top: '18%', delay: '90ms', orbit: true },
                    { icon: 'Star', left: '44%', top: '62%', delay: '160ms', orbit: false },
                    { icon: 'Sparkles', left: '78%', top: '48%', delay: '220ms', orbit: true },
                    { icon: 'Coins', left: '50%', top: '42%', delay: '100ms', orbit: false },
                    { icon: 'Gem', left: '18%', top: '52%', delay: '280ms', orbit: true },
                    { icon: 'Flame', left: '64%', top: '28%', delay: '40ms', orbit: false },
                    { icon: 'Sparkles', left: '36%', top: '34%', delay: '340ms', orbit: true },
                  ] as const
                ).map((s, i) => (
                  <span
                    key={i}
                    className={`absolute motion-reduce:hidden ${s.orbit ? 'motion-safe:animate-shop-sparkle-orbit' : 'motion-safe:animate-shop-sparkle'}`}
                    style={{ left: s.left, top: s.top, animationDelay: s.delay }}
                  >
                    <Icon name={s.icon} size="xl" className="text-amber-600 sm:h-10 sm:w-10" />
                  </span>
                ))}
                {(['60ms', '140ms', '200ms'] as const).map((delay, i) => (
                  <span
                    key={delay}
                    className="absolute motion-safe:animate-shop-coin-burst motion-reduce:hidden"
                    style={{ left: `${[50, 30, 70][i]}%`, top: `${[32, 40, 38][i]}%`, animationDelay: delay }}
                  >
                    <Icon name="Coins" size={i === 0 ? '2xl' : 'xl'} className="text-amber-500" />
                  </span>
                ))}
              </div>
            ) : null}

            {/* ── Carte solde ─────────────────────────────────────────────── */}
            <div
              className={`sticky top-24 z-40 -mx-4 px-4 pt-2 pb-6 mb-8 motion-reduce:animate-none ${
                celebratePurchase ? 'motion-safe:animate-shop-screen-shake' : ''
              }`}
            >
              <div
                className={`app-shop-balance-card max-w-4xl mx-auto p-5 sm:p-6 transition-shadow duration-300 ${
                  celebratePurchase ? 'shadow-[0_0_0_4px_rgba(251,191,36,0.45)] ring-2 ring-amber-400/50' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6">
                  <div className="min-w-0 flex items-center gap-4">
                    <span className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 ring-2 ring-amber-400/40" aria-hidden>
                      <Icon name="Coins" size="xl" className="text-amber-700" />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--muted)] mb-1">
                        {t('balanceLabel')}
                      </p>
                      <p
                        key={balanceAnimTick}
                        className="font-display text-4xl sm:text-5xl font-black tracking-tight text-[var(--text)] tabular-nums leading-none motion-safe:animate-shop-balance-pop motion-reduce:animate-none"
                      >
                        {balance.toLocaleString(numLocale)}
                        <span className="ml-2 text-2xl sm:text-3xl font-black text-[var(--orange)]">{t('questCoins')}</span>
                      </p>
                      {/* Stats inventaire rapides */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-ui)] bg-[color:color-mix(in_srgb,var(--orange)_10%,var(--card))] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)]">
                          <Icon name="RefreshCw" size="xs" className="text-[var(--orange)] shrink-0" aria-hidden />
                          <span className="text-[var(--muted)]">{t('bonusRerolls')}</span>
                          <span className="font-black tabular-nums text-[var(--orange)]">{shop.bonusRerollCredits}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-ui)] bg-[color:color-mix(in_srgb,var(--green)_10%,var(--card))] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)]">
                          <Icon name="Zap" size="xs" className="text-[var(--green)] shrink-0" aria-hidden />
                          <span className="text-[var(--muted)]">{t('xpBoosts')}</span>
                          <span className="font-black tabular-nums text-[var(--green)]">{shop.xpBonusCharges}</span>
                          <span className="text-[10px] text-[var(--muted)]">{t('xpPerValidation', { n: XP_SHOP_BONUS_PER_CHARGE })}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-700/30 ring-2 ring-emerald-500/40 transition-all duration-200 hover:bg-emerald-700 hover:ring-emerald-400/50 hover:scale-105 active:scale-95 sm:min-w-[200px]"
                    onClick={() => setRechargeOpen(true)}
                  >
                    {t('addQc')}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Offre groupée ───────────────────────────────────────────── */}
            {bundleItem ? (() => {
              const owns = catalogItemFullyOwned(bundleItem, shop, coinPurchasedSkus);
              const affordable = balance >= bundleItem.priceCoins;
              const bump = purchaseHighlightSku === bundleItem.sku;
              return (
                <section className="mb-10" aria-labelledby="shop-bundle-heading">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 id="shop-bundle-heading" className="font-display font-black text-xl text-[var(--text)] drop-shadow-[0_1px_0_rgba(0,0,0,0.20)]">
                      {t('featuredHeading')}
                    </h2>
                  </div>

                  <div
                    className={`app-shop-featured-card p-5 sm:p-6 transition-shadow duration-300 ${
                      bump ? 'motion-safe:animate-shop-card-bump motion-reduce:ring-2 motion-reduce:ring-amber-300/60' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] ring-2 ring-amber-400/35" aria-hidden>
                          <Icon name={bundleItem.icon} size="xl" className="text-[var(--orange)]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          {bundleItem.marketing?.badge ? <MarketingBadge badge={bundleItem.marketing.badge} /> : null}
                          <div className="mt-1.5 flex items-start gap-2">
                            <p className="font-display font-black text-xl text-[var(--text)] flex-1 min-w-0">
                              {bundleItem.name}
                            </p>
                            {bundleItem.contentsDetail ? (
                              <button
                                type="button"
                                className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white/95 text-[10px] font-black text-[var(--on-cream-muted)] shadow-sm hover:bg-white mt-0.5"
                                aria-label={t('moreInfo', { name: bundleItem.name })}
                                onClick={() => setInfoModal({ title: bundleItem.name, body: bundleItem.contentsDetail! })}
                              >
                                i
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-[var(--muted)] font-medium mb-3">{bundleItem.description}</p>

                    {bundleItem.includedItems?.length ? (
                      <ul className="space-y-1.5 mb-3">
                        {bundleItem.includedItems.map((line) => (
                          <li key={line} className="flex gap-2 text-sm text-[var(--muted)] font-medium">
                            <Icon name="Check" size="xs" className="mt-0.5 shrink-0 text-[var(--green)]" aria-hidden />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {bundleItem.marketing?.hook ? (
                      <p className="text-sm font-semibold text-[var(--link-on-bg)] mb-2">{bundleItem.marketing.hook}</p>
                    ) : null}

                    {bundleItem.marketing?.compareAtCoins != null && bundleItem.marketing?.savingsCoins != null ? (
                      <p className="text-sm text-[var(--muted)] mb-4">
                        <span className="line-through tabular-nums text-[var(--subtle)]">
                          {bundleItem.marketing.compareAtCoins.toLocaleString(numLocale)} QC
                        </span>
                        <span className="ml-2 font-black text-[var(--green)]">
                          {t('economy', { n: bundleItem.marketing.savingsCoins.toLocaleString(numLocale) })}
                        </span>
                        <span className="text-[var(--subtle)] text-xs ml-1">{t('vsDetail')}</span>
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[color:var(--border-ui)]">
                      <span className="font-display text-2xl font-black text-[var(--orange)] tabular-nums">
                        {bundleItem.priceCoins.toLocaleString(numLocale)} QC
                      </span>
                      {owns ? (
                        <span className="text-sm font-black uppercase text-emerald-800">{t('owned')}</span>
                      ) : (
                        <button
                          type="button"
                          disabled={coinPurchaseSku === bundleItem.sku}
                          onClick={() => {
                            if (!affordable) { setRechargeOpen(true); return; }
                            void buyWithCoins(bundleItem.sku);
                          }}
                          className={`btn btn-primary btn-md text-sm font-black transition-transform duration-150 hover:scale-[1.03] hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${
                            !affordable && coinPurchaseSku !== bundleItem.sku
                              ? 'ring-2 ring-amber-400/80 ring-offset-2 ring-offset-amber-50'
                              : ''
                          }`}
                          title={!affordable ? t('insufficientHint') : undefined}
                        >
                          {coinPurchaseSku === bundleItem.sku ? '…' : t('bundleBuy')}
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              );
            })() : null}

            {/* ── Boosts XP ───────────────────────────────────────────────── */}
            {boostItems.length > 0 && (
              <section className="mb-10" aria-labelledby="shop-xp-heading">
                <h2 id="shop-xp-heading" className="font-display font-black text-xl text-[var(--text)] mb-1">
                  {t('sectionXp')}
                </h2>
                <p className="text-sm text-[var(--muted)] mb-4">
                  Gagne plus d'XP à chaque quête complétée — les charges sont stockées et consommées automatiquement.
                </p>
                <ul className="grid gap-4 sm:grid-cols-2">{boostItems.map(renderCatalogCard)}</ul>
              </section>
            )}

            {/* ── Relances ────────────────────────────────────────────────── */}
            {rerollItems.length > 0 && (
              <section className="mb-10" aria-labelledby="shop-reroll-heading">
                <h2 id="shop-reroll-heading" className="font-display font-black text-xl text-[var(--text)] mb-1">
                  {t('sectionRerolls')}
                </h2>
                <p className="text-sm text-[var(--muted)] mb-4">
                  La quête du jour ne te convient pas ? Échange-la contre une autre sans attendre le lendemain.
                </p>
                <ul className="grid gap-4 sm:grid-cols-2">{rerollItems.map(renderCatalogCard)}</ul>
              </section>
            )}

            {/* ── Packs de quêtes thématiques ─────────────────────────────── */}
            {questPackItems.length > 0 && (
              <section className="mb-10" aria-labelledby="shop-packs-heading">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      id="shop-packs-heading"
                      className="font-display font-black text-xl text-[var(--text)] flex items-center gap-2"
                    >
                      <Icon name="Backpack" size="md" className="text-[var(--violet)]" aria-hidden />
                      {locale === 'en' ? 'Themed quest packs' : 'Packs de quêtes thématiques'}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)] max-w-2xl">
                      {locale === 'en'
                        ? 'Each pack is a 10-quest journey in 3 chapters, played alongside your daily quest. Earn an exclusive title and Quest Coins on completion.'
                        : "Chaque pack est un parcours de 10 quêtes en 3 chapitres, à jouer en parallèle de ta quête quotidienne. Titre exclusif et Quest Coins à la clé."}
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {(['all', 'vibe', 'lifestyle', 'location'] as const).map((k) => {
                    const isActive = questPackFilter === k;
                    const label =
                      k === 'all'
                        ? locale === 'en'
                          ? 'All'
                          : 'Tous'
                        : locale === 'en'
                          ? PACK_KIND_META[k].en
                          : PACK_KIND_META[k].fr;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setQuestPackFilter(k)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors ${
                          isActive
                            ? 'border-[color:var(--cyan)] bg-[color:color-mix(in_srgb,var(--cyan)_18%,var(--card))] text-[var(--text)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--cyan)_28%,transparent)]'
                            : 'border-[color:var(--border-ui)] bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--surface)]'
                        }`}
                      >
                        {k !== 'all' ? (
                          <Icon name={PACK_KIND_META[k].icon} size="xs" aria-hidden />
                        ) : null}
                        {label}
                      </button>
                    );
                  })}
                </div>

                {filteredQuestPacks.length === 0 ? (
                  <p className="text-sm text-[var(--subtle)] italic">
                    {locale === 'en' ? 'No pack in this category yet.' : 'Aucun pack dans cette catégorie pour le moment.'}
                  </p>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredQuestPacks.map(renderCatalogCard)}
                  </ul>
                )}
              </section>
            )}

            {/* ── Historique des transactions ──────────────────────────────── */}
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-[var(--orange)]">
                  {t('txJournal')}
                </h2>
                <Link
                  href="/app/history?tab=wallet"
                  className="text-xs font-black text-[var(--cyan)] underline-offset-2 hover:underline"
                >
                  {t('txHistoryLink')}
                </Link>
              </div>
              {transactions.length === 0 ? (
                <p className="text-sm font-semibold text-[var(--subtle)] rounded-2xl border border-dashed border-[color:var(--border-ui)] px-4 py-8 text-center">
                  {t('noTx')}
                </p>
              ) : (
                <ul className="shop-elevated-surface rounded-2xl border border-[color:var(--border-ui)] divide-y divide-[color:var(--border-ui)] overflow-hidden">
                  {transactions.map((tx) => (
                    <li key={tx.id} className="px-4 py-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[var(--text)] block">{tx.label}</span>
                        <span className="text-[var(--subtle)] font-mono text-[10px]">{tx.primarySku}</span>
                      </div>
                      <div className="text-right">
                        {tx.coinsDelta != null ? (
                          <span className={`font-black tabular-nums ${tx.coinsDelta >= 0 ? 'text-[var(--green)]' : 'text-[var(--orange)]'}`}>
                            {tx.coinsDelta >= 0 ? '+' : ''}{tx.coinsDelta} QC
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
                        {new Date(tx.createdAt).toLocaleString(numLocale, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ── Modale recharge ─────────────────────────────────────────── */}
            {rechargeOpen ? (
              <div
                className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="recharge-modal-title"
              >
                <button
                  type="button"
                  className="absolute inset-0 quest-modal-backdrop cursor-pointer border-0"
                  aria-label={t('close')}
                  onClick={() => setRechargeOpen(false)}
                />
                <div className="quest-modal-sheet relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-3xl flex-col overflow-hidden motion-safe:animate-shop-modal-in motion-reduce:animate-none">
                  <div className="quest-modal-panel-accent shrink-0" aria-hidden />
                  <RechargeModalContent
                    coinPacksSorted={coinPacksSorted}
                    coinPackReference={coinPackReference}
                    stripeLoadingSku={stripeLoadingSku}
                    balance={balance}
                    onClose={() => setRechargeOpen(false)}
                    onPay={(sku) => void rechargeStripe(sku)}
                    onShowInfo={(title, body) => setInfoModal({ title, body })}
                  />
                </div>
              </div>
            ) : null}

            {/* ── Modale info article ──────────────────────────────────────── */}
            {infoModal ? (
              <div
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="info-modal-title"
              >
                <button
                  type="button"
                  className="absolute inset-0 quest-modal-backdrop cursor-pointer border-0"
                  aria-label={t('close')}
                  onClick={() => setInfoModal(null)}
                />
                <div className="quest-modal-panel relative z-10 w-full max-w-md overflow-hidden shadow-2xl motion-safe:animate-modal-fade motion-reduce:animate-none">
                  <div className="quest-modal-panel-accent shrink-0" aria-hidden />
                  <div className="relative p-5 pt-4">
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full p-2 text-[var(--subtle)] hover:bg-[var(--surface)]"
                      onClick={() => setInfoModal(null)}
                      aria-label={t('close')}
                    >
                      <Icon name="X" size="md" />
                    </button>
                    <h3 id="info-modal-title" className="font-display font-black text-lg text-[var(--text)] pr-8">
                      {infoModal.title}
                    </h3>
                    <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
                      {infoModal.body}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm mt-5 w-full font-black"
                      onClick={() => setInfoModal(null)}
                    >
                      {t('infoOk')}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

export default function ShopPage() {
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
      <ShopPageInner />
    </Suspense>
  );
}
