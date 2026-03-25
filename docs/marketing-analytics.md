# Marketing, mesure d’audience et tracking (Questia web)

Ce document décrit comment configurer et exploiter **Google Tag Manager (GTM)**, **Google Analytics 4 (GA4)** et **Meta Pixel** sur le site Next.js (`apps/web`), en cohérence avec le **bandeau cookies** et le stockage du consentement côté navigateur.

**Pourquoi pas PostHog en plus ?** GA4 (souvent via GTM) couvre déjà audience, funnels et campagnes marketing. Ajouter PostHog en parallèle dupliquait la mesure (double comptage, double maintenance). Si un jour tu as besoin d’analytics produit avancé (feature flags, session replay), tu pourras réintroduire un outil dédié — idéalement avec un périmètre clair (ex. app mobile seulement).

---

## Principes

1. **Opt-in** : les scripts tiers (GTM, GA en direct, Meta Pixel) ne sont injectés qu’après un choix explicite dans le bandeau (`CookieNotice`). Le refus enregistre `analytics: false` et `ads: false` dans `localStorage` sous la clé `questia_cookie_consent_v2`.
2. **Séparation analytics / pub** :
   - **Analytics** : mesure d’audience (GA4, tags « analytics » dans GTM).
   - **Publicité** : remarketing et campagnes (Meta Pixel, tags pub dans GTM).
3. **Variables d’environnement** : toutes les clés côté client sont préfixées `NEXT_PUBLIC_*` (voir `apps/web/.env.example` et `src/config/analytics.ts`).

---

## Fichiers concernés

| Fichier | Rôle |
|--------|------|
| `src/lib/analytics/consent.ts` | Lecture/écriture du consentement, événement `questia-consent-change` |
| `src/config/analytics.ts` | Lecture des IDs depuis l’environnement |
| `src/components/analytics/MarketingScripts.tsx` | Chargement conditionnel des scripts |
| `src/components/CookieNotice.tsx` | Bandeau « Refuser » / « Accepter mesure & pub » |
| `src/app/layout.tsx` | Montage de `CookieNotice` et `MarketingScripts` |

---

## Google Tag Manager (GTM)

1. Créer un conteneur **Web** dans [tagmanager.google.com](https://tagmanager.google.com).
2. Récupérer l’ID `GTM-XXXXXXX`.
3. Définir dans l’environnement : `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX`.
4. Dans GTM, configurer les tags souhaités (GA4, pixels, conversions, etc.). Le conteneur est chargé uniquement si l’utilisateur a accepté **au moins** analytics **ou** pub (comportement actuel du code : si l’un des deux est vrai, GTM se charge — à affiner dans GTM avec le **Consent Mode** ou des déclencheurs personnalisés si besoin).

**Recommandation** : brancher **GA4 via GTM** plutôt qu’en parallèle avec `NEXT_PUBLIC_GA_MEASUREMENT_ID`, pour éviter le double comptage. Le code n’injecte GA « en direct » que si `NEXT_PUBLIC_GA_MEASUREMENT_ID` est défini **et** `NEXT_PUBLIC_GTM_ID` est absent.

**Balise `noscript`** : pour les utilisateurs sans JavaScript, tu peux ajouter manuellement l’iframe GTM recommandée par Google juste après l’ouverture de `<body>` dans `layout.tsx` (documentation Google Tag Manager). Elle n’est pas obligatoire pour la majorité des parcours.

---

## Google Analytics 4 (GA4)

1. Créer une propriété GA4 dans [Google Analytics](https://analytics.google.com).
2. **Option A — via GTM** : tag « Configuration Google Analytics : événement GA4 » + ID de mesure `G-XXXXXXXXXX` dans GTM. Ne pas définir `NEXT_PUBLIC_GA_MEASUREMENT_ID` dans ce cas (ou laisser vide).
3. **Option B — direct (sans GTM)** : ne pas définir `NEXT_PUBLIC_GTM_ID`, définir `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`. Le snippet `gtag.js` est alors chargé par `MarketingScripts`.

**UTM & campagnes** : utiliser des URLs avec `utm_source`, `utm_medium`, `utm_campaign`, etc. GA4 les associe aux sessions si le tag est correctement déployé.

**Consent Mode (Google Ads / GA)** : si tu utilises des fonctionnalités publicitaires Google, configure le **Mode consentement** dans GTM et aligne les états avec ton bandeau (souvent via variables dataLayer ou CMP). Le bandeau Questia pose un opt-in binaire ; une évolution possible est d’exposer `analytics` / `ads` au `dataLayer` avant le chargement de GTM.

---

## Meta (Facebook) Pixel

1. Créer/ récupérer le Pixel dans [Meta Events Manager](https://business.facebook.com/events_manager).
2. Définir `NEXT_PUBLIC_META_PIXEL_ID` avec l’ID numérique du Pixel.

Le script `fbevents.js` et le `PageView` initial ne sont chargés que si `consent.ads === true`. Un suivi supplémentaire des changements de route SPA est fait via `fbq('track', 'PageView')` dans `MetaPageViewTracker`.

**Campagnes** : associer le Pixel aux ensembles publicitaires dans Meta Ads ; utiliser les paramètres UTM sur les liens d’annonces pour corréler trafic et conversions côté analytics.

---

## Tests avant mise en prod

1. **Variables** : renseigner les `NEXT_PUBLIC_*` sur Vercel (ou l’hôte) et redéployer.
2. **Bandeau** : en navigation privée, vérifier « Refuser » → aucun réseau vers GTM/GA/Meta dans l’onglet Réseau ; puis « Accepter » → requêtes attendues.
3. **GTM** : mode **Aperçu** + extension **Tag Assistant**.
4. **GA4** : rapport Temps réel.
5. **Meta** : extension **Meta Pixel Helper** sur les pages concernées.

---

## Limites actuelles & évolutions possibles

- Pas d’intégration automatique du consentement dans **Google Consent Mode v2** (à ajouter via GTM + `dataLayer` si besoin Ads/UE).
- Pas de page « Préférences cookies » pour modifier le choix sans vider le stockage (à prévoir : lien « Gérer mes cookies » qui rouvre le bandeau ou un panneau).
- L’app mobile (Expo) n’est pas couverte par ce flux ; prévoir un SDK analytics natif ou des deep links + paramètres distincts.

---

## Références

- [Google Tag Manager — démarrage](https://support.google.com/tagmanager)
- [GA4 — mesure web](https://support.google.com/analytics/answer/9304153)
- [Meta — Pixel](https://developers.facebook.com/docs/meta-pixel)
