import type { AppLocale } from '@questia/shared';
import type { ShopCatalogEntry, ShopMarketingBadge } from '@questia/shared';

export type ShopScreenStrings = {
  numLocale: string;
  title: string;
  close: string;
  closeA11y: string;
  retry: string;
  errSession: string;
  errProfileMissing: string;
  errLoadShop: string;
  errCheckout: string;
  errPurchase: string;
  errSavePrefs: string;
  flashPaymentOk: string;
  flashStripeCanceled: string;
  kindLabel(kind: ShopCatalogEntry['kind']): string;
  themeLabel(id: string): string;
  noTitle: string;
  marketingBadge(b: ShopMarketingBadge): string;
  moreInfoA11y(name: string): string;
  vsSeparate: string;
  owned: string;
  buy: string;
  buyBundle: string;
  buyHintNeedCoins: string;
  buyBundleHintNeedCoins: string;
  balanceK: string;
  questCoinsSuffix: string;
  addQc: string;
  addQcA11y: string;
  walletHistoryA11y: string;
  walletHistoryHint: string;
  prefsHeading: string;
  prefsIntro: string;
  customization: string;
  customizationLead: string;
  fieldTheme: string;
  fieldTitle: string;
  themeCurrentA11y(name: string): string;
  themeOpenHint: string;
  titleCurrentA11y(name: string): string;
  titleOpenHint: string;
  bonusRerolls: string;
  xpCharges: string;
  xpPerValidation: (n: number) => string;
  featured: string;
  economy: (n: string) => string;
  vsRetail: string;
  sectionProgression: string;
  sectionLook: string;
  sectionThemes: string;
  sectionTitles: string;
  sectionRerolls: string;
  sectionQuestPacks: string;
  questPacksIntro: string;
  questPackKindAll: string;
  questPackKindVibe: string;
  questPackKindLifestyle: string;
  questPackKindLocation: string;
  questPacksEmpty: string;
  txJournal: string;
  txHistoryLink: string;
  txEmpty: string;
  balanceAfter: (n: number) => string;
  selectThemeTitle: string;
  selectTitleTitle: string;
  rechargeTitle: string;
  rechargeSubtitle: string;
  currentBalance: string;
  securePayment: string;
  rechargeHint: string;
  rechargeFooter: string;
  redirecting: string;
  payEur: (eur: string) => string;
  qcPerEur: (n: number) => string;
  bonusVsSmall: (pct: number) => string;
};

function themeLabelFr(id: string): string {
  if (id === 'default') return 'Questia (clair)';
  if (id === 'midnight') return 'Nuit boréale';
  if (id === 'aurora') return 'Aurore';
  if (id === 'parchment') return 'Parchemin';
  return id;
}

function themeLabelEn(id: string): string {
  if (id === 'default') return 'Questia (light)';
  if (id === 'midnight') return 'Boreal night';
  if (id === 'aurora') return 'Aurora';
  if (id === 'parchment') return 'Parchment';
  return id;
}

