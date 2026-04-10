import type { AppLocale } from '@questia/shared';
import type { EscalationPhase } from '@questia/shared';

export type HistoryScreenStrings = {
  numLocale: string;
  title: string;
  tabListA11y: string;
  tabQuests: string;
  tabQuestsHint: string;
  tabWallet: string;
  tabWalletHint: string;
  retry: string;
  retryLoadA11y: string;
  errSession: string;
  errQuests: (code: number) => string;
  errWallet: (code: number) => string;
  errNetwork: string;
  phase: Record<EscalationPhase, string>;
  statusQuest: Record<'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced', string>;
  entryKind: Record<string, string>;
  txStatus: Record<string, string>;
  filterKicker: string;
  qPlaceholder: string;
  qSearchA11y: string;
  qSearchHint: string;
  labelStatus: string;
  statusAll: string;
  statusCompleted: string;
  statusAccepted: string;
  statusRejected: string;
  statusReplaced: string;
  statusPending: string;
  labelPhase: string;
  phaseAll: string;
  labelPlace: string;
  placeAll: string;
  placeOutdoor: string;
  placeIndoor: string;
  wPlaceholder: string;
  wSearchA11y: string;
  wSearchHint: string;
  labelType: string;
  labelPayStatus: string;
  labelQcFlow: string;
  flowAll: string;
  flowIn: string;
  flowOut: string;
  all: string;
  rerolled: string;
  outdoor: string;
  indoor: string;
  inspiration: (t: string) => string;
  reuse: string;
  reuseHint: string;
  copyTitle: string;
  copyMsg: string;
  emptyQuestNone: string;
  emptyQuestFiltered: string;
  emptyWalletNone: string;
  emptyWalletFiltered: string;
  balanceAfterTx: (n: number) => string;
  txLoadMoreA11y: string;
  walletShopHint: string;
  loadMore: string;
  loading: string;
  loadMoreA11y: string;
  loadingA11y: string;
  allLoaded: string;
  questCountLine: (filtered: number, total: number, hasMore: boolean) => string;
  txCountLine: (filtered: number, total: number, hasMore: boolean) => string;
  txRowA11y: (tx: {
    label: string;
    primarySku: string;
    entryKind: string;
    status: string;
    coinsDelta: number | null;
    amountCents: number;
    currency: string;
    coinBalanceAfter: number | null;
    createdAt: string;
  }) => string;
};

