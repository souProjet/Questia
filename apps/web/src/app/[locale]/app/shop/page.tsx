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
  getThemeIds,
  getTitleDefinition,
  XP_SHOP_BONUS_PER_CHARGE,
  bonusPercentVsPack,
  questCoinsPerEuro,
  catalogItemFullyOwned,
  buildCoinPurchasedSkuSet,
  type ShopCatalogEntry,
  type CoinPackEntry,
  type ShopMarketingBadge,
} from '@questia/shared';
import { AnalyticsEvent } from '@/lib/analytics/events';
import { trackAnalyticsEvent } from '@/lib/analytics/track';
import { trackMetaPixelEvent } from '@/lib/analytics/trackMeta';

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
    <div className="flex max-h-[min(90vh,820px)] min-h-0 flex-col">
      <header className="shrink-0 border-b border-emerald-100 bg-gradient-to-br from-emerald-50/95 via-amber-50/50 to-cyan-50/40 px-5 pb-4 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="recharge-modal-title" className="font-display font-black text-xl leading-tight text-[var(--on-cream)] sm:text-2xl">
              {t('rechargeTitle')}
            </h2>
            <p className="mt-1.5 text-sm font-medium text-[var(--on-cream-muted)]">
              {t('rechargeSub')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/95 px-3 py-1 text-xs font-bold text-amber-950 shadow-sm backdrop-blur-[2px]">
                <span className="text-amber-800/80">{t('currentBalance')}</span>
                <span className="font-display tabular-nums font-black text-[var(--on-cream)]">
                  {balance.toLocaleString(numLocale)} QC
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:color-mix(in_srgb,var(--on-cream)_10%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--on-cream-muted)]">
                <span aria-hidden>🔒</span> {t('securePay')}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full p-2 text-[var(--on-cream-muted)] transition-colors hover:bg-black/5 hover:text-[var(--on-cream)]"
            onClick={onClose}
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--on-cream-muted)]">
          {t('rechargeNote')}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
        <ul className="grid gap-4 sm:grid-cols-3 sm:gap-3">
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
                className={`flex min-h-0 flex-col rounded-2xl border-2 p-4 shadow-sm transition-shadow ${
                  isBest
                    ? 'border-emerald-400 bg-gradient-to-b from-emerald-50/95 to-white ring-2 ring-emerald-300/40'
                    : 'border-[color:var(--border-ui)] bg-[var(--card)]'
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="text-3xl leading-none" aria-hidden>
                    {pack.emoji}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {pack.marketing?.badge ? <MarketingBadge badge={pack.marketing.badge} /> : null}
                    {pack.contentsDetail ? (
                      <button
                        type="button"
                        className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-ui)] bg-[var(--surface)] text-[10px] font-black text-[var(--muted)] hover:bg-[var(--card)]"
                        aria-label={t('moreInfo', { name: pack.name })}
                        onClick={() => onShowInfo(pack.name, pack.contentsDetail!)}
                      >
                        i
                      </button>
                    ) : null}
                  </div>
                </div>

                <p
                  className={`font-display text-2xl font-black leading-none tracking-tight sm:text-[1.65rem] ${
                    isBest ? 'text-emerald-900' : 'text-[var(--green)]'
                  }`}
                >
                  +{pack.coinsGranted.toLocaleString(numLocale)}{' '}
                  <span
                    className={`text-base font-black ${
                      isBest ? 'text-emerald-700/90' : 'text-[var(--green)]'
                    }`}
                  >
                    QC
                  </span>
                </p>
                <p className="mt-1 text-xs font-bold text-[var(--subtle)]">{pack.name}</p>
                <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-[var(--muted)]">{pack.description}</p>

                {pack.includedItems?.length ? (
                  <ul className="mt-3 space-y-1.5 border-t border-[color:var(--border-ui)] pt-3">
                    {pack.includedItems.map((line) => (
                      <li key={line} className="flex gap-2 text-[11px] font-semibold leading-snug text-[var(--muted)]">
                        <span
                          className={`mt-0.5 shrink-0 ${isBest ? 'text-emerald-600' : 'text-[var(--green)]'}`}
                          aria-hidden
                        >
                          ✓
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {pack.marketing?.hook ? (
                  <p
                    className={`mt-2 text-[11px] font-bold ${
                      isBest ? 'text-emerald-800/90' : 'text-[var(--green)]'
                    }`}
                  >
                    {pack.marketing.hook}
                  </p>
                ) : null}

                <div className="mt-auto border-t border-[color:var(--border-ui)] pt-3">
                  <p className="font-display text-xl font-black tabular-nums text-[var(--text)]">
                    {eur} €
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-[var(--subtle)]">
                    <span
                      className={
                        isBest ? 'tabular-nums text-emerald-800' : 'tabular-nums text-[var(--green)]'
                      }
                    >
                      {t('qcPerEur', { n: Math.round(qcPerEur) })}
                    </span>
                    {bonusVsStarter > 0 ? (
                      <span
                        className={
                          isBest
                            ? 'ml-1 font-black text-emerald-700'
                            : 'ml-1 font-black text-[var(--green)]'
                        }
                      >
                        {t('vsStarter', { n: bonusVsStarter })}
                      </span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    disabled={stripeLoadingSku === pack.sku}
                    onClick={() => onPay(pack.sku)}
                    className="btn btn-primary btn-sm mt-3 w-full text-xs font-black shadow-md disabled:opacity-50"
                  >
                    {stripeLoadingSku === pack.sku ? t('redirecting') : t('payAmount', { amount: eur })}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="shrink-0 border-t border-[color:var(--border-ui)] bg-[var(--surface)] px-5 py-3 text-center sm:px-6">
        <p className="text-[11px] font-medium leading-relaxed text-[var(--subtle)]">
          {t('rechargeFooter')}
        </p>
      </footer>
    </div>
  );
}

type ShopFlash = { message: string; kind: 'success' | 'error' | 'info' };

type ProfileShop = {
  coinBalance: number;
  activeThemeId: string;
  ownedThemes: string[];
  ownedNarrationPacks: string[];
  activeNarrationPackId: string | null;
  bonusRerollCredits: number;
  ownedTitleIds: string[];
  equippedTitleId: string | null;
  xpBonusCharges: number;
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

function kindOrder(kind: ShopCatalogEntry['kind']): number {
  const order: Record<ShopCatalogEntry['kind'], number> = {
    theme_pack: 0,
    title: 1,
    xp_booster: 2,
    narration_pack: 3,
    reroll_pack: 4,
    bundle: 5,
  };
  return order[kind] ?? 9;
}

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
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border ${styles[badge]}`}
    >
      {labels[badge]}
    </span>
  );
}

