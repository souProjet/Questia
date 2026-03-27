# Marketing, mesure d’audience et tracking (Questia)

Ce document décrit comment configurer **Google Tag Manager (GTM)**, **Google Analytics 4 (GA4)** et **Meta Pixel** sur le site Next.js (`apps/web`), en cohérence avec le **bandeau cookies**, puis **comment déployer une mesure complète** du **jeu web** et de **l’app** (événements, paramètres, GTM, serveur). La section [Plan de mesure complet](#plan-de-mesure-complet--jeu-web--app-détail) est la référence opérationnelle.

**Pourquoi pas PostHog en plus ?** GA4 (souvent via GTM) couvre déjà audience, funnels et campagnes marketing. Ajouter PostHog en parallèle dupliquait la mesure (double comptage, double maintenance). Si un jour tu as besoin d’analytics produit avancé (feature flags, session replay), tu pourras réintroduire un outil dédié — idéalement avec un périmètre clair (ex. app mobile seulement).

---

## Sommaire

1. [Principes et ordre des opérations](#principes-et-ordre-des-opérations)
2. [Fichiers concernés dans le code](#fichiers-concernés-dans-le-code)
3. [Étapes précises — Google Tag Manager (GTM)](#étapes-précises--google-tag-manager-gtm)
4. [Étapes précises — Google Analytics 4 (GA4)](#étapes-précises--google-analytics-4-ga4)
5. [Étapes précises — Meta (Facebook) Pixel](#étapes-précises--meta-facebook-pixel)
6. [Étapes précises — variables d’environnement et déploiement](#étapes-précises--variables-denvironnement-et-déploiement)
7. [Étapes précises — validation avant mise en prod](#étapes-précises--validation-avant-mise-en-prod)
8. [Plan de mesure complet — jeu web + app (détail)](#plan-de-mesure-complet--jeu-web--app-détail)
9. [Limites actuelles & évolutions possibles](#limites-actuelles--évolutions-possibles)
10. [Références](#références)

---

## Principes et ordre des opérations

1. **Opt-in** : les scripts tiers (GTM, GA en direct, Meta Pixel) ne sont injectés qu’après un choix explicite dans le bandeau (`CookieNotice`). Le refus enregistre `analytics: false` et `ads: false` dans `localStorage` sous la clé `questia_cookie_consent_v2`.
2. **Séparation analytics / pub** :
   - **Analytics** : mesure d’audience (GA4, tags « analytics » dans GTM).
   - **Publicité** : remarketing et campagnes (Meta Pixel, tags pub dans GTM).
3. **Variables d’environnement** : toutes les clés côté client sont préfixées `NEXT_PUBLIC_*` (voir `apps/web/.env.example` et `src/config/analytics.ts`).

**Ordre recommandé une première fois**

| Étape | Action |
|-------|--------|
| 1 | Créer (ou réutiliser) un compte **Google** pour Analytics / Tag Manager. |
| 2 | Créer la **propriété GA4** et noter l’ID `G-XXXXXXXXXX`. |
| 3 | Créer le **conteneur GTM Web** et noter `GTM-XXXXXXX` **ou** décider de ne pas utiliser GTM (GA direct uniquement). |
| 4 | Créer le **Pixel Meta** et noter l’ID numérique. |
| 5 | Renseigner les variables `NEXT_PUBLIC_*` en **préproduction** ou **local**, déployer, tester le bandeau + réseau. |
| 6 | Configurer les **tags** dans GTM (si GTM) et **publier** la version du conteneur. |
| 7 | Valider avec Temps réel GA4, Aperçu GTM, Pixel Helper. |
| 8 | Déployer en **production** et documenter les **UTM** utilisés pour les campagnes. |

---

## Fichiers concernés dans le code

| Fichier | Rôle |
|--------|------|
| `apps/web/src/lib/analytics/consent.ts` | Lecture/écriture du consentement, événement `questia-consent-change` |
| `apps/web/src/config/analytics.ts` | Lecture des IDs depuis l’environnement |
| `apps/web/src/components/analytics/MarketingScripts.tsx` | Chargement conditionnel des scripts (GTM, gtag, Meta) |
| `apps/web/src/components/CookieNotice.tsx` | Bandeau « Refuser » / « Accepter » |
| `apps/web/src/app/layout.tsx` | Montage de `CookieNotice` et `MarketingScripts` |

**Comportement actuel (à connaître pour la mesure)**

- **GTM** se charge si l’utilisateur a accepté **au moins** analytics **ou** pub (`consent.analytics \|\| consent.ads`) **et** que `NEXT_PUBLIC_GTM_ID` est défini.
- **GA4 en direct** (`gtag`) ne se charge que si `consent.analytics === true`, que `NEXT_PUBLIC_GA_MEASUREMENT_ID` est défini **et** qu’il **n’y a pas** de `NEXT_PUBLIC_GTM_ID`.
- **Meta Pixel** se charge si `consent.ads === true` et `NEXT_PUBLIC_META_PIXEL_ID` est défini. Les changements de route déclenchent un `PageView` Meta via `MetaPageViewTracker`.

---

## Étapes précises — Google Tag Manager (GTM)

1. Va sur [tagmanager.google.com](https://tagmanager.google.com) et connecte-toi avec le compte Google qui gérera le site.
2. **Créer un compte** (si besoin) puis **Créer un conteneur** :
   - Nom du conteneur : ex. `Questia Web`.
   - Cible : **Web**.
3. Accepte les CGU : tu obtiens l’ID **GTM-XXXXXXX** (affiche en haut ou dans Admin → Installer Google Tag Manager).
4. Dans ton dépôt / hébergeur, définis :
   - `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX`
5. **Dans GTM** (espace de travail) :
   - Ajoute au minimum un tag **Google Analytics : configuration GA4** ou **balise Google** liée à ton flux GA4, avec ton ID `G-XXXXXXXXXX`.
   - Configure les **déclencheurs** (souvent « All Pages » ou « Consent Initialization » si tu utilises le mode consentement avancé).
6. Utilise **Aperçu** (Preview) pour tester sur ton domaine de préprod ou `localhost` (selon ce que GTM autorise).
7. Quand c’est bon : **Soumettre** → publier une **version** du conteneur.

**Recommandation** : brancher **GA4 via GTM** plutôt qu’en parallèle avec `NEXT_PUBLIC_GA_MEASUREMENT_ID`, pour éviter le double comptage. Le code n’injecte GA « en direct » que si `NEXT_PUBLIC_GA_MEASUREMENT_ID` est défini **et** `NEXT_PUBLIC_GTM_ID` est absent.

**Affiner analytics vs pub dans GTM** : aujourd’hui le site charge GTM dès qu’**un** des deux consentements est vrai. Pour n’envoyer à GA que si `analytics` est accepté, utilise des **variables** et **déclencheurs** conditionnels, ou pousse `analytics` / `ads` dans le `dataLayer` **avant** le snippet GTM (évolution code — voir section Limites).

**Balise `noscript`** : pour les utilisateurs sans JavaScript, tu peux ajouter manuellement l’iframe GTM recommandée par Google juste après l’ouverture de `<body>` dans `layout.tsx`. Ce n’est pas obligatoire pour la majorité des parcours.

**Détail GTM** (noms de balises, variables, déclencheurs, événements) : voir [§ Plan de mesure complet — GTM](#3-google-tag-manager--ce-que-tu-configures-concrètement).

---

## Étapes précises — Google Analytics 4 (GA4)

### Option A — GA4 via GTM (recommandé)

1. Va sur [analytics.google.com](https://analytics.google.com) → **Admin** → **Créer une propriété** (type GA4).
2. Crée un **flux de données** « Web » : indique l’URL du site (ex. `https://questia.fr`). Note l’**ID de mesure** `G-XXXXXXXXXX`.
3. Dans **GTM**, ajoute un tag de type **Configuration Google Analytics : GA4** (ou équivalent selon l’interface) avec cet ID, sur le déclencheur adapté.
4. Dans `.env` / Vercel : définis **`NEXT_PUBLIC_GTM_ID`** et **ne mets pas** `NEXT_PUBLIC_GA_MEASUREMENT_ID` (ou laisse vide), pour que seul GTM charge GA côté site.

### Option B — GA4 sans GTM (gtag direct)

1. Crée la propriété GA4 et le flux Web comme ci-dessus ; note `G-XXXXXXXXXX`.
2. **Ne définis pas** `NEXT_PUBLIC_GTM_ID` (ou vide).
3. Définis `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`.
4. Après acceptation du bandeau (**analytics** coché côté consentement stocké), `MarketingScripts` injecte `gtag.js` et la config avec `anonymize_ip: true`.

**UTM & campagnes** : utilise des URLs avec `utm_source`, `utm_medium`, `utm_campaign`, etc. GA4 les associe aux sessions si le tag est actif.

**Consent Mode (Google Ads / GA)** : pour l’UE et les usages publicitaires Google, configure le **Mode consentement** dans GTM et aligne les états avec ton bandeau (variables `dataLayer` ou CMP). Le bandeau Questia est un opt-in global ; une évolution est d’exposer `analytics` / `ads` au `dataLayer` avant le chargement de GTM.

**Dimensions, conversions, catalogue d’événements** : voir [Plan de mesure complet](#plan-de-mesure-complet--jeu-web--app-détail).

---

## Étapes précises — Meta (Facebook) Pixel

1. Va sur [Meta Events Manager](https://business.facebook.com/events_manager) (compte Business Meta).
2. **Créer une source de données** → **Pixel** (ou sélectionne un Pixel existant).
3. Copie l’**ID du Pixel** (numérique, souvent 15–16 chiffres).
4. Définis `NEXT_PUBLIC_META_PIXEL_ID=<cet ID>` dans l’environnement de build Next.js.
5. Le script `fbevents.js` et le premier `PageView` ne se chargent que si `consent.ads === true` dans le stockage local.
6. Les **changements de route** (App Router) déclenchent un `PageView` supplémentaire via `MetaPageViewTracker`.

**Campagnes** : associe le Pixel aux ensembles publicitaires dans Meta Ads ; utilise des UTM sur les liens d’annonces pour corréler trafic et conversions dans GA4 / rapports Meta.

**Événements Meta complémentaires** : voir [§ Meta dans le plan complet](#6-meta-pixel--complément-au-web).

---

## Étapes précises — variables d’environnement et déploiement

1. Ouvre `apps/web/.env.example` : repère `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`.
2. En **local** : copie vers `.env.local` (non versionné) et renseigne les clés nécessaires.
3. Sur **Vercel** (ou autre) : **Settings → Environment Variables** → ajoute les mêmes clés pour **Production** (et éventuellement Preview).
4. **Redéploie** l’application : les `NEXT_PUBLIC_*` sont injectées au **build** ; un simple changement d’env exige souvent un nouveau déploiement.
5. Vérifie que le **domaine de production** est bien déclaré dans GA4 (flux de données) et, pour Meta, que le domaine est autorisé si demandé.

---

## Étapes précises — validation avant mise en prod

1. **Variables** : toutes les `NEXT_PUBLIC_*` nécessaires sont présentes sur l’environnement cible.
2. **Navigation privée** : ouvre le site → **Refuser** le bandeau → onglet **Réseau** du navigateur : aucune requête vers `googletagmanager.com`, `google-analytics.com`, `facebook.net` (sauf assets du site).
3. **Accepter** le bandeau → les requêtes attendues apparaissent selon ta config (GTM, gtag, Meta).
4. **GTM** : mode **Aperçu** + [Tag Assistant](https://tagassistant.google.com/).
5. **GA4** : rapport **Temps réel** pendant que tu navigues.
6. **Meta** : extension **Meta Pixel Helper** sur les pages où le Pixel est chargé.
7. **Parcours critique** : landing `/`, `/sign-in`, `/app` (après auth) — vérifier que les vues ou événements apparaissent là où tu les attends ; suivre la [checklist](#10-checklist-tracking-pertinent-rappel) du plan complet.

### Dépannage — l’Aperçu GTM / Tag Assistant « ne se connecte pas » sur la prod

Sur Questia, **`gtm.js` n’est chargé que si le bandeau a été accepté** (au moins analytics **ou** pub) — voir `MarketingScripts.tsx`. Tant que le consentement n’est pas enregistré dans `localStorage` (`questia_cookie_consent_v2`), **il n’y a pas de conteneur GTM sur la page** : le mode **Aperçu** (Tag Assistant) ne peut pas s’y rattacher, même sur l’URL de production.

**Procédure qui fonctionne en général**

1. Ouvre ton site **prod** dans un onglet (Chrome ou Edge, de préférence).
2. Clique **Accepter** sur le bandeau cookies (ou vérifie que le consentement est déjà enregistré).
3. Vérifie dans l’onglet **Réseau** qu’une requête vers `googletagmanager.com/gtm.js?id=GTM-…` part bien.
4. **Ensuite seulement** lance **Aperçu** depuis GTM et indique la même URL (même domaine, avec ou sans `www` comme en prod).

Si tu ouvres l’URL depuis Tag Assistant **avant** d’avoir accepté, ou en **navigation privée** sans avoir cliqué sur Accepter, la connexion échoue.

**Autres causes fréquentes**

- **Bloqueurs de pub / confidentialité** (uBlock, Brave strict, etc.) : désactive-les sur le domaine de prod pour le test.
- **Safari** : restrictions renforcées sur les scripts tiers ; tester avec Chrome.
- **URL** : l’URL saisie dans l’Aperçu doit être exactement celle où le site est servi (ex. `https://questia.fr` vs `www`).

**Alternative** : ne pas dépendre de l’Aperçu pour valider GA4 — utilise le rapport **Temps réel** dans GA4 pendant que tu navigues (après consentement), et l’onglet Réseau pour `gtm.js` / collectes.

---

## Plan de mesure complet — jeu web + app (détail)

Ce plan relie **acquisition**, **parcours web** (Next.js, locales `[locale]`), **jeu** (`/app`, historique, boutique, profil), **API / paiements** et **app mobile Expo**. La stack actuelle charge **GTM / GA / Meta** seulement après le bandeau ; les **événements métier** listés ci-dessous supposent d’**instrumenter le code** (`dataLayer` ou équivalent) — ils ne sont pas tous envoyés automatiquement aujourd’hui.

### 1. Principes transverses

| Règle | Détail |
|--------|--------|
| **Consentement** | N’envoyer des hits GA4 / événements `dataLayer` qu’après `hasAnalyticsConsent()` (`consent.ts`). Même logique côté app avec l’écran / paramètres de confidentialité prévus pour les stores. |
| **Pas de PII dans les tags** | N’envoyer **ni email, ni nom complet, ni identifiant Clerk brut** dans GA4 / Meta comme paramètres d’événement. Préférer des **hashes** ou des **segments** si besoin d’AB test ; la vérité identité reste côté **base + Clerk**. |
| **Une convention de noms** | Événements et paramètres en **snake_case**, stables dans le temps (éviter de renommer tous les 15 jours). |
| **Double source de vérité** | **Revenus / abonnements / achats** : comptabiliser au minimum côté **Stripe + base** ; le navigateur peut rater un hit (réseau, bloqueur). |
| **Parité web / mobile** | Même **nom d’événement** et mêmes **paramètres** (quand applicable) entre `dataLayer` / GA4 web et **Firebase Analytics** (ou SDK choisi) pour comparer les entonnoirs. |

### 2. Cartographie des zones produit (web)

Préfixe de locale : `fr`, `en`, etc. Les chemins ci-dessous sont **sans** préfixe pour la lecture.

| Zone | Routes typiques | Objectifs de mesure |
|------|-----------------|---------------------|
| **Marketing** | `/` | Sources campagnes, UTM, premier contact |
| **Onboarding** | `/onboarding` | Complétion des étapes, abandon |
| **Auth** | `/sign-in`, `/sign-up` | Connexion, inscription (sans PII dans le tag) |
| **Jeu** | `/app` | Génération / acceptation / complétion de quête, engagement |
| **Historique** | `/app/history` | Rétention, consultation |
| **Boutique** | `/app/shop` | Vues offres, intention d’achat |
| **Profil** | `/app/profile` | Modifications profil (événements agrégés) |
| **Légal** | `/legal/*` | Rarement des conversions ; utile pour audits de trafic |

### 3. Google Tag Manager — ce que tu configures concrètement

#### 3.1 Nommage des balises (libellés dans GTM)

Les **noms affichés** dans GTM sont libres ; garde une **préfixe** pour t’y retrouver :

| Libellé suggéré | Type de balise | Rôle |
|-----------------|-----------------|------|
| `Questia — GA4 — Configuration` | Google / **Configuration GA4** | ID `G-XXXXXXXXXX`, mesure de base |
| `Questia — GA4 — Event — page_view (SPA)` | **Google Analytics : événement GA4** | Si tu relies les changements de route manuellement ou via History Change |
| `Questia — GA4 — Event — <nom_evt>` | **Événement GA4** | Un tag par **famille** d’événements ou un tag générique avec **variables** (voir ci-dessous) |

Tu peux aussi utiliser **un seul tag « Événement GA4 »** piloté par des **variables de couche de données** (`Event Name`, paramètres) pour éviter la multiplication des tags.

#### 3.2 Variables GTM à créer

| Variable (nom GTM) | Type | Source |
|--------------------|------|--------|
| `DL - event` | Variable couche de données | Clé `event` |
| `DL - page_path` | Couche de données | ex. `page_path` ou `page_location` si tu les pousses |
| `DL - quest_id` | Couche de données | pour les événements quête |
| `DL - …` | Couche de données | selon le [catalogue §5](#5-catalogue-dévénements--paramètres-recommandés-web) |

Adapte les clés aux **objets** que tu pousses réellement dans `dataLayer` depuis le code.

#### 3.3 Déclencheurs

| Déclencheur | Quand l’utiliser |
|-------------|------------------|
| **Initialisation du consentement** | Si tu branches **Consent Mode** / CMP avancé. |
| **All Pages** (ou **DOM Ready**) | Souvent pour le tag **Configuration GA4** sur site multi-pages « classique ». |
| **History Change** | Pour les **SPA** : à tester sur Questia ; si les vues manquent entre `/` → `/app`, active un envoi **`page_view`** sur History Change ou via code. |
| **Événement personnalisé** | Nom = valeur de `event` du `dataLayer` (ex. `quest_completed`) — **un déclencheur par événement** ou un déclencheur générique « event equals … » avec plusieurs exceptions. |

#### 3.4 Ordre recommandé dans GTM

1. Tag **Configuration GA4** (toutes les pages / consentement OK).
2. Vérifier **`page_view`** (Temps réel GA4 sur navigation interne).
3. Ajouter tags **Événement GA4** liés aux événements `dataLayer` du catalogue.
4. Publier une **version** nommée (ex. `questia-ga4-events-v1`).

### 4. Google Analytics 4 — propriété, flux, dimensions, conversions

#### 4.1 Propriété et flux

- **Une propriété GA4** « Questia Web » (ou **Web + App** si tu relies le SDK mobile au même rapport — option avancée).
- **Flux Web** : URL canonique du site (ex. `https://questia.fr`).
- **Flux App** (optionnel) : si tu relies Firebase / GA4 App ; sinon l’app peut rester sur **Firebase** seul et tu compares dans BigQuery / outil externe plus tard.

#### 4.2 Événements automatiques utiles

GA4 enregistre déjà `session_start`, `first_visit`, `page_view` (selon config), `user_engagement`, etc. Ne les duplique pas manuellement sans raison.

#### 4.3 Paramètres d’événement et dimensions personnalisées

Pour chaque paramètre métier que tu envoies souvent (`quest_theme`, `shop_item_id`, …) :

1. **Admin** → **Définitions personnalisées** → **Dimensions personnalisées** (portée « Événement ») → associer le **nom du paramètre** envoyé dans le tag.
2. Attendre 24–48 h pour l’historique ; le **Temps réel** montre avant la finalisation.

Évite de créer **des centaines** de dimensions : priorise celles des **entonnoirs** et **campagnes** (ex. `campaign_group` interne, pas le texte utilisateur libre).

#### 4.4 Conversions dans GA4

Marquer comme **conversion** (Admin → Événements) uniquement ce qui sert à la **décision business** ou aux **annonces** :

- Exemples : `sign_up`, `purchase` (si envoyé côté client en complément du serveur), `quest_completed` (engagement fort), `subscribe` (si applicable).

Les **micro-conversions** (ex. `quest_viewed`) peuvent rester des événements **non** marqués conversion pour ne pas polluer les rapports Ads.

### 5. Catalogue d’événements + paramètres recommandés (web)

Les noms ci-dessous sont des **recommandations** ; une fois en prod, **ne les change pas** sans migration.

#### 5.1 Navigation et conteneur

| Événement `dataLayer` / GA4 | Paramètres suggérés | Notes |
|-----------------------------|---------------------|--------|
| `page_view` | `page_location`, `page_path`, `page_title` | Aligné sur [événements recommandés GA4](https://support.google.com/analytics/answer/9267735) ; pour SPA, s’assurer que **chaque route** déclenche un hit. |

#### 5.2 Acquisition et compte

| Événement | Paramètres | Notes |
|-----------|--------------|--------|
| `sign_up` | `method` (ex. `clerk`) | À déclencher **après** succès d’inscription ; pas d’email dans les params. |
| `login` | `method` | Idem après connexion réussie. |

#### 5.3 Onboarding

| Événement | Paramètres | Notes |
|-----------|------------|--------|
| `onboarding_started` | — | Première entrée sur le flux. |
| `onboarding_step_completed` | `step_name` (string stable), `step_index` (nombre) | Permet un entonnoir par étape. |
| `onboarding_completed` | — | Fin du flux. |

#### 5.4 Jeu — quêtes et engagement

| Événement | Paramètres | Notes |
|-----------|------------|--------|
| `quest_generated` ou `quest_viewed` | `quest_id` (opaque ou hash), `quest_theme` ou catégorie | Selon ton modèle de données. |
| `quest_accepted` | `quest_id` | L’utilisateur valide la quête du jour. |
| `quest_completed` | `quest_id`, `duration_seconds` (optionnel) | Signal fort de valeur ; candidat **conversion**. |
| `quest_skipped` | `quest_id` | Comprendre la friction. |
| `share_opened` | `share_channel` (ex. `native`, `copy_link`) | Si partage présent. |

#### 5.5 Boutique et monétisation (navigateur)

| Événement | Paramètres | Notes |
|-----------|------------|--------|
| `view_item` / `view_item_list` | `items` (tableau conforme [GA4 ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)) | Si tu exposes des produits avec IDs stables. |
| `begin_checkout` | `currency`, `value`, `items` | Intention de paiement. |
| `purchase` | `transaction_id`, `currency`, `value`, `items` | **Idéalement** doublé ou vérifié côté **serveur** (Stripe webhook) pour la vérité comptable. |

Pour **Meta Ads**, les conversions « achat » sont souvent basées sur le **Pixel** + **API Conversions** ; aligne les **IDs de commande** avec Stripe.

#### 5.6 Profil et réglages

| Événement | Paramètres | Notes |
|-----------|------------|--------|
| `profile_updated` | `field_group` (ex. `avatar`, `notifications`) | Sans valeur du champ personnel. |

### 6. Meta Pixel — complément au web

| Élément | Détail |
|---------|--------|
| **Déjà en place** | `PageView` au chargement et sur **changement de route** (`MetaPageViewTracker`) si `consent.ads`. |
| **Événements standard utiles** | `CompleteRegistration` (après inscription), `InitiateCheckout`, `Purchase` — à envoyer via `fbq('track', …)` **uniquement** avec consentement pub et en cohérence avec les règles Meta. |
| **Paramètres** | `value`, `currency`, `content_ids` pour les achats ; pas de données sensibles. |
| **Attribution** | Garde des **UTM** sur les liens d’annonces ; croise avec GA4 pour éviter les doubles interprétations. |

### 7. Application mobile (Expo)

| Sujet | Action concrète |
|-------|-----------------|
| **SDK** | **Firebase Analytics** (souvent déjà présent avec Expo) ou équivalent ; **Sentry** pour les crashs (ce n’est pas du marketing). |
| **Consentement** | Écran / réglages « Analyse / Publicité » alignés sur `docs/store-app-play-compliance.md` et les fiches stores. |
| **Parité d’événements** | Réutiliser les **mêmes noms** que le [§5](#5-catalogue-dévénements--paramètres-recommandés-web) (`quest_completed`, `purchase`, …) avec les mêmes paramètres quand c’est pertinent. |
| **Écrans** | Logger les **vues d’écran** (équivalent `page_view`) avec un nom stable : `onboarding`, `app_home`, `shop`, etc. |
| **Liaison utilisateur** | Si tu utilises `setUserId` / propriétés utilisateur, privilégier un **ID interne** anonymisé compatible avec ta politique de confidentialité, pas l’email. |
| **Installations** | Campagnes : **liens avec UTM** vers le store + **paramètres d’attribution** (Play Install Referrer, SKAdNetwork côté iOS selon setup). |

### 8. Serveur, API et Stripe (vérité métier)

| Besoin | Où le couvrir |
|--------|----------------|
| Paiement réussi / échec | Webhooks **Stripe**, logs structurés, table métier `orders` ou équivalent. |
| Taux d’erreur API | Monitoring des routes `/api/*`, alertes 5xx. |
| Conversion Ads sans navigateur | **Measurement Protocol** GA4 ou **Conversions API** Meta, avec **respect du consentement** et des conditions d’utilisation. |
| Cohérence avec GA4 | Si tu envoies `purchase` côté client, le **même** `transaction_id` que Stripe facilite la déduplication dans les analyses. |

### 9. UTM et campagnes (standard)

Utiliser systématiquement sur les liens externes (newsletter, réseaux, pubs) :

- `utm_source`, `utm_medium`, `utm_campaign`, et si besoin `utm_content`, `utm_term`.

Exemple : `utm_source=instagram&utm_medium=social&utm_campaign=lancement_2025`

Documente dans une **feuille interne** les valeurs autorisées pour éviter le chaos (`newsletter` vs `email`).

### 10. Checklist « tracking pertinent » (rappel)

| # | Vérification |
|---|----------------|
| 1 | Bandeau : refus → pas de GTM/GA/Meta ; acceptation → hits visibles en Temps réel. |
| 2 | Navigation SPA : chaque route importante apparaît (ou événement `page_view` équivalent). |
| 3 | Événements §5 implémentés dans le code + GTM + dimensions GA4 pour les params clés. |
| 4 | Conversions GA4 définies pour les objectifs business réels. |
| 5 | Meta : Pixel + événements de conversion alignés sur les mêmes règles que la pub. |
| 6 | Mobile : SDK + parité des noms d’événements + écran confidentialité. |
| 7 | Revenus : traçabilité Stripe + logs, pas uniquement le navigateur. |

### 11. Tableau « où regarder quoi »

| Question | Où regarder |
|----------|-------------|
| Campagnes et UTM | GA4 — Acquisition ; sources identiques sur les liens. |
| Inscription / connexion | Événements `sign_up` / `login` + entonnoirs. |
| Engagement jeu | `quest_*`, rétention GA4, éventuellement Firebase pour le mobile. |
| Achats | Stripe + `purchase` (client/serveur) + rapports Meta si Ads. |
| Santé technique | Logs hébergeur, Sentry, pas seulement GA4. |

### 12. Implémentation côté code (rappel)

1. Créer un module client `trackProductEvent(name, params)` qui vérifie `hasAnalyticsConsent()` puis fait `window.dataLayer?.push({ event: name, ...params })` si GTM est utilisé, ou `gtag('event', …)` si GA direct.
2. Dans **GTM**, relier les déclencheurs aux tags GA4 **Événement** comme en [§3](#3-google-tag-manager--ce-que-tu-configures-concrètement).
3. Ne pas envoyer d’événements sans consentement analytics (RGPD).

---

## Limites actuelles & évolutions possibles

- Pas d’intégration automatique du consentement dans **Google Consent Mode v2** (à ajouter via GTM + `dataLayer` si besoin Ads/UE).
- Pas de page « Préférences cookies » pour modifier le choix sans vider le stockage (à prévoir : lien « Gérer mes cookies » qui rouvre le bandeau ou un panneau).
- Les **événements du catalogue** ([§5](#5-catalogue-dévénements--paramètres-recommandés-web)) ne sont pas tous **implémentés** dans le dépôt : à ajouter avec `trackProductEvent` + GTM pour une mesure **complète** du parcours `/app` et mobile.
- L’app mobile (Expo) n’est pas couverte par le **bandeau web** ; le plan [§7](#7-application-mobile-expo) décrit le SDK et la parité d’événements.

---

## Références

- [Google Tag Manager — démarrage](https://support.google.com/tagmanager)
- [GA4 — mesure web](https://support.google.com/analytics/answer/9304153)
- [Meta — Pixel](https://developers.facebook.com/docs/meta-pixel)
- [GA4 — Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [GA4 — Ecommerce events](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