function fr(): HistoryScreenStrings {
  const phase: Record<EscalationPhase, string> = {
    calibration: 'Étalonnage',
    expansion: 'Expansion',
    rupture: 'Rupture',
  };
  const statusQuest = {
    pending: 'En attente',
    accepted: 'Acceptée',
    completed: 'Terminée',
    rejected: 'Refusée',
    replaced: 'Remplacée',
  } as const;
  const entryKind: Record<string, string> = {
    legacy_stripe_product: 'Achat Stripe',
    stripe_coin_topup: 'Recharge QC',
    coin_purchase: 'Achat en QC',
  };
  const txStatus: Record<string, string> = {
    pending: 'En attente',
    paid: 'Payé',
    failed: 'Échoué',
    refunded: 'Remboursé',
  };

  return {
    numLocale: 'fr-FR',
    title: 'Historique',
    tabListA11y: "Type d'historique",
    tabQuests: 'Quêtes',
    tabQuestsHint: "Affiche l'historique des quêtes",
    tabWallet: 'Portefeuille',
    tabWalletHint: 'Affiche les mouvements Quest Coins',
    retry: 'Réessayer',
    retryLoadA11y: 'Réessayer le chargement',
    errSession: 'Session expirée.',
    errQuests: (code) => `Quêtes : erreur ${code}`,
    errWallet: (code) => `Portefeuille : erreur ${code}`,
    errNetwork: 'Impossible de joindre le serveur.',
    phase,
    statusQuest,
    entryKind,
    txStatus,
    filterKicker: 'Recherche & filtres',
    qPlaceholder: 'Titre, mission, lieu, date…',
    qSearchA11y: 'Recherche dans les quêtes',
    qSearchHint: 'Filtre la liste par titre, mission, lieu ou date',
    labelStatus: 'Statut',
    statusAll: 'Tous',
    statusCompleted: 'Terminées',
    statusAccepted: 'Acceptées',
    statusRejected: 'Refusées',
    statusReplaced: 'Remplacées',
    statusPending: 'Attente',
    labelPhase: 'Phase',
    phaseAll: 'Toutes',
    labelPlace: 'Lieu',
    placeAll: 'Tous',
    placeOutdoor: 'Extérieur',
    placeIndoor: 'Intérieur',
    wPlaceholder: 'Libellé, référence, type…',
    wSearchA11y: 'Recherche dans le portefeuille',
    wSearchHint: 'Filtre par libellé, référence ou type de mouvement',
    labelType: 'Type',
    labelPayStatus: 'Statut paiement',
    labelQcFlow: 'Flux QC',
    flowAll: 'Tous',
    flowIn: 'Entrées +',
    flowOut: 'Sorties −',
    all: 'Tous',
    rerolled: 'relancée',
    outdoor: 'Extérieur',
    indoor: 'Intérieur',
    inspiration: (t) => `Inspiration : ${t}`,
    reuse: 'Réutiliser',
    reuseHint: 'Copie le texte de la quête dans le presse-papiers',
    copyTitle: 'Copié',
    copyMsg: "Tu peux coller le texte où tu veux pour t'inspirer.",
    emptyQuestNone: 'Aucune quête dans ton historique.',
    emptyQuestFiltered: 'Aucune quête ne correspond à ces filtres.',
    emptyWalletNone: 'Aucun mouvement dans ton portefeuille.',
    emptyWalletFiltered: 'Aucune opération ne correspond à ces filtres.',
    balanceAfterTx: (n) => `Solde après : ${n} QC`,
    txLoadMoreA11y: 'Charger plus de mouvements',
    walletShopHint: 'Recharge et achats depuis la boutique',
    loadMore: "Charger plus d'entrées",
    loading: 'Chargement…',
    loadMoreA11y: 'Charger plus de quêtes',
    loadingA11y: 'Chargement',
    allLoaded: 'Tu as tout chargé.',
    questCountLine(filtered, total, hasMore) {
      const loaded =
        total === 0
          ? 'aucune entrée chargée'
          : `${total} entrée${total > 1 ? 's' : ''} chargée${total > 1 ? 's' : ''}`;
      return `${filtered} résultat(s) sur ${loaded}${
        hasMore ? " · d'autres entrées peuvent exister" : ' · historique entièrement chargé'
      }`;
    },
    txCountLine(filtered, total, hasMore) {
      const loaded =
        total === 0
          ? 'aucune entrée chargée'
          : `${total} entrée${total > 1 ? 's' : ''} chargée${total > 1 ? 's' : ''}`;
      return `${filtered} mouvement(s) sur ${loaded}${
        hasMore ? " · d'autres entrées peuvent exister" : ' · historique entièrement chargé'
      }`;
    },
    txRowA11y(tx) {
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
      const bal =
        tx.coinBalanceAfter != null ? `Solde après : ${tx.coinBalanceAfter} Quest Coins` : '';
      const kind = entryKind[tx.entryKind] ?? tx.entryKind;
      const st = txStatus[tx.status] ?? tx.status;
      return [tx.label, tx.primarySku, kind, st, qc, eur, bal, date].filter(Boolean).join('. ');
    },
  };
}