function ShopPageInner() {
  const t = useTranslations('AppShop');
  const locale = useLocale();
  const numLocale = locale === 'en' ? 'en-US' : 'fr-FR';
  const kindLabel = useCallback(
    (kind: ShopCatalogEntry['kind']) => {
      switch (kind) {
        case 'theme_pack':
          return t('kindTheme');
        case 'title':
          return t('kindTitle');
        case 'xp_booster':
          return t('kindXp');
        case 'narration_pack':
          return t('kindNarration');
        case 'reroll_pack':
          return t('kindReroll');
        case 'bundle':
          return t('kindBundle');
        default:
          return '';
      }
    },
    [t],
  );
  const narrationLabels = useMemo(
    () => ({
      cinematic: t('narrationCinematic'),
      poetic: t('narrationPoetic'),
      noir: t('narrationNoir'),
    }),
    [t],
  );
  const searchParams = useSearchParams();
  const [items] = useState<ShopCatalogEntry[]>(() =>
    [...SHOP_CATALOG].sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.name.localeCompare(b.name)),
  );
  const coinPacksSorted = useMemo(
    () => [...COIN_PACKS].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [],
  );
  const coinPackReference = coinPacksSorted[0];
  const [shop, setShop] = useState<ProfileShop | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoadingSku, setStripeLoadingSku] = useState<string | null>(null);
  const [coinPurchaseSku, setCoinPurchaseSku] = useState<string | null>(null);
  const [flash, setFlash] = useState<ShopFlash | null>(null);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);
  /** Ré-anime le solde (clé) + flash / carte après achat QC */
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

  const { featuredBundle, xpItems, themeItems, titleItems, narrationItems, rerollItems } = useMemo(() => {
    const bundle = items.find((i) => i.kind === 'bundle');
    const rest = items.filter((i) => i.kind !== 'bundle');
    return {
      featuredBundle: bundle,
      xpItems: rest.filter((i) => i.kind === 'xp_booster'),
      themeItems: rest.filter((i) => i.kind === 'theme_pack'),
      titleItems: rest.filter((i) => i.kind === 'title'),
      narrationItems: rest.filter((i) => i.kind === 'narration_pack'),
      rerollItems: rest.filter((i) => i.kind === 'reroll_pack'),
    };
  }, [items]);

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
    if (success === '1') void load();
    if (success === '1') {
      let skipDup = false;
      try {
        skipDup = sessionStorage.getItem('questia_stripe_purchase_done') === '1';
      } catch {
        /* ignore */
      }
      let sku: string | null = null;
      try {
        sku = sessionStorage.getItem('questia_checkout_sku');
        if (sku) sessionStorage.removeItem('questia_checkout_sku');
      } catch {
        /* ignore */
      }
      const pack = sku ? getCoinPack(sku) : undefined;
      const valueEur = pack ? pack.priceCents / 100 : 0;
      if (sku && !skipDup) {
        try {
          sessionStorage.setItem('questia_stripe_purchase_done', '1');
        } catch {
          /* ignore */
        }
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
      setFlash({
        message: t('flashPaid'),
        kind: 'success',
      });
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
      } catch {
        /* ignore */
      }
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
      runPurchaseCelebration(sku);
    } finally {
      setCoinPurchaseSku(null);
    }
  };

  const savePreferences = async (patch: {
    activeThemeId?: string;
    activeNarrationPackId?: string | null;
    equippedTitleId?: string | null;
  }) => {
    setFlash(null);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setFlash({ message: j.error ?? t('errSave'), kind: 'error' });
      return;
    }
    const j = (await res.json()) as { shop?: ProfileShop };
    setShop(j.shop ?? null);
  };

  const ownedThemeIds = new Set(shop?.ownedThemes ?? ['default']);
  const ownedNarration = new Set(shop?.ownedNarrationPacks ?? []);
  const balance = shop?.coinBalance ?? 0;

  const renderCatalogCard = (item: ShopCatalogEntry) => {
    const owns = catalogItemFullyOwned(item, shop!, coinPurchasedSkus);
    const affordable = balance >= item.priceCoins;
    const m = item.marketing;
    const bump = purchaseHighlightSku === item.sku;
    return (
      <li
        key={item.sku}
        className={`shop-elevated-surface rounded-2xl border p-5 flex flex-col gap-3 transition-shadow duration-300 ${
          m?.badge === 'featured' || m?.badge === 'best_value'
            ? 'border-emerald-300/80 ring-1 ring-emerald-200/60'
            : 'border-[color:var(--border-ui)]'
        } ${bump ? 'motion-safe:animate-shop-card-bump motion-reduce:ring-2 motion-reduce:ring-amber-300/50' : ''}`}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span className="text-3xl leading-none" aria-hidden>
            {item.emoji}
          </span>
          <div className="flex flex-wrap items-center gap-1 justify-end">
            {m?.badge ? <MarketingBadge badge={m.badge} /> : null}
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--subtle)] shrink-0">
              {kindLabel(item.kind)}
            </span>
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
        <p className="font-black text-[var(--text)]">{item.name}</p>
        <p className="text-xs text-[var(--muted)] font-medium leading-relaxed flex-1">{item.description}</p>
        {item.includedItems?.length ? (
          <ul className="list-disc pl-4 text-[11px] font-medium text-[var(--muted)] space-y-0.5">
            {item.includedItems.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {m?.hook ? (
          <p className="text-[11px] font-semibold text-[var(--green)]">{m.hook}</p>
        ) : null}
        {m?.compareAtCoins != null && m.savingsCoins != null ? (
          <p className="text-xs text-[var(--subtle)]">
            <span className="line-through tabular-nums">{m.compareAtCoins.toLocaleString(numLocale)} QC</span>
            <span className="mx-1.5 font-bold text-[var(--green)]">
              −{m.savingsCoins.toLocaleString(numLocale)} QC
            </span>
            <span className="text-[var(--subtle)]">{t('vsSeparate')}</span>
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[color:var(--border-ui)]">
          <span className="font-display text-xl font-black text-[var(--orange)] tabular-nums">
            {item.priceCoins.toLocaleString(numLocale)} QC
          </span>
          {owns ? (
            <span className="text-xs font-black uppercase tracking-wider text-[var(--green)]">{t('owned')}</span>
          ) : (
            <button
              type="button"
              disabled={coinPurchaseSku === item.sku}
              onClick={() => {
                if (!affordable) {
                  setRechargeOpen(true);
                  return;
                }
                void buyWithCoins(item.sku);
              }}
              className={`btn btn-primary btn-md text-sm font-black transition-transform duration-150 will-change-transform hover:scale-[1.03] hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${
                !affordable && coinPurchaseSku !== item.sku ? 'ring-2 ring-amber-400/80 ring-offset-2 ring-offset-[var(--card)]' : ''
              }`}
              title={
                !affordable
                  ? t('insufficientHint')
                  : undefined
              }
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

        {flash ? (
          <div
            role={flash.kind === 'error' ? 'alert' : 'status'}
            key={flash.message}
            className={`mb-6 rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--text)] motion-safe:animate-fade-up motion-reduce:animate-none ${
              flash.kind === 'success'
                ? 'shop-flash-success'
                : flash.kind === 'error'
                  ? 'shop-flash-error'
                  : 'shop-flash-info'
            }`}
          >
            {flash.message}
          </div>
        ) : null}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
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
            {celebratePurchase ? (
              <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
                <div className="absolute inset-0 bg-gradient-to-b from-amber-300/45 via-fuchsia-400/15 to-cyan-400/25 motion-safe:animate-shop-celebration-overlay motion-reduce:hidden" />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 via-transparent to-amber-200/20 motion-safe:animate-shop-gold-flash motion-reduce:hidden" />
                {[
                  { emoji: '✨', left: '10%', top: '24%', delay: '0ms', orbit: false },
                  { emoji: '🎉', left: '82%', top: '18%', delay: '90ms', orbit: true },
                  { emoji: '⭐', left: '44%', top: '62%', delay: '160ms', orbit: false },
                  { emoji: '✨', left: '78%', top: '48%', delay: '220ms', orbit: true },
                  { emoji: '🪙', left: '50%', top: '42%', delay: '100ms', orbit: false },
                  { emoji: '💎', left: '18%', top: '52%', delay: '280ms', orbit: true },
                  { emoji: '🔥', left: '64%', top: '28%', delay: '40ms', orbit: false },
                  { emoji: '✨', left: '36%', top: '34%', delay: '340ms', orbit: true },
                ].map((s, i) => (
                  <span
                    key={i}
                    className={`absolute text-2xl sm:text-4xl motion-reduce:hidden ${
                      s.orbit ? 'motion-safe:animate-shop-sparkle-orbit' : 'motion-safe:animate-shop-sparkle'
                    }`}
                    style={{ left: s.left, top: s.top, animationDelay: s.delay }}
                  >
                    {s.emoji}
                  </span>
                ))}
                <span
                  className="absolute left-1/2 top-[32%] text-4xl sm:text-5xl motion-safe:animate-shop-coin-burst motion-reduce:hidden"
                  style={{ animationDelay: '60ms' }}
                >
                  🪙
                </span>
                <span
                  className="absolute left-[30%] top-[40%] text-3xl motion-safe:animate-shop-coin-burst motion-reduce:hidden"
                  style={{ animationDelay: '140ms' }}
                >
                  🪙
                </span>
                <span
                  className="absolute left-[70%] top-[38%] text-3xl motion-safe:animate-shop-coin-burst motion-reduce:hidden"
                  style={{ animationDelay: '200ms' }}
                >
                  🪙
                </span>
              </div>
            ) : null}

            <div
              className={`sticky top-24 z-40 -mx-4 px-4 pt-2 pb-6 mb-6 motion-reduce:animate-none ${
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
                    <span
                      className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-3xl ring-2 ring-amber-400/40"
                      aria-hidden
                    >
                      🪙
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

            <section className="mb-10" aria-labelledby="shop-prefs-heading">
              <h2 id="shop-prefs-heading" className="font-display font-black text-xl text-[var(--text)] mb-1">
                {t('prefsTitle')}
              </h2>
              <p className="text-sm text-[var(--muted)] mb-4 max-w-xl">
                {t('prefsSub')}
              </p>

              <div className="shop-prefs-panel p-5 sm:p-6 pt-6 sm:pt-7">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--violet)_16%,transparent)] text-[22px] ring-2 ring-[color:color-mix(in_srgb,var(--violet)_32%,transparent)]"
                    aria-hidden
                  >
                    ⚙️
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--subtle)]">
                      {t('customization')}
                    </p>
                    <p className="text-sm font-bold text-[var(--text)]">
                      {t('customizationSub')}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="shop-pref-field p-4 flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-[var(--subtle)]">
                      {t('activeTheme')}
                    </label>
                    <select
                      className="shop-pref-select"
                      value={shop.activeThemeId}
                      onChange={(e) => void savePreferences({ activeThemeId: e.target.value })}
                    >
                      {getThemeIds()
                        .filter((id) => ownedThemeIds.has(id))
                        .map((id) => (
                          <option key={id} value={id}>
                            {id === 'default'
                              ? t('themeDefault')
                              : id === 'midnight'
                                ? t('themeMidnight')
                                : id === 'aurora'
                                  ? t('themeAurora')
                                  : id === 'parchment'
                                    ? t('themeParchment')
                                    : id}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="shop-pref-field p-4 flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-[var(--subtle)]">
                      {t('narrationLabel')}
                    </label>
                    <select
                      className="shop-pref-select"
                      value={shop.activeNarrationPackId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        void savePreferences({
                          activeNarrationPackId: v === '' ? null : v,
                        });
                      }}
                    >
                      <option value="">{t('narrationDefault')}</option>
                      {ownedNarration.size > 0
                        ? [...ownedNarration].map((id) => (
                            <option key={id} value={id}>
                              {narrationLabels[id as keyof typeof narrationLabels] ?? id}
                            </option>
                          ))
                        : null}
                    </select>
                  </div>
                  <div className="shop-pref-field p-4 flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-[var(--subtle)]">
                      {t('titleEquip')}
                    </label>
                    <select
                      className="shop-pref-select"
                      value={shop.equippedTitleId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        void savePreferences({ equippedTitleId: v === '' ? null : v });
                      }}
                    >
                      <option value="">{t('noTitle')}</option>
                      {(shop.ownedTitleIds ?? []).length > 0
                        ? (shop.ownedTitleIds ?? []).map((id) => {
                            const def = getTitleDefinition(id);
                            return (
                              <option key={id} value={id}>
                                {def ? `${def.emoji} ${def.label}` : id}
                              </option>
                            );
                          })
                        : null}
                    </select>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-[color:var(--border-ui)] flex flex-wrap gap-2.5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-ui)] bg-[color:color-mix(in_srgb,var(--orange)_14%,var(--card))] px-3 py-1.5 text-xs font-semibold text-[var(--text)]">
                    <span className="text-[var(--muted)]">{t('bonusRerolls')}</span>
                    <span className="font-black tabular-nums text-[var(--orange)]">
                      {shop.bonusRerollCredits}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-ui)] bg-[color:color-mix(in_srgb,var(--green)_12%,var(--card))] px-3 py-1.5 text-xs font-semibold text-[var(--text)]">
                    <span className="text-[var(--muted)]">{t('xpBoosts')}</span>
                    <span className="font-black tabular-nums text-[var(--green)]">{shop.xpBonusCharges}</span>
                    <span className="text-[10px] font-medium text-[var(--muted)]">
                      {t('xpPerValidation', { n: XP_SHOP_BONUS_PER_CHARGE })}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {featuredBundle ? (
              <section className="mb-10" aria-labelledby="shop-featured-heading">
                <h2 id="shop-featured-heading" className="font-display font-black text-xl text-[var(--text)] mb-3 drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]">
                  {t('featuredHeading')}
                </h2>
                <div
                  className={`app-shop-featured-card p-6 transition-shadow duration-300 ${
                    purchaseHighlightSku === featuredBundle.sku
                      ? 'motion-safe:animate-shop-card-bump motion-reduce:ring-2 motion-reduce:ring-amber-300/60'
                      : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-4xl shrink-0" aria-hidden>
                        {featuredBundle.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        {featuredBundle.marketing?.badge ? (
                          <MarketingBadge badge={featuredBundle.marketing.badge} />
                        ) : null}
                        <div className="mt-2 flex items-start gap-2">
                          <p className="font-display font-black text-xl text-[var(--text)] flex-1 min-w-0">
                            {featuredBundle.name}
                          </p>
                          {featuredBundle.contentsDetail ? (
                            <button
                              type="button"
                              className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white/95 text-[10px] font-black text-[var(--on-cream-muted)] shadow-sm hover:bg-white mt-0.5"
                              aria-label={t('moreInfo', { name: featuredBundle.name })}
                              onClick={() =>
                                setInfoModal({
                                  title: featuredBundle.name,
                                  body: featuredBundle.contentsDetail!,
                                })
                              }
                            >
                              i
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--muted)] font-medium mb-2">{featuredBundle.description}</p>
                  {featuredBundle.includedItems?.length ? (
                    <ul className="list-disc pl-5 text-sm text-[var(--muted)] font-medium space-y-1 mb-2">
                      {featuredBundle.includedItems.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                  {featuredBundle.marketing?.hook ? (
                    <p className="text-sm font-semibold text-[var(--link-on-bg)] mb-3">{featuredBundle.marketing.hook}</p>
                  ) : null}
                  {featuredBundle.marketing?.compareAtCoins != null &&
                  featuredBundle.marketing?.savingsCoins != null ? (
                    <p className="text-sm text-[var(--muted)] mb-4">
                      <span className="line-through tabular-nums text-[var(--subtle)]">
                        {featuredBundle.marketing.compareAtCoins.toLocaleString(numLocale)} QC
                      </span>
                      <span className="ml-2 font-black text-[var(--green)]">
                        {t('economy', {
                          n: featuredBundle.marketing.savingsCoins.toLocaleString(numLocale),
                        })}
                      </span>
                      <span className="text-[var(--subtle)] text-xs ml-1">{t('vsDetail')}</span>
                    </p>
                  ) : null}
                  {(() => {
                    const owns = catalogItemFullyOwned(featuredBundle, shop, coinPurchasedSkus);
                    const affordable = balance >= featuredBundle.priceCoins;
                    return (
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[color:var(--border-ui)]">
                        <span className="font-display text-2xl font-black text-[var(--orange)] tabular-nums">
                          {featuredBundle.priceCoins.toLocaleString(numLocale)} QC
                        </span>
                        {owns ? (
                          <span className="text-sm font-black uppercase text-emerald-800">{t('owned')}</span>
                        ) : (
                          <button
                            type="button"
                            disabled={coinPurchaseSku === featuredBundle.sku}
                            onClick={() => {
                              if (!affordable) {
                                setRechargeOpen(true);
                                return;
                              }
                              void buyWithCoins(featuredBundle.sku);
                            }}
                            className={`btn btn-primary btn-md text-sm font-black transition-transform duration-150 hover:scale-[1.03] hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${
                              !affordable && coinPurchaseSku !== featuredBundle.sku
                                ? 'ring-2 ring-amber-400/80 ring-offset-2 ring-offset-amber-50'
                                : ''
                            }`}
                            title={
                              !affordable
                                ? t('insufficientHint')
                                : undefined
                            }
                          >
                            {coinPurchaseSku === featuredBundle.sku ? '…' : t('bundleBuy')}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </section>
            ) : null}

            <section className="mb-10" aria-labelledby="shop-xp-heading">
              <h2 id="shop-xp-heading" className="font-display font-black text-lg text-[var(--text)] mb-3">
                {t('sectionXp')}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">{xpItems.map(renderCatalogCard)}</ul>
            </section>

            <section className="mb-10" aria-labelledby="shop-look-heading">
              <h2 id="shop-look-heading" className="font-display font-black text-lg text-[var(--text)] mb-3">
                {t('sectionLook')}
              </h2>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--subtle)] mb-3">{t('sectionThemes')}</h3>
              <ul className="grid gap-4 sm:grid-cols-2 mb-8">{themeItems.map(renderCatalogCard)}</ul>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--subtle)] mb-3">{t('sectionTitles')}</h3>
              <ul className="grid gap-4 sm:grid-cols-2">{titleItems.map(renderCatalogCard)}</ul>
            </section>

            <section className="mb-10" aria-labelledby="shop-narration-heading">
              <h2 id="shop-narration-heading" className="font-display font-black text-lg text-[var(--text)] mb-3">
                {t('sectionNarration')}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">{narrationItems.map(renderCatalogCard)}</ul>
            </section>

            <section className="mb-10" aria-labelledby="shop-reroll-heading">
              <h2 id="shop-reroll-heading" className="font-display font-black text-lg text-[var(--text)] mb-3">
                {t('sectionRerolls')}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">{rerollItems.map(renderCatalogCard)}</ul>
            </section>

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
                        {new Date(tx.createdAt).toLocaleString(numLocale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {rechargeOpen ? (
              <div
                className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="recharge-modal-title"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
                  aria-label={t('close')}
                  onClick={() => setRechargeOpen(false)}
                />
                <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-t-2xl border border-emerald-200/90 bg-[var(--card)] shadow-2xl motion-safe:animate-shop-modal-in motion-reduce:animate-none sm:rounded-2xl">
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

            {infoModal ? (
              <div
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="info-modal-title"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
                  aria-label={t('close')}
                  onClick={() => setInfoModal(null)}
                />
                <div className="relative z-10 w-full max-w-md rounded-2xl border border-[color:var(--border-ui)] bg-[var(--card)] p-5 shadow-2xl">
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full p-2 text-[var(--subtle)] hover:bg-[var(--surface)]"
                    onClick={() => setInfoModal(null)}
                    aria-label={t('close')}
                  >
                    ✕
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
