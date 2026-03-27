# Checklist publication Questia

Liste des éléments restants typiques pour une mise en production (web + iOS + Android), au-delà de ce qui est déjà en place dans le dépôt.

---

## Infra & domaine

- [x] Pointer **questia.fr** vers l’hébergement (Vercel, autre) avec **HTTPS** valide.
- [x] Configurer les **variables d’environnement de prod** sur l’hôte : `DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL=https://questia.fr`, clés **Clerk** (prod), **OpenAI**, **OpenWeather**, **Stripe**, **Resend** (si mails), secrets **cron** / **webhooks**, etc. (référence : `apps/web/.env.example`).
- [x] **Analytics & pub (opt-in)** : si tu actives GTM, GA4 ou Meta Pixel, renseigner les `NEXT_PUBLIC_*` documentées dans `.env.example`, vérifier le bandeau cookies et la section cookies de `/legal/confidentialite`, puis tester en prod (voir [`marketing-analytics.md`](marketing-analytics.md)).
- [x] **Mobile** : `EXPO_PUBLIC_API_BASE_URL` = URL HTTPS du backend en prod ; `EXPO_PUBLIC_SITE_URL` = `https://questia.fr` ; même **Clerk publishable** que le web en prod.

---

## Base de données & migrations

- [x] Appliquer les **migrations Prisma** sur la base **production** (pas seulement un `db push` local).
- [x] Avoir un **plan de sauvegarde** / restauration (ex. snapshots Neon).

---

## Clerk (authentification)

- [x] Utiliser une **instance production** : domaines autorisés (`questia.fr`, sous-domaines si besoin), URLs de callback compatibles Next + Expo.
- [x] **Dashboard Clerk** : branding, e-mails, lien vers la politique de confidentialité (`https://questia.fr/legal/confidentialite`).

---

## Paiements (Stripe)

- [x] **Compte Stripe live**, produits / prix alignés avec le code (webhooks, `STRIPE_WEBHOOK_SECRET` prod).
- [ ] Tester un **parcours d’achat réel** (petit montant) + remboursement si besoin.
- [x] Relire les **CGV** publiées (`/legal/cgv`) avec un conseil si besoin (monnaie virtuelle, Stripe, rétractation).

---

## Deep links & Universal / App Links

- [ ] Compléter **`apple-app-site-association`** : `TEAMID` + bundle id (`fr.questia.app`).
- [ ] Compléter **`assetlinks.json`** : empreinte **SHA-256** du certificat **release** Play Store.
- [ ] **App Store Connect** : capability **Associated Domains** (`applinks:questia.fr`).
- [ ] Vérifier en prod : `https://questia.fr/.well-known/...` accessible (pas de 404, bon `Content-Type` pour Apple).

*Détail : voir [`deep-links.md`](deep-links.md).*

---

## Mobile — build & stores

- [ ] **`app.json`** : remplacer `REPLACE_WITH_EAS_PROJECT_ID` par le vrai projet EAS.
- [ ] **`eas.json`** : Apple ID, `ascAppId`, compte de service Google Play pour **submit**, clés prod.
- [ ] **Builds release** iOS + Android ; tests sur appareils réels (auth, quête, boutique, rappels, partage, liens).
- [ ] **App Store Connect** : métadonnées, captures, classification, **App Privacy** (données réelles = code + SDK).
- [ ] **Google Play Console** : fiche, **Sécurité des données**, classification, tests puis prod.
- [ ] Renseigner **`NEXT_PUBLIC_APP_STORE_URL`** et **`NEXT_PUBLIC_PLAY_STORE_URL`** sur le web pour les badges de téléchargement.

*Aide rédactionnelle : [`store-app-play-compliance.md`](store-app-play-compliance.md).*

---

## Légal & contenu éditorial

### Déjà dans le dépôt (à finaliser en prod)

| Page | URL | Action avant prod |
|------|-----|---------------------|
| Politique de confidentialité | `/legal/confidentialite` | Renseigner `NEXT_PUBLIC_LEGAL_*` (voir `.env.example`) pour supprimer les mentions « à compléter ». |
| Mentions légales (LCEN) | `/legal/mentions-legales` | Idem + directeur de publication, SIRET/RCS si applicable. |
| CGU | `/legal/cgu` | Relire / adapter avec conseil si société. |
| CGV | `/legal/cgv` | Aligner sur la politique commerciale réelle (QC, Stripe, rétractation). |
| Bien-être & limites | `/legal/bien-etre` | OK structurellement ; vérifier cohérence avec les stores. |
| Bandeau cookies | (bas de page, toutes routes) | Informatif « nécessaires » ; si tu ajoutes **analytics** tiers, prévoir consentement renforcé + mise à jour de la § cookies. |

- [ ] Variables **`NEXT_PUBLIC_LEGAL_COMPANY_NAME`**, **`NEXT_PUBLIC_LEGAL_ADDRESS`**, **`NEXT_PUBLIC_LEGAL_CONTACT_EMAIL`** (minimum) sur l’hébergeur.
- [ ] **`NEXT_PUBLIC_LEGAL_DPO_EMAIL`** uniquement si un DPO est désigné (sinon la politique indique l’absence de DPO).
- [ ] **Clerk** : dans le dashboard, lien vers la politique — `https://questia.fr/legal/confidentialite` (et éventuellement CGU si la plateforme le permet).
- [ ] Cohérence **âge minimum** (13 ans, §9 de la confidentialité) avec la cible et les questionnaires **App Store / Play** (familles, etc.).
- [ ] **Liens** : pied de page landing + page Profil web pointent vers confidentialité, mentions, CGU, CGV, bien-être.

### Contenu éditorial (stores & site)

- [ ] Finaliser textes / captures selon [`store-app-play-compliance.md`](store-app-play-compliance.md) et [`direction-artistique.md`](direction-artistique.md).

---

## Ops & sécurité

- [ ] **Cron** (rappels quotidiens) : secret d’URL en prod, monitoring des échecs.
- [ ] **Abus / charge** : surveillance des logs ; renforcer si besoin (rate limiting, etc.).
- [ ] **Outil d’erreurs** (Sentry ou équivalent) en prod si ce n’est pas déjà branché partout.

---

## QA finale

- [ ] Parcours **inscription → onboarding → quête → validation → XP / badges → historique → boutique** (web + mobile).
- [ ] **Déconnexion**, **suppression de compte**, **export JSON**.
- [ ] **Notifications** push + e-mail en conditions réelles.
- [ ] **Partage** : lien `questia.fr/app?questDate=…` et ouverture app (après Universal Links OK).

---

## Versioning & communication

- [ ] **Version** (`app.json`, changelog) alignée avec les stores.
- [ ] Texte **« Nouveautés »** pour la première version (brouillon dans `store-app-play-compliance.md` à adapter).

---

## État fonctionnel (référence interne)

Les blocs produit suivants sont déjà couverts dans le dépôt (voir `note.txt`) : règles XP, badges, boutique, historique, rappels, accessibilité, tests/CI, observabilité, pages légales (confidentialité, mentions, CGU, CGV, bien-être), bandeau cookies informatif, RGPD dans l’UI, transparence IA, fiches stores, deep links / partage.