function en(): HistoryScreenStrings {
  const phase: Record<EscalationPhase, string> = {
    calibration: 'Calibration',
    expansion: 'Expansion',
    rupture: 'Rupture',
  };
  const statusQuest = {
    pending: 'Pending',
    accepted: 'Accepted',
    completed: 'Completed',
    rejected: 'Declined',
    replaced: 'Replaced',
  } as const;
  const entryKind: Record<string, string> = {
    legacy_stripe_product: 'Stripe purchase',
    stripe_coin_topup: 'QC top-up',
    coin_purchase: 'QC purchase',
  };
  const txStatus: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  };

  return {
    numLocale: 'en-GB',
    title: 'History',
    tabListA11y: 'History type',
    tabQuests: 'Quests',
    tabQuestsHint: 'Shows your quest history',
    tabWallet: 'Wallet',
    tabWalletHint: 'Shows Quest Coin movements',
    retry: 'Retry',
    retryLoadA11y: 'Retry loading',
    errSession: 'Session expired.',
    errQuests: (code) => `Quests: error ${code}`,
    errWallet: (code) => `Wallet: error ${code}`,
    errNetwork: 'Could not reach the server.',
    phase,
    statusQuest,
    entryKind,
    txStatus,
    filterKicker: 'Search & filters',
    qPlaceholder: 'Title, mission, place, date…',
    qSearchA11y: 'Search quests',
    qSearchHint: 'Filter by title, mission, place, or date',
    labelStatus: 'Status',
    statusAll: 'All',
    statusCompleted: 'Completed',
    statusAccepted: 'Accepted',
    statusRejected: 'Declined',
    statusReplaced: 'Replaced',
    statusPending: 'Pending',
    labelPhase: 'Phase',
    phaseAll: 'All',
    labelPlace: 'Place',
    placeAll: 'All',
    placeOutdoor: 'Outdoor',
    placeIndoor: 'Indoor',
    wPlaceholder: 'Label, reference, type…',
    wSearchA11y: 'Search wallet',
    wSearchHint: 'Filter by label, reference, or movement type',
    labelType: 'Type',
    labelPayStatus: 'Payment status',
    labelQcFlow: 'QC flow',
    flowAll: 'All',
    flowIn: 'Credits +',
    flowOut: 'Debits −',
    all: 'All',
    rerolled: 'rerolled',
    outdoor: 'Outdoor',
    indoor: 'Indoor',
    inspiration: (t) => `Inspiration: ${t}`,
    reuse: 'Reuse',
    reuseHint: 'Copy quest text to the clipboard',
    copyTitle: 'Copied',
    copyMsg: 'You can paste the text wherever you like.',
    emptyQuestNone: 'No quests in your history yet.',
    emptyQuestFiltered: 'No quests match these filters.',
    emptyWalletNone: 'No wallet movements yet.',
    emptyWalletFiltered: 'No transactions match these filters.',
    balanceAfterTx: (n) => `Balance after: ${n} QC`,
    txLoadMoreA11y: 'Load more movements',
    walletShopHint: 'Top-ups and purchases from the shop (Shop tab).',
    loadMore: 'Load more',
    loading: 'Loading…',
    loadMoreA11y: 'Load more quests',
    loadingA11y: 'Loading',
    allLoaded: 'Everything is loaded.',
    questCountLine(filtered, total, hasMore) {
      const loaded =
        total === 0
          ? 'no entries loaded'
          : `${total} entr${total === 1 ? 'y' : 'ies'} loaded`;
      return `${filtered} result(s) of ${loaded}${
        hasMore ? ' · more entries may exist' : ' · full history loaded'
      }`;
    },
    txCountLine(filtered, total, hasMore) {
      const loaded =
        total === 0
          ? 'no entries loaded'
          : `${total} entr${total === 1 ? 'y' : 'ies'} loaded`;
      return `${filtered} movement(s) of ${loaded}${
        hasMore ? ' · more entries may exist' : ' · full history loaded'
      }`;
    },
    txRowA11y(tx) {
      const date = new Date(tx.createdAt).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const qc =
        tx.coinsDelta != null
          ? `${tx.coinsDelta >= 0 ? 'plus' : 'minus'} ${Math.abs(tx.coinsDelta)} Quest Coins`
          : '';
      const eur =
        tx.amountCents > 0
          ? `${(tx.amountCents / 100).toLocaleString('en-GB', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} ${tx.currency.toUpperCase()}`
          : '';
      const bal =
        tx.coinBalanceAfter != null ? `Balance after: ${tx.coinBalanceAfter} Quest Coins` : '';
      const kind = entryKind[tx.entryKind] ?? tx.entryKind;
      const st = txStatus[tx.status] ?? tx.status;
      return [tx.label, tx.primarySku, kind, st, qc, eur, bal, date].filter(Boolean).join('. ');
    },
  };
}

export function getHistoryScreenStrings(locale: AppLocale): HistoryScreenStrings {
  return locale === 'en' ? en() : fr();
}