function frStrings(): ShopScreenStrings {
  const marketingBadge = (b: ShopMarketingBadge): string => {
    const m: Record<ShopMarketingBadge, string> = {
      featured: 'À la une',
      best_value: 'Meilleur rapport',
      popular: 'Populaire',
      starter: 'Pour débuter',
      new: 'Nouveau',
    };
    return m[b];
  };
  return {
    numLocale: 'fr-FR',
    title: 'Boutique',
    close: 'Fermer',
    closeA11y: 'Fermer',
    retry: 'Réessayer',
    errSession: 'Session expirée. Reconnecte-toi.',
    errProfileMissing: 'Profil introuvable.',
    errLoadShop: 'Impossible de charger la boutique.',
    errCheckout: 'Impossible de lancer le paiement.',
    errPurchase: 'Achat impossible.',
    errSavePrefs: "Impossible d'enregistrer.",
    flashPaymentOk: 'Paiement enregistré — ton solde Quest Coins est à jour ci-dessous.',
    flashStripeCanceled: 'Paiement annulé. Tu peux réessayer quand tu veux.',
    kindLabel(kind: ShopCatalogEntry['kind']): string {
      switch (kind) {
        case 'title':
          return 'Titre';
        case 'xp_booster':
          return 'Bonus XP';
        case 'reroll_pack':
          return 'Relances';
        case 'bundle':
          return 'Bundle';
        case 'quest_pack':
          return 'Pack quêtes';
        default:
          return '';
      }
    },
    themeLabel: themeLabelFr,
    noTitle: 'Aucun titre',
    marketingBadge,
    moreInfoA11y: (name) => `Plus d'infos : ${name}`,
    vsSeparate: 'vs achat séparé',
    owned: 'Déjà à toi',
    buy: 'Acheter',
    buyBundle: 'Acheter le bundle',
    buyHintNeedCoins: "Ouvre l'achat de Quest Coins — solde insuffisant pour cet article.",
    buyBundleHintNeedCoins: "Ouvre l'achat de Quest Coins — solde insuffisant pour ce bundle.",
    balanceK: 'Ton solde',
    questCoinsSuffix: ' Quest Coins',
    addQc: 'Ajouter des QC',
    addQcA11y: 'Ajouter des Quest Coins en euros',
    walletHistoryA11y: 'Historique du portefeuille',
    walletHistoryHint: 'Ouvre le journal des mouvements Quest Coins',
    prefsHeading: 'Équipement & affichage',
    prefsIntro: "Thème et titre — appliqués tout de suite dans l'app.",
    customization: 'Personnalisation',
    customizationLead: "Règle l'apparence comme sur ton inventaire",
    fieldTheme: 'Thème actif',
    fieldTitle: 'Titre sur le profil',
    themeCurrentA11y: (name) => `Thème actuel : ${name}`,
    themeOpenHint: 'Ouvre le choix de thème',
    titleCurrentA11y: (name) => `Titre sur le profil : ${name}`,
    titleOpenHint: 'Ouvre le choix du titre affiché',
    bonusRerolls: 'Relances bonus',
    xpCharges: 'Surcharges XP',
    xpPerValidation: (n) => `(+${n} XP / validation)`,
    featured: 'À la une',
    economy: (n) => ` Économie ~${n} QC`,
    vsRetail: ' vs détail',
    sectionProgression: 'Progression & XP',
    sectionLook: 'Apparence',
    sectionThemes: 'Thèmes',
    sectionTitles: 'Titres',
    sectionRerolls: 'Relances',
    sectionQuestPacks: 'Packs de quêtes',
    questPacksIntro:
      "Oriente le moteur vers une ambiance, un style de vie ou une ville. Plusieurs packs cohabitent.",
    questPackKindAll: 'Tous',
    questPackKindVibe: 'Ambiances',
    questPackKindLifestyle: 'Style de vie',
    questPackKindLocation: 'Lieux',
    questPacksEmpty: 'Aucun pack dans cette catégorie pour le moment.',
    txJournal: 'Journal des transactions',
    txHistoryLink: 'Historique détaillé',
    txEmpty: "Aucune opération pour l'instant.",
    balanceAfter: (n) => `Solde après : ${n} QC`,
    selectThemeTitle: 'Thème actif',
    selectTitleTitle: 'Titre sur le profil',
    rechargeTitle: 'Ajouter des Quest Coins',
    rechargeSubtitle:
      'Paiement par carte via Stripe. Aucun abonnement — tu paies uniquement le montant choisi.',
    currentBalance: 'Solde actuel',
    securePayment: 'Paiement sécurisé',
    rechargeHint: 'Après validation, les QC sont ajoutés à ton solde. Utilisables dans la boutique.',
    rechargeFooter: 'Tu reviens sur la boutique après le paiement. Annulation = aucun débit.',
    redirecting: 'Redirection…',
    payEur: (eur) => `Payer ${eur} €`,
    qcPerEur: (n) => `${n} QC / €`,
    bonusVsSmall: (pct) => ` (+${pct}% vs petit)`,
  };
}

