import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  AppState,
  RefreshControl,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SHOP_CATALOG,
  COIN_PACKS,
  getThemeIds,
  getTitleDefinition,
  XP_SHOP_BONUS_PER_CHARGE,
  bonusPercentVsPack,
  questCoinsPerEuro,
  type ShopCatalogEntry,
  type ShopMarketingBadge,
} from '@questia/shared';
import { DA } from '@questia/ui';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function apiFetch(
  url: string,
  token: string | null,
  options?: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
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

const TITLE_NONE = '__title_none__';
const NARRATION_NONE = '__narration_none__';

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

function themeLabel(id: string): string {
  if (id === 'default') return 'Questia (clair)';
  if (id === 'midnight') return 'Nuit boréale';
  if (id === 'aurora') return 'Aurore';
  if (id === 'parchment') return 'Parchemin';
  return id;
}

function narrationDisplayLabel(shop: ProfileShop): string {
  const id = shop.activeNarrationPackId;
  if (!id) return 'Style Questia (par défaut)';
  return NARRATION_LABELS[id] ?? id;
}

function titleDisplayLabel(shop: ProfileShop): string {
  const id = shop.equippedTitleId;
  if (!id) return 'Aucun titre';
  const def = getTitleDefinition(id);
  return def ? `${def.emoji} ${def.label}` : id;
}

type SelectOpt = { value: string; label: string };

function SelectSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SelectOpt[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <View pointerEvents="box-none" style={styles.modalSheetWrap}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  style={[styles.modalRow, o.value === selectedValue && styles.modalRowSelected]}
                  onPress={() => {
                    onSelect(o.value);
                    onClose();
                  }}
                >
                  <Text style={styles.modalRowText} numberOfLines={2}>
                    {o.label}
                  </Text>
                  {o.value === selectedValue ? <Text style={styles.modalCheck}>✓</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const BADGE_BG: Record<ShopMarketingBadge, string> = {
  featured: '#7c3aed',
  best_value: '#059669',
  popular: '#ea580c',
  starter: '#475569',
  new: '#0891b2',
};

function MarketingBadgeRN({ badge }: { badge: ShopMarketingBadge }) {
  return (
    <View style={[styles.badgePill, { backgroundColor: BADGE_BG[badge] }]}>
      <Text style={styles.badgePillText}>{BADGE_LABELS[badge]}</Text>
    </View>
  );
}

export default function ShopScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const [items] = useState<ShopCatalogEntry[]>(() =>
    [...SHOP_CATALOG].sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.name.localeCompare(b.name)),
  );
  const coinPacksSorted = useMemo(
    () => [...COIN_PACKS].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [],
  );
  const coinPackReference = coinPacksSorted[0];

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

  const [shop, setShop] = useState<ProfileShop | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoadingSku, setStripeLoadingSku] = useState<string | null>(null);
  const [coinPurchaseSku, setCoinPurchaseSku] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [selectKind, setSelectKind] = useState<null | 'theme' | 'narration' | 'title'>(null);
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const stripeOpenedAt = useRef<number | null>(null);

  const themeOptions = useMemo(() => {
    if (!shop) return [] as SelectOpt[];
    const o = new Set(shop.ownedThemes ?? ['default']);
    return getThemeIds()
      .filter((id) => o.has(id))
      .map((id) => ({ value: id, label: themeLabel(id) }));
  }, [shop]);

  const narrationOptions = useMemo(() => {
    if (!shop) return [] as SelectOpt[];
    const rows: SelectOpt[] = [{ value: NARRATION_NONE, label: 'Style Questia (par défaut)' }];
    for (const id of shop.ownedNarrationPacks ?? []) {
      rows.push({ value: id, label: NARRATION_LABELS[id] ?? id });
    }
    return rows;
  }, [shop]);

  const titleOptions = useMemo(() => {
    if (!shop) return [] as SelectOpt[];
    const rows: SelectOpt[] = [{ value: TITLE_NONE, label: 'Aucun titre' }];
    for (const id of shop.ownedTitleIds ?? []) {
      const def = getTitleDefinition(id);
      rows.push({ value: id, label: def ? `${def.emoji} ${def.label}` : id });
    }
    return rows;
  }, [shop]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setError(null);
    try {
      const token = await getTokenRef.current();
      const [pRes, tRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/profile`, token),
        apiFetch(`${API_BASE_URL}/api/shop/transactions`, token),
      ]);
      if (!pRes.ok) {
        if (!silent) {
          setError(pRes.status === 401 ? 'Session expirée. Reconnecte-toi.' : 'Profil introuvable.');
          setLoading(false);
        }
        setRefreshing(false);
        return;
      }
      const pJson = (await pRes.json()) as { shop?: ProfileShop };
      setShop(pJson.shop ?? null);
      if (tRes.ok) {
        const tJson = (await tRes.json()) as { transactions?: TxRow[] };
        setTransactions(tJson.transactions ?? []);
      }
    } catch {
      if (!silent) setError('Impossible de charger la boutique.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const t = stripeOpenedAt.current;
      if (t != null && Date.now() - t < 180_000) {
        stripeOpenedAt.current = null;
        void load({ silent: true });
        setBanner('Si le paiement est passé, ton solde est à jour ci-dessous.');
      }
    });
    return () => sub.remove();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ silent: true });
  }, [load]);

  const rechargeStripe = async (sku: string) => {
    setStripeLoadingSku(sku);
    setBanner(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch(`${API_BASE_URL}/api/shop/checkout`, token, {
        method: 'POST',
        body: JSON.stringify({ sku }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setBanner(data.error ?? 'Impossible de lancer le paiement.');
        return;
      }
      stripeOpenedAt.current = Date.now();
      await WebBrowser.openBrowserAsync(data.url);
    } finally {
      setStripeLoadingSku(null);
    }
  };

  const buyWithCoins = async (sku: string) => {
    setCoinPurchaseSku(sku);
    setBanner(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch(`${API_BASE_URL}/api/shop/purchase`, token, {
        method: 'POST',
        body: JSON.stringify({ sku }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setBanner(data.error ?? 'Achat impossible.');
        return;
      }
      await load({ silent: true });
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
    const token = await getTokenRef.current();
    const res = await apiFetch(`${API_BASE_URL}/api/profile`, token, {
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

  const balance = shop?.coinBalance ?? 0;

  const renderCatalogCard = (item: ShopCatalogEntry) => {
    if (!shop) return null;
    const owns = catalogItemFullyOwned(item, shop);
    const affordable = balance >= item.priceCoins;
    const m = item.marketing;
    const highlight = m?.badge === 'featured' || m?.badge === 'best_value';
    return (
      <View
        key={item.sku}
        style={[styles.card, highlight && styles.cardHighlight]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
          <View style={styles.cardBadges}>
            {m?.badge ? <MarketingBadgeRN badge={m.badge} /> : null}
            <Text style={styles.kindLbl}>{kindLabel(item.kind)}</Text>
            {item.contentsDetail ? (
              <Pressable
                style={styles.infoDot}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Plus d'infos : ${item.name}`}
                onPress={() => Alert.alert(item.name, item.contentsDetail!)}
              >
                <Text style={styles.infoDotText}>i</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardDesc}>{item.description}</Text>
        {item.includedItems?.map((line) => (
          <Text key={line} style={styles.includedLine}>
            • {line}
          </Text>
        ))}
        {m?.hook ? <Text style={styles.cardHook}>{m.hook}</Text> : null}
        {m?.compareAtCoins != null && m.savingsCoins != null ? (
          <Text style={styles.cardSave}>
            <Text style={styles.strike}>{m.compareAtCoins.toLocaleString('fr-FR')} QC</Text>
            <Text style={styles.saveAmt}> −{m.savingsCoins.toLocaleString('fr-FR')} QC </Text>
            <Text style={styles.mutedSm}>vs achat séparé</Text>
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.price}>{item.priceCoins.toLocaleString('fr-FR')} QC</Text>
          {owns ? (
            <Text style={styles.ownsLbl}>Déjà à toi</Text>
          ) : (
            <Pressable
              style={[styles.buyBtn, (!affordable || coinPurchaseSku === item.sku) && styles.buyBtnDisabled]}
              disabled={coinPurchaseSku === item.sku || !affordable}
              onPress={() => void buyWithCoins(item.sku)}
            >
              <Text style={styles.buyBtnText}>{coinPurchaseSku === item.sku ? '…' : 'Acheter'}</Text>
            </Pressable>
          )}
        </View>
        {!owns && !affordable ? (
          <Pressable onPress={() => setRechargeModalVisible(true)} accessibilityRole="button">
            <Text style={styles.insuffLink}>Recharger</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  if (loading && !shop && !error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Retour</Text>
          </Pressable>
          <Text style={styles.topTitle}>Boutique</Text>
          <View style={{ width: 72 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color="#22d3ee" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.topTitle}>Boutique</Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}
        keyboardShouldPersistTaps="handled"
      >
        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => void load()}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}

        {shop && !error ? (
          <>
            <LinearGradient
              colors={['#fffbeb', '#ffffff', '#fef3c7']}
              locations={[0, 0.42, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceGradient}
            >
              <View style={styles.balanceRow}>
                <View style={styles.balanceCoinIcon} accessibilityElementsHidden>
                  <Text style={styles.balanceCoinEmoji}>🪙</Text>
                </View>
                <View style={styles.balanceLeft}>
                  <Text style={styles.balanceK}>Ton solde</Text>
                  <Text style={styles.balanceNum}>
                    {balance.toLocaleString('fr-FR')}
                    <Text style={styles.balanceQc}> QC</Text>
                  </Text>
                </View>
                <Pressable
                  style={styles.balanceCta}
                  onPress={() => setRechargeModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter des Quest Coins en euros"
                >
                  <Text style={styles.balanceCtaText}>Ajouter des QC</Text>
                </Pressable>
              </View>
            </LinearGradient>

            <View style={styles.prefsSection}>
              <View style={styles.prefsHero}>
                <Text style={styles.prefsTitle}>Équipement & affichage</Text>
                <Text style={styles.prefsSubtitle}>
                  Thème, ton des quêtes et titre — utilisés tout de suite dans l’app.
                </Text>
              </View>
              <View style={styles.prefsFields}>
                <View style={styles.prefsFieldCard}>
                  <Text style={styles.prefsFieldLabel}>Thème actif</Text>
                  <Pressable
                    style={styles.selectRow}
                    onPress={() => setSelectKind('theme')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.selectRowText}>{themeLabel(shop.activeThemeId)}</Text>
                    <Text style={styles.selectChevron}>▼</Text>
                  </Pressable>
                </View>
                <View style={styles.prefsFieldCard}>
                  <Text style={styles.prefsFieldLabel}>Ton des textes de quête</Text>
                  <Pressable
                    style={styles.selectRow}
                    onPress={() => setSelectKind('narration')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.selectRowText}>{narrationDisplayLabel(shop)}</Text>
                    <Text style={styles.selectChevron}>▼</Text>
                  </Pressable>
                  <Text style={styles.prefsFieldHint}>Prochaines quêtes du jour uniquement.</Text>
                </View>
                <View style={styles.prefsFieldCard}>
                  <Text style={styles.prefsFieldLabel}>Titre sur le profil</Text>
                  <Pressable
                    style={styles.selectRow}
                    onPress={() => setSelectKind('title')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.selectRowText}>{titleDisplayLabel(shop)}</Text>
                    <Text style={styles.selectChevron}>▼</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.prefsStatsRow}>
                <View style={styles.statPillOrange}>
                  <Text style={styles.statPillLabel}>Relances bonus</Text>
                  <Text style={styles.statPillValueReroll}>{shop.bonusRerollCredits}</Text>
                </View>
                <View style={styles.statPillGreen}>
                  <Text style={styles.statPillLabel}>Surcharges XP</Text>
                  <Text style={styles.statPillValueXp}>{shop.xpBonusCharges}</Text>
                  <Text style={styles.statPillHint}>
                    (+{XP_SHOP_BONUS_PER_CHARGE} XP / validation)
                  </Text>
                </View>
              </View>
            </View>

            {featuredBundle ? (
              <View style={styles.section}>
                <Text style={styles.h2}>À la une</Text>
                <View style={styles.featuredBox}>
                  <View style={styles.featuredHead}>
                    <Text style={styles.featuredEmoji}>{featuredBundle.emoji}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {featuredBundle.marketing?.badge ? (
                        <MarketingBadgeRN badge={featuredBundle.marketing.badge} />
                      ) : null}
                      <View style={styles.featuredTitleRow}>
                        <Text style={[styles.featuredName, styles.featuredNameFlex]}>{featuredBundle.name}</Text>
                        {featuredBundle.contentsDetail ? (
                          <Pressable
                            style={styles.infoDot}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={`Plus d'infos : ${featuredBundle.name}`}
                            onPress={() =>
                              Alert.alert(featuredBundle.name, featuredBundle.contentsDetail!)
                            }
                          >
                            <Text style={styles.infoDotText}>i</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.featuredDesc}>{featuredBundle.description}</Text>
                  {featuredBundle.includedItems?.map((line) => (
                    <Text key={line} style={styles.includedLineFeatured}>
                      • {line}
                    </Text>
                  ))}
                  {featuredBundle.marketing?.hook ? (
                    <Text style={styles.featuredHook}>{featuredBundle.marketing.hook}</Text>
                  ) : null}
                  {featuredBundle.marketing?.compareAtCoins != null &&
                  featuredBundle.marketing?.savingsCoins != null ? (
                    <Text style={styles.featuredSave}>
                      <Text style={styles.strike}>
                        {featuredBundle.marketing.compareAtCoins.toLocaleString('fr-FR')} QC
                      </Text>
                      <Text style={styles.saveAmt}>
                        {' '}
                        Économie ~{featuredBundle.marketing.savingsCoins.toLocaleString('fr-FR')} QC
                      </Text>
                      <Text style={styles.mutedSm}> vs détail</Text>
                    </Text>
                  ) : null}
                  <View style={styles.featuredFooter}>
                    <Text style={styles.featuredPrice}>
                      {featuredBundle.priceCoins.toLocaleString('fr-FR')} QC
                    </Text>
                    {catalogItemFullyOwned(featuredBundle, shop) ? (
                      <Text style={styles.ownsLbl}>Déjà à toi</Text>
                    ) : (
                      <Pressable
                        style={[
                          styles.buyBtnLg,
                          (balance < featuredBundle.priceCoins || coinPurchaseSku === featuredBundle.sku) &&
                            styles.buyBtnDisabled,
                        ]}
                        disabled={coinPurchaseSku === featuredBundle.sku || balance < featuredBundle.priceCoins}
                        onPress={() => void buyWithCoins(featuredBundle.sku)}
                      >
                        <Text style={styles.buyBtnText}>
                          {coinPurchaseSku === featuredBundle.sku ? '…' : 'Acheter le bundle'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  {!catalogItemFullyOwned(featuredBundle, shop) && balance < featuredBundle.priceCoins ? (
                    <Pressable onPress={() => setRechargeModalVisible(true)} accessibilityRole="button">
                      <Text style={styles.insuffLink}>Recharger</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.h2}>Progression & XP</Text>
              {xpItems.map(renderCatalogCard)}
            </View>

            <View style={styles.section}>
              <Text style={styles.h2}>Apparence</Text>
              <Text style={styles.h3}>Thèmes</Text>
              {themeItems.map(renderCatalogCard)}
              <Text style={styles.h3}>Titres</Text>
              {titleItems.map(renderCatalogCard)}
            </View>

            <View style={styles.section}>
              <Text style={styles.h2}>Ton des quêtes</Text>
              {narrationItems.map(renderCatalogCard)}
            </View>

            <View style={styles.section}>
              <Text style={styles.h2}>Relances</Text>
              {rerollItems.map(renderCatalogCard)}
            </View>

            <View style={styles.section}>
              <Text style={styles.h2}>Journal des transactions</Text>
              {transactions.length === 0 ? (
                <Text style={styles.emptyTx}>Aucune opération pour l’instant.</Text>
              ) : (
                transactions.map((tx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txLabel}>{tx.label}</Text>
                      <Text style={styles.txSku}>{tx.primarySku}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {tx.coinsDelta != null ? (
                        <Text
                          style={[styles.txCoins, tx.coinsDelta >= 0 ? styles.txPos : styles.txNeg]}
                        >
                          {tx.coinsDelta >= 0 ? '+' : ''}
                          {tx.coinsDelta} QC
                        </Text>
                      ) : null}
                      {tx.amountCents > 0 ? (
                        <Text style={styles.txEur}>
                          {(tx.amountCents / 100).toFixed(2).replace('.', ',')} {tx.currency.toUpperCase()}
                        </Text>
                      ) : null}
                      {tx.coinBalanceAfter != null ? (
                        <Text style={styles.txAfter}>Solde après : {tx.coinBalanceAfter} QC</Text>
                      ) : null}
                      <Text style={styles.txDate}>
                        {new Date(tx.createdAt).toLocaleString('fr-FR', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      {shop && !error ? (
        <SelectSheet
          visible={selectKind !== null}
          title={
            selectKind === 'theme'
              ? 'Thème actif'
              :             selectKind === 'narration'
                ? 'Ton des textes de quête'
                : selectKind === 'title'
                  ? 'Titre sur le profil'
                  : ''
          }
          options={
            selectKind === 'theme'
              ? themeOptions
              : selectKind === 'narration'
                ? narrationOptions
                : selectKind === 'title'
                  ? titleOptions
                  : []
          }
          selectedValue={
            selectKind === 'theme'
              ? shop.activeThemeId
              : selectKind === 'narration'
                ? (shop.activeNarrationPackId ?? NARRATION_NONE)
                : selectKind === 'title'
                  ? (shop.equippedTitleId ?? TITLE_NONE)
                  : ''
          }
          onSelect={(v) => {
            if (selectKind === 'theme') void savePreferences({ activeThemeId: v });
            else if (selectKind === 'narration') {
              void savePreferences({ activeNarrationPackId: v === NARRATION_NONE ? null : v });
            } else if (selectKind === 'title') {
              void savePreferences({ equippedTitleId: v === TITLE_NONE ? null : v });
            }
          }}
          onClose={() => setSelectKind(null)}
        />
      ) : null}

      {shop && !error ? (
        <Modal
          visible={rechargeModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setRechargeModalVisible(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setRechargeModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            />
            <View pointerEvents="box-none" style={styles.modalSheetWrap}>
              <View style={[styles.modalSheet, styles.rechargeModalSheet]}>
                <View style={styles.rechargeModalHeader}>
                  <View style={styles.rechargeModalHeaderTop}>
                    <View style={styles.rechargeModalHeaderText}>
                      <Text style={styles.rechargeModalTitle}>Ajouter des Quest Coins</Text>
                      <Text style={styles.rechargeModalSubtitle}>
                        Paiement par carte via Stripe. Aucun abonnement — tu paies uniquement le montant choisi.
                      </Text>
                      <View style={styles.rechargeModalPills}>
                        <View style={styles.rechargeBalancePill}>
                          <Text style={styles.rechargeBalancePillLbl}>Solde actuel</Text>
                          <Text style={styles.rechargeBalancePillVal}>
                            {balance.toLocaleString('fr-FR')} QC
                          </Text>
                        </View>
                        <View style={styles.rechargeTrustPill}>
                          <Text style={styles.rechargeTrustPillTxt}>🔒 Paiement sécurisé</Text>
                        </View>
                      </View>
                      <Text style={styles.rechargeModalHint}>
                        Après validation, les QC sont ajoutés à ton solde. Utilisables dans la boutique.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setRechargeModalVisible(false)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel="Fermer"
                    >
                      <Text style={styles.rechargeModalClose}>✕</Text>
                    </Pressable>
                  </View>
                </View>
                <ScrollView
                  style={styles.rechargeModalScroll}
                  contentContainerStyle={styles.rechargeModalScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {coinPacksSorted.map((pack) => {
                    const eur = (pack.priceCents / 100).toFixed(2).replace('.', ',');
                    const qcPerEur = questCoinsPerEuro(pack.priceCents, pack.coinsGranted);
                    const bonusVsStarter =
                      coinPackReference && pack.sku !== coinPackReference.sku
                        ? bonusPercentVsPack(pack, coinPackReference)
                        : 0;
                    const isBest = pack.marketing?.badge === 'best_value';
                    return (
                      <View key={pack.sku} style={[styles.rechargePackCard, isBest && styles.rechargePackCardBest]}>
                        <View style={styles.rechargePackTop}>
                          <Text style={styles.rechargePackEmoji}>{pack.emoji}</Text>
                          <View style={styles.cardBadges}>
                            {pack.marketing?.badge ? <MarketingBadgeRN badge={pack.marketing.badge} /> : null}
                            {pack.contentsDetail ? (
                              <Pressable
                                style={styles.infoDot}
                                hitSlop={10}
                                accessibilityRole="button"
                                accessibilityLabel={`Plus d'infos : ${pack.name}`}
                                onPress={() => Alert.alert(pack.name, pack.contentsDetail!)}
                              >
                                <Text style={styles.infoDotText}>i</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                        <Text style={styles.rechargePackQc}>
                          +{pack.coinsGranted.toLocaleString('fr-FR')}{' '}
                          <Text style={styles.rechargePackQcUnit}>QC</Text>
                        </Text>
                        <Text style={styles.rechargePackName}>{pack.name}</Text>
                        <Text style={styles.rechargePackDesc}>{pack.description}</Text>
                        {pack.includedItems?.map((line) => (
                          <View key={line} style={styles.rechargePackBulletRow}>
                            <Text style={styles.rechargePackBullet}>✓</Text>
                            <Text style={styles.rechargePackBulletTxt}>{line}</Text>
                          </View>
                        ))}
                        {pack.marketing?.hook ? (
                          <Text style={styles.rechargePackHook}>{pack.marketing.hook}</Text>
                        ) : null}
                        <View style={styles.rechargePackPriceBlock}>
                          <Text style={styles.rechargePackEur}>{eur} €</Text>
                          <Text style={styles.rechargePackMeta}>
                            {Math.round(qcPerEur)} QC / €
                            {bonusVsStarter > 0 ? (
                              <Text style={styles.bonusPct}> (+{bonusVsStarter}% vs petit)</Text>
                            ) : null}
                          </Text>
                          <Pressable
                            style={[styles.stripeBtn, stripeLoadingSku === pack.sku && styles.buyBtnDisabled]}
                            disabled={stripeLoadingSku === pack.sku}
                            onPress={() => void rechargeStripe(pack.sku)}
                          >
                            <Text style={styles.stripeBtnText}>
                              {stripeLoadingSku === pack.sku
                                ? 'Redirection…'
                                : `Payer ${eur} €`}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={styles.rechargeModalFooter}>
                  <Text style={styles.rechargeModalFooterTxt}>
                    Tu reviens sur la boutique après le paiement. Annulation = aucun débit.
                  </Text>
                  <Pressable style={styles.modalCancel} onPress={() => setRechargeModalVisible(false)}>
                    <Text style={styles.modalCancelText}>Fermer</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const C = {
  bg: DA.bg,
  card: DA.card,
  border: DA.borderCyan,
  accent: DA.cyan,
  text: DA.text,
  muted: DA.muted,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,211,238,0.2)',
  },
  backBtn: { paddingVertical: 8, minWidth: 72 },
  backText: { color: C.accent, fontWeight: '800', fontSize: 14 },
  topTitle: { fontSize: 15, fontWeight: '900', color: C.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { fontSize: 13, fontWeight: '600', color: '#065f46' },
  errBox: { marginBottom: 12 },
  errText: { color: '#f87171', fontWeight: '600', marginBottom: 8 },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '800' },
  /** Aligné sur la carte solde web : un seul bloc (dégradé + bordure), pas de double encadré */
  balanceGradient: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(252, 211, 77, 0.75)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#b45309',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceCoinIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  balanceCoinEmoji: { fontSize: 26 },
  balanceLeft: { flex: 1, minWidth: 0 },
  balanceK: {
    fontSize: 11,
    fontWeight: '900',
    color: '#78350f',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  balanceNum: { fontSize: 32, fontWeight: '900', color: C.text, marginTop: 4, letterSpacing: -0.5 },
  balanceQc: { fontSize: 20, fontWeight: '900', color: '#b45309' },
  balanceCta: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    flexShrink: 0,
  },
  balanceCtaText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.4, textAlign: 'center' },
  section: { marginBottom: 20 },
  h2: { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 6 },
  h3: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  sectionSub: { fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 16 },
  featuredBox: {
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.45)',
    borderRadius: 22,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  featuredHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  featuredEmoji: { fontSize: 40 },
  featuredName: { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 6 },
  featuredDesc: { fontSize: 13, color: '#334155', fontWeight: '600', lineHeight: 20, marginBottom: 8 },
  featuredHook: { fontSize: 13, fontWeight: '700', color: '#5b21b6', marginBottom: 8 },
  featuredSave: { fontSize: 12, marginBottom: 10 },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,92,246,0.25)',
    gap: 12,
  },
  featuredPrice: { fontSize: 22, fontWeight: '900', color: '#92400e' },
  coinCard: {
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  coinCardBest: {
    borderWidth: 2,
    borderColor: '#34d399',
    backgroundColor: 'rgba(236,253,245,0.95)',
  },
  coinGrant: { fontSize: 18, fontWeight: '900', color: '#047857', marginTop: 6 },
  coinMeta: { fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 4 },
  bonusPct: { color: '#047857', fontWeight: '900' },
  stripeBtn: {
    marginTop: 12,
    backgroundColor: '#f97316',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  stripeBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: C.card,
  },
  cardHighlight: {
    borderColor: 'rgba(16,185,129,0.45)',
    borderWidth: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardEmoji: { fontSize: 28 },
  cardBadges: { alignItems: 'flex-end', gap: 4 },
  kindLbl: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, textAlign: 'right' },
  infoDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  infoDotText: { fontSize: 10, fontWeight: '900', color: '#475569' },
  includedLine: { fontSize: 11, color: '#334155', fontWeight: '600', marginTop: 4, lineHeight: 16 },
  includedLineFeatured: { fontSize: 12, color: '#334155', fontWeight: '600', marginTop: 4, lineHeight: 18 },
  featuredTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 },
  featuredNameFlex: { flex: 1, minWidth: 0, marginTop: 0 },
  badgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgePillText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: C.text, marginTop: 8 },
  cardDesc: { fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 18, fontWeight: '600' },
  cardHook: { fontSize: 11, fontWeight: '700', color: '#047857', marginTop: 6 },
  cardSave: { fontSize: 11, marginTop: 6 },
  strike: { textDecorationLine: 'line-through', color: '#94a3b8' },
  saveAmt: { fontWeight: '900', color: '#047857' },
  mutedSm: { color: '#94a3b8', fontSize: 11 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226,232,240,0.9)',
  },
  price: { fontSize: 18, fontWeight: '900', color: '#92400e' },
  ownsLbl: { fontSize: 11, fontWeight: '900', color: '#047857', letterSpacing: 0.5 },
  buyBtn: {
    backgroundColor: '#f97316',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buyBtnLg: {
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buyBtnDisabled: { opacity: 0.45 },
  buyBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  insuffLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2410c',
    marginTop: 6,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(194,65,12,0.45)',
  },
  prefsSection: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: '#fff',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  prefsHero: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,232,240,0.95)',
    backgroundColor: 'rgba(248,250,252,0.95)',
  },
  prefsTitle: { fontSize: 17, fontWeight: '900', color: C.text },
  prefsSubtitle: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 4, lineHeight: 17 },
  prefsFields: { padding: 14, gap: 12 },
  prefsFieldCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    backgroundColor: 'rgba(248,250,252,0.65)',
    padding: 12,
  },
  prefsFieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  prefsFieldHint: { fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 15 },
  prefsStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(241,245,249,0.95)',
    backgroundColor: 'rgba(248,250,252,0.9)',
  },
  statPillOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.45)',
    backgroundColor: 'rgba(255,247,237,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    backgroundColor: 'rgba(236,253,245,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statPillLabel: { fontSize: 11, fontWeight: '700', color: '#334155' },
  statPillValueReroll: { fontSize: 13, fontWeight: '900', color: '#c2410c' },
  statPillValueXp: { fontSize: 13, fontWeight: '900', color: '#047857' },
  statPillHint: { fontSize: 10, fontWeight: '600', color: '#047857', flexShrink: 1 },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0e7490',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.45)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  selectRowText: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  selectChevron: { fontSize: 10, color: '#0e7490', fontWeight: '900' },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    paddingBottom: 28,
    paddingHorizontal: 16,
    zIndex: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  rechargeModalSheet: {
    maxHeight: '90%',
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
    overflow: 'hidden',
  },
  rechargeModalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16,185,129,0.2)',
    backgroundColor: 'rgba(236,253,245,0.85)',
  },
  rechargeModalHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  rechargeModalHeaderText: { flex: 1, minWidth: 0 },
  rechargeModalTitle: { fontSize: 18, fontWeight: '900', color: C.text },
  rechargeModalSubtitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 17,
  },
  rechargeModalPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rechargeBalancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.55)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rechargeBalancePillLbl: { fontSize: 10, fontWeight: '800', color: '#92400e' },
  rechargeBalancePillVal: { fontSize: 13, fontWeight: '900', color: C.text },
  rechargeTrustPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  rechargeTrustPillTxt: { fontSize: 10, fontWeight: '700', color: '#475569' },
  rechargeModalHint: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '600',
    marginTop: 10,
    lineHeight: 16,
  },
  rechargeModalClose: { fontSize: 22, color: '#64748b', fontWeight: '700', paddingLeft: 4 },
  rechargeModalScroll: { flexGrow: 0, maxHeight: 420 },
  rechargeModalScrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
  rechargePackCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(226,232,240,0.95)',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 4,
  },
  rechargePackCardBest: {
    borderColor: '#34d399',
    backgroundColor: 'rgba(236,253,245,0.5)',
  },
  rechargePackTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rechargePackEmoji: { fontSize: 28 },
  rechargePackQc: { fontSize: 26, fontWeight: '900', color: '#065f46', marginTop: 8 },
  rechargePackQcUnit: { fontSize: 15, fontWeight: '900', color: '#047857' },
  rechargePackName: { fontSize: 12, fontWeight: '800', color: '#64748b', marginTop: 4 },
  rechargePackDesc: { fontSize: 12, color: '#334155', fontWeight: '600', marginTop: 8, lineHeight: 17 },
  rechargePackBulletRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-start' },
  rechargePackBullet: { fontSize: 12, color: '#059669', fontWeight: '900', marginTop: 1 },
  rechargePackBulletTxt: { flex: 1, fontSize: 11, color: '#334155', fontWeight: '600', lineHeight: 15 },
  rechargePackHook: { fontSize: 11, fontWeight: '800', color: '#047857', marginTop: 8 },
  rechargePackPriceBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226,232,240,0.95)',
  },
  rechargePackEur: { fontSize: 22, fontWeight: '900', color: C.text },
  rechargePackMeta: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 4 },
  rechargeModalFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(241,245,249,0.95)',
    backgroundColor: 'rgba(248,250,252,0.95)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  rechargeModalFooterTxt: {
    fontSize: 11,
    textAlign: 'center',
    color: '#64748b',
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: C.text,
    paddingVertical: 16,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,232,240,0.9)',
  },
  modalScroll: { maxHeight: 360 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241,245,249,0.9)',
  },
  modalRowSelected: { backgroundColor: 'rgba(34,211,238,0.08)' },
  modalRowText: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1, paddingRight: 12 },
  modalCheck: { fontSize: 16, color: '#047857', fontWeight: '900' },
  modalCancel: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '800', color: '#0e7490' },
  hintSm: { fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 16 },
  statLine: { fontSize: 13, color: C.text, fontWeight: '600', marginTop: 10 },
  statEm: { fontWeight: '900', color: '#047857' },
  emptyTx: {
    textAlign: 'center',
    padding: 24,
    color: C.muted,
    fontWeight: '600',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 14,
  },
  txRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,232,240,0.9)',
    gap: 8,
  },
  txLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  txSku: { fontSize: 9, color: '#94a3b8', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  txCoins: { fontSize: 13, fontWeight: '900' },
  txPos: { color: '#047857' },
  txNeg: { color: '#c2410c' },
  txEur: { fontSize: 11, color: '#475569', fontWeight: '600' },
  txAfter: { fontSize: 9, color: '#94a3b8' },
  txDate: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
});
