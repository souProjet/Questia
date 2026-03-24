import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { HISTORY_PAGE_SIZE, questDisplayEmoji, type EscalationPhase } from '@questia/shared';
import { colorWithAlpha, type ThemePalette } from '@questia/ui';
import { useAppTheme } from '../../contexts/AppThemeContext';

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

const PHASE_LABEL: Record<EscalationPhase, string> = {
  calibration: 'Étalonnage',
  expansion: 'Expansion',
  rupture: 'Rupture',
};

const STATUS_QUEST_LABEL: Record<QuestHistoryRow['status'], string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  completed: 'Terminée',
  rejected: 'Refusée',
  replaced: 'Remplacée',
};

const ENTRY_KIND_LABEL: Record<string, string> = {
  legacy_stripe_product: 'Achat Stripe',
  stripe_coin_topup: 'Recharge QC',
  coin_purchase: 'Achat en QC',
};

const TX_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function txRowA11yLabel(tx: TxRow) {
  const date = new Date(tx.createdAt).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const qc =
    tx.coinsDelta != null
      ? `${tx.coinsDelta >= 0 ? 'plus' : 'moins'} ${Math.abs(tx.coinsDelta)} Quest Coins`
      : '';
  const eur =
    tx.amountCents > 0
      ? `${(tx.amountCents / 100).toFixed(2).replace('.', ',')} ${tx.currency.toUpperCase()}`
      : '';
  const bal = tx.coinBalanceAfter != null ? `Solde après : ${tx.coinBalanceAfter} Quest Coins` : '';
  return [tx.label, tx.primarySku, ENTRY_KIND_LABEL[tx.entryKind] ?? tx.entryKind, TX_STATUS_LABEL[tx.status] ?? tx.status, qc, eur, bal, date]
    .filter(Boolean)
    .join('. ');
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

export default function HistoryScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const router = useRouter();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const segment = tabParam === 'wallet' ? 'wallet' : 'quests';

  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const [quests, setQuests] = useState<QuestHistoryRow[] | null>(null);
  const [transactions, setTransactions] = useState<TxRow[] | null>(null);
  const [questHasMore, setQuestHasMore] = useState(true);
  const [txHasMore, setTxHasMore] = useState(true);
  const [questLoadingMore, setQuestLoadingMore] = useState(false);
  const [txLoadingMore, setTxLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qSearch, setQSearch] = useState('');
  const [qStatus, setQStatus] = useState<'all' | QuestHistoryRow['status']>('all');
  const [qPhase, setQPhase] = useState<'all' | EscalationPhase>('all');
  const [qOutdoor, setQOutdoor] = useState<'all' | 'out' | 'in'>('all');

  const [wSearch, setWSearch] = useState('');
  const [wKind, setWKind] = useState<'all' | string>('all');
  const [wTxStatus, setWTxStatus] = useState<'all' | string>('all');
  const [wFlow, setWFlow] = useState<'all' | 'in' | 'out'>('all');

  const loading = quests === null || transactions === null;

  const load = useCallback(async () => {
    setError(null);
    setQuests(null);
    setTransactions(null);
    try {
      const token = await getTokenRef.current();
      const qUrl = `${API_BASE_URL}/api/quest/history?limit=${HISTORY_PAGE_SIZE}&offset=0`;
      const tUrl = `${API_BASE_URL}/api/shop/transactions?limit=${HISTORY_PAGE_SIZE}&offset=0`;
      const [rq, rt] = await Promise.all([apiFetch(qUrl, token), apiFetch(tUrl, token)]);
      if (!rq.ok) {
        setError(rq.status === 401 ? 'Session expirée.' : `Quêtes : erreur ${rq.status}`);
        setQuests([]);
        setTransactions([]);
        return;
      }
      if (!rt.ok) {
        setError(rt.status === 401 ? 'Session expirée.' : `Portefeuille : erreur ${rt.status}`);
        setQuests([]);
        setTransactions([]);
        return;
      }
      const jq = (await rq.json()) as { quests: QuestHistoryRow[]; hasMore: boolean };
      const jt = (await rt.json()) as { transactions: TxRow[]; hasMore: boolean };
      setQuests(jq.quests);
      setQuestHasMore(jq.hasMore);
      setTransactions(jt.transactions);
      setTxHasMore(jt.hasMore);
    } catch {
      setError('Impossible de joindre le serveur.');
      setQuests([]);
      setTransactions([]);
    }
  }, []);

  const loadMoreQuests = useCallback(async () => {
    if (!questHasMore || questLoadingMore || quests === null) return;
    setQuestLoadingMore(true);
    try {
      const offset = quests.length;
      const token = await getTokenRef.current();
      const res = await apiFetch(
        `${API_BASE_URL}/api/quest/history?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`,
        token,
      );
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
      const token = await getTokenRef.current();
      const res = await apiFetch(
        `${API_BASE_URL}/api/shop/transactions?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`,
        token,
      );
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

  useEffect(() => {
    void load();
  }, [load]);

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
      const hay = normalize([t.label, t.primarySku, ENTRY_KIND_LABEL[t.entryKind] ?? t.entryKind].join(' '));
      return hay.includes(needle);
    });
  }, [transactions, wSearch, wKind, wTxStatus, wFlow]);

  const questCountLabel = useMemo(() => {
    const n = quests?.length ?? 0;
    const loaded =
      n === 0
        ? 'aucune entrée chargée'
        : `${n} entrée${n > 1 ? 's' : ''} chargée${n > 1 ? 's' : ''}`;
    return `${filteredQuests.length} résultat(s) sur ${loaded}${
      questHasMore ? ' · d’autres entrées peuvent exister' : ' · historique entièrement chargé'
    }`;
  }, [filteredQuests.length, quests, questHasMore]);

  const txCountLabel = useMemo(() => {
    const n = transactions?.length ?? 0;
    const loaded =
      n === 0
        ? 'aucune entrée chargée'
        : `${n} entrée${n > 1 ? 's' : ''} chargée${n > 1 ? 's' : ''}`;
    return `${filteredTx.length} mouvement(s) sur ${loaded}${
      txHasMore ? ' · d’autres entrées peuvent exister' : ' · historique entièrement chargé'
    }`;
  }, [filteredTx.length, transactions, txHasMore]);

  const setTab = (t: 'quests' | 'wallet') => {
    if (t === 'wallet') router.replace('/history?tab=wallet');
    else router.replace('/history');
  };

  const onReuse = (q: QuestHistoryRow) => {
    const text = reusePayload(q);
    Clipboard.setString(text);
    Alert.alert('Copié', 'Tu peux coller le texte où tu veux pour t’inspirer.');
  };

  const phasePillStyle = (phase: EscalationPhase) =>
    phase === 'calibration' ? styles.pillCal : phase === 'expansion' ? styles.pillExp : styles.pillRup;

  const chipRipple = useMemo(
    () => ({ color: colorWithAlpha(palette.cyan, 0.28), borderless: true as const }),
    [palette.cyan],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={{ width: 72 }} />
        <Text style={[styles.topTitle, styles.topTitleCenter]}>Historique</Text>
        <View style={{ width: 72 }} />
      </View>

      <View style={styles.tabShell} accessibilityRole="tablist" accessibilityLabel="Type d’historique">
        <Pressable
          onPress={() => setTab('quests')}
          android_ripple={chipRipple}
          accessibilityRole="tab"
          accessibilityState={{ selected: segment === 'quests' }}
          accessibilityLabel="Quêtes"
          accessibilityHint="Affiche l’historique des quêtes"
          style={({ pressed }) => [
            styles.tabBtn,
            segment === 'quests' && styles.tabBtnActive,
            pressed && styles.tabPressed,
          ]}
        >
          <Text style={[styles.tabBtnText, segment === 'quests' && styles.tabBtnTextActive]}>Quêtes</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('wallet')}
          android_ripple={chipRipple}
          accessibilityRole="tab"
          accessibilityState={{ selected: segment === 'wallet' }}
          accessibilityLabel="Portefeuille"
          accessibilityHint="Affiche les mouvements Quest Coins"
          style={({ pressed }) => [
            styles.tabBtn,
            segment === 'wallet' && styles.tabBtnActive,
            pressed && styles.tabPressed,
          ]}
        >
          <Text style={[styles.tabBtnText, segment === 'wallet' && styles.tabBtnTextActive]}>Portefeuille</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.orange} />
        </View>
      ) : error ? (
        <View style={styles.center} accessibilityLiveRegion="polite">
          <Text style={styles.err}>{error}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => void load()}
            accessibilityRole="button"
            accessibilityLabel="Réessayer le chargement"
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : segment === 'quests' ? (
        <FlatList
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          data={filteredQuests}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReached={() => void loadMoreQuests()}
          onEndReachedThreshold={0.35}
          ListHeaderComponent={
            <>
              <View style={styles.filterPanelOuter}>
                <View importantForAccessibility="no">
                  <LinearGradient
                    colors={[palette.cyan, palette.orange, palette.green]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterPanelStripe}
                  />
                </View>
                <View style={styles.filterPanelInner}>
                  <Text style={styles.filterPanelKicker}>Recherche & filtres</Text>
                  <TextInput
                    style={styles.histInput}
                    value={qSearch}
                    onChangeText={setQSearch}
                    placeholder="Titre, mission, lieu, date…"
                    placeholderTextColor={palette.muted}
                    accessibilityLabel="Recherche dans les quêtes"
                    accessibilityHint="Filtre la liste par titre, mission, lieu ou date"
                  />
                  <Text style={styles.filterGroupLabel}>Statut</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {(
                      [
                        ['all', 'Tous'],
                        ['completed', 'Terminées'],
                        ['accepted', 'Acceptées'],
                        ['rejected', 'Refusées'],
                        ['replaced', 'Remplacées'],
                        ['pending', 'Attente'],
                      ] as const
                    ).map(([v, label]) => (
                      <Pressable
                        key={v}
                        android_ripple={chipRipple}
                        onPress={() => setQStatus(v)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: qStatus === v }}
                        accessibilityLabel={`Statut : ${label}`}
                        style={({ pressed }) => [
                          styles.chip,
                          qStatus === v && styles.chipOnOrange,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text style={[styles.chipText, qStatus === v && styles.chipTextOn]}>{label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={styles.filterGroupLabel}>Phase</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {(
                      [
                        ['all', 'Toutes'],
                        ['calibration', PHASE_LABEL.calibration],
                        ['expansion', PHASE_LABEL.expansion],
                        ['rupture', PHASE_LABEL.rupture],
                      ] as const
                    ).map(([v, label]) => (
                      <Pressable
                        key={v}
                        android_ripple={chipRipple}
                        onPress={() => setQPhase(v)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: qPhase === v }}
                        accessibilityLabel={`Phase : ${label}`}
                        style={({ pressed }) => [
                          styles.chip,
                          qPhase === v && styles.chipOnCyan,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text style={[styles.chipText, qPhase === v && styles.chipTextOn]}>{label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={styles.filterGroupLabel}>Lieu</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {(
                      [
                        ['all', 'Tous'],
                        ['out', 'Extérieur'],
                        ['in', 'Intérieur'],
                      ] as const
                    ).map(([v, label]) => (
                      <Pressable
                        key={v}
                        android_ripple={chipRipple}
                        onPress={() => setQOutdoor(v)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: qOutdoor === v }}
                        accessibilityLabel={`Lieu : ${label}`}
                        style={({ pressed }) => [
                          styles.chip,
                          qOutdoor === v && styles.chipOnGreen,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text style={[styles.chipText, qOutdoor === v && styles.chipTextOn]}>{label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <Text style={styles.count}>{questCountLabel}</Text>
            </>
          }
          renderItem={({ item: q }) => (
            <View style={styles.questCardOuter}>
              <View importantForAccessibility="no">
                <LinearGradient
                  colors={[palette.cyan, palette.orange, palette.green]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.questCardStripe}
                />
              </View>
              <View style={styles.questCardInner}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardEmoji} accessibilityElementsHidden={true}>
                    {questDisplayEmoji(q.emoji)}
                  </Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardTitle}>{q.title}</Text>
                    <Text style={styles.cardMeta}>
                      {new Date(q.questDate).toLocaleDateString('fr-FR')} · {STATUS_QUEST_LABEL[q.status]}
                      {q.wasRerolled ? ' · relancée' : ''}
                    </Text>
                    <View style={styles.tagRow}>
                      <Text style={phasePillStyle(q.phase)}>{PHASE_LABEL[q.phase]}</Text>
                      <Text style={q.isOutdoor ? styles.pillOutdoor : styles.pillIndoor}>
                        {q.isOutdoor ? 'Extérieur' : 'Intérieur'}
                      </Text>
                      {q.xpAwarded != null ? <Text style={styles.pillXp}>{`+${q.xpAwarded} XP`}</Text> : null}
                    </View>
                  </View>
                  <Pressable
                    android_ripple={chipRipple}
                    style={({ pressed }) => [styles.reuseBtn, pressed && styles.reuseBtnPressed]}
                    onPress={() => onReuse(q)}
                    accessibilityRole="button"
                    accessibilityLabel="Réutiliser"
                    accessibilityHint="Copie le texte de la quête dans le presse-papiers"
                  >
                    <Text style={styles.reuseBtnText}>Réutiliser</Text>
                  </Pressable>
                </View>
                {q.archetypeTitle ? (
                  <Text style={styles.inspire}>Inspiration : {q.archetypeTitle}</Text>
                ) : null}
                <View style={styles.missionBox}>
                  <Text style={styles.missionText}>{q.mission}</Text>
                </View>
                {q.hook ? <Text style={styles.hook}>{q.hook}</Text> : null}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View>
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {(quests?.length ?? 0) === 0
                    ? 'Aucune quête dans ton historique.'
                    : 'Aucune quête ne correspond à ces filtres.'}
                </Text>
              </View>
              {(quests?.length ?? 0) > 0 && questHasMore ? (
                <Pressable
                  style={[styles.retry, { alignSelf: 'center', marginTop: 16 }]}
                  onPress={() => void loadMoreQuests()}
                  disabled={questLoadingMore}
                  accessibilityRole="button"
                  accessibilityLabel={questLoadingMore ? 'Chargement' : 'Charger plus de quêtes'}
                  accessibilityState={{ disabled: questLoadingMore }}
                >
                  <Text style={styles.retryText}>
                    {questLoadingMore ? 'Chargement…' : 'Charger plus d’entrées'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListFooterComponent={
            <View style={styles.listFooter}>
              {questLoadingMore ? <ActivityIndicator color={palette.orange} /> : null}
              {!questHasMore && !questLoadingMore ? (
                <Text style={styles.loadMoreHint}>Tu as tout chargé.</Text>
              ) : null}
            </View>
          }
        />
      ) : (
        <FlatList
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          data={filteredTx}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReached={() => void loadMoreTx()}
          onEndReachedThreshold={0.35}
          ListHeaderComponent={
            <>
              <View style={styles.filterPanelOuter}>
                <View importantForAccessibility="no">
                  <LinearGradient
                    colors={[palette.cyan, palette.orange, palette.green]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterPanelStripe}
                  />
                </View>
                <View style={styles.filterPanelInner}>
                  <Text style={styles.filterPanelKicker}>Recherche & filtres</Text>
                  <TextInput
                    style={styles.histInput}
                    value={wSearch}
                    onChangeText={setWSearch}
                    placeholder="Libellé, référence, type…"
                    placeholderTextColor={palette.muted}
                    accessibilityLabel="Recherche dans le portefeuille"
                    accessibilityHint="Filtre par libellé, référence ou type de mouvement"
                  />
                  <Text style={styles.filterGroupLabel}>Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    <Pressable
                      android_ripple={chipRipple}
                      onPress={() => setWKind('all')}
                      accessibilityRole="button"
                      accessibilityState={{ selected: wKind === 'all' }}
                      accessibilityLabel="Type : Tous"
                      style={({ pressed }) => [
                        styles.chip,
                        wKind === 'all' && styles.chipOnCyan,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Text style={[styles.chipText, wKind === 'all' && styles.chipTextOn]}>Tous</Text>
                    </Pressable>
                    {kindOptions.map((k) => (
                      <Pressable
                        key={k}
                        android_ripple={chipRipple}
                        onPress={() => setWKind(k)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: wKind === k }}
                        accessibilityLabel={`Type : ${ENTRY_KIND_LABEL[k] ?? k}`}
                        style={({ pressed }) => [
                          styles.chip,
                          wKind === k && styles.chipOnCyan,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text style={[styles.chipText, wKind === k && styles.chipTextOn]}>
                          {ENTRY_KIND_LABEL[k] ?? k}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={styles.filterGroupLabel}>Statut paiement</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {(['all', 'paid', 'pending', 'failed', 'refunded'] as const).map((v) => (
                      <Pressable
                        key={v}
                        android_ripple={chipRipple}
                        onPress={() => setWTxStatus(v)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: wTxStatus === v }}
                        accessibilityLabel={
                          v === 'all'
                            ? 'Statut paiement : Tous'
                            : `Statut paiement : ${TX_STATUS_LABEL[v] ?? v}`
                        }
                        style={({ pressed }) => [
                          styles.chip,
                          wTxStatus === v && styles.chipOnGold,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text style={[styles.chipText, wTxStatus === v && styles.chipTextOn]}>
                          {v === 'all' ? 'Tous' : TX_STATUS_LABEL[v] ?? v}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={styles.filterGroupLabel}>Flux QC</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {(
                      [
                        ['all', 'Tous'],
                        ['in', 'Entrées +'],
                        ['out', 'Sorties −'],
                      ] as const
                    ).map(([v, label]) => (
                      <Pressable
                        key={v}
                        android_ripple={chipRipple}
                        onPress={() => setWFlow(v)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: wFlow === v }}
                        accessibilityLabel={`Flux Quest Coins : ${label}`}
                        style={({ pressed }) => [
                          styles.chip,
                          wFlow === v && styles.chipOnGreen,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text style={[styles.chipText, wFlow === v && styles.chipTextOn]}>{label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <Text style={styles.count}>{txCountLabel}</Text>
            </>
          }
          renderItem={({ item: tx, index: i }) => (
            <View
              style={[styles.txRowOuter, i > 0 && styles.txRowBorder]}
              accessible
              accessibilityLabel={txRowA11yLabel(tx)}
            >
              <Text style={styles.txLabel}>{tx.label}</Text>
              <Text style={styles.txSku}>{tx.primarySku}</Text>
              <Text style={styles.txKind}>
                {ENTRY_KIND_LABEL[tx.entryKind] ?? tx.entryKind} · {TX_STATUS_LABEL[tx.status] ?? tx.status}
              </Text>
              <View style={styles.txAmountRow}>
                {tx.coinsDelta != null ? (
                  <Text style={[styles.txCoins, tx.coinsDelta >= 0 ? styles.txPos : styles.txNeg]}>
                    {tx.coinsDelta >= 0 ? '+' : ''}
                    {tx.coinsDelta} QC
                  </Text>
                ) : null}
                {tx.amountCents > 0 ? (
                  <Text style={styles.txEur}>
                    {(tx.amountCents / 100).toFixed(2).replace('.', ',')} {tx.currency.toUpperCase()}
                  </Text>
                ) : null}
              </View>
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
          )}
          ListEmptyComponent={
            <View>
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {(transactions?.length ?? 0) === 0
                    ? 'Aucun mouvement dans ton portefeuille.'
                    : 'Aucune opération ne correspond à ces filtres.'}
                </Text>
              </View>
              {(transactions?.length ?? 0) > 0 && txHasMore ? (
                <Pressable
                  style={[styles.retry, { alignSelf: 'center', marginTop: 16 }]}
                  onPress={() => void loadMoreTx()}
                  disabled={txLoadingMore}
                  accessibilityRole="button"
                  accessibilityLabel={txLoadingMore ? 'Chargement' : 'Charger plus de mouvements'}
                  accessibilityState={{ disabled: txLoadingMore }}
                >
                  <Text style={styles.retryText}>
                    {txLoadingMore ? 'Chargement…' : 'Charger plus d’entrées'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListFooterComponent={
            <View style={styles.listFooter}>
              {txLoadingMore ? <ActivityIndicator color={palette.orange} /> : null}
              {!txHasMore && !txLoadingMore ? (
                <Text style={styles.loadMoreHint}>Tu as tout chargé.</Text>
              ) : null}
              <Text style={styles.walletShopHint}>
                Recharge et achats depuis la boutique (onglet Shop).
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(p: ThemePalette) {
  const C = { text: p.text, muted: p.muted };
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: p.bg },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: p.borderCyan,
      backgroundColor: colorWithAlpha(p.surface, 0.85),
    },
    topTitle: { fontSize: 18, fontWeight: '900', color: p.text, letterSpacing: -0.3 },
    topTitleCenter: { flex: 1, textAlign: 'center' },
    tabShell: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 14,
      borderRadius: 16,
      padding: 4,
      borderWidth: 1,
      borderColor: p.borderCyan,
      backgroundColor: colorWithAlpha(p.cyan, 0.08),
    },
    tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    tabBtnActive: {
      backgroundColor: p.cardCream,
      borderWidth: 1,
      borderColor: p.border,
      shadowColor: p.text,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    tabBtnText: { fontSize: 13, fontWeight: '800', color: p.muted },
    tabBtnTextActive: { color: p.text },
    tabPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    err: { color: p.orange, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
    retry: {
      backgroundColor: p.orange,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    retryText: { color: '#fff', fontWeight: '800' },

    filterPanelOuter: {
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: p.borderCyan,
      backgroundColor: p.card,
      marginBottom: 16,
      shadowColor: p.text,
      shadowOpacity: 0.14,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    filterPanelStripe: { height: 4, width: '100%' },
    filterPanelInner: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 },
    filterPanelKicker: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: p.muted,
      marginBottom: 12,
    },
    histInput: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: p.divider,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 14,
      fontWeight: '600',
      color: p.text,
      backgroundColor: p.inputBg,
      marginBottom: 16,
      shadowColor: p.text,
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 1,
    },
    filterGroupLabel: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: p.muted,
      marginBottom: 8,
    },
    chips: { flexDirection: 'row', gap: 8, marginBottom: 14, paddingRight: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    chipOnOrange: {
      borderColor: colorWithAlpha(p.orange, 0.5),
      backgroundColor: colorWithAlpha(p.orange, 0.12),
    },
    chipOnCyan: {
      borderColor: colorWithAlpha(p.cyan, 0.5),
      backgroundColor: colorWithAlpha(p.cyan, 0.1),
    },
    chipOnGreen: {
      borderColor: colorWithAlpha(p.green, 0.48),
      backgroundColor: colorWithAlpha(p.green, 0.1),
    },
    chipOnGold: {
      borderColor: colorWithAlpha(p.gold, 0.55),
      backgroundColor: colorWithAlpha(p.gold, 0.16),
    },
    chipText: { fontSize: 11, fontWeight: '800', color: p.muted },
    chipTextOn: { color: p.text },
    chipPressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },

    count: { fontSize: 12, fontWeight: '800', color: p.muted, marginBottom: 12 },
    emptyBox: {
      borderRadius: 18,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: p.border,
      paddingVertical: 28,
      paddingHorizontal: 16,
      backgroundColor: colorWithAlpha(p.surface, 0.9),
    },
    emptyText: { textAlign: 'center', color: p.muted, fontWeight: '600', fontSize: 14, lineHeight: 20 },

    questCardOuter: {
      borderRadius: 22,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colorWithAlpha(p.orange, 0.22),
      backgroundColor: p.cardCream,
      shadowColor: p.cyan,
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    questCardStripe: { height: 4, width: '100%' },
    questCardInner: { padding: 16 },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardEmoji: { fontSize: 30 },
    cardTitle: { fontSize: 17, fontWeight: '900', color: C.text, lineHeight: 22 },
    cardMeta: { fontSize: 11, color: p.muted, fontWeight: '600', marginTop: 4 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
    pillCal: {
      fontSize: 10,
      fontWeight: '900',
      overflow: 'hidden',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colorWithAlpha(p.green, 0.12),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.green, 0.28),
      color: p.green,
    },
    pillExp: {
      fontSize: 10,
      fontWeight: '900',
      overflow: 'hidden',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colorWithAlpha(p.cyan, 0.12),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.cyan, 0.35),
      color: p.linkOnBg,
    },
    pillRup: {
      fontSize: 10,
      fontWeight: '900',
      overflow: 'hidden',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colorWithAlpha(p.orange, 0.12),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.orange, 0.3),
      color: p.orange,
    },
    pillOutdoor: {
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colorWithAlpha(p.green, 0.12),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.green, 0.3),
      color: p.green,
    },
    pillIndoor: {
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colorWithAlpha(p.text, 0.06),
      borderWidth: 1,
      borderColor: p.border,
      color: p.muted,
    },
    pillXp: {
      fontSize: 10,
      fontWeight: '900',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colorWithAlpha(p.gold, 0.2),
      borderWidth: 1,
      borderColor: colorWithAlpha(p.orange, 0.35),
      color: '#92400e',
    },
    reuseBtn: {
      borderWidth: 2,
      borderColor: colorWithAlpha(p.cyan, 0.45),
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: colorWithAlpha(p.cyan, 0.1),
    },
    reuseBtnPressed: {
      backgroundColor: colorWithAlpha(p.cyan, 0.18),
      transform: [{ scale: 0.97 }],
    },
    reuseBtnText: { fontSize: 11, fontWeight: '900', color: p.text },
    inspire: { fontSize: 11, fontWeight: '700', color: p.muted, marginTop: 10 },
    missionBox: {
      marginTop: 12,
      borderWidth: 2,
      borderColor: colorWithAlpha(p.cyan, 0.4),
      borderRadius: 16,
      padding: 14,
      backgroundColor: p.cardCream,
    },
    missionText: { fontSize: 14, fontWeight: '700', color: p.text, lineHeight: 21 },
    hook: {
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: colorWithAlpha(p.orange, 0.55),
      backgroundColor: colorWithAlpha(p.gold, 0.08),
      fontSize: 13,
      fontStyle: 'italic',
      color: p.muted,
      lineHeight: 20,
    },

    txListShell: {
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
      shadowColor: p.text,
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    txRowOuter: { paddingHorizontal: 14, paddingVertical: 12 },
    txRowBorder: { borderTopWidth: 1, borderTopColor: p.divider },
    txLabel: { fontSize: 15, fontWeight: '800', color: p.text },
    txSku: {
      fontSize: 10,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      color: p.muted,
      marginTop: 2,
    },
    txKind: { fontSize: 10, fontWeight: '700', color: p.muted, marginTop: 6 },
    txAmountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, alignItems: 'baseline' },
    txCoins: { fontSize: 16, fontWeight: '900' },
    txPos: { color: p.green },
    txNeg: { color: p.orange },
    txEur: { fontSize: 13, fontWeight: '700', color: p.muted },
    txAfter: { fontSize: 11, color: p.muted, marginTop: 4 },
    txDate: { fontSize: 11, color: p.subtle, marginTop: 8, fontWeight: '600' },

    listFooter: {
      minHeight: 48,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    loadMoreHint: { fontSize: 12, fontWeight: '700', color: p.muted, textAlign: 'center' },
    walletShopHint: {
      fontSize: 11,
      fontWeight: '600',
      color: p.muted,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 12,
    },
  });
}
