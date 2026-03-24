'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import {
  SHOP_CATALOG,
  COIN_PACKS,
  getThemeIds,
  getTitleDefinition,
  XP_SHOP_BONUS_PER_CHARGE,
  bonusPercentVsPack,
  questCoinsPerEuro,
  type ShopCatalogEntry,
  type CoinPackEntry,
  type ShopMarketingBadge,
} from '@questia/shared';

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
  return (
    <div className="flex max-h-[min(90vh,820px)] min-h-0 flex-col">
      <header className="shrink-0 border-b border-emerald-100 bg-gradient-to-br from-emerald-50/95 via-amber-50/50 to-cyan-50/40 px-5 pb-4 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="recharge-modal-title" className="font-display font-black text-xl leading-tight text-slate-900 sm:text-2xl">
              Ajouter des Quest Coins
            </h2>
            <p className="mt-1.5 text-sm font-medium text-slate-600">
              Paiement par carte bancaire via Stripe. Aucun abonnement — tu paies uniquement le montant choisi.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/90 px-3 py-1 text-xs font-bold text-amber-950 shadow-sm">
                <span className="text-amber-800/80">Solde actuel</span>
                <span className="font-display tabular-nums font-black text-slate-900">
                  {balance.toLocaleString('fr-FR')} QC
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/5 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                <span aria-hidden>🔒</span> Paiement sécurisé
              </span>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-800"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Après validation, les QC sont ajoutés à ton solde. Tu les utilises dans la boutique (thèmes, bonus, packs…).
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
                    : 'border-slate-200/90 bg-white'
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
                        className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-600 hover:bg-white"
                        aria-label={`Plus d'infos : ${pack.name}`}
                        onClick={() => onShowInfo(pack.name, pack.contentsDetail!)}
                      >
                        i
                      </button>
                    ) : null}
                  </div>
                </div>

                <p className="font-display text-2xl font-black leading-none tracking-tight text-emerald-900 sm:text-[1.65rem]">
                  +{pack.coinsGranted.toLocaleString('fr-FR')}{' '}
                  <span className="text-base font-black text-emerald-700/90">QC</span>
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">{pack.name}</p>
                <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-slate-600">{pack.description}</p>

                {pack.includedItems?.length ? (
                  <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                    {pack.includedItems.map((line) => (
                      <li key={line} className="flex gap-2 text-[11px] font-semibold leading-snug text-slate-700">
                        <span className="mt-0.5 shrink-0 text-emerald-600" aria-hidden>
                          ✓
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {pack.marketing?.hook ? (
                  <p className="mt-2 text-[11px] font-bold text-emerald-800/90">{pack.marketing.hook}</p>
                ) : null}

                <div className="mt-auto border-t border-slate-100 pt-3">
                  <p className="font-display text-xl font-black tabular-nums text-slate-900">
                    {eur} €
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                    <span className="tabular-nums text-emerald-800">{Math.round(qcPerEur)} QC / €</span>
                    {bonusVsStarter > 0 ? (
                      <span className="ml-1 font-black text-emerald-700">(+{bonusVsStarter}% vs petit pack)</span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    disabled={stripeLoadingSku === pack.sku}
                    onClick={() => onPay(pack.sku)}
                    className="btn btn-primary btn-sm mt-3 w-full text-xs font-black shadow-md disabled:opacity-50"
                  >
                    {stripeLoadingSku === pack.sku ? 'Redirection…' : `Payer ${eur} €`}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-3 text-center sm:px-6">
        <p className="text-[11px] font-medium leading-relaxed text-slate-500">
          Tu reviens sur la boutique après le paiement. En cas d’annulation, aucun débit.
        </p>
      </footer>
    </div>
  );
}

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

const NARRATION_LABELS: Record<string, string> = {
  cinematic: 'Cinématique',
  poetic: 'Poétique',
  noir: 'Mystère urbain',
};

const BADGE_LABELS: Record<ShopMarketingBadge, string> = {
  featured: 'À la une',
  best_value: 'Meilleur rapport',
  popular: 'Populaire',
  starter: 'Pour débuter',
  new: 'Nouveau',
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

function catalogItemFullyOwned(item: ShopCatalogEntry, shop: ProfileShop): boolean {
  const ownedThemeIds = new Set(shop.ownedThemes ?? ['default']);
  const ownedNarration = new Set(shop.ownedNarrationPacks ?? []);
  const ownedTitles = new Set(shop.ownedTitleIds ?? []);
  if (item.kind === 'reroll_pack' || item.kind === 'xp_booster') return false;
  if (item.kind === 'bundle') {
    return (
      (item.grants.themes?.every((t) => ownedThemeIds.has(t)) ?? true) &&
      (item.grants.narrationPacks?.every((n) => ownedNarration.has(n)) ?? true) &&
      (item.grants.titles?.every((t) => ownedTitles.has(t)) ?? true)
    );
  }
  if (item.kind === 'theme_pack') return item.grants.themes?.every((t) => ownedThemeIds.has(t)) ?? false;
  if (item.kind === 'title') return item.grants.titles?.every((t) => ownedTitles.has(t)) ?? false;
  if (item.kind === 'narration_pack') return item.grants.narrationPacks?.every((n) => ownedNarration.has(n)) ?? false;
  return false;
}

function kindLabel(kind: ShopCatalogEntry['kind']): string {
  switch (kind) {
    case 'theme_pack':
      return 'Thèmes';
    case 'title':
      return 'Titre';
    case 'xp_booster':
      return 'Bonus XP';
    case 'narration_pack':
      return 'Ton des quêtes';
    case 'reroll_pack':
      return 'Relances';
    case 'bundle':
      return 'Bundle';
    default:
      return '';
  }
}

function MarketingBadge({ badge }: { badge: ShopMarketingBadge }) {
  const styles: Record<ShopMarketingBadge, string> = {
    featured: 'bg-gradient-to-r from-violet-600 to-amber-500 text-white border-0',
    best_value: 'bg-emerald-600 text-white border-emerald-700',
    popular: 'bg-orange-500 text-white border-orange-600',
    starter: 'bg-slate-600 text-white border-slate-700',
    new: 'bg-cyan-600 text-white border-cyan-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border ${styles[badge]}`}
    >
      {BADGE_LABELS[badge]}
    </span>
  );
}

function ShopPageInner() {
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
  const [banner, setBanner] = useState<string | null>(null);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);

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

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch('/api/profile', { cache: 'no-store' }),
        fetch('/api/shop/transactions', { cache: 'no-store' }),
      ]);
      if (!pRes.ok) {
        setError(pRes.status === 401 ? 'Connecte-toi pour accéder à la boutique.' : 'Profil introuvable.');
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
      setError('Impossible de charger la boutique.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    if (success === '1') void load();
    if (success === '1') setBanner('Paiement confirmé — tes Quest Coins sont crédités.');
    if (canceled === '1') setBanner('Paiement annulé.');
  }, [searchParams, load]);

  useEffect(() => {
    const t = shop?.activeThemeId ?? 'default';
    if (t === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }, [shop?.activeThemeId]);

  const rechargeStripe = async (sku: string) => {
    setStripeLoadingSku(sku);
    setBanner(null);
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setBanner(data.error ?? 'Impossible de lancer le paiement.');
        return;
      }
      window.location.href = data.url;
    } finally {
      setStripeLoadingSku(null);
    }
  };

  const buyWithCoins = async (sku: string) => {
    setCoinPurchaseSku(sku);
    setBanner(null);
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      const data = (await res.json()) as { error?: string; coinBalance?: number };
      if (!res.ok) {
        setBanner(data.error ?? 'Achat impossible.');
        return;
      }
      await load();
      setBanner('Achat effectué avec tes Quest Coins.');
    } finally {
      setCoinPurchaseSku(null);
    }
  };

  const savePreferences = async (patch: {
    activeThemeId?: string;
    activeNarrationPackId?: string | null;
    equippedTitleId?: string | null;
  }) => {
    setBanner(null);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setBanner(j.error ?? 'Impossible d’enregistrer.');
      return;
    }
    const j = (await res.json()) as { shop?: ProfileShop };
    setShop(j.shop ?? null);
    setBanner('Préférences enregistrées.');
  };

  const ownedThemeIds = new Set(shop?.ownedThemes ?? ['default']);
  const ownedNarration = new Set(shop?.ownedNarrationPacks ?? []);
  const balance = shop?.coinBalance ?? 0;

  const renderCatalogCard = (item: ShopCatalogEntry) => {
    const owns = catalogItemFullyOwned(item, shop!);
    const affordable = balance >= item.priceCoins;
    const m = item.marketing;
    return (
      <li
        key={item.sku}
        className={`rounded-2xl border bg-white/90 p-5 shadow-sm flex flex-col gap-3 ${
          m?.badge === 'featured' || m?.badge === 'best_value'
            ? 'border-emerald-300/80 ring-1 ring-emerald-200/60'
            : 'border-slate-200/90'
        }`}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span className="text-3xl leading-none" aria-hidden>
            {item.emoji}
          </span>
          <div className="flex flex-wrap items-center gap-1 justify-end">
            {m?.badge ? <MarketingBadge badge={m.badge} /> : null}
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
              {kindLabel(item.kind)}
            </span>
            {item.contentsDetail ? (
              <button
                type="button"
                className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50"
                aria-label={`Plus d'infos : ${item.name}`}
                onClick={() => setInfoModal({ title: item.name, body: item.contentsDetail! })}
              >
                i
              </button>
            ) : null}
          </div>
        </div>
        <p className="font-black text-slate-900">{item.name}</p>
        <p className="text-xs text-slate-600 font-medium leading-relaxed flex-1">{item.description}</p>
        {item.includedItems?.length ? (
          <ul className="list-disc pl-4 text-[11px] font-medium text-slate-700 space-y-0.5">
            {item.includedItems.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {m?.hook ? <p className="text-[11px] font-semibold text-emerald-800/90">{m.hook}</p> : null}
        {m?.compareAtCoins != null && m.savingsCoins != null ? (
          <p className="text-xs text-slate-500">
            <span className="line-through tabular-nums">{m.compareAtCoins.toLocaleString('fr-FR')} QC</span>
            <span className="mx-1.5 font-bold text-emerald-700">
              −{m.savingsCoins.toLocaleString('fr-FR')} QC
            </span>
            <span className="text-slate-400">vs achat séparé</span>
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <span className="font-display text-xl font-black text-amber-800 tabular-nums">
            {item.priceCoins.toLocaleString('fr-FR')} QC
          </span>
          {owns ? (
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700">Déjà à toi</span>
          ) : (
            <button
              type="button"
              disabled={coinPurchaseSku === item.sku || !affordable}
              onClick={() => void buyWithCoins(item.sku)}
              className="btn btn-primary btn-md text-sm font-black disabled:opacity-50"
              title={!affordable ? 'Solde insuffisant — recharge des Quest Coins.' : undefined}
            >
              {coinPurchaseSku === item.sku ? '…' : 'Acheter'}
            </button>
          )}
        </div>
        {!owns && !affordable ? (
          <button
            type="button"
            className="self-start text-[11px] font-semibold text-orange-700 underline decoration-orange-400/80 hover:text-orange-900"
            onClick={() => setRechargeOpen(true)}
          >
            Recharger
          </button>
        ) : null}
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-adventure">
      <Navbar />
      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-24 pb-24">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm font-bold text-cyan-900 hover:underline mb-6"
        >
          ← Retour à la quête
        </Link>

        <h1 className="font-display font-black text-3xl text-slate-900 mb-6">Boutique</h1>

        {banner && (
          <div className="mb-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/95 px-4 py-3 text-sm font-semibold text-emerald-950">
            {banner}
          </div>
        )}

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
            <div className="sticky top-24 z-40 -mx-4 px-4 pt-2 pb-6 mb-6">
              <div className="max-w-4xl mx-auto rounded-3xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-amber-100/90 p-5 sm:p-6 shadow-[0_12px_40px_-8px_rgba(180,83,9,0.25)]">
                <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6">
                  <div className="min-w-0 flex items-center gap-4">
                    <span
                      className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-3xl ring-2 ring-amber-400/40"
                      aria-hidden
                    >
                      🪙
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-amber-900/90 mb-1">
                        Ton solde
                      </p>
                      <p className="font-display text-4xl sm:text-5xl font-black tracking-tight text-slate-900 tabular-nums leading-none">
                        {balance.toLocaleString('fr-FR')}
                        <span className="ml-2 text-2xl sm:text-3xl font-black text-amber-700">QC</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-700/30 ring-2 ring-emerald-500/40 hover:bg-emerald-700 hover:ring-emerald-400/50 transition-colors sm:min-w-[200px]"
                    onClick={() => setRechargeOpen(true)}
                  >
                    Ajouter des QC
                  </button>
                </div>
              </div>
            </div>

            <section className="mb-10" aria-labelledby="shop-prefs-heading">
              <div className="rounded-3xl border border-slate-200/90 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 sm:px-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-cyan-50/40 to-amber-50/30">
                  <div>
                    <h2 id="shop-prefs-heading" className="font-display font-black text-lg text-slate-900">
                      Équipement & affichage
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      Thème, ton des quêtes et titre — utilisés tout de suite dans l’app.
                    </p>
                  </div>
                </div>
                <div className="p-5 sm:p-6 grid gap-5 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Thème actif
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      value={shop.activeThemeId}
                      onChange={(e) => void savePreferences({ activeThemeId: e.target.value })}
                    >
                      {getThemeIds()
                        .filter((id) => ownedThemeIds.has(id))
                        .map((id) => (
                          <option key={id} value={id}>
                            {id === 'default'
                              ? 'Questia (clair)'
                              : id === 'midnight'
                                ? 'Nuit boréale'
                                : id === 'aurora'
                                  ? 'Aurore'
                                  : id === 'parchment'
                                    ? 'Parchemin'
                                    : id}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Ton des textes de quête
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      value={shop.activeNarrationPackId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        void savePreferences({
                          activeNarrationPackId: v === '' ? null : v,
                        });
                      }}
                    >
                      <option value="">Style Questia (par défaut)</option>
                      {ownedNarration.size > 0
                        ? [...ownedNarration].map((id) => (
                            <option key={id} value={id}>
                              {NARRATION_LABELS[id] ?? id}
                            </option>
                          ))
                        : null}
                    </select>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Prochaines quêtes du jour uniquement.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Titre sur le profil
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      value={shop.equippedTitleId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        void savePreferences({ equippedTitleId: v === '' ? null : v });
                      }}
                    >
                      <option value="">Aucun titre</option>
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
                <div className="flex flex-wrap gap-3 px-5 sm:px-6 py-4 bg-slate-50/90 border-t border-slate-100">
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/90 px-3 py-1.5 text-xs font-semibold text-orange-950">
                    <span className="opacity-80">Relances bonus</span>
                    <span className="font-black tabular-nums text-orange-800">{shop.bonusRerollCredits}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-xs font-semibold text-emerald-950">
                    <span className="opacity-80">Surcharges XP</span>
                    <span className="font-black tabular-nums text-emerald-800">{shop.xpBonusCharges}</span>
                    <span className="text-[10px] font-medium text-emerald-800/80">
                      (+{XP_SHOP_BONUS_PER_CHARGE} XP / validation)
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {featuredBundle ? (
              <section className="mb-10" aria-labelledby="shop-featured-heading">
                <h2 id="shop-featured-heading" className="font-display font-black text-xl text-slate-900 mb-3">
                  À la une
                </h2>
                <div className="rounded-3xl border-2 border-violet-400/50 bg-gradient-to-br from-violet-50 via-amber-50/80 to-cyan-50 p-6 shadow-lg">
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
                          <p className="font-display font-black text-xl text-slate-900 flex-1 min-w-0">
                            {featuredBundle.name}
                          </p>
                          {featuredBundle.contentsDetail ? (
                            <button
                              type="button"
                              className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 mt-0.5"
                              aria-label={`Plus d'infos : ${featuredBundle.name}`}
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
                  <p className="text-sm text-slate-700 font-medium mb-2">{featuredBundle.description}</p>
                  {featuredBundle.includedItems?.length ? (
                    <ul className="list-disc pl-5 text-sm text-slate-700 font-medium space-y-1 mb-2">
                      {featuredBundle.includedItems.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                  {featuredBundle.marketing?.hook ? (
                    <p className="text-sm font-semibold text-violet-900 mb-3">{featuredBundle.marketing.hook}</p>
                  ) : null}
                  {featuredBundle.marketing?.compareAtCoins != null &&
                  featuredBundle.marketing?.savingsCoins != null ? (
                    <p className="text-sm text-slate-600 mb-4">
                      <span className="line-through tabular-nums">
                        {featuredBundle.marketing.compareAtCoins.toLocaleString('fr-FR')} QC
                      </span>
                      <span className="ml-2 font-black text-emerald-700">
                        Économie ~{featuredBundle.marketing.savingsCoins.toLocaleString('fr-FR')} QC
                      </span>
                      <span className="text-slate-400 text-xs ml-1">vs pièces détail</span>
                    </p>
                  ) : null}
                  {(() => {
                    const owns = catalogItemFullyOwned(featuredBundle, shop);
                    const affordable = balance >= featuredBundle.priceCoins;
                    return (
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-violet-200/60">
                        <span className="font-display text-2xl font-black text-amber-900 tabular-nums">
                          {featuredBundle.priceCoins.toLocaleString('fr-FR')} QC
                        </span>
                        {owns ? (
                          <span className="text-sm font-black uppercase text-emerald-700">Déjà à toi</span>
                        ) : (
                          <button
                            type="button"
                            disabled={coinPurchaseSku === featuredBundle.sku || !affordable}
                            onClick={() => void buyWithCoins(featuredBundle.sku)}
                            className="btn btn-primary btn-md text-sm font-black disabled:opacity-50"
                          >
                            {coinPurchaseSku === featuredBundle.sku ? '…' : 'Acheter le bundle'}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  {!catalogItemFullyOwned(featuredBundle, shop) && balance < featuredBundle.priceCoins ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-orange-700 underline decoration-orange-400/80 hover:text-orange-900"
                      onClick={() => setRechargeOpen(true)}
                    >
                      Recharger
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="mb-10" aria-labelledby="shop-xp-heading">
              <h2 id="shop-xp-heading" className="font-display font-black text-lg text-slate-900 mb-3">
                Progression & XP
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">{xpItems.map(renderCatalogCard)}</ul>
            </section>

            <section className="mb-10" aria-labelledby="shop-look-heading">
              <h2 id="shop-look-heading" className="font-display font-black text-lg text-slate-900 mb-3">
                Apparence
              </h2>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Thèmes</h3>
              <ul className="grid gap-4 sm:grid-cols-2 mb-8">{themeItems.map(renderCatalogCard)}</ul>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Titres</h3>
              <ul className="grid gap-4 sm:grid-cols-2">{titleItems.map(renderCatalogCard)}</ul>
            </section>

            <section className="mb-10" aria-labelledby="shop-narration-heading">
              <h2 id="shop-narration-heading" className="font-display font-black text-lg text-slate-900 mb-3">
                Ton des quêtes
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">{narrationItems.map(renderCatalogCard)}</ul>
            </section>

            <section className="mb-10" aria-labelledby="shop-reroll-heading">
              <h2 id="shop-reroll-heading" className="font-display font-black text-lg text-slate-900 mb-3">
                Relances
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">{rerollItems.map(renderCatalogCard)}</ul>
            </section>

            <section>
              <h2 className="label mb-4">Journal des transactions</h2>
              {transactions.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                  Aucune opération pour l’instant.
                </p>
              ) : (
                <ul className="rounded-2xl border border-slate-200/90 bg-white/90 divide-y divide-slate-100 overflow-hidden">
                  {transactions.map((tx) => (
                    <li key={tx.id} className="px-4 py-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-800 block">{tx.label}</span>
                        <span className="text-slate-500 font-mono text-[10px]">{tx.primarySku}</span>
                      </div>
                      <div className="text-right">
                        {tx.coinsDelta != null ? (
                          <span
                            className={`font-black tabular-nums ${tx.coinsDelta >= 0 ? 'text-emerald-700' : 'text-orange-800'}`}
                          >
                            {tx.coinsDelta >= 0 ? '+' : ''}
                            {tx.coinsDelta} QC
                          </span>
                        ) : null}
                        {tx.amountCents > 0 ? (
                          <span className="block text-xs text-slate-600 font-semibold">
                            {(tx.amountCents / 100).toFixed(2).replace('.', ',')} {tx.currency.toUpperCase()}
                          </span>
                        ) : null}
                        {tx.coinBalanceAfter != null ? (
                          <span className="block text-[10px] text-slate-400">
                            Solde après : {tx.coinBalanceAfter} QC
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-400 w-full font-medium">
                        {new Date(tx.createdAt).toLocaleString('fr-FR', {
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
                  aria-label="Fermer"
                  onClick={() => setRechargeOpen(false)}
                />
                <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-t-2xl border border-emerald-200/90 bg-white shadow-2xl sm:rounded-2xl">
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
                  aria-label="Fermer"
                  onClick={() => setInfoModal(null)}
                />
                <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full p-2 text-slate-500 hover:bg-slate-100"
                    onClick={() => setInfoModal(null)}
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                  <h3 id="info-modal-title" className="font-display font-black text-lg text-slate-900 pr-8">
                    {infoModal.title}
                  </h3>
                  <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {infoModal.body}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-5 w-full font-black"
                    onClick={() => setInfoModal(null)}
                  >
                    OK
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
          <main className="max-w-4xl mx-auto px-4 pt-24 pb-24 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </main>
        </div>
      }
    >
      <ShopPageInner />
    </Suspense>
  );
}
