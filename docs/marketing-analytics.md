# Marketing, mesure d’audience et tracking (Questia)

Ce document décrit comment configurer **Google Tag Manager (GTM)**, **Google Analytics 4 (GA4)** et **Meta Pixel** sur le site Next.js (`apps/web`), en cohérence avec le **bandeau cookies**, puis **comment penser la mesure de l’ensemble du produit** (pas seulement la landing marketing).

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
8. [Mesurer toute l’application (vision d’ensemble)](#mesurer-toute-lapplication-vision-densemble)
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

---

## Étapes précises — Meta (Facebook) Pixel

1. Va sur [Meta Events Manager](https://business.facebook.com/events_manager) (compte Business Meta).
2. **Créer une source de données** → **Pixel** (ou sélectionne un Pixel existant).
3. Copie l’**ID du Pixel** (numérique, souvent 15–16 chiffres).
4. Définis `NEXT_PUBLIC_META_PIXEL_ID=<cet ID>` dans l’environnement de build Next.js.
5. Le script `fbevents.js` et le premier `PageView` ne se chargent que si `consent.ads === true` dans le stockage local.
6. Les **changements de route** (App Router) déclenchent un `PageView` supplémentaire via `MetaPageViewTracker`.

**Campagnes** : associe le Pixel aux ensembles publicitaires dans Meta Ads ; utilise des UTM sur les liens d’annonces pour corréler trafic et conversions dans GA4 / rapports Meta.

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
7. **Parcours critique** : landing `/`, `/sign-in`, `/app` (après auth) — vérifier que les vues ou événements apparaissent là où tu les attends (voir section suivante).

---

## Mesurer toute l’application (vision d’ensemble)

La stack actuelle mesure surtout **l’audience web** et le **comportement navigateur** une fois les scripts chargés. « Toute l’application » recouvre plusieurs couches : **site marketing**, **app web connectée**, **API**, **mobile**. Voici comment les articuler sans tout mélanger.

### 1. Périmètres à distinguer

| Périmètre | Ce que tu mesures typiquement | Outils adaptés |
|-----------|------------------------------|----------------|
| **Acquisition & campagnes** | clics, landing, UTM, coût / conversion | GA4, Meta Ads, GTM |
| **Produit web** (`/app`, onboarding, shop) | parcours, rétention, funnels | GA4 (événements), ou outil produit (PostHog, Amplitude…) si tu en ajoutes un |
| **API / serveur** | erreurs, latence, jobs, webhooks Stripe | Logs (Vercel, Axiom, Datadog…), alertes, **pas** GA4 seul |
| **Mobile Expo** | ouvertures, écrans, crashs | Firebase Analytics, Sentry, ou SDK branché sur la même propriété que le web (selon stratégie) |

### 2. Web — pages vues et navigation SPA

- Avec **GTM + GA4**, les **page views** sont en général émises sur chargement ; sur une **SPA** (Next.js App Router), les changements de route peuvent nécessiter un tag GA4 **« History Change »** ou un envoi manuel d’événement `page_view` dans GTM.
- **À vérifier** : dans GA4 Temps réel, navigue de `/` vers `/onboarding` puis `/sign-in` : chaque transition doit produire une vue ou un événement si tu as configuré le déclencheur adapté dans GTM.
- Le code Questia envoie déjà des **PageView Meta** sur changement de route (`MetaPageViewTracker`) ; pour GA4, c’est surtout une question de **configuration GTM** (ou d’évolution pour pousser `gtag('event', 'page_view', …)`).

### 3. Web — événements produit (quête, shop, partage)

Aujourd’hui, **aucun événement métier** n’est poussé automatiquement vers `dataLayer` / `gtag` dans le dépôt : il faudrait **ajouter** des appels (après consentement analytics) du type :

- `quest_accepted`, `quest_completed`, `shop_checkout_started`, `share_opened`, etc.

**Façon de faire propre**

1. Créer un petit module client `trackProductEvent(name, params)` qui vérifie `hasAnalyticsConsent()` (`consent.ts`) puis fait `window.dataLayer?.push({ event: name, ... })` si GTM est utilisé, ou `gtag('event', …)` si GA direct.
2. Dans **GTM**, créer des **déclencheurs personnalisés** sur ces noms d’événements et des tags GA4 **Événement**.
3. Dans **GA4**, marquer les événements importants comme **conversions** (Admin → Événements).

Cela permet de mesurer **tout le parcours applicatif** côté navigateur de façon cohérente avec le RGPD (pas d’envoi sans consentement analytics).

### 4. Côté serveur (API Next, Prisma, Stripe)

- **Ne compte pas** les « succès métier » uniquement via GA4 : en cas d’échec réseau ou de blocage des scripts, tu perdrais la vérité.
- Utilise des **logs structurés** (niveau `info` / `error`), des **métriques** sur les routes `/api/*`, et des **alertes** sur les 5xx et les échecs Stripe (voir aussi `note.txt` / observabilité).
- Si tu dois remonter des conversions dans **Google Ads** sans passer par le navigateur, regarde le **[Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)** GA4 (clé API, respect du consentement et de la politique Google).

### 5. Application mobile (Expo)

- Le bandeau cookies **web** ne s’applique pas à l’app native : prévoir un **SDK analytics** (Firebase, etc.) et une **politique de consentement** conforme aux stores (voir `docs/store-app-play-compliance.md`).
- Pour **relier web et mobile**, tu peux utiliser les mêmes **UTM** sur les liens d’installation, des **deep links** avec paramètres, et, côté backend, un **identifiant utilisateur** commun (ex. `userId` Clerk) pour analyser les parcours cross-device dans un entrepôt de données — hors scope du simple GTM.

### 6. Tableau de bord « couverture » de la mesure

| Question | Où regarder |
|----------|-------------|
| Est-ce que ma campagne envoie du trafic qualifié ? | GA4 — Acquisition / Campagnes ; UTM sur les liens |
| Est-ce que les utilisateurs voient la landing puis s’inscrivent ? | GA4 — Entonnoirs / explorations ; événements `sign_up` si envoyés |
| Est-ce que les quêtes sont complétées ? | Événements produit (à instrumenter) + éventuellement base de données |
| Est-ce que l’API est saine ? | Logs hébergeur, monitoring, taux d’erreur |
| Est-ce que le Pixel Meta remonte les conversions ? | Events Manager, colonnes de conversion dans Ads |

---

## Limites actuelles & évolutions possibles

- Pas d’intégration automatique du consentement dans **Google Consent Mode v2** (à ajouter via GTM + `dataLayer` si besoin Ads/UE).
- Pas de page « Préférences cookies » pour modifier le choix sans vider le stockage (à prévoir : lien « Gérer mes cookies » qui rouvre le bandeau ou un panneau).
- Pas d’événements produit **dans le code** vers GA/GTM encore : à ajouter comme décrit ci-dessus pour une mesure **complète** du parcours `/app`.
- L’app mobile (Expo) n’est pas couverte par ce flux web ; prévoir un SDK analytics natif ou des deep links + paramètres distincts.

---

## Références

- [Google Tag Manager — démarrage](https://support.google.com/tagmanager)
- [GA4 — mesure web](https://support.google.com/analytics/answer/9304153)
- [Meta — Pixel](https://developers.facebook.com/docs/meta-pixel)
- [GA4 — Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