function enStrings(): ShopScreenStrings {
  const marketingBadge = (b: ShopMarketingBadge): string => {
    const m: Record<ShopMarketingBadge, string> = {
      featured: 'Featured',
      best_value: 'Best value',
      popular: 'Popular',
      starter: 'Starter',
      new: 'New',
    };
    return m[b];
  };
  return {
    numLocale: 'en-GB',
    title: 'Shop',
    close: 'Close',
    closeA11y: 'Close',
    retry: 'Retry',
    errSession: 'Session expired. Sign in again.',
    errProfileMissing: 'Profile not found.',
    errLoadShop: 'Could not load the shop.',
    errCheckout: 'Could not start checkout.',
    errPurchase: 'Purchase failed.',
    errSavePrefs: 'Could not save settings.',
    flashPaymentOk: 'Payment recorded — your Quest Coin balance below is up to date.',
    flashStripeCanceled: 'Payment canceled. You can try again anytime.',
    kindLabel(kind: ShopCatalogEntry['kind']): string {
      switch (kind) {
        case 'title':
          return 'Title';
        case 'xp_booster':
          return 'XP boost';
        case 'reroll_pack':
          return 'Rerolls';
        case 'bundle':
          return 'Bundle';
        case 'quest_pack':
          return 'Quest pack';
        default:
          return '';
      }
    },
    themeLabel: themeLabelEn,
    noTitle: 'No title',
    marketingBadge,
    moreInfoA11y: (name) => `More info: ${name}`,
    vsSeparate: 'vs separate purchase',
    owned: 'Already yours',
    buy: 'Buy',
    buyBundle: 'Buy bundle',
    buyHintNeedCoins: 'Opens Quest Coins purchase — not enough balance for this item.',
    buyBundleHintNeedCoins: 'Opens Quest Coins purchase — not enough balance for this bundle.',
    balanceK: 'Your balance',
    questCoinsSuffix: ' Quest Coins',
    addQc: 'Add QC',
    addQcA11y: 'Add Quest Coins (EUR)',
    walletHistoryA11y: 'Wallet history',
    walletHistoryHint: 'Opens Quest Coin transactions',
    prefsHeading: 'Gear & display',
    prefsIntro: 'Theme and title — applied immediately in the app.',
    customization: 'Customization',
    customizationLead: 'Tune the look like in your inventory',
    fieldTheme: 'Active theme',
    fieldTitle: 'Profile title',
    themeCurrentA11y: (name) => `Current theme: ${name}`,
    themeOpenHint: 'Opens theme picker',
    titleCurrentA11y: (name) => `Profile title: ${name}`,
    titleOpenHint: 'Opens title picker',
    bonusRerolls: 'Bonus rerolls',
    xpCharges: 'XP charges',
    xpPerValidation: (n) => `(+${n} XP per completion)`,
    featured: 'Featured',
    economy: (n) => ` Save ~${n} QC`,
    vsRetail: ' vs retail',
    sectionProgression: 'Progression & XP',
    sectionLook: 'Look',
    sectionThemes: 'Themes',
    sectionTitles: 'Titles',
    sectionRerolls: 'Rerolls',
    sectionQuestPacks: 'Quest packs',
    questPacksIntro:
      'Steer the engine toward a vibe, a lifestyle or a city. Multiple packs cohabit.',
    questPackKindAll: 'All',
    questPackKindVibe: 'Vibes',
    questPackKindLifestyle: 'Lifestyle',
    questPackKindLocation: 'Locations',
    questPacksEmpty: 'No pack in this category yet.',
    txJournal: 'Transaction log',
    txHistoryLink: 'Full history',
    txEmpty: 'No transactions yet.',
    balanceAfter: (n) => `Balance after: ${n} QC`,
    selectThemeTitle: 'Active theme',
    selectTitleTitle: 'Profile title',
    rechargeTitle: 'Add Quest Coins',
    rechargeSubtitle:
      'Pay by card via Stripe. No subscription — you only pay the amount you choose.',
    currentBalance: 'Current balance',
    securePayment: 'Secure payment',
    rechargeHint: 'After confirmation, QC are added to your balance. Spend them in the shop.',
    rechargeFooter: 'You return to the shop after payment. Cancel = no charge.',
    redirecting: 'Redirecting…',
    payEur: (eur) => `Pay €${eur}`,
    qcPerEur: (n) => `${n} QC / €`,
    bonusVsSmall: (pct) => ` (+${pct}% vs small pack)`,
  };
}

export function getShopScreenStrings(locale: AppLocale): ShopScreenStrings {
  return locale === 'en' ? enStrings() : frStrings();
}
